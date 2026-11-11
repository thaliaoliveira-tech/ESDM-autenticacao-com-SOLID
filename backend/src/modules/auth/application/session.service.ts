import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AuthConfig } from '../../../config/auth.config';
import { CLOCK, type Clock } from '../../../shared/domain/clock';
import { SessionExpiredError } from '../../../shared/errors/application-error';
import { currentRequestContext } from '../../../shared/http/request-context';
import { AuditService } from '../../audit/application/audit.service';
import { AuditAction } from '../../audit/domain/audit';
import { USER_REPOSITORY, type UserRepository } from '../../users/domain/contracts/user.repository';
import {
  SECURE_TOKEN_GENERATOR,
  type SecureTokenGenerator,
} from '../domain/contracts/secure-token';
import {
  SESSION_REPOSITORY,
  type SessionRepository,
  type StoredSession,
} from '../domain/contracts/session.repository';
import { TOKEN_SERVICE, type TokenService } from '../domain/contracts/token-service';
import type { AuthIdentity, AuthSession } from '../domain/entities/auth-session';

const DAY_MS = 24 * 60 * 60 * 1000;
/** Sessoes encerradas ficam mais uma semana (rastreabilidade) antes da limpeza. */
const STALE_RETENTION_MS = 7 * DAY_MS;

/**
 * Ciclo de vida das sessoes: emissao, renovacao (refresh rotativo), validacao
 * e encerramento.
 *
 * Cada access token carrega o id da sessao (`sid`). Revogar a sessao invalida o
 * token imediatamente, o que torna o "Sair" e a troca de senha efetivos.
 */
@Injectable()
export class SessionService {
  private readonly refreshTtlMs: number;

  constructor(
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenService,
    @Inject(SECURE_TOKEN_GENERATOR) private readonly secureTokens: SecureTokenGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly audit: AuditService,
    config: ConfigService,
  ) {
    this.refreshTtlMs = config.getOrThrow<AuthConfig>('auth').refreshTokenTtlDays * DAY_MS;
  }

  /** Abre uma sessao para uma identidade ja confirmada. */
  async start(identity: AuthIdentity): Promise<AuthSession> {
    const context = currentRequestContext();
    const refreshToken = this.secureTokens.generate();
    const expiresAt = new Date(this.clock.now().getTime() + this.refreshTtlMs);
    const session = await this.sessions.create({
      userId: identity.userId,
      provider: identity.provider,
      refreshTokenHash: this.secureTokens.hash(refreshToken),
      expiresAt,
      userAgent: context?.userAgent ?? null,
      ipAddress: context?.ipAddress ?? null,
    });

    await this.audit.record({
      userId: identity.userId,
      action: AuditAction.Login,
      entityType: 'session',
      entityId: session.id,
      metadata: { provider: identity.provider },
    });

    return this.toAuthSession(identity, session.id, refreshToken, expiresAt);
  }

  /** Troca um refresh token valido por um novo par de tokens (rotacao). */
  async refresh(refreshToken: string): Promise<AuthSession> {
    if (!this.secureTokens.isWellFormed(refreshToken)) {
      throw new SessionExpiredError();
    }
    const now = this.clock.now();
    const currentHash = this.secureTokens.hash(refreshToken);
    const session = await this.sessions.findByRefreshTokenHash(currentHash);
    if (!session || !this.isUsable(session, now)) {
      throw new SessionExpiredError();
    }

    const user = await this.users.findById(session.userId);
    if (!user) {
      throw new SessionExpiredError();
    }

    const nextToken = this.secureTokens.generate();
    const expiresAt = new Date(now.getTime() + this.refreshTtlMs);
    const rotated = await this.sessions.rotate(session.id, currentHash, {
      refreshTokenHash: this.secureTokens.hash(nextToken),
      expiresAt,
      usedAt: now,
    });
    if (!rotated) {
      throw new SessionExpiredError();
    }

    const identity: AuthIdentity = {
      userId: user.id,
      email: user.email,
      name: user.name,
      provider: session.provider,
    };
    return this.toAuthSession(identity, session.id, nextToken, expiresAt);
  }

  /** Usado pelo guard JWT a cada requisicao autenticada. */
  async isActive(sessionId: string, userId: string): Promise<boolean> {
    const session = await this.sessions.findById(sessionId);
    return (
      session !== null && session.userId === userId && this.isUsable(session, this.clock.now())
    );
  }

  async end(sessionId: string, userId: string): Promise<void> {
    await this.sessions.revoke(sessionId, this.clock.now());
    await this.audit.record({
      userId,
      action: AuditAction.Logout,
      entityType: 'session',
      entityId: sessionId,
    });
  }

  async endAllForUser(userId: string): Promise<number> {
    return this.sessions.revokeAllForUser(userId, this.clock.now());
  }

  async purgeStale(): Promise<number> {
    return this.sessions.deleteStale(new Date(this.clock.now().getTime() - STALE_RETENTION_MS));
  }

  private isUsable(session: StoredSession, now: Date): boolean {
    return session.revokedAt === null && session.expiresAt.getTime() > now.getTime();
  }

  private async toAuthSession(
    identity: AuthIdentity,
    sessionId: string,
    refreshToken: string,
    refreshExpiresAt: Date,
  ): Promise<AuthSession> {
    return {
      accessToken: await this.tokens.generate(identity, sessionId),
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.tokens.expiresIn,
      refreshTokenExpiresAt: refreshExpiresAt.toISOString(),
      user: identity,
    };
  }
}
