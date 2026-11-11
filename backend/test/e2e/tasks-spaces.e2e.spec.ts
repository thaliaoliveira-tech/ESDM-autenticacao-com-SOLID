import request from 'supertest';
import {
  bearer,
  createTestApp,
  destroyTestApp,
  guestToken,
  type TestContext,
} from '../helpers/app-factory';

interface TaskBody {
  id: string;
  title: string;
  status: string;
  dueOn: string | null;
  completedOn: string | null;
  priority: string | null;
  spaceId: string | null;
  space: { id: string; name: string } | null;
}

/**
 * Telas Hoje, Tarefas e Espacos de ponta a ponta. A data de "hoje" e fixada
 * pelo parametro `today` (2026-10-14, quarta-feira) para os periodos serem
 * deterministicos.
 */
describe('Tarefas e espacos (E2E)', () => {
  let context: TestContext;
  let token: string;
  const TODAY = '2026-10-14';

  beforeAll(async () => {
    context = await createTestApp();
  });

  afterAll(async () => {
    await destroyTestApp(context);
  });

  beforeEach(async () => {
    token = await guestToken(context.server);
  });

  const api = () => request(context.server);
  const createTask = async (body: Record<string, unknown>, auth = token): Promise<TaskBody> => {
    const response = await api().post('/tasks').set(bearer(auth)).send(body).expect(201);
    return response.body as TaskBody;
  };

  describe('autorizacao', () => {
    it.each([
      ['get', '/tasks'],
      ['post', '/tasks'],
      ['get', '/spaces'],
      ['get', '/tasks/summary'],
    ] as const)('%s %s exige autenticacao', async (method, path) => {
      await api()[method](path).expect(401);
    });

    it('um usuario nao enxerga nem altera tarefas e espacos de outro (404)', async () => {
      const task = await createTask({ title: 'Minha tarefa', spaceName: 'Trabalho' });
      const intruder = await guestToken(context.server);

      await api().get(`/tasks/${task.id}`).set(bearer(intruder)).expect(404);
      await api().patch(`/tasks/${task.id}`).set(bearer(intruder)).send({ title: 'x' }).expect(404);
      await api().delete(`/tasks/${task.id}`).set(bearer(intruder)).expect(404);
      await api().get(`/spaces/${task.spaceId}`).set(bearer(intruder)).expect(404);
      const list = await api().get('/tasks').set(bearer(intruder)).expect(200);
      expect((list.body as { data: unknown[] }).data).toHaveLength(0);
    });
  });

  describe('POST /tasks', () => {
    it('cria com todos os campos e devolve espaco e conversa resolvidos', async () => {
      const task = await createTask({
        title: '  Enviar relatório  ',
        description: 'Versão final',
        assignee: 'Thalia',
        dueOn: TODAY,
        priority: 'high',
        spaceName: 'Trabalho',
      });

      expect(task).toMatchObject({
        title: 'Enviar relatório',
        status: 'pending',
        dueOn: TODAY,
        priority: 'high',
        completedOn: null,
        space: { name: 'Trabalho' },
      });
    });

    it('"+ Criar novo espaco" reutiliza o espaco de mesmo nome (sem acento/maiuscula)', async () => {
      const first = await createTask({ title: 'A', spaceName: 'Faculdade' });
      const second = await createTask({ title: 'B', spaceName: ' faculdáde ' });

      expect(second.spaceId).toBe(first.spaceId);
    });

    it.each([
      [{}, 'title'],
      [{ title: '   ' }, 'titulo'],
      [{ title: 'x'.repeat(161) }, '160'],
      [{ title: 'ok', dueOn: '2026-02-30' }, 'data'],
      [{ title: 'ok', priority: 'altissima' }, 'priority'],
      [{ title: 'ok', status: 'done' }, 'status'],
    ])('400 para corpo invalido %j', async (body, hint) => {
      const response = await api().post('/tasks').set(bearer(token)).send(body).expect(400);

      expect(JSON.stringify(response.body).toLowerCase()).toContain(hint.toLowerCase());
    });

    it('400 quando o espaco informado nao pertence ao usuario', async () => {
      const response = await api()
        .post('/tasks')
        .set(bearer(token))
        .send({ title: 'x', spaceId: 'nao-existe' })
        .expect(400);

      expect(response.body).toMatchObject({ field: 'spaceId' });
    });

    it('400 com spaceId e spaceName juntos', async () => {
      const space = await api().post('/spaces').set(bearer(token)).send({ name: 'Casa' });
      await api()
        .post('/tasks')
        .set(bearer(token))
        .send({ title: 'x', spaceId: (space.body as { id: string }).id, spaceName: 'Outro' })
        .expect(400);
    });
  });

  describe('edicao, conclusao, reabertura e exclusao', () => {
    it('PATCH altera campos e limpa os opcionais com null', async () => {
      const task = await createTask({ title: 'A', dueOn: TODAY, priority: 'low', spaceName: 'X' });

      const response = await api()
        .patch(`/tasks/${task.id}`)
        .set(bearer(token))
        .send({ title: 'B', dueOn: null, priority: null, spaceId: null, assignee: 'Lucas' })
        .expect(200);

      expect(response.body).toMatchObject({
        title: 'B',
        dueOn: null,
        priority: null,
        spaceId: null,
        assignee: 'Lucas',
      });
    });

    it('conclui com a data informada, reabre e exclui', async () => {
      const task = await createTask({ title: 'Concluir' });

      const done = await api()
        .post(`/tasks/${task.id}/complete`)
        .set(bearer(token))
        .send({ completedOn: '2026-10-10' })
        .expect(200);
      expect(done.body).toMatchObject({ status: 'done', completedOn: '2026-10-10' });

      const reopened = await api().post(`/tasks/${task.id}/reopen`).set(bearer(token)).expect(200);
      expect(reopened.body).toMatchObject({ status: 'pending', completedOn: null });

      await api().delete(`/tasks/${task.id}`).set(bearer(token)).expect(204);
      const missing = await api().get(`/tasks/${task.id}`).set(bearer(token)).expect(404);
      expect(missing.body).toMatchObject({ error: 'NotFoundError' });
    });

    it('conclusao sem data usa o dia de hoje no fuso do usuario', async () => {
      const task = await createTask({ title: 'Hoje' });

      const response = await api().post(`/tasks/${task.id}/complete`).set(bearer(token)).send({});

      expect((response.body as TaskBody).completedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('GET /tasks (filtros, periodos, busca, ordenacao, paginacao)', () => {
    beforeEach(async () => {
      await createTask({
        title: 'Relatório do cliente',
        dueOn: TODAY,
        priority: 'medium',
        spaceName: 'Trabalho',
        assignee: 'Thalia',
      });
      await createTask({
        title: 'Prova de cálculo',
        dueOn: '2026-10-15',
        priority: 'high',
        spaceName: 'Faculdade',
      });
      await createTask({ title: 'Academia', dueOn: '2026-10-18' });
      await createTask({ title: 'Sem prazo nenhum' });
      const done = await createTask({ title: 'Ja feita hoje', dueOn: TODAY });
      await api()
        .post(`/tasks/${done.id}/complete`)
        .set(bearer(token))
        .send({ completedOn: TODAY });
    });

    const list = async (query: Record<string, string | number>) =>
      (
        await api()
          .get('/tasks')
          .query({ today: TODAY, ...query })
          .set(bearer(token))
          .expect(200)
      ).body as {
        data: TaskBody[];
        meta: { total: number; totalPages: number; counts: Record<string, number>; range: unknown };
      };

    it('Hoje: somente prazo no dia, com contadores Para fazer/Concluidas', async () => {
      const today = await list({ period: 'today' });

      expect(today.data.map((t) => t.title).sort()).toEqual([
        'Ja feita hoje',
        'Relatório do cliente',
      ]);
      expect(today.meta.counts).toEqual({ pending: 1, done: 1, all: 2 });
      expect(today.meta.range).toEqual({ from: TODAY, to: TODAY });
    });

    it('Amanha e Esta semana (segunda a domingo)', async () => {
      expect((await list({ period: 'tomorrow' })).data.map((t) => t.title)).toEqual([
        'Prova de cálculo',
      ]);
      const week = await list({ period: 'week', status: 'pending' });
      expect(week.meta.range).toEqual({ from: '2026-10-12', to: '2026-10-18' });
      expect(week.data).toHaveLength(3);
    });

    it('Todas inclui tarefas sem prazo; status filtra', async () => {
      expect((await list({})).meta.total).toBe(5);
      expect((await list({ status: 'done' })).data.map((t) => t.title)).toEqual(['Ja feita hoje']);
    });

    it('busca sem acentos e por todos os termos (titulo, responsavel, espaco, prazo)', async () => {
      expect((await list({ q: 'relatorio thalia' })).data.map((t) => t.title)).toEqual([
        'Relatório do cliente',
      ]);
      expect((await list({ q: 'FACULDADE' })).data).toHaveLength(1);
      expect((await list({ q: '2026-10-18' })).data.map((t) => t.title)).toEqual(['Academia']);
      expect((await list({ q: 'inexistente' })).data).toHaveLength(0);
    });

    it('ordena por prazo (sem prazo por ultimo) e por prioridade; concluidas no fim', async () => {
      const byDue = await list({ sort: 'due' });
      expect(byDue.data.map((t) => t.title)).toEqual([
        'Relatório do cliente',
        'Prova de cálculo',
        'Academia',
        'Sem prazo nenhum',
        'Ja feita hoje',
      ]);
      const byPriority = await list({ sort: 'priority', status: 'pending' });
      expect(byPriority.data[0].title).toBe('Prova de cálculo');
    });

    it('filtra por espaco e por "none" (sem espaco)', async () => {
      const spaces = (await api().get('/spaces').set(bearer(token))).body as {
        data: Array<{ id: string; name: string }>;
      };
      const work = spaces.data.find((s) => s.name === 'Trabalho')!;

      expect((await list({ spaceId: work.id })).data).toHaveLength(1);
      expect((await list({ spaceId: 'none' })).meta.total).toBe(3);
    });

    it('pagina com meta consistente', async () => {
      const page = await list({ page: 2, pageSize: 2 });

      expect(page.data).toHaveLength(2);
      expect(page.meta).toMatchObject({ total: 5, totalPages: 3 });
    });

    it('400 para filtros invalidos', async () => {
      await api().get('/tasks').query({ period: 'mes' }).set(bearer(token)).expect(400);
      await api().get('/tasks').query({ pageSize: 500 }).set(bearer(token)).expect(400);
      await api().get('/tasks').query({ today: '14/10/2026' }).set(bearer(token)).expect(400);
    });

    it('GET /tasks/summary resume periodos e atrasadas', async () => {
      const response = await api()
        .get('/tasks/summary')
        .query({ today: '2026-10-16' })
        .set(bearer(token))
        .expect(200);

      expect(response.body).toMatchObject({
        today: '2026-10-16',
        periods: { all: { pending: 4, done: 1 } },
        overdue: 2,
      });
    });
  });

  describe('Espacos', () => {
    it('CRUD com contadores, "Sem espaco", busca e atalhos', async () => {
      const suggestions = await api().get('/spaces/suggestions').set(bearer(token)).expect(200);
      expect(suggestions.body).toEqual({ data: ['Trabalho', 'Faculdade', 'Pessoal'] });

      const created = await api()
        .post('/spaces')
        .set(bearer(token))
        .send({ name: '  Trabalho ' })
        .expect(201);
      const space = created.body as { id: string; name: string };
      expect(space).toMatchObject({ name: 'Trabalho', counts: { pending: 0, done: 0, total: 0 } });

      await api().post('/spaces').set(bearer(token)).send({ name: 'trabálho' }).expect(409);
      await api().post('/spaces').set(bearer(token)).send({ name: '' }).expect(400);
      await api()
        .post('/spaces')
        .set(bearer(token))
        .send({ name: 'x'.repeat(41) })
        .expect(400);

      await createTask({ title: 'Na categoria', spaceId: space.id });
      await createTask({ title: 'Sem categoria' });

      const listed = await api().get('/spaces').set(bearer(token)).expect(200);
      expect(listed.body).toMatchObject({
        data: [{ name: 'Trabalho', counts: { pending: 1, done: 0, total: 1 } }],
        meta: { unassigned: { pending: 1, total: 1 }, showUnassigned: true },
      });

      const search = await api().get('/spaces').query({ q: 'TRAB' }).set(bearer(token)).expect(200);
      expect(search.body).toMatchObject({ meta: { total: 1, showUnassigned: false } });

      const remaining = await api().get('/spaces/suggestions').set(bearer(token));
      expect(remaining.body).toEqual({ data: ['Faculdade', 'Pessoal'] });

      const renamed = await api()
        .patch(`/spaces/${space.id}`)
        .set(bearer(token))
        .send({ name: 'Emprego' })
        .expect(200);
      expect(renamed.body).toMatchObject({ name: 'Emprego', counts: { total: 1 } });

      await api().delete(`/spaces/${space.id}`).set(bearer(token)).expect(204);
      const tasks = await api().get('/tasks').query({ spaceId: 'none' }).set(bearer(token));
      // As tarefas continuam salvas, sem espaco.
      expect((tasks.body as { meta: { total: number } }).meta.total).toBe(2);
    });

    it('409 ao renomear para o nome de outro espaco', async () => {
      await api().post('/spaces').set(bearer(token)).send({ name: 'Casa' });
      const other = await api().post('/spaces').set(bearer(token)).send({ name: 'Rua' });

      const response = await api()
        .patch(`/spaces/${(other.body as { id: string }).id}`)
        .set(bearer(token))
        .send({ name: 'CASA' })
        .expect(409);
      expect(response.body).toMatchObject({ error: 'ConflictError', field: 'name' });
    });
  });
});
