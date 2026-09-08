import { EmailPasswordAuthStrategy } from '../../src/modules/auth/application/strategies/email-password-auth.strategy';
import { InvalidCredentialsError } from '../../src/shared/errors/application-error';
import { FakePasswordHasher, InMemoryUserRepository } from '../helpers/fakes';

describe('EmailPasswordAuthStrategy', () => {
  const buildStrategy = (users: InMemoryUserRepository) =>
    new EmailPasswordAuthStrategy(users, new FakePasswordHasher());

  it('identifica o provider como "email"', () => {
    expect(buildStrategy(new InMemoryUserRepository()).provider).toBe('email');
  });

  it('autentica com credenciais corretas e devolve a identidade', async () => {
    const user = InMemoryUserRepository.buildUser({ passwordHash: 'hashed:Demo@123' });
    const strategy = buildStrategy(new InMemoryUserRepository([user]));

    const identity = await strategy.authenticate({
      email: 'demo@example.com',
      password: 'Demo@123',
    });

    expect(identity).toEqual({
      userId: user.id,
      email: user.email,
      name: user.name,
      provider: 'email',
    });
  });

  it('normaliza e-mail com espacos e maiusculas', async () => {
    const user = InMemoryUserRepository.buildUser({ passwordHash: 'hashed:Demo@123' });
    const strategy = buildStrategy(new InMemoryUserRepository([user]));

    const identity = await strategy.authenticate({
      email: '  DEMO@Example.COM  ',
      password: 'Demo@123',
    });

    expect(identity.userId).toBe(user.id);
  });

  it('rejeita usuario inexistente', async () => {
    const strategy = buildStrategy(new InMemoryUserRepository());

    await expect(
      strategy.authenticate({ email: 'ninguem@example.com', password: 'Demo@123' }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it('rejeita senha incorreta', async () => {
    const user = InMemoryUserRepository.buildUser({ passwordHash: 'hashed:Demo@123' });
    const strategy = buildStrategy(new InMemoryUserRepository([user]));

    await expect(
      strategy.authenticate({ email: 'demo@example.com', password: 'errada' }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it('rejeita usuario sem senha local (conta criada via Google)', async () => {
    const googleOnly = InMemoryUserRepository.buildUser({
      passwordHash: null,
      googleId: 'google-123',
    });
    const strategy = buildStrategy(new InMemoryUserRepository([googleOnly]));

    await expect(
      strategy.authenticate({ email: 'demo@example.com', password: 'Demo@123' }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it('usa a mesma mensagem para usuario inexistente e senha errada', async () => {
    const user = InMemoryUserRepository.buildUser({ passwordHash: 'hashed:Demo@123' });
    const comUsuario = buildStrategy(new InMemoryUserRepository([user]));
    const semUsuario = buildStrategy(new InMemoryUserRepository());

    const erroSenha = await comUsuario
      .authenticate({ email: 'demo@example.com', password: 'x'.repeat(8) })
      .catch((error: Error) => error.message);
    const erroUsuario = await semUsuario
      .authenticate({ email: 'demo@example.com', password: 'x'.repeat(8) })
      .catch((error: Error) => error.message);

    // Mensagens diferentes vazariam quais e-mails estao cadastrados.
    expect(erroSenha).toBe(erroUsuario);
  });
});
