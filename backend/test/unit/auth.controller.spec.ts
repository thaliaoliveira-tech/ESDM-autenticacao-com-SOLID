import { AuthService } from '../../src/modules/auth/application/auth.service';
import { PasswordResetService } from '../../src/modules/auth/application/password-reset.service';
import { RegistrationService } from '../../src/modules/auth/application/registration.service';
import { EmailPasswordAuthStrategy } from '../../src/modules/auth/application/strategies/email-password-auth.strategy';
import { GuestAuthStrategy } from '../../src/modules/auth/application/strategies/guest-auth.strategy';
import { AuthController } from '../../src/modules/auth/presentation/auth.controller';
import type {
  AuthenticatedUser,
  AuthIdentity,
} from '../../src/modules/auth/domain/entities/auth-session';
import { NotFoundError } from '../../src/shared/errors/application-error';
import {
  buildSessionKit,
  configStub,
  FakePasswordHasher,
  ImmediateTransactionManager,
  InMemoryPasswordResetRepository,
  InMemoryUserRepository,
} from '../helpers/fakes';

/**
 * O controller e testavel sem HTTP porque nao contem regra: os guards ja
 * depositaram a identidade, e a ele resta traduzir chamada de caso de uso.
 */
describe('AuthController', () => {
  const identity: AuthIdentity = {
    userId: 'user-1',
    email: 'demo@example.com',
    name: 'Usuario Demo',
    provider: 'email',
  };

  const build = () => {
    const users = new InMemoryUserRepository([
      InMemoryUserRepository.buildUser({ passwordHash: 'hashed:Demo@1234' }),
    ]);
    const kit = buildSessionKit(users);
    const hasher = new FakePasswordHasher();
    const auth = new AuthService(
      [new EmailPasswordAuthStrategy(users, hasher), new GuestAuthStrategy(users)],
      kit.service,
    );
    const config = configStub();
    const resets = new InMemoryPasswordResetRepository();
    const passwordReset = new PasswordResetService(
      users,
      resets,
      hasher,
      kit.secureTokens,
      new ImmediateTransactionManager(),
      kit.clock,
      kit.service,
      kit.audit,
      config,
    );
    const controller = new AuthController(
      auth,
      kit.service,
      new RegistrationService(users, hasher, kit.audit),
      passwordReset,
      config,
    );
    return { controller, kit, users };
  };

  it('login emite a sessao para a identidade confirmada pelo guard', async () => {
    const session = await build().controller.login(identity);

    expect(session).toMatchObject({
      accessToken: 'token-for:user-1',
      tokenType: 'Bearer',
      expiresIn: '1h',
      user: identity,
    });
    expect(session.refreshToken).toHaveLength(64);
  });

  it('register cria a conta e devolve a sessao', async () => {
    const session = await build().controller.register({
      username: 'nova.conta',
      email: 'nova@example.com',
      password: 'Senha@123',
      confirmPassword: 'Senha@123',
    });

    expect(session.user).toMatchObject({ email: 'nova@example.com', provider: 'email' });
  });

  it('guest abre uma sessao de convidado', async () => {
    const session = await build().controller.guest();

    expect(session.user).toMatchObject({ provider: 'guest', email: null, name: 'Convidado' });
  });

  it('refresh troca o refresh token por um novo par', async () => {
    const { controller } = build();
    const first = await controller.login(identity);

    const second = await controller.refresh({ refreshToken: first.refreshToken });

    expect(second.refreshToken).not.toBe(first.refreshToken);
  });

  it('me devolve a identidade do portador do token, sem a sessao', () => {
    const user: AuthenticatedUser = { ...identity, sessionId: 'session-1' };

    expect(build().controller.me(user)).toEqual(identity);
  });

  it('logout revoga a sessao do token', async () => {
    const { controller, kit } = build();
    await controller.login(identity);

    await controller.logout({ ...identity, sessionId: 'session-1' });

    expect(kit.sessions.sessions.get('session-1')?.revokedAt).toBeInstanceOf(Date);
  });

  it('forgotPassword devolve o link de redefinicao e os dados na propria resposta', async () => {
    const response = await build().controller.forgotPassword({ email: 'demo@example.com' });

    expect(response.resetToken).toMatch(/^[a-f0-9]{64}$/);
    expect(response).toEqual({
      message: expect.stringContaining('30 minutos') as string,
      email: 'demo@example.com',
      name: 'Usuario Demo',
      resetToken: response.resetToken,
      resetUrl: `sintetiza://redefinir?token=${response.resetToken}`,
      expiresAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/) as string,
      expiresInMinutes: 30,
    });
  });

  it('forgotPassword responde NotFound para e-mail sem conta', async () => {
    await expect(
      build().controller.forgotPassword({ email: 'ninguem@example.com' }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('resetPassword troca a senha com um token valido', async () => {
    const { controller, users } = build();
    const { resetToken } = await controller.forgotPassword({ email: 'demo@example.com' });

    await controller.resetPassword({
      token: resetToken,
      password: 'Nova@12345',
      confirmPassword: 'Nova@12345',
    });

    expect((await users.findById('user-1'))?.passwordHash).toBe('hashed:Nova@12345');
  });
});
