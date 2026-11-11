import { Injectable } from '@nestjs/common';
import type { Session } from '@prisma/client';
import { PrismaService } from '../../../../database/prisma.service';
import { dbClient } from '../../../../database/transaction';
import type {
  CreateSessionData,
  SessionRepository,
  StoredSession,
} from '../../domain/contracts/session.repository';
import { isAuthProvider } from '../../domain/entities/auth-session';

@Injectable()
export class PrismaSessionRepository implements SessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  private get db() {
    return dbClient(this.prisma);
  }

  async create(data: CreateSessionData): Promise<StoredSession> {
    return this.toDomain(await this.db.session.create({ data }));
  }

  async findById(id: string): Promise<StoredSession | null> {
    const found = await this.db.session.findUnique({ where: { id } });
    return found ? this.toDomain(found) : null;
  }

  async findByRefreshTokenHash(hash: string): Promise<StoredSession | null> {
    const found = await this.db.session.findUnique({ where: { refreshTokenHash: hash } });
    return found ? this.toDomain(found) : null;
  }

  async rotate(
    id: string,
    currentHash: string,
    next: { refreshTokenHash: string; expiresAt: Date; usedAt: Date },
  ): Promise<boolean> {
    const { count } = await this.db.session.updateMany({
      where: { id, refreshTokenHash: currentHash, revokedAt: null },
      data: {
        refreshTokenHash: next.refreshTokenHash,
        expiresAt: next.expiresAt,
        lastUsedAt: next.usedAt,
      },
    });
    return count === 1;
  }

  async revoke(id: string, at: Date): Promise<void> {
    await this.db.session.updateMany({ where: { id, revokedAt: null }, data: { revokedAt: at } });
  }

  async revokeAllForUser(userId: string, at: Date): Promise<number> {
    const { count } = await this.db.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: at },
    });
    return count;
  }

  async deleteStale(before: Date): Promise<number> {
    const { count } = await this.db.session.deleteMany({
      where: { OR: [{ expiresAt: { lt: before } }, { revokedAt: { lt: before } }] },
    });
    return count;
  }

  private toDomain(record: Session): StoredSession {
    return {
      id: record.id,
      userId: record.userId,
      provider: isAuthProvider(record.provider) ? record.provider : 'email',
      expiresAt: record.expiresAt,
      revokedAt: record.revokedAt,
    };
  }
}
