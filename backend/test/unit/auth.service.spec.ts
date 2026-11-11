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
import { buildSessionKit } from '../helpers/fakes';

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
      [new StubStrategy('email', identity), new StubStrategy('guest', identity)],
      buildSessionKit().service,
    );

    expect(service.availableProviders).toEqual(['email', 'guest']);
  });

  it('recusa duas Strategies para o mesmo provider', () => {
    expect(
      () =>
        new AuthService(
          [new StubStrategy('email', identity), new StubStrategy('email', identity)],
          buildSessionKit().service,
        ),
    ).toThrow(/Mais de uma AuthStrategy/);
  });

  it('delega a autenticacao para a Strategy do provider pedido', async () => {
    const email = new StubStrategy('email', identity);
    const guest = new StubStrategy('guest', { ...identity, provider: 'guest' });
    const service = new AuthService([email, guest], buildSessionKit().service);

    await service.authenticate('guest', { ok: true });

    expect(guest.authenticateCalls).toHaveLength(1);
    expect(email.authenticateCalls).toHaveLength(0);
  });

  it('rejeita provider sem Strategy registrada', async () => {
    const service = new AuthService(
      [new StubStrategy('email', identity)],
      buildSessionKit().service,
    );

    await expect(service.authenticate('guest', { ok: true })).rejects.toBeInstanceOf(
      UnsupportedAuthProviderError,
    );
  });

  it('emite a sessao (access + refresh) a partir de uma identidade confirmada', async () => {
    const kit = buildSessionKit();
    const service = new AuthService([new StubStrategy('email', identity)], kit.service);

    const session = await service.issueSession(identity);

    expect(session).toEqual({
      accessToken: 'token-for:user-1',
      refreshToken: expect.stringMatching(/^[a-f0-9]{64}$/) as string,
      tokenType: 'Bearer',
      expiresIn: '1h',
      refreshTokenExpiresAt: '2026-11-13T12:00:00.000Z',
      user: identity,
    });
    expect(kit.sessions.sessions.size).toBe(1);
  });

  it('login executa autenticacao e emissao de token, nessa ordem', async () => {
    const strategy = new StubStrategy('email', identity);
    const service = new AuthService([strategy], buildSessionKit().service);

    const session = await service.login('email', { ok: true });

    expect(strategy.authenticateCalls).toHaveLength(1);
    expect(session.accessToken).toBe('token-for:user-1');
  });

  it('NAO emite token quando a autenticacao falha', async () => {
    const kit = buildSessionKit();
    const service = new AuthService([new StubStrategy('email', null)], kit.service);

    await expect(service.login('email', { ok: false })).rejects.toBeInstanceOf(
      InvalidCredentialsError,
    );
    expect(kit.tokens.generateCalls).toHaveLength(0);
    expect(kit.sessions.sessions.size).toBe(0);
  });
});
