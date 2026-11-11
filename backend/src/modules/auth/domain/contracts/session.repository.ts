import type { AuthProvider } from '../entities/auth-session';

export const SESSION_REPOSITORY = Symbol('SessionRepository');

export interface StoredSession {
  readonly id: string;
  readonly userId: string;
  readonly provider: AuthProvider;
  readonly expiresAt: Date;
  readonly revokedAt: Date | null;
}

export interface CreateSessionData {
  readonly userId: string;
  readonly provider: AuthProvider;
  readonly refreshTokenHash: string;
  readonly expiresAt: Date;
  readonly userAgent: string | null;
  readonly ipAddress: string | null;
}

export interface SessionRepository {
  create(data: CreateSessionData): Promise<StoredSession>;
  findById(id: string): Promise<StoredSession | null>;
  findByRefreshTokenHash(hash: string): Promise<StoredSession | null>;
  /**
   * Troca o refresh token somente se o hash atual ainda for `currentHash`.
   * Devolve false quando outra requisicao ja rotacionou (token reutilizado).
   */
  rotate(
    id: string,
    currentHash: string,
    next: { refreshTokenHash: string; expiresAt: Date; usedAt: Date },
  ): Promise<boolean>;
  revoke(id: string, at: Date): Promise<void>;
  revokeAllForUser(userId: string, at: Date): Promise<number>;
  /** Remove sessoes expiradas ou revogadas antes de `before`. */
  deleteStale(before: Date): Promise<number>;
}
