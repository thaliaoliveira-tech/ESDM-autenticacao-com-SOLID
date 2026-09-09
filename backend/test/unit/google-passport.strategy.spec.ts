import type { ConfigService } from '@nestjs/config';
import type { Profile } from 'passport-google-oauth20';
import { AuthService } from '../../src/modules/auth/application/auth.service';
import { GoogleAuthStrategy } from '../../src/modules/auth/application/strategies/google-auth.strategy';
import { GooglePassportStrategy } from '../../src/modules/auth/infrastructure/passport/google-passport.strategy';
import { AuthenticationProviderError } from '../../src/shared/errors/application-error';
import { FakeTokenService, InMemoryUserRepository } from '../helpers/fakes';

/**
 * O adaptador do Google e testado sem tocar na rede: recebe um `Profile` como
 * o passport-google-oauth20 entregaria e verifica a traducao para o dominio.
 */
describe('GooglePassportStrategy (adaptador)', () => {
  const configStub = {
    getOrThrow: () => ({
      jwtSecret: 'segredo-de-teste',
      jwtExpiresIn: '1h',
      google: {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        callbackUrl: 'http://localhost:3001/auth/google/callback',
        enabled: true,
      },
    }),
  } as unknown as ConfigService;

  const buildStrategy = (users = new InMemoryUserRepository()) => {
    const authService = new AuthService([new GoogleAuthStrategy(users)], new FakeTokenService());
    return new GooglePassportStrategy(configStub, authService);
  };

  const profile = (overrides: Partial<Profile> = {}): Profile =>
    ({
      id: 'google-123',
      displayName: 'Usuario Google',
      emails: [{ value: 'google@example.com', verified: true }],
      ...overrides,
    }) as Profile;

  it('traduz o Profile da lib para o dominio e devolve a identidade', async () => {
    const strategy = buildStrategy();
    const done = jest.fn();

    await strategy.validate('access', 'refresh', profile(), done);

    expect(done).toHaveBeenCalledWith(
      null,
      expect.objectContaining({
        email: 'google@example.com',
        name: 'Usuario Google',
        provider: 'google',
      }),
    );
  });

  it('usa o primeiro e-mail quando o Google envia varios', async () => {
    const strategy = buildStrategy();
    const done = jest.fn();

    await strategy.validate(
      'access',
      'refresh',
      profile({
        emails: [
          { value: 'principal@example.com', verified: true },
          { value: 'secundario@example.com', verified: true },
        ],
      }),
      done,
    );

    expect(done).toHaveBeenCalledWith(
      null,
      expect.objectContaining({ email: 'principal@example.com' }),
    );
  });

  it('entrega o erro ao callback quando o perfil vem sem e-mail', async () => {
    const strategy = buildStrategy();
    const done = jest.fn();

    await strategy.validate('access', 'refresh', profile({ emails: undefined }), done);

    expect(done).toHaveBeenCalledWith(expect.any(AuthenticationProviderError), false);
  });

  it('trata displayName ausente sem quebrar', async () => {
    const strategy = buildStrategy();
    const done = jest.fn();

    await strategy.validate('access', 'refresh', profile({ displayName: undefined }), done);

    // Sem nome, o e-mail vira o nome (regra da GoogleAuthStrategy).
    expect(done).toHaveBeenCalledWith(
      null,
      expect.objectContaining({ name: 'google@example.com' }),
    );
  });

  it('reconhece um usuario que ja havia entrado pelo Google', async () => {
    const existing = InMemoryUserRepository.buildUser({
      email: 'google@example.com',
      googleId: 'google-123',
      passwordHash: null,
    });
    const strategy = buildStrategy(new InMemoryUserRepository([existing]));
    const done = jest.fn();

    await strategy.validate('access', 'refresh', profile(), done);

    expect(done).toHaveBeenCalledWith(null, expect.objectContaining({ userId: existing.id }));
  });
});
