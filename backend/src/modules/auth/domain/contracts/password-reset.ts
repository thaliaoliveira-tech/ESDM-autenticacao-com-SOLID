export const PASSWORD_RESET_REPOSITORY = Symbol('PasswordResetRepository');

export interface PasswordResetRecord {
  readonly id: string;
  readonly userId: string;
  readonly expiresAt: Date;
  readonly usedAt: Date | null;
}

export interface PasswordResetRepository {
  create(data: { userId: string; tokenHash: string; expiresAt: Date }): Promise<void>;
  findByTokenHash(hash: string): Promise<PasswordResetRecord | null>;
  /** Marca como usado somente se ainda nao foi usado; false em corrida. */
  markUsed(id: string, at: Date): Promise<boolean>;
  /** Gerar outro link invalida os anteriores ainda nao usados. */
  deleteUnusedForUser(userId: string): Promise<void>;
  deleteStale(before: Date): Promise<number>;
}
