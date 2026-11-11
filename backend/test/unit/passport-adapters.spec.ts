import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../../src/modules/auth/application/auth.service';
import { EmailPasswordAuthStrategy } from '../../src/modules/auth/application/strategies/email-password-auth.strategy';
import { LocalPassportStrategy } from '../../src/modules/auth/infrastructure/passport/local-passport.strategy';
import { JwtPassportStrategy } from '../../src/modules/auth/infrastructure/passport/jwt-passport.strategy';
import { InvalidCredentialsError } from '../../src/shared/errors/application-error';
import {
  buildSessionKit,
  configStub,
  FakePasswordHasher,
  InMemoryUserRepository,
} from '../helpers/fakes';

describe('LocalPassportStrategy (adaptador)', () => {
  const buildStrategy = (users: InMemoryUserRepository) => {
    const authService = new AuthService(
      [new EmailPasswordAuthStrategy(users, new FakePasswordHasher())],
      buildSessionKit(users).service,
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
  const setup = async (
    users = new InMemoryUserRepository([InMemoryUserRepository.buildUser()]),
  ) => {
    const kit = buildSessionKit(users);
    const user = InMemoryUserRepository.buildUser();
    await kit.service.start({
      userId: user.id,
      email: user.email,
      name: user.name,
      provider: 'email',
    });
    return { kit, user, strategy: new JwtPassportStrategy(configStub(), users, kit.service) };
  };

  it('reconstroi a identidade a partir do usuario no banco e da sessao ativa', async () => {
    const { strategy, user } = await setup();

    const identity = await strategy.validate({
      sub: user.id,
      email: user.email,
      provider: 'email',
      sid: 'session-1',
    });

    expect(identity).toEqual({
      userId: user.id,
      email: user.email,
      name: user.name,
      provider: 'email',
      sessionId: 'session-1',
    });
  });

  it('rejeita token de usuario que nao existe mais', async () => {
    const { strategy } = await setup(new InMemoryUserRepository());

    await expect(
      strategy.validate({
        sub: 'apagado',
        email: 'x@example.com',
        provider: 'email',
        sid: 'session-1',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejeita token cuja sessao foi encerrada (logout real)', async () => {
    const { strategy, kit, user } = await setup();
    await kit.service.end('session-1', user.id);

    await expect(
      strategy.validate({ sub: user.id, email: user.email, provider: 'email', sid: 'session-1' }),
    ).rejects.toThrow(/Sessao encerrada/);
  });

  it('rejeita token sem sessao ou com provider desconhecido', async () => {
    const { strategy, user } = await setup();

    await expect(
      strategy.validate({ sub: user.id, email: user.email, provider: 'email', sid: '' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(
      strategy.validate({ sub: user.id, email: user.email, provider: 'saml', sid: 'session-1' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejeita sessao de outro usuario', async () => {
    const other = InMemoryUserRepository.buildUser({ id: 'user-2', email: 'outro@example.com' });
    const users = new InMemoryUserRepository([InMemoryUserRepository.buildUser(), other]);
    const { strategy } = await setup(users);

    await expect(
      strategy.validate({ sub: 'user-2', email: other.email, provider: 'email', sid: 'session-1' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('preserva o provider declarado no token', async () => {
    const { strategy, user } = await setup();

    const identity = await strategy.validate({
      sub: user.id,
      email: user.email,
      provider: 'guest',
      sid: 'session-1',
    });

    expect(identity.provider).toBe('guest');
  });
});
