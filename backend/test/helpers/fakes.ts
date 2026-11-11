import type { ConfigService } from '@nestjs/config';
import type { TransactionManager } from '../../src/database/transaction';
import type { Clock } from '../../src/shared/domain/clock';
import type { PageRequest } from '../../src/shared/pagination';
import { ConflictError } from '../../src/shared/errors/application-error';
import { AuditService } from '../../src/modules/audit/application/audit.service';
import type {
  AuditEntry,
  AuditRecord,
  AuditRepository,
} from '../../src/modules/audit/domain/audit';
import { SessionService } from '../../src/modules/auth/application/session.service';
import type { PasswordHasher } from '../../src/modules/auth/domain/contracts/password-hasher';
import type {
  PasswordResetRecord,
  PasswordResetRepository,
} from '../../src/modules/auth/domain/contracts/password-reset';
import type { SecureTokenGenerator } from '../../src/modules/auth/domain/contracts/secure-token';
import type {
  CreateSessionData,
  SessionRepository,
  StoredSession,
} from '../../src/modules/auth/domain/contracts/session.repository';
import type {
  TokenPayload,
  TokenService,
} from '../../src/modules/auth/domain/contracts/token-service';
import type { AuthIdentity } from '../../src/modules/auth/domain/entities/auth-session';
import type { UserRepository } from '../../src/modules/users/domain/contracts/user.repository';
import type {
  CreateLocalUserData,
  UpdateUserProfileData,
  User,
} from '../../src/modules/users/domain/entities/user';

/**
 * Fakes em memoria dos contratos do dominio.
 *
 * Sao a prova pratica do Dependency Inversion Principle: as regras podem ser
 * exercitadas sem banco, sem Argon2 e sem Nest, porque nunca dependeram deles.
 */
export class InMemoryUserRepository implements UserRepository {
  readonly users = new Map<string, User>();
  private sequence = 0;
  /** Sessoes ativas por usuario, para simular `deleteInactiveGuests`. */
  activeSessionUsers = new Set<string>();

  constructor(seed: User[] = []) {
    seed.forEach((user) => this.users.set(user.id, user));
  }

  /** Atalho para montar cenarios nos testes. */
  static buildUser(overrides: Partial<User> = {}): User {
    return {
      id: 'user-1',
      name: 'Usuario Demo',
      username: 'demo',
      email: 'demo@example.com',
      passwordHash: 'hash-valido',
      isGuest: false,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      ...overrides,
    };
  }

  findById(id: string): Promise<User | null> {
    return Promise.resolve(this.users.get(id) ?? null);
  }

  findByEmail(email: string): Promise<User | null> {
    return Promise.resolve([...this.users.values()].find((user) => user.email === email) ?? null);
  }

  findByUsername(username: string): Promise<User | null> {
    return Promise.resolve(
      [...this.users.values()].find((user) => user.username === username) ?? null,
    );
  }

  async createLocal(data: CreateLocalUserData): Promise<User> {
    if (await this.findByUsername(data.username)) {
      throw new ConflictError('Esse nome de usuario ja esta em uso. Escolha outro.', 'username');
    }
    if (await this.findByEmail(data.email)) {
      throw new ConflictError('Ja existe uma conta com esse e-mail.', 'email');
    }
    return this.insert({ ...data });
  }

  createGuest(name: string): Promise<User> {
    return Promise.resolve(this.insert({ name, email: null, isGuest: true }));
  }

  updateProfile(userId: string, data: UpdateUserProfileData): Promise<User> {
    return this.patch(userId, data);
  }

  updatePasswordHash(userId: string, passwordHash: string): Promise<User> {
    return this.patch(userId, { passwordHash });
  }

  delete(userId: string): Promise<void> {
    this.users.delete(userId);
    return Promise.resolve();
  }

  deleteInactiveGuests(createdBefore: Date): Promise<number> {
    let removed = 0;
    for (const user of [...this.users.values()]) {
      if (user.isGuest && user.createdAt < createdBefore && !this.activeSessionUsers.has(user.id)) {
        this.users.delete(user.id);
        removed += 1;
      }
    }
    return Promise.resolve(removed);
  }

