import { AuthService } from '../../src/modules/auth/application/auth.service';
import type { AuthStrategy } from '../../src/modules/auth/domain/contracts/auth-strategy';
import type {
  AuthIdentity,
  AuthProvider,
} from '../../src/modules/auth/domain/entities/auth-session';
import {
  InvalidCredentialsError,
  UnsupportedAuthProviderError,
} from '../../src/shared/errors/application-error';
import { FakeTokenService } from '../helpers/fakes';

/** Strategy de teste: prova que o service so depende do contrato. */
class StubStrategy implements AuthStrategy<{ ok: boolean }> {
  authenticateCalls: { ok: boolean }[] = [];

  constructor(
    readonly provider: AuthProvider,
    private readonly identity: AuthIdentity | null,
  ) {}

  authenticate(input: { ok: boolean }): Promise<AuthIdentity> {
    this.authenticateCalls.push(input);
    if (!this.identity) {
      return Promise.reject(new InvalidCredentialsError());
    }
    return Promise.resolve(this.identity);
  }
}

describe('AuthService', () => {
  const identity: AuthIdentity = {
    userId: 'user-1',
    email: 'demo@example.com',
    name: 'Usuario Demo',
    provider: 'email',
  };

  it('expoe os providers registrados', () => {
    const service = new AuthService(
      [new StubStrategy('email', identity), new StubStrategy('google', identity)],
      new FakeTokenService(),
    );

    expect(service.availableProviders).toEqual(['email', 'google']);
  });

  it('recusa duas Strategies para o mesmo provider', () => {
    expect(
      () =>
        new AuthService(
          [new StubStrategy('email', identity), new StubStrategy('email', identity)],
          new FakeTokenService(),
        ),
    ).toThrow(/Mais de uma AuthStrategy/);
  });

  it('delega a autenticacao para a Strategy do provider pedido', async () => {
    const email = new StubStrategy('email', identity);
    const google = new StubStrategy('google', { ...identity, provider: 'google' });
    const service = new AuthService([email, google], new FakeTokenService());

    await service.authenticate('google', { ok: true });

    expect(google.authenticateCalls).toHaveLength(1);
    expect(email.authenticateCalls).toHaveLength(0);
  });

  it('rejeita provider sem Strategy registrada', async () => {
    const service = new AuthService([new StubStrategy('email', identity)], new FakeTokenService());

    await expect(service.authenticate('google', { ok: true })).rejects.toBeInstanceOf(
      UnsupportedAuthProviderError,
    );
  });

  it('emite a sessao a partir de uma identidade confirmada', async () => {
    const tokens = new FakeTokenService();
    const service = new AuthService([new StubStrategy('email', identity)], tokens);

    const session = await service.issueSession(identity);

    expect(session).toEqual({
      accessToken: 'token-for:user-1',
      tokenType: 'Bearer',
      expiresIn: '1h',
      user: identity,
    });
  });

  it('login executa autenticacao e emissao de token, nessa ordem', async () => {
    const tokens = new FakeTokenService();
    const strategy = new StubStrategy('email', identity);
    const service = new AuthService([strategy], tokens);

    const session = await service.login('email', { ok: true });

    expect(strategy.authenticateCalls).toHaveLength(1);
    expect(session.accessToken).toBe('token-for:user-1');
  });

  it('NAO emite token quando a autenticacao falha', async () => {
    const tokens = new FakeTokenService();
    const service = new AuthService([new StubStrategy('email', null)], tokens);

    await expect(service.login('email', { ok: false })).rejects.toBeInstanceOf(
      InvalidCredentialsError,
    );
    expect(tokens.generateCalls).toHaveLength(0);
  });
});
