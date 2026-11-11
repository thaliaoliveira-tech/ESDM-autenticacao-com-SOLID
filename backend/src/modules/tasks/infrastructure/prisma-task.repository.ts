import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { dbClient } from '../../../database/transaction';
import {
  isPriority,
  type CreateTaskData,
  type TaskRepository,
  type TaskScope,
  type TaskView,
  type UpdateTaskData,
} from '../domain/task';

const include = {
  space: { select: { id: true, name: true } },
  conversation: { select: { id: true, fileName: true } },
} satisfies Prisma.TaskInclude;

type TaskRow = Prisma.TaskGetPayload<{ include: typeof include }>;

@Injectable()
export class PrismaTaskRepository implements TaskRepository {
  constructor(private readonly prisma: PrismaService) {}

  private get db() {
    return dbClient(this.prisma);
  }

  async create(data: CreateTaskData): Promise<TaskView> {
    return this.toDomain(await this.db.task.create({ data, include }));
  }

  async findById(userId: string, id: string): Promise<TaskView | null> {
    const row = await this.db.task.findFirst({ where: { id, userId }, include });
    return row ? this.toDomain(row) : null;
  }

  async update(id: string, data: UpdateTaskData): Promise<TaskView> {
    return this.toDomain(await this.db.task.update({ where: { id }, data, include }));
  }

  async delete(id: string): Promise<void> {
    await this.db.task.delete({ where: { id } });
  }

  async list(userId: string, scope: TaskScope): Promise<TaskView[]> {
    const rows = await this.db.task.findMany({
      where: this.where(userId, scope),
      include,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    return rows.map((row) => this.toDomain(row));
  }

  async countByStatus(
    userId: string,
    scope: TaskScope,
  ): Promise<{ pending: number; done: number }> {
    const groups = await this.db.task.groupBy({
      by: ['status'],
      where: this.where(userId, scope),
      _count: { _all: true },
    });
    const count = (status: string) => groups.find((g) => g.status === status)?._count._all ?? 0;
    return { pending: count('pending'), done: count('done') };
  }

  async countOverdue(userId: string, before: string): Promise<number> {
    return this.db.task.count({
      where: { userId, status: 'pending', dueOn: { not: null, lt: before } },
    });
  }

  private where(userId: string, scope: TaskScope): Prisma.TaskWhereInput {
    const where: Prisma.TaskWhereInput = { userId };
    if (scope.spaceId !== undefined) {
      where.spaceId = scope.spaceId;
    }
    if (scope.dueFrom !== undefined || scope.dueTo !== undefined) {
      where.dueOn = {
        not: null,
        ...(scope.dueFrom !== undefined ? { gte: scope.dueFrom } : {}),
        ...(scope.dueTo !== undefined ? { lte: scope.dueTo } : {}),
      };
    }
    return where;
  }

  private toDomain(row: TaskRow): TaskView {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      assignee: row.assignee,
      dueOn: row.dueOn,
      priority: isPriority(row.priority) ? row.priority : null,
      status: row.status === 'done' ? 'done' : 'pending',
      completedOn: row.completedOn,
      spaceId: row.spaceId,
      conversationId: row.conversationId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      space: row.space,
      conversation: row.conversation,
    };
  }
}
