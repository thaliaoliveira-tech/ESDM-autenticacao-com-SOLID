import request from 'supertest';
import { AuthMaintenanceService } from '../../src/modules/auth/application/auth-maintenance.service';
import {
  bearer,
  createTestApp,
  destroyTestApp,
  guestToken,
  type TestContext,
} from '../helpers/app-factory';

interface Session {
  accessToken: string;
  refreshToken: string;
  user: { userId: string; email: string | null; provider: string };
}

/** Cadastro, convidado, recuperacao de senha, conta, configuracoes, lembrete e auditoria. */
describe('Conta, configuracoes e notificacoes (E2E)', () => {
  let context: TestContext;
  let sequence = 0;

  beforeAll(async () => {
    context = await createTestApp();
  });

  afterAll(async () => {
    await destroyTestApp(context);
  });

  const api = () => request(context.server);
  const register = async (overrides: Record<string, unknown> = {}) => {
    sequence += 1;
    const body = {
      username: `pessoa.${sequence}`,
      email: `pessoa${sequence}@example.com`,
      password: 'Senha@123',
      confirmPassword: 'Senha@123',
      ...overrides,
    };
    const response = await api().post('/auth/register').send(body).expect(201);
    return { session: response.body as Session, body };
  };

  describe('POST /auth/register', () => {
    it('cria a conta (e-mail normalizado), devolve a sessao e a conta funciona no login', async () => {
      const { session } = await register({ email: '  NOVA@Example.COM ', username: 'Nova.Conta' });

      expect(session.user).toMatchObject({ email: 'nova@example.com', provider: 'email' });
      const me = await api().get('/account').set(bearer(session.accessToken)).expect(200);
      expect(me.body).toMatchObject({
        username: 'nova.conta',
        name: 'nova.conta',
        isGuest: false,
        hasPassword: true,
      });
      expect(JSON.stringify(me.body)).not.toContain('passwordHash');
      await api()
        .post('/auth/login')
        .send({ email: 'nova@example.com', password: 'Senha@123' })
        .expect(200);
    });

    it.each([
      [{ username: 'ab' }, 'username'],
      [{ username: 'com espaço' }, 'username'],
      [{ email: 'invalido' }, 'e-mail'],
      [{ password: 'curta', confirmPassword: 'curta' }, 'senha'],
      [{ confirmPassword: 'Diferente@1' }, 'iguais'],
    ])('400 para %j', async (overrides, hint) => {
      const response = await api()
        .post('/auth/register')
        .send({
          username: 'valido',
          email: 'v@example.com',
          password: 'Senha@123',
          confirmPassword: 'Senha@123',
          ...overrides,
        })
        .expect(400);
      expect(JSON.stringify(response.body).toLowerCase()).toContain(hint.toLowerCase());
    });

    it('409 para nome de usuario ou e-mail ja usados, indicando o campo', async () => {
      const { body } = await register();

      const sameUser = await api()
        .post('/auth/register')
        .send({ ...body, email: 'outro@example.com' })
        .expect(409);
      expect(sameUser.body).toMatchObject({ field: 'username' });

      const sameEmail = await api()
        .post('/auth/register')
        .send({ ...body, username: 'outro.nome' })
        .expect(409);
      expect(sameEmail.body).toMatchObject({ field: 'email' });
    });
  });

  describe('Convidado', () => {
    it('entra sem cadastro, tem dados proprios e nao edita o perfil', async () => {
      const response = await api().post('/auth/guest').expect(201);
      const session = response.body as Session;

      expect(session.user).toMatchObject({ provider: 'guest', email: null });
      const profile = await api().get('/account').set(bearer(session.accessToken)).expect(200);
      expect(profile.body).toMatchObject({ isGuest: true, email: null, hasPassword: false });
      await api()
        .patch('/account')
        .set(bearer(session.accessToken))
        .send({ email: 'x@example.com' })
        .expect(403);
    });

    it('a manutencao remove convidados inativos com todos os dados', async () => {
      const session = (await api().post('/auth/guest')).body as Session;
      await api()
        .post('/tasks')
        .set(bearer(session.accessToken))
        .send({ title: 'Tarefa de convidado' });
      await api().post('/auth/logout').set(bearer(session.accessToken)).expect(204);
      await context.prisma.user.update({
        where: { id: session.user.userId },
        data: { createdAt: new Date('2020-01-01T00:00:00Z') },
      });

      const report = await context.app.get(AuthMaintenanceService).run();

      expect(report.guests).toBeGreaterThanOrEqual(1);
      expect(
        await context.prisma.user.findUnique({ where: { id: session.user.userId } }),
      ).toBeNull();
      expect(await context.prisma.task.count({ where: { userId: session.user.userId } })).toBe(0);
    });
  });

  describe('Recuperacao de senha', () => {
    it('gera link de uso unico, troca a senha e encerra as sessoes', async () => {
      const { session, body } = await register();

      const forgot = await api()
        .post('/auth/password/forgot')
        .send({ email: body.email })
        .expect(200);
      const { resetToken } = forgot.body as { resetToken: string };
      expect(resetToken).toMatch(/^[a-f0-9]{64}$/);
      expect(forgot.body).toEqual({
        message: expect.any(String) as string,
        email: body.email,
        name: expect.any(String) as string,
        resetToken,
        resetUrl: `sintetiza://redefinir-senha?token=${resetToken}`,
        expiresAt: expect.any(String) as string,
        expiresInMinutes: 30,
      });

      await api()
        .post('/auth/password/reset')
        .send({ token: resetToken, password: 'NovaSenha@1', confirmPassword: 'NovaSenha@1' })
        .expect(204);

      // A sessao anterior foi encerrada e a senha antiga deixou de valer.
      await api().get('/auth/me').set(bearer(session.accessToken)).expect(401);
      await api()
        .post('/auth/login')
        .send({ email: body.email, password: 'Senha@123' })
        .expect(401);
      await api()
        .post('/auth/login')
        .send({ email: body.email, password: 'NovaSenha@1' })
        .expect(200);

      // Uso unico.
      const reused = await api()
        .post('/auth/password/reset')
        .send({ token: resetToken, password: 'Outra@1234', confirmPassword: 'Outra@1234' })
        .expect(400);
      expect(reused.body).toMatchObject({ field: 'token' });
    });

    it('gerar outro link invalida o anterior', async () => {
      const { body } = await register();
      const first = await api().post('/auth/password/forgot').send({ email: body.email });
      await api().post('/auth/password/forgot').send({ email: body.email });

      await api()
        .post('/auth/password/reset')
        .send({
          token: (first.body as { resetToken: string }).resetToken,
          password: 'Outra@1234',
          confirmPassword: 'Outra@1234',
        })
        .expect(400);
    });

    it('404 para e-mail sem conta, sem gerar link', async () => {
      const response = await api()
        .post('/auth/password/forgot')
        .send({ email: 'ninguem@example.com' })
        .expect(404);

      expect(response.body).toMatchObject({ statusCode: 404 });
      expect(response.body).not.toHaveProperty('resetToken');
    });

    it('400 para senhas diferentes e token malformado', async () => {
      await api()
        .post('/auth/password/reset')
        .send({ token: 'a'.repeat(64), password: 'Senha@123', confirmPassword: 'Senha@124' })
        .expect(400);
      await api()
        .post('/auth/password/reset')
        .send({ token: 'curto', password: 'Senha@123', confirmPassword: 'Senha@123' })
        .expect(400);
    });
  });

  describe('Gerenciar conta', () => {
    it('atualiza e-mail e nome e rejeita e-mail de outra conta', async () => {
      const { session } = await register();
      const other = await register();

      const updated = await api()
        .patch('/account')
        .set(bearer(session.accessToken))
        .send({ email: 'Atualizado@Example.com', name: 'Pessoa Atualizada' })
        .expect(200);
      expect(updated.body).toMatchObject({
        email: 'atualizado@example.com',
        name: 'Pessoa Atualizada',
      });

      await api()
        .patch('/account')
        .set(bearer(session.accessToken))
        .send({ email: other.body.email })
        .expect(409);
    });

    it('excluir a conta remove todos os dados e invalida o token', async () => {
      const { session } = await register();
      await api()
        .post('/tasks')
        .set(bearer(session.accessToken))
        .send({ title: 'x', spaceName: 'Y' });

      await api().delete('/account').set(bearer(session.accessToken)).expect(204);

      await api().get('/auth/me').set(bearer(session.accessToken)).expect(401);
      expect(await context.prisma.task.count({ where: { userId: session.user.userId } })).toBe(0);
      expect(await context.prisma.space.count({ where: { userId: session.user.userId } })).toBe(0);
    });

    it('GET /account/activity lista a trilha de auditoria com requestId', async () => {
      const { session } = await register();
      await api()
        .post('/tasks')
        .set(bearer(session.accessToken))
        .set('X-Request-Id', 'teste-rastreio-123')
        .send({ title: 'Auditada' })
        .expect(201);

      const response = await api()
        .get('/account/activity')
        .set(bearer(session.accessToken))
        .expect(200);
      const actions = (response.body as { data: Array<{ action: string; requestId: string }> })
        .data;
      expect(actions.map((a) => a.action)).toEqual(
        expect.arrayContaining(['auth.register', 'auth.login', 'task.created']),
      );
      expect(actions.find((a) => a.action === 'task.created')?.requestId).toBe(
        'teste-rastreio-123',
      );
    });
  });

  describe('Configuracoes e lembrete diario', () => {
    it('devolve os padroes, atualiza e valida', async () => {
      const token = await guestToken(context.server);

      const defaults = await api().get('/settings').set(bearer(token)).expect(200);
      expect(defaults.body).toMatchObject({
        theme: 'system',
        timezone: 'America/Sao_Paulo',
        dailyReminder: { enabled: false, time: '09:00', lastSentOn: null },
      });

      const updated = await api()
        .patch('/settings')
        .set(bearer(token))
        .send({ theme: 'dark', timezone: 'UTC', dailyReminder: { enabled: true, time: '07:30' } })
        .expect(200);
      expect(updated.body).toMatchObject({
        theme: 'dark',
        timezone: 'UTC',
        dailyReminder: { enabled: true, time: '07:30' },
      });

      await api().patch('/settings').set(bearer(token)).send({ theme: 'azul' }).expect(400);
      await api()
        .patch('/settings')
        .set(bearer(token))
        .send({ timezone: 'Marte/Base' })
        .expect(400);
      await api()
        .patch('/settings')
        .set(bearer(token))
        .send({ dailyReminder: { time: '25:00' } })
        .expect(400);
    });

    type NotificationList = {
      data: Array<{ id: string; body: string; data: unknown }>;
      meta: { total: number };
    };
    const poll = async (token: string) =>
      (await api().get('/notifications').set(bearer(token)).expect(200)).body as NotificationList;

    it('sem lembrete ligado, a consulta nao gera nada', async () => {
      const token = await guestToken(context.server);

      expect(await poll(token)).toMatchObject({ data: [], meta: { total: 0 } });
    });

    it('a consulta gera o lembrete vencido uma vez por dia; ler tira da lista', async () => {
      const token = await guestToken(context.server);
      await api()
        .patch('/settings')
        .set(bearer(token))
        .send({ timezone: 'UTC', dailyReminder: { enabled: true, time: '00:00' } });
      const today = new Date().toISOString().slice(0, 10);
      await api().post('/tasks').set(bearer(token)).send({ title: 'Hoje 1', dueOn: today });
      await api().post('/tasks').set(bearer(token)).send({ title: 'Hoje 2', dueOn: today });
      await api()
        .post('/tasks')
        .set(bearer(token))
        .send({ title: 'Outro dia', dueOn: '2099-01-01' });

      // Primeira consulta do app: o horario ja passou, o lembrete e gerado.
      const first = await poll(token);
      expect(first.data).toHaveLength(1);
      expect(first.data[0]).toMatchObject({
        body: 'Voce tem 2 tarefas pendentes para hoje.',
        data: { view: 'today', date: today, pending: 2 },
      });

      // Novas consultas no mesmo dia nao duplicam (inclusive em paralelo).
      const [second, third] = await Promise.all([poll(token), poll(token)]);
      expect(second.data.map((n) => n.id)).toEqual([first.data[0].id]);
      expect(third.meta.total).toBe(1);

      // Lida: some da lista e nao volta nas proximas consultas do dia.
      await api().post(`/notifications/${first.data[0].id}/read`).set(bearer(token)).expect(204);
      expect((await poll(token)).meta.total).toBe(0);

      const settings = await api().get('/settings').set(bearer(token));
      expect(settings.body).toMatchObject({ dailyReminder: { lastSentOn: today } });
    });

    it('read-all tira todas da lista; ler notificacao inexistente ou de outro usuario e 404', async () => {
      const token = await guestToken(context.server);
      const me = (await api().get('/auth/me').set(bearer(token))).body as { userId: string };
      for (const title of ['A', 'B']) {
        await context.prisma.notification.create({
          data: { userId: me.userId, type: 'daily_reminder', title, body: title },
        });
      }
      const listed = await poll(token);
      expect(listed.meta.total).toBe(2);

      const intruder = await guestToken(context.server);
      await api()
        .post(`/notifications/${listed.data[0].id}/read`)
        .set(bearer(intruder))
        .expect(404);
      await api().post('/notifications/inexistente/read').set(bearer(token)).expect(404);

      await api().post('/notifications/read-all').set(bearer(token)).expect(204);
      expect((await poll(token)).data).toEqual([]);
    });
  });

  describe('Infraestrutura HTTP', () => {
    it('GET /health e publico', async () => {
      const response = await api().get('/health').expect(200);
      expect(response.body).toMatchObject({ status: 'ok', database: 'up' });
    });

    it('toda resposta traz X-Request-Id e erros seguem o formato padrao', async () => {
      const response = await api().get('/rota-inexistente').expect(404);

      expect(response.headers['x-request-id']).toEqual(expect.any(String));
      expect(response.body).toMatchObject({
        statusCode: 404,
        error: 'NotFound',
        path: '/rota-inexistente',
        requestId: response.headers['x-request-id'],
      });
    });
  });
});
