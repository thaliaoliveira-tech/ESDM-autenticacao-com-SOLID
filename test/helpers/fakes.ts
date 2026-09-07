import type { CreateGoogleUserData, User } from '../../src/modules/users/domain/entities/user';
import type { UserRepository } from '../../src/modules/users/domain/contracts/user.repository';
import type { PasswordHasher } from '../../src/modules/auth/domain/contracts/password-hasher';
import type {
  TokenPayload,
  TokenService,
} from '../../src/modules/auth/domain/contracts/token-service';
import type { AuthIdentity } from '../../src/modules/auth/domain/entities/auth-session';

/**
 * Fakes em memoria dos contratos do dominio.
 *
 * Sao a prova pratica do Dependency Inversion Principle: as regras podem ser
 * exercitadas sem banco, sem Argon2 e sem Nest, porque nunca dependeram deles.
 */
export class InMemoryUserRepository implements UserRepository {
  private readonly users = new Map<string, User>();
  private sequence = 0;

  constructor(seed: User[] = []) {
    seed.forEach((user) => this.users.set(user.id, user));
  }

  /** Atalho para montar cenarios nos testes. */
  static buildUser(overrides: Partial<User> = {}): User {
    return {
      id: 'user-1',
      name: 'Usuario Demo',
      email: 'demo@example.com',
      passwordHash: 'hash-valido',
      googleId: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      ...overrides,
    };
  }

  findById(id: string): Promise<User | null> {
    return Promise.resolve(this.users.get(id) ?? null);
  }

  findByEmail(email: string): Promise<User | null> {
    const found = [...this.users.values()].find((user) => user.email === email);
    return Promise.resolve(found ?? null);
  }

  findByGoogleId(googleId: string): Promise<User | null> {
    const found = [...this.users.values()].find((user) => user.googleId === googleId);
    return Promise.resolve(found ?? null);
  }

  createFromGoogle(data: CreateGoogleUserData): Promise<User> {
    this.sequence += 1;
    const created: User = {
      id: `generated-${this.sequence}`,
      name: data.name,
      email: data.email,
      passwordHash: null,
      googleId: data.googleId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(created.id, created);
    return Promise.resolve(created);
  }

  linkGoogleAccount(userId: string, googleId: string): Promise<User> {
    const existing = this.users.get(userId);
    if (!existing) {
      return Promise.reject(new Error(`Usuario ${userId} inexistente no fake.`));
    }
    const updated: User = { ...existing, googleId, updatedAt: new Date() };
    this.users.set(userId, updated);
    return Promise.resolve(updated);
  }
}

/** Hasher previsivel: o "hash" de `x` e `hashed:x`. */
export class FakePasswordHasher implements PasswordHasher {
  hash(plainPassword: string): Promise<string> {
    return Promise.resolve(`hashed:${plainPassword}`);
  }

  verify(plainPassword: string, hash: string): Promise<boolean> {
    return Promise.resolve(hash === `hashed:${plainPassword}`);
  }
}

/** TokenService previsivel, sem criptografia. */
export class FakeTokenService implements TokenService {
  readonly expiresIn = '1h';
  generateCalls: AuthIdentity[] = [];

  generate(identity: AuthIdentity): Promise<string> {
    this.generateCalls.push(identity);
    return Promise.resolve(`token-for:${identity.userId}`);
  }

  verify(token: string): Promise<TokenPayload> {
    return Promise.resolve({
      subject: token.replace('token-for:', ''),
      email: 'demo@example.com',
      provider: 'email',
    });
  }
}
