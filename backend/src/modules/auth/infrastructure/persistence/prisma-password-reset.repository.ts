import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { dbClient } from '../../../../database/transaction';
import type {
  PasswordResetRecord,
  PasswordResetRepository,
} from '../../domain/contracts/password-reset';

@Injectable()
export class PrismaPasswordResetRepository implements PasswordResetRepository {
  constructor(private readonly prisma: PrismaService) {}

  private get db() {
    return dbClient(this.prisma);
  }

  async create(data: { userId: string; tokenHash: string; expiresAt: Date }): Promise<void> {
    await this.db.passwordResetToken.create({ data });
  }

  async findByTokenHash(hash: string): Promise<PasswordResetRecord | null> {
    const found = await this.db.passwordResetToken.findUnique({ where: { tokenHash: hash } });
    return found
      ? { id: found.id, userId: found.userId, expiresAt: found.expiresAt, usedAt: found.usedAt }
      : null;
  }

  async markUsed(id: string, at: Date): Promise<boolean> {
    const { count } = await this.db.passwordResetToken.updateMany({
      where: { id, usedAt: null },
      data: { usedAt: at },
    });
    return count === 1;
  }

  async deleteUnusedForUser(userId: string): Promise<void> {
    await this.db.passwordResetToken.deleteMany({ where: { userId, usedAt: null } });
  }

  async deleteStale(before: Date): Promise<number> {
    const { count } = await this.db.passwordResetToken.deleteMany({
      where: { OR: [{ expiresAt: { lt: before } }, { usedAt: { not: null } }] },
    });
    return count;
  }
}
