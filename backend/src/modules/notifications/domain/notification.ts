import type { PageRequest } from '../../../shared/pagination';

export const NOTIFICATION_REPOSITORY = Symbol('NotificationRepository');

export const NotificationType = {
  DailyReminder: 'daily_reminder',
} as const;

export interface Notification {
  readonly id: string;
  readonly type: string;
  readonly title: string;
  readonly body: string;
  readonly data: Record<string, unknown> | null;
  readonly createdAt: Date;
}

export interface NewNotification {
  readonly userId: string;
  readonly type: string;
  readonly title: string;
  readonly body: string;
  readonly data?: Record<string, unknown>;
}

export interface NotificationRepository {
  create(notification: NewNotification): Promise<Notification>;
  /** Somente as nao lidas: ler uma notificacao a tira da lista. */
  listUnread(userId: string, page: PageRequest): Promise<{ items: Notification[]; total: number }>;
  /** Marca como lida; false quando a notificacao nao existe para o usuario. */
  markRead(userId: string, id: string, at: Date): Promise<boolean>;
  markAllRead(userId: string, at: Date): Promise<number>;
}

/** Mesmo texto do prototipo: conta so as pendentes com prazo hoje, inclusive zero. */
export function reminderMessage(count: number): string {
  return `Voce tem ${count} ${count === 1 ? 'tarefa pendente' : 'tarefas pendentes'} para hoje.`;
}
