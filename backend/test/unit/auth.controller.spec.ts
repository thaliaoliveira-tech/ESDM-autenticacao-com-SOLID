import { AuthService } from '../../src/modules/auth/application/auth.service';
import { EmailPasswordAuthStrategy } from '../../src/modules/auth/application/strategies/email-password-auth.strategy';
import { AuthController } from '../../src/modules/auth/presentation/auth.controller';
import type { AuthIdentity } from '../../src/modules/auth/domain/entities/auth-session';
import { FakePasswordHasher, FakeTokenService, InMemoryUserRepository } from '../helpers/fakes';

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

  const buildController = () => {
    const service = new AuthService(
      [new EmailPasswordAuthStrategy(new InMemoryUserRepository(), new FakePasswordHasher())],
      new FakeTokenService(),
    );
    return new AuthController(service);
  };

  it('login emite a sessao para a identidade confirmada pelo guard', async () => {
    const session = await buildController().login(identity);

    expect(session).toEqual({
      accessToken: 'token-for:user-1',
      tokenType: 'Bearer',
      expiresIn: '1h',
      user: identity,
    });
  });

  it('me devolve a identidade do portador do token, sem consultar nada', () => {
    expect(buildController().me(identity)).toBe(identity);
  });

  it('logout nao devolve corpo (o token e descartado pelo cliente)', () => {
    expect(buildController().logout()).toBeUndefined();
  });

  it('googleLogin nao executa: o guard redireciona antes', () => {
    expect(buildController().googleLogin()).toBeUndefined();
  });

  it('googleCallback emite a sessao da identidade vinda do Google', async () => {
    const googleIdentity: AuthIdentity = { ...identity, provider: 'google' };

    const session = await buildController().googleCallback(googleIdentity);

    // A API emite o PROPRIO JWT: nao repassa o token do Google.
    expect(session.accessToken).toBe('token-for:user-1');
    expect(session.user.provider).toBe('google');
  });
});
