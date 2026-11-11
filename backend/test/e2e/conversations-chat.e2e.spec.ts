import request from 'supertest';
import { UpstreamServiceError } from '../../src/shared/errors/application-error';
import {
  bearer,
  createTestApp,
  destroyTestApp,
  guestToken,
  type TestContext,
} from '../helpers/app-factory';
import { proposeActions, text } from '../helpers/scripted-ai-provider';

const EXPORT = [
  '\uFEFF13/10/2026 09:00 - As mensagens sao exemplos.',
  '13/10/2026 09:05 - Thalia: Precisamos enviar o relatório hoje.',
  '13/10/2026 09:06 - Lucas: A reunião será amanhã às 10h.',
  'continua na linha de baixo',
  '[14/10/2026, 11:05:00] Lucas: Fase 1 até 30/10.',
].join('\r\n');

interface Proposal {
  id: string;
  ref: string;
  type: string;
  status: string;
  taskId: string | null;
  spaceIsNew: boolean;
  result: Record<string, unknown> | null;
}
interface Message {
  id: string;
  role: string;
  kind: string;
  content: string;
  interrupted: boolean;
  proposals: Proposal[];
}

/** Importacao do WhatsApp, chat com IA (modelo roteirizado) e propostas de tarefas. */
describe('Conversas e chat (E2E)', () => {
  let context: TestContext;
  let token: string;

  beforeAll(async () => {
    context = await createTestApp();
  });

  afterAll(async () => {
    await destroyTestApp(context);
  });

  beforeEach(async () => {
    context.ai.reset();
    token = await guestToken(context.server);
  });

  const api = () => request(context.server);
  const upload = (content: string | Buffer, name = 'Conversa do WhatsApp.txt', auth = token) =>
    api()
      .post('/conversations')
      .set(bearer(auth))
      .attach('file', Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8'), name);
  const importConversation = async () =>
    ((await upload(EXPORT).expect(201)).body as { conversation: { id: string } }).conversation.id;
  const ask = (content: string, conversationId?: string) =>
    api()
      .post('/chat/messages')
      .set(bearer(token))
      .send({ content, ...(conversationId ? { conversationId } : {}) });

  describe('Importacao', () => {
    it('importa, calcula os detalhes e reconhece Android, iOS e continuacoes', async () => {
      const response = await upload(EXPORT).expect(201);

      expect(response.body).toMatchObject({
        created: true,
        conversation: {
          fileName: 'Conversa do WhatsApp.txt',
          messageCount: 4,
          participantCount: 2,
          activeDays: 2,
          firstMessageOn: '2026-10-13',
          lastMessageOn: '2026-10-14',
          participants: [
            { name: 'Lucas', messageCount: 2, share: 50 },
            { name: 'Thalia', messageCount: 1, share: 25 },
          ],
        },
      });
    });

    it('reimportar o mesmo arquivo abre o existente (200, created=false)', async () => {
      const first = await importConversation();
      const again = await upload(EXPORT.replace(/\r\n/g, '\n'), 'outro-nome.txt').expect(200);

      expect(again.body).toMatchObject({ created: false, conversation: { id: first } });
    });

    it.each([
      ['arquivo.pdf', EXPORT, 400, 'txt'],
      ['vazio.txt', '   \n', 400, 'vazio'],
      ['texto.txt', 'apenas um texto qualquer', 400, 'WhatsApp'],
    ])('rejeita %s', async (name, content, status, hint) => {
      const response = await upload(content, name).expect(status);
      expect(JSON.stringify(response.body)).toContain(hint);
    });

    it('400 sem arquivo e 413 acima de 10 MB', async () => {
      await api().post('/conversations').set(bearer(token)).expect(400);
      const big = Buffer.alloc(10 * 1024 * 1024 + 1, 'a');
      const response = await upload(big).expect(413);
      expect(response.body).toMatchObject({ message: 'Use um arquivo de ate 10 MB.' });
    });

    it('"Usar um exemplo" importa a conversa ficticia', async () => {
      const response = await api().post('/conversations/sample').set(bearer(token)).expect(201);

      expect(response.body).toMatchObject({
        created: true,
        conversation: { fileName: 'conversa-exemplo.txt' },
      });
    });
  });

  describe('Historico de conversas', () => {
    it('lista, busca por nome e conteudo, renomeia, mostra o texto e exclui', async () => {
      const id = await importConversation();
      await api().post('/conversations/sample').set(bearer(token));

      const all = await api().get('/conversations').set(bearer(token)).expect(200);
      expect((all.body as { meta: { total: number } }).meta.total).toBe(2);
      expect(JSON.stringify(all.body)).not.toContain('Precisamos enviar');

      const byContent = await api()
        .get('/conversations')
        .query({ q: 'REUNIAO amanha' })
        .set(bearer(token));
      expect((byContent.body as { data: Array<{ id: string }> }).data.map((c) => c.id)).toContain(
        id,
      );
      const none = await api().get('/conversations').query({ q: 'zzz' }).set(bearer(token));
      expect((none.body as { data: unknown[] }).data).toHaveLength(0);

      const renamed = await api()
        .patch(`/conversations/${id}`)
        .set(bearer(token))
        .send({ fileName: 'Grupo do projeto' })
        .expect(200);
      expect(renamed.body).toMatchObject({ fileName: 'Grupo do projeto' });
      await api()
        .patch(`/conversations/${id}`)
        .set(bearer(token))
        .send({ fileName: ' ' })
        .expect(400);

      const content = await api()
        .get(`/conversations/${id}/content`)
        .set(bearer(token))
        .expect(200);
      expect(content.text).toContain('Thalia: Precisamos enviar');

      await api().delete(`/conversations/${id}`).set(bearer(token)).expect(204);
      await api().get(`/conversations/${id}`).set(bearer(token)).expect(404);
    });

    it('outro usuario nao acessa a conversa (404)', async () => {
      const id = await importConversation();
      const intruder = await guestToken(context.server);

      await api().get(`/conversations/${id}`).set(bearer(intruder)).expect(404);
      await api().get(`/conversations/${id}/content`).set(bearer(intruder)).expect(404);
      await api()
        .get('/chat/messages')
        .query({ conversationId: id })
        .set(bearer(intruder))
        .expect(404);
    });
  });

  describe('Chat', () => {
    it('GET /ai/status informa a configuracao', async () => {
      const response = await api().get('/ai/status').set(bearer(token)).expect(200);
      expect(response.body).toEqual({ configured: true, model: 'roteiro/teste' });
    });

    it('503 quando a IA nao esta configurada, sem salvar a pergunta', async () => {
      context.ai.configured = false;

      const response = await ask('Oi?').expect(503);

      expect(response.body).toMatchObject({ error: 'ServiceUnavailableError' });
      const messages = await api().get('/chat/messages').set(bearer(token));
      expect((messages.body as { data: unknown[] }).data).toHaveLength(0);
    });

    it('pergunta geral (JSON): salva pergunta e resposta e monta o contexto no servidor', async () => {
      context.ai.enqueue([text('Você não tem '), text('tarefas.')]);
      await api()
        .post('/tasks')
        .set(bearer(token))
        .send({ title: 'Comprar pão', spaceName: 'Casa' });

      const response = await ask('Quais tarefas tenho?').expect(201);

      expect(response.body).toMatchObject({
        userMessage: { role: 'user', content: 'Quais tarefas tenho?' },
        assistantMessage: { role: 'assistant', kind: 'chat', content: 'Você não tem tarefas.' },
      });
      const [aiRequest] = context.ai.requests;
      const system = aiRequest.messages[0].content;
      expect(system).toContain('Ainda não há conversa aberta');
      expect(system).toContain('Comprar pão');
      expect(system).toContain('Espaços existentes: Casa');
      expect(aiRequest.tools).toHaveLength(1);
      expect(aiRequest.messages.at(-1)).toEqual({ role: 'user', content: 'Quais tarefas tenho?' });
    });

    it('streaming SSE: user_message, deltas, assistant_message e done', async () => {
      const id = await importConversation();
      context.ai.enqueue([text('Olá'), text(', tudo certo.')]);

      const response = await api()
        .post('/chat/messages')
        .set(bearer(token))
        .set('Accept', 'text/event-stream')
        .send({ content: 'Resuma', conversationId: id })
        .expect(200);

      expect(response.headers['content-type']).toContain('text/event-stream');
      const events = response.text
        .split('\n\n')
        .filter(Boolean)
        .map(
          (block) => JSON.parse(block.split('\n')[1].slice(6)) as { type: string; text?: string },
        );
      expect(events.map((event) => event.type)).toEqual([
        'user_message',
        'delta',
        'delta',
        'assistant_message',
        'done',
      ]);
      expect(context.ai.requests[0].messages[0].content).toContain('<conversa arquivo=');
    });

    it('SSE relata falha do provedor como evento error e permite "Tentar novamente"', async () => {
      context.ai.enqueue(new UpstreamServiceError('A conta do OpenRouter esta sem creditos.'));

      const failed = await api()
        .post('/chat/messages?stream=true')
        .set(bearer(token))
        .send({ content: 'Oi' })
        .expect(200);
      expect(failed.text).toContain('event: error');
      expect(failed.text).toContain('sem creditos');

      context.ai.enqueue([text('Agora foi.')]);
      const retried = await api().post('/chat/retry').set(bearer(token)).send({}).expect(201);
      expect(retried.body).toMatchObject({
        userMessage: null,
        assistantMessage: { content: 'Agora foi.' },
      });

      await api().post('/chat/retry').set(bearer(token)).send({}).expect(409);
    });

    it('JSON: erro do provedor vira 502', async () => {
      context.ai.enqueue(new UpstreamServiceError('O OpenRouter recusou a requisicao (500).'));
      const response = await ask('Oi').expect(502);
      expect(response.body).toMatchObject({ error: 'UpstreamServiceError' });
    });

    it('analise automatica: sem ferramentas e salva como kind=analysis', async () => {
      const id = await importConversation();
      context.ai.enqueue([text('### Resumo\nTudo certo.')]);

      const response = await api()
        .post('/chat/analysis')
        .set(bearer(token))
        .send({ conversationId: id })
        .expect(201);

      expect(response.body).toMatchObject({ assistantMessage: { kind: 'analysis' } });
      const aiRequest = context.ai.requests[0];
      expect(aiRequest.tools).toHaveLength(0);
      expect(aiRequest.messages.at(-1)?.content).toContain('Analise a conversa');
      await api().post('/chat/analysis').set(bearer(token)).send({}).expect(400);
    });

    it('sugestoes: comandos gerais e perguntas iniciais da conversa', async () => {
      const general = await api().get('/chat/suggestions').set(bearer(token)).expect(200);
      expect(JSON.stringify(general.body)).toContain('Criar lista de tarefas');

      const id = await importConversation();
      const starters = await api()
        .get('/chat/suggestions')
        .query({ conversationId: id })
        .set(bearer(token));
      expect((starters.body as { data: Array<{ text: string }> }).data[0].text).toBe(
        'Crie as tarefas desta conversa.',
      );
    });
  });

  describe('Propostas de tarefas', () => {
    const proposalsFrom = (body: unknown) =>
      (body as { assistantMessage: Message }).assistantMessage;

    it('cria propostas, confirma (com e sem edicao), descarta e cria o espaco so na confirmacao', async () => {
      const id = await importConversation();
      context.ai.enqueue([
        text('Encontrei 3 tarefas.'),
        proposeActions([
          {
            tipo: 'criar',
            ref: 't1',
            titulo: 'Enviar relatório',
            responsavel: 'Thalia',
            prazo: '2026-10-13',
            prioridade: 'urgente',
            espaco: 'Projeto X',
          },
          { tipo: 'criar', ref: 't2', titulo: 'Reservar sala', prazo: 'amanhã' },
          { tipo: 'criar', ref: 't3', titulo: 'Preparar fase 1' },
          { tipo: 'editar', tarefa_id: 'nao-existe', titulo: 'ignorada' },
        ]),
      ]);

      const message = proposalsFrom(
        (await ask('Crie as tarefas desta conversa.', id).expect(201)).body,
      );
      expect(message.proposals.map((p) => [p.ref, p.type, p.status])).toEqual([
        ['t1', 'create', 'pending'],
        ['t2', 'create', 'pending'],
        ['t3', 'create', 'pending'],
      ]);
      expect(message.proposals[0].spaceIsNew).toBe(true);
      // Nada foi salvo antes da confirmacao.
      expect(
        ((await api().get('/tasks').set(bearer(token))).body as { meta: { total: number } }).meta
          .total,
      ).toBe(0);

      const confirmed = await api()
        .post(`/chat/proposals/${message.proposals[0].id}/confirm`)
        .set(bearer(token))
        .send({})
        .expect(200);
      expect(confirmed.body).toMatchObject({
        proposal: { status: 'confirmed', taskId: expect.any(String) as string },
        task: {
          title: 'Enviar relatório',
          priority: 'high',
          dueOn: '2026-10-13',
          space: { name: 'Projeto X' },
          conversation: { id },
        },
      });

      const edited = await api()
        .post(`/chat/proposals/${message.proposals[1].id}/confirm`)
        .set(bearer(token))
        .send({ title: 'Reservar sala 3', dueOn: '2026-10-14', spaceName: '' })
        .expect(200);
      expect(edited.body).toMatchObject({
        task: { title: 'Reservar sala 3', dueOn: '2026-10-14', space: null },
      });

      await api()
        .post(`/chat/proposals/${message.proposals[2].id}/discard`)
        .set(bearer(token))
        .expect(200);
      const again = await api()
        .post(`/chat/proposals/${message.proposals[2].id}/confirm`)
        .set(bearer(token))
        .send({})
        .expect(409);
      expect(again.body).toMatchObject({ message: 'Essa proposta ja foi resolvida.' });

      const tasks = await api().get('/tasks').set(bearer(token));
      expect((tasks.body as { meta: { total: number } }).meta.total).toBe(2);
    });

    it('reenviar o mesmo ref substitui a proposta pendente; historico informa o destino', async () => {
      context.ai.enqueue([proposeActions([{ tipo: 'criar', ref: 't1', titulo: 'Versão 1' }])]);
      const first = proposalsFrom((await ask('crie').expect(201)).body);
      expect(first.content).toBe('Confira as propostas abaixo e confirme as que estiverem certas.');

      context.ai.enqueue([
        text('Corrigido.'),
        proposeActions([{ tipo: 'criar', ref: 't1', titulo: 'Versão 2' }]),
      ]);
      await ask('a primeira é do Lucas').expect(201);

      const thread = (await api().get('/chat/messages').set(bearer(token))).body as {
        data: Message[];
      };
      expect(thread.data[1].proposals[0].status).toBe('superseded');
      expect(thread.data[3].proposals[0].status).toBe('pending');
      const history = context.ai.requests[1].messages.map((m) => m.content).join('\n');
      expect(history).toContain('ref t1: criar "Versão 1"');
      expect(history).toContain('aguardando confirmação');
    });

    it('editar, concluir, reabrir e excluir tarefas existentes; confirmar todas', async () => {
      const created = await api().post('/tasks').set(bearer(token)).send({ title: 'Relatório' });
      const taskId = (created.body as { id: string }).id;
      context.ai.enqueue([
        proposeActions([
          {
            tipo: 'editar',
            ref: 'e1',
            tarefa_id: taskId,
            responsavel: 'Marina',
            espaco: 'Trabalho',
          },
          { tipo: 'concluir', ref: 'c1', tarefa_id: taskId, concluida_em: '2026-10-13' },
        ]),
      ]);
      const message = proposalsFrom((await ask('Marina fez o relatório ontem').expect(201)).body);

      const all = await api()
        .post(`/chat/messages/${message.id}/proposals/confirm-all`)
        .set(bearer(token))
        .expect(200);
      expect(all.body).toMatchObject({ confirmed: 2, failures: [] });
      const task = await api().get(`/tasks/${taskId}`).set(bearer(token));
      expect(task.body).toMatchObject({
        assignee: 'Marina',
        status: 'done',
        completedOn: '2026-10-13',
        space: { name: 'Trabalho' },
      });

      context.ai.enqueue([
        proposeActions([
          { tipo: 'reabrir', ref: 'r1', tarefa_id: taskId },
          { tipo: 'excluir', ref: 'x1', tarefa_id: taskId },
        ]),
      ]);
      const second = proposalsFrom((await ask('reabra e depois exclua').expect(201)).body);
      await api()
        .post(`/chat/proposals/${second.proposals[0].id}/confirm`)
        .set(bearer(token))
        .send({})
        .expect(200);
      const deleted = await api()
        .post(`/chat/proposals/${second.proposals[1].id}/confirm`)
        .set(bearer(token))
        .send({})
        .expect(200);
      expect(deleted.body).toMatchObject({
        task: null,
        proposal: { result: { deletedTitle: 'Relatório' } },
      });
      await api().get(`/tasks/${taskId}`).set(bearer(token)).expect(404);

      // O cartao continua legivel depois da exclusao: o titulo foi guardado.
      const thread = (await api().get('/chat/messages').set(bearer(token))).body as {
        data: Message[];
      };
      expect(JSON.stringify(thread.data)).toContain('"taskTitle":"Relatório"');
    });

    it('502 quando a IA so propoe alteracoes em tarefas inexistentes', async () => {
      context.ai.enqueue([proposeActions([{ tipo: 'excluir', tarefa_id: 'fantasma' }])]);
      const response = await ask('exclua').expect(502);
      expect(response.body).toMatchObject({
        message: expect.stringContaining('nao existem') as string,
      });
    });

    it('excluir a conversa remove o historico e mantem as tarefas, sem vinculo', async () => {
      const id = await importConversation();
      context.ai.enqueue([proposeActions([{ tipo: 'criar', ref: 't1', titulo: 'Da conversa' }])]);
      const message = proposalsFrom((await ask('crie', id).expect(201)).body);
      const confirmed = await api()
        .post(`/chat/proposals/${message.proposals[0].id}/confirm`)
        .set(bearer(token))
        .send({});
      const taskId = (confirmed.body as { task: { id: string } }).task.id;

      await api().delete(`/conversations/${id}`).set(bearer(token)).expect(204);

      const task = await api().get(`/tasks/${taskId}`).set(bearer(token)).expect(200);
      expect(task.body).toMatchObject({ conversationId: null, conversation: null });
      await api()
        .post(`/chat/proposals/${message.proposals[0].id}/discard`)
        .set(bearer(token))
        .expect(404);
    });

    it('404 para proposta de outro usuario', async () => {
      context.ai.enqueue([proposeActions([{ tipo: 'criar', titulo: 'Minha' }])]);
      const message = proposalsFrom((await ask('crie').expect(201)).body);
      const intruder = await guestToken(context.server);

      await api()
        .post(`/chat/proposals/${message.proposals[0].id}/confirm`)
        .set(bearer(intruder))
        .send({})
        .expect(404);
    });
  });
});
