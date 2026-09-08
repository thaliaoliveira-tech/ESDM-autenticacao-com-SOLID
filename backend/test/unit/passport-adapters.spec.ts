import {
  ServiceUnavailableException,
  UnauthorizedException,
  type ExecutionContext,
} from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { AuthService } from '../../src/modules/auth/application/auth.service';
import { EmailPasswordAuthStrategy } from '../../src/modules/auth/application/strategies/email-password-auth.strategy';
import { LocalPassportStrategy } from '../../src/modules/auth/infrastructure/passport/local-passport.strategy';
import { JwtPassportStrategy } from '../../src/modules/auth/infrastructure/passport/jwt-passport.strategy';
import { GoogleAuthGuard } from '../../src/modules/auth/infrastructure/guards/google-auth.guard';
import { InvalidCredentialsError } from '../../src/shared/errors/application-error';
import { FakePasswordHasher, FakeTokenService, InMemoryUserRepository } from '../helpers/fakes';

const configStub = (overrides: Record<string, unknown> = {}) =>
  ({
    getOrThrow: () => ({
      jwtSecret: 'segredo-de-teste',
      jwtExpiresIn: '1h',
      google: { clientId: '', clientSecret: '', callbackUrl: '', enabled: false, ...overrides },
    }),
  }) as unknown as ConfigService;

describe('LocalPassportStrategy (adaptador)', () => {
  const buildStrategy = (users: InMemoryUserRepository) => {
    const authService = new AuthService(
      [new EmailPasswordAuthStrategy(users, new FakePasswordHasher())],
      new FakeTokenService(),
    );
    return new LocalPassportStrategy(authService);
  };

  it('delega para a AuthStrategy de e-mail e devolve a identidade', async () => {
    const user = InMemoryUserRepository.buildUser({ passwordHash: 'hashed:Demo@123' });
    const strategy = buildStrategy(new InMemoryUserRepository([user]));

    const identity = await strategy.validate('demo@example.com', 'Demo@123');

    expect(identity).toMatchObject({ userId: user.id, provider: 'email' });
  });

  it('propaga o erro de credencial invalida sem traduzi-lo', async () => {
    const strategy = buildStrategy(new InMemoryUserRepository());

    // O adaptador nao decide status HTTP: quem traduz e o ApplicationErrorFilter.
    await expect(strategy.validate('demo@example.com', 'errada')).rejects.toBeInstanceOf(
      InvalidCredentialsError,
    );
  });
});

describe('JwtPassportStrategy (adaptador)', () => {
  it('reconstroi a identidade a partir do usuario no banco', async () => {
    const user = InMemoryUserRepository.buildUser();
    const strategy = new JwtPassportStrategy(configStub(), new InMemoryUserRepository([user]));

    const identity = await strategy.validate({
      sub: user.id,
      email: user.email,
      provider: 'email',
    });

    expect(identity).toEqual({
      userId: user.id,
      email: user.email,
      name: user.name,
      provider: 'email',
    });
  });

  it('rejeita token de usuario que nao existe mais', async () => {
    const strategy = new JwtPassportStrategy(configStub(), new InMemoryUserRepository());

    await expect(
      strategy.validate({ sub: 'apagado', email: 'x@example.com', provider: 'email' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('preserva o provider declarado no token', async () => {
    const user = InMemoryUserRepository.buildUser({ googleId: 'google-1' });
    const strategy = new JwtPassportStrategy(configStub(), new InMemoryUserRepository([user]));

    const identity = await strategy.validate({
      sub: user.id,
      email: user.email,
      provider: 'google',
    });

    expect(identity.provider).toBe('google');
  });
});

describe('GoogleAuthGuard', () => {
  it('responde 503 quando o Google nao esta configurado', () => {
    const guard = new GoogleAuthGuard(configStub({ enabled: false }));

    expect(() => guard.canActivate({} as ExecutionContext)).toThrow(ServiceUnavailableException);
  });

  it('explica no erro qual variavel falta', () => {
    const guard = new GoogleAuthGuard(configStub({ enabled: false }));

    expect(() => guard.canActivate({} as ExecutionContext)).toThrow(/GOOGLE_CLIENT_ID/);
  });
});
