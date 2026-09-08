import { GoogleAuthStrategy } from '../../src/modules/auth/application/strategies/google-auth.strategy';
import { AuthenticationProviderError } from '../../src/shared/errors/application-error';
import { InMemoryUserRepository } from '../helpers/fakes';

describe('GoogleAuthStrategy', () => {
  const profile = {
    googleId: 'google-123',
    email: 'demo@example.com',
    name: 'Usuario Demo',
  };

  it('identifica o provider como "google"', () => {
    expect(new GoogleAuthStrategy(new InMemoryUserRepository()).provider).toBe('google');
  });

  it('reconhece usuario que ja autenticou via Google antes', async () => {
    const existing = InMemoryUserRepository.buildUser({
      googleId: 'google-123',
      passwordHash: null,
    });
    const strategy = new GoogleAuthStrategy(new InMemoryUserRepository([existing]));

    const identity = await strategy.authenticate(profile);

    expect(identity).toEqual({
      userId: existing.id,
      email: existing.email,
      name: existing.name,
      provider: 'google',
    });
  });

  it('vincula a conta Google a um usuario local com o mesmo e-mail', async () => {
    const local = InMemoryUserRepository.buildUser({ googleId: null });
    const users = new InMemoryUserRepository([local]);
    const strategy = new GoogleAuthStrategy(users);

    const identity = await strategy.authenticate(profile);

    expect(identity.userId).toBe(local.id);
    await expect(users.findByGoogleId('google-123')).resolves.toMatchObject({ id: local.id });
  });

  it('cria um novo usuario no primeiro acesso, sem senha local', async () => {
    const users = new InMemoryUserRepository();
    const strategy = new GoogleAuthStrategy(users);

    const identity = await strategy.authenticate(profile);
    const created = await users.findById(identity.userId);

    expect(identity.provider).toBe('google');
    expect(created?.passwordHash).toBeNull();
    expect(created?.googleId).toBe('google-123');
  });

  it('usa o e-mail como nome quando o Google nao envia displayName', async () => {
    const users = new InMemoryUserRepository();
    const strategy = new GoogleAuthStrategy(users);

    const identity = await strategy.authenticate({ ...profile, name: '' });

    expect(identity.name).toBe('demo@example.com');
  });

  it('normaliza o e-mail vindo do provedor', async () => {
    const users = new InMemoryUserRepository();
    const strategy = new GoogleAuthStrategy(users);

    const identity = await strategy.authenticate({ ...profile, email: '  DEMO@Example.COM ' });

    expect(identity.email).toBe('demo@example.com');
  });

  it('rejeita perfil sem googleId', async () => {
    const strategy = new GoogleAuthStrategy(new InMemoryUserRepository());

    await expect(strategy.authenticate({ ...profile, googleId: '' })).rejects.toBeInstanceOf(
      AuthenticationProviderError,
    );
  });

  it('rejeita perfil sem e-mail', async () => {
    const strategy = new GoogleAuthStrategy(new InMemoryUserRepository());

    await expect(strategy.authenticate({ ...profile, email: '' })).rejects.toBeInstanceOf(
      AuthenticationProviderError,
    );
  });
});
