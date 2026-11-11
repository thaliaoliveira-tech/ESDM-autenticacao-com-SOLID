import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, type Clock } from '../../../shared/domain/clock';
import { NotFoundError } from '../../../shared/errors/application-error';
import { pageMeta, type PageRequest, type Paginated } from '../../../shared/pagination';
import {
  NOTIFICATION_REPOSITORY,
  type Notification,
  type NotificationRepository,
} from '../domain/notification';
import { DailyReminderService } from './daily-reminder.service';

/**
 * Avisos do app, consultados periodicamente pelo frontend (polling).
 *
 * Cada consulta primeiro processa o que ja venceu para o usuario (o lembrete
 * diario) e depois devolve as notificacoes NAO lidas. Marcar como lida tira a
 * notificacao da lista.
 */
@Injectable()
export class NotificationsService {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY) private readonly notifications: NotificationRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly reminders: DailyReminderService,
  ) {}

  async list(userId: string, page: PageRequest): Promise<Paginated<Notification>> {
    await this.reminders.deliverIfDue(userId);
    const { items, total } = await this.notifications.listUnread(userId, page);
    return { data: items, meta: pageMeta(page, total) };
  }

  async markRead(userId: string, id: string): Promise<void> {
    if (!(await this.notifications.markRead(userId, id, this.clock.now()))) {
      throw new NotFoundError('Notificacao nao encontrada.');
    }
  }

  async markAllRead(userId: string): Promise<void> {
    await this.notifications.markAllRead(userId, this.clock.now());
  }
}
