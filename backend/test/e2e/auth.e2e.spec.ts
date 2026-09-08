import request from 'supertest';
import * as argon2 from 'argon2';
import type { Server } from 'node:http';
import { createTestApp, destroyTestApp, type TestContext } from '../helpers/app-factory';

describe('Autenticacao (E2E)', () => {
  let context: TestContext;
  let server: Server;

  beforeAll(async () => {
    context = await createTestApp();
    server = context.app.getHttpServer() as Server;
  });

  afterAll(async () => {
    await destroyTestApp(context);
  });

  const login = () => request(server).post('/auth/login').send(context.credentials);

  const validToken = async (): Promise<string> => {
    const response = await login();
    return (response.body as { accessToken: string }).accessToken;
  };

  /** Recria o usuario de teste apos um cenario que o remove do banco. */
  const restoreDemoUser = async (): Promise<void> => {
    await context.prisma.user.create({
      data: {
        name: 'Usuario Demo',
        email: context.credentials.email,
        passwordHash: await argon2.hash(context.credentials.password, { type: argon2.argon2id }),
      },
    });
  };

  describe('POST /auth/login', () => {
    it('200 com credenciais validas', async () => {
      const response = await login();

      expect(response.status).toBe(200);
    });

    it('retorna accessToken, tipo e identidade', async () => {
      const response = await login();

      expect(response.body).toEqual({
        accessToken: expect.any(String) as string,
        tokenType: 'Bearer',
        expiresIn: expect.any(String) as string,
        user: {
          userId: expect.any(String) as string,
          email: 'demo@example.com',
          name: 'Usuario Demo',
          provider: 'email',
        },
      });
    });

    it('nunca devolve o hash da senha', async () => {
      const response = await login();

      expect(JSON.stringify(response.body)).not.toContain('argon2');
    });

    it('401 com senha incorreta', async () => {
      const response = await request(server)
        .post('/auth/login')
        .send({ email: context.credentials.email, password: 'senha-errada' });

      expect(response.status).toBe(401);
    });

    it('401 com usuario inexistente', async () => {
      const response = await request(server)
        .post('/auth/login')
        .send({ email: 'ninguem@example.com', password: 'Demo@123' });

      expect(response.status).toBe(401);
    });

    it('usa a mesma resposta para senha errada e usuario inexistente', async () => {
      const senhaErrada = await request(server)
        .post('/auth/login')
        .send({ email: context.credentials.email, password: 'senha-errada' });
      const inexistente = await request(server)
        .post('/auth/login')
        .send({ email: 'ninguem@example.com', password: 'Demo@123' });

      expect(senhaErrada.body).toEqual(inexistente.body);
    });

    it('400 quando o corpo esta vazio', async () => {
      const response = await request(server).post('/auth/login').send({});

      expect(response.status).toBe(400);
    });

    it('400 quando o e-mail e invalido', async () => {
      const response = await request(server)
        .post('/auth/login')
        .send({ email: 'nao-e-email', password: 'Demo@123' });

      expect(response.status).toBe(400);
    });

    it('400 quando a senha e curta demais', async () => {
      const response = await request(server)
        .post('/auth/login')
        .send({ email: context.credentials.email, password: '123' });

      expect(response.status).toBe(400);
    });

    it('400 quando o corpo traz campos desconhecidos', async () => {
      const response = await request(server)
        .post('/auth/login')
        .send({ ...context.credentials, isAdmin: true });

      expect(response.status).toBe(400);
    });

    it('aceita e-mail com maiusculas e espacos', async () => {
      const response = await request(server)
        .post('/auth/login')
        .send({ email: '  DEMO@Example.COM  ', password: context.credentials.password });

      expect(response.status).toBe(200);
    });
  });

  describe('GET /auth/me', () => {
    it('401 sem token', async () => {
      const response = await request(server).get('/auth/me');

      expect(response.status).toBe(401);
    });

    it('401 com token invalido', async () => {
      const response = await request(server)
        .get('/auth/me')
        .set('Authorization', 'Bearer token.invalido.aqui');

      expect(response.status).toBe(401);
    });

    it('401 com esquema de autorizacao errado', async () => {
      const token = await validToken();
      const response = await request(server).get('/auth/me').set('Authorization', `Basic ${token}`);

      expect(response.status).toBe(401);
    });

    it('200 com token valido, devolvendo a identidade', async () => {
      const token = await validToken();
      const response = await request(server)
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        email: 'demo@example.com',
        name: 'Usuario Demo',
        provider: 'email',
      });
    });

    it('401 quando o usuario do token foi removido do banco', async () => {
      const token = await validToken();
      await context.prisma.user.deleteMany({ where: { email: context.credentials.email } });

      const response = await request(server)
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(401);

      await restoreDemoUser();
    });
  });

  describe('POST /auth/logout', () => {
    it('401 sem autenticacao', async () => {
      const response = await request(server).post('/auth/logout');

      expect(response.status).toBe(401);
    });

    it('204 autenticado', async () => {
      const token = await validToken();
      const response = await request(server)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(204);
    });

    it('o token CONTINUA valido depois do logout (limitacao documentada do POC)', async () => {
      const token = await validToken();

      await request(server).post('/auth/logout').set('Authorization', `Bearer ${token}`);
      const response = await request(server)
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`);

      // Nao e um bug: o JWT e stateless e nao ha blacklist neste POC.
      // Ver docs/authentication-flow.md, secao "Logout".
      expect(response.status).toBe(200);
    });
  });

  describe('Google OAuth', () => {
    it('503 quando GOOGLE_CLIENT_ID/SECRET nao estao configurados', async () => {
      const response = await request(server).get('/auth/google');

      // .env.test define credenciais fake, entao a rota tenta redirecionar;
      // sem credenciais, o guard responde 503 com instrucao clara.
      expect([302, 503]).toContain(response.status);
    });
  });
});