  private insert(data: Partial<User>): User {
    this.sequence += 1;
    const created: User = {
      ...InMemoryUserRepository.buildUser({
        id: `generated-${this.sequence}`,
        username: null,
        passwordHash: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      ...data,
    };
    this.users.set(created.id, created);
    return created;
  }

  private patch(userId: string, data: Partial<User>): Promise<User> {
    const existing = this.users.get(userId);
    if (!existing) {
      return Promise.reject(new Error(`Usuario ${userId} inexistente no fake.`));
    }
    const updated: User = { ...existing, ...data, updatedAt: new Date() };
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
  generateCalls: Array<{ identity: AuthIdentity; sessionId: string }> = [];

  generate(identity: AuthIdentity, sessionId: string): Promise<string> {
    this.generateCalls.push({ identity, sessionId });
    return Promise.resolve(`token-for:${identity.userId}`);
  }

  verify(token: string): Promise<TokenPayload> {
    return Promise.resolve({
      subject: token.replace('token-for:', ''),
      email: 'demo@example.com',
      provider: 'email',
      sessionId: 'session-1',
    });
  }
}

/** Tokens opacos sequenciais e hash reversivel, para inspecao nos testes. */
export class FakeSecureTokenGenerator implements SecureTokenGenerator {
  private sequence = 0;

  generate(): string {
    this.sequence += 1;
    return this.sequence.toString(16).padStart(64, '0');
  }

  hash(token: string): string {
    return `hash:${token}`;
  }

  isWellFormed(token: string): boolean {
    return /^[a-f0-9]{64}$/.test(token);
  }
}

export class FixedClock implements Clock {
  constructor(public current = new Date('2026-10-14T12:00:00.000Z')) {}

  now(): Date {
    return new Date(this.current);
  }

  advance(ms: number): void {
    this.current = new Date(this.current.getTime() + ms);
  }
}

export class InMemorySessionRepository implements SessionRepository {
  readonly sessions = new Map<string, StoredSession & { refreshTokenHash: string }>();
  private sequence = 0;

  create(data: CreateSessionData): Promise<StoredSession> {
    this.sequence += 1;
    const session = {
      id: `session-${this.sequence}`,
      userId: data.userId,
      provider: data.provider,
      expiresAt: data.expiresAt,
      revokedAt: null,
      refreshTokenHash: data.refreshTokenHash,
    };
    this.sessions.set(session.id, session);
    return Promise.resolve(session);
  }

  findById(id: string): Promise<StoredSession | null> {
    return Promise.resolve(this.sessions.get(id) ?? null);
  }

  findByRefreshTokenHash(hash: string): Promise<StoredSession | null> {
    return Promise.resolve(
      [...this.sessions.values()].find((s) => s.refreshTokenHash === hash) ?? null,
    );
  }

  rotate(
    id: string,
    currentHash: string,
    next: { refreshTokenHash: string; expiresAt: Date },
  ): Promise<boolean> {
    const session = this.sessions.get(id);
    if (!session || session.refreshTokenHash !== currentHash || session.revokedAt) {
      return Promise.resolve(false);
    }
    this.sessions.set(id, { ...session, ...next });
    return Promise.resolve(true);
  }

  revoke(id: string, at: Date): Promise<void> {
    const session = this.sessions.get(id);
    if (session && !session.revokedAt) {
      this.sessions.set(id, { ...session, revokedAt: at });
    }
    return Promise.resolve();
  }

  revokeAllForUser(userId: string, at: Date): Promise<number> {
    let count = 0;
    for (const session of this.sessions.values()) {
      if (session.userId === userId && !session.revokedAt) {
        this.sessions.set(session.id, { ...session, revokedAt: at });
        count += 1;
      }
    }
    return Promise.resolve(count);
  }

  deleteStale(before: Date): Promise<number> {
    let count = 0;
    for (const session of [...this.sessions.values()]) {
      if (session.expiresAt < before || (session.revokedAt && session.revokedAt < before)) {
        this.sessions.delete(session.id);
        count += 1;
      }
    }
    return Promise.resolve(count);
  }
}

export class InMemoryPasswordResetRepository implements PasswordResetRepository {
  readonly records = new Map<string, PasswordResetRecord & { tokenHash: string }>();
  private sequence = 0;

  create(data: { userId: string; tokenHash: string; expiresAt: Date }): Promise<void> {
    this.sequence += 1;
    const id = `reset-${this.sequence}`;
    this.records.set(id, { id, usedAt: null, ...data });
    return Promise.resolve();
  }

  findByTokenHash(hash: string): Promise<PasswordResetRecord | null> {
    return Promise.resolve([...this.records.values()].find((r) => r.tokenHash === hash) ?? null);
  }

  markUsed(id: string, at: Date): Promise<boolean> {
    const record = this.records.get(id);
    if (!record || record.usedAt) {
      return Promise.resolve(false);
    }
    this.records.set(id, { ...record, usedAt: at });
    return Promise.resolve(true);
  }

  deleteUnusedForUser(userId: string): Promise<void> {
    for (const record of [...this.records.values()]) {
      if (record.userId === userId && !record.usedAt) {
        this.records.delete(record.id);
      }
    }
    return Promise.resolve();
  }

  deleteStale(before: Date): Promise<number> {
    let count = 0;
    for (const record of [...this.records.values()]) {
      if (record.expiresAt < before || record.usedAt) {
        this.records.delete(record.id);
        count += 1;
      }
    }
    return Promise.resolve(count);
  }
}

/** Executa o trabalho diretamente: os fakes em memoria nao tem transacao. */
export class ImmediateTransactionManager implements TransactionManager {
  runs = 0;

  run<T>(work: () => Promise<T>): Promise<T> {
    this.runs += 1;
    return work();
  }
}

export class InMemoryAuditRepository implements AuditRepository {
  readonly entries: Array<AuditEntry & { requestId: string | null }> = [];

  create(
    entry: AuditEntry & { requestId: string | null; ipAddress: string | null },
  ): Promise<void> {
    this.entries.push(entry);
    return Promise.resolve();
  }

  listForUser(userId: string, page: PageRequest): Promise<{ items: AuditRecord[]; total: number }> {
    const mine = this.entries.filter((entry) => entry.userId === userId);
    return Promise.resolve({
      total: mine.length,
      items: mine
        .slice((page.page - 1) * page.pageSize, page.page * page.pageSize)
        .map((entry, index) => ({
          id: `audit-${index}`,
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId ?? null,
          metadata: entry.metadata ?? null,
          requestId: entry.requestId,
          createdAt: new Date(),
        })),
    });
  }
}

export const testAuthConfig = {
  jwtSecret: 'segredo-de-teste',
  jwtExpiresIn: '1h',
  refreshTokenTtlDays: 30,
  passwordReset: { ttlMinutes: 30, url: 'sintetiza://redefinir?token=' },
  guestRetentionDays: 30,
};

export function configStub(sections: Record<string, unknown> = {}): ConfigService {
  const all: Record<string, unknown> = {
    auth: testAuthConfig,
    app: { env: 'test', port: 3001, corsOrigins: [], jobsEnabled: false },
    ...sections,
  };
  return { getOrThrow: (key: string) => all[key] } as unknown as ConfigService;
}

/** Monta um SessionService completo sobre fakes em memoria. */
export function buildSessionKit(users = new InMemoryUserRepository()) {
  const sessions = new InMemorySessionRepository();
  const tokens = new FakeTokenService();
  const secureTokens = new FakeSecureTokenGenerator();
  const clock = new FixedClock();
  const auditRepository = new InMemoryAuditRepository();
  const audit = new AuditService(auditRepository);
  const service = new SessionService(
    sessions,
    users,
    tokens,
    secureTokens,
    clock,
    audit,
    configStub(),
  );
  return { service, sessions, users, tokens, secureTokens, clock, audit, auditRepository };
}
