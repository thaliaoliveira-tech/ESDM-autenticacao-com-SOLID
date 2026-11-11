import { Injectable } from '@nestjs/common';
import type { Notification as NotificationRow } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { dbClient } from '../../../database/transaction';
import type { PageRequest } from '../../../shared/pagination';
import type { NewNotification, Notification, NotificationRepository } from '../domain/notification';

@Injectable()
export class PrismaNotificationRepository implements NotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  private get db() {
    return dbClient(this.prisma);
  }

  async create(notification: NewNotification): Promise<Notification> {
    const row = await this.db.notification.create({
      data: {
        userId: notification.userId,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        data: notification.data ? JSON.stringify(notification.data) : null,
      },
    });
    return this.toDomain(row);
  }

  async listUnread(
    userId: string,
    page: PageRequest,
  ): Promise<{ items: Notification[]; total: number }> {
    const where = { userId, readAt: null };
    const [rows, total] = await Promise.all([
      this.db.notification.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page.page - 1) * page.pageSize,
        take: page.pageSize,
      }),
      this.db.notification.count({ where }),
    ]);
    return { items: rows.map((row) => this.toDomain(row)), total };
  }

  async markRead(userId: string, id: string, at: Date): Promise<boolean> {
    // Marcar de novo uma ja lida e inofensivo: a notificacao continua fora da lista.
    await this.db.notification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: at },
    });
    return (await this.db.notification.count({ where: { id, userId } })) === 1;
  }

  async markAllRead(userId: string, at: Date): Promise<number> {
    const { count } = await this.db.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: at },
    });
    return count;
  }

  private toDomain(row: NotificationRow): Notification {
    return {
      id: row.id,
      type: row.type,
      title: row.title,
      body: row.body,
      data: row.data ? (JSON.parse(row.data) as Record<string, unknown>) : null,
      createdAt: row.createdAt,
    };
  }
}
