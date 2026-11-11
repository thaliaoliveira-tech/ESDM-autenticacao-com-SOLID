import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { dbClient } from '../../../database/transaction';
import type { PageRequest } from '../../../shared/pagination';
import type { AuditEntry, AuditRecord, AuditRepository } from '../domain/audit';

@Injectable()
export class PrismaAuditRepository implements AuditRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    entry: AuditEntry & { requestId: string | null; ipAddress: string | null },
  ): Promise<void> {
    await dbClient(this.prisma).auditLog.create({
      data: {
        userId: entry.userId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
        requestId: entry.requestId,
        ipAddress: entry.ipAddress,
      },
    });
  }

  async listForUser(
    userId: string,
    page: PageRequest,
  ): Promise<{ items: AuditRecord[]; total: number }> {
    const db = dbClient(this.prisma);
    const [rows, total] = await Promise.all([
      db.auditLog.findMany({
        where: { userId },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page.page - 1) * page.pageSize,
        take: page.pageSize,
      }),
      db.auditLog.count({ where: { userId } }),
    ]);
    return {
      total,
      items: rows.map((row) => ({
        id: row.id,
        action: row.action,
        entityType: row.entityType,
        entityId: row.entityId,
        metadata: row.metadata ? (JSON.parse(row.metadata) as Record<string, unknown>) : null,
        requestId: row.requestId,
        createdAt: row.createdAt,
      })),
    };
  }
}
