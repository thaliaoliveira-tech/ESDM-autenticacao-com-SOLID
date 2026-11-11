import { Injectable } from '@nestjs/common';
import type { Space as SpaceRow } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { uniqueViolationFields } from '../../../database/prisma-errors';
import { dbClient } from '../../../database/transaction';
import { ConflictError } from '../../../shared/errors/application-error';
import type { Space, SpaceRepository, TaskCounts } from '../domain/space';

@Injectable()
export class PrismaSpaceRepository implements SpaceRepository {
  constructor(private readonly prisma: PrismaService) {}

  private get db() {
    return dbClient(this.prisma);
  }

  async listByUser(userId: string): Promise<Space[]> {
    const rows = await this.db.space.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    return rows.map((row) => this.toDomain(row));
  }

  async findById(userId: string, id: string): Promise<Space | null> {
    const row = await this.db.space.findFirst({ where: { id, userId } });
    return row ? this.toDomain(row) : null;
  }

  async findByKey(userId: string, key: string): Promise<Space | null> {
    const row = await this.db.space.findUnique({
      where: { userId_nameKey: { userId, nameKey: key } },
    });
    return row ? this.toDomain(row) : null;
  }

  async create(userId: string, name: string, key: string): Promise<Space> {
    try {
      return this.toDomain(await this.db.space.create({ data: { userId, name, nameKey: key } }));
    } catch (error) {
      if (uniqueViolationFields(error)) {
        throw new ConflictError('Ja existe um espaco com esse nome.', 'name');
      }
      throw error;
    }
  }

  async rename(id: string, name: string, key: string): Promise<Space> {
    try {
      return this.toDomain(
        await this.db.space.update({ where: { id }, data: { name, nameKey: key } }),
      );
    } catch (error) {
      if (uniqueViolationFields(error)) {
        throw new ConflictError('Ja existe um espaco com esse nome.', 'name');
      }
      throw error;
    }
  }

  async delete(id: string): Promise<number> {
    // Desvincula explicitamente para registrar a alteracao nas tarefas (updatedAt);
    // a FK com ON DELETE SET NULL garante o mesmo resultado em qualquer caminho.
    const { count } = await this.db.task.updateMany({
      where: { spaceId: id },
      data: { spaceId: null },
    });
    await this.db.space.delete({ where: { id } });
    return count;
  }

  async taskCounts(userId: string): Promise<Map<string | null, TaskCounts>> {
    const groups = await this.db.task.groupBy({
      by: ['spaceId', 'status'],
      where: { userId },
      _count: { _all: true },
    });
    const counts = new Map<string | null, { pending: number; done: number; total: number }>();
    for (const group of groups) {
      const entry = counts.get(group.spaceId) ?? { pending: 0, done: 0, total: 0 };
      const amount = group._count._all;
      if (group.status === 'done') {
        entry.done += amount;
      } else {
        entry.pending += amount;
      }
      entry.total += amount;
      counts.set(group.spaceId, entry);
    }
    return counts;
  }

  private toDomain(row: SpaceRow): Space {
    return { id: row.id, name: row.name, createdAt: row.createdAt, updatedAt: row.updatedAt };
  }
}
