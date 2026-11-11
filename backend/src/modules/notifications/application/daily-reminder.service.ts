import { Inject, Injectable } from '@nestjs/common';
import { TRANSACTION_MANAGER, type TransactionManager } from '../../../database/transaction';
import { CLOCK, type Clock } from '../../../shared/domain/clock';
import { isValidTimezone, localDate, localTime } from '../../../shared/domain/dates';
import { SETTINGS_REPOSITORY, type SettingsRepository } from '../../settings/domain/settings';
import { TasksService } from '../../tasks/application/tasks.service';
import {
  NOTIFICATION_REPOSITORY,
  NotificationType,
  reminderMessage,
  type NotificationRepository,
} from '../domain/notification';

/**
 * Lembrete diario (Conta -> Configuracoes -> Lembrete diario).
 *
 * Nao ha job: o lembrete e gerado sob demanda, quando o app consulta
 * `GET /notifications`. Se o lembrete esta ligado, o horario ja passou no fuso
 * do usuario e ainda nao foi gerado hoje, o dia e reservado de forma atomica e
 * a notificacao e criada. Consultas repetidas no mesmo dia nao duplicam o aviso;
 * mudar o horario depois do aviso nao gera outro no mesmo dia.
 */
@Injectable()
export class DailyReminderService {
  constructor(
    @Inject(SETTINGS_REPOSITORY) private readonly settings: SettingsRepository,
    @Inject(NOTIFICATION_REPOSITORY) private readonly notifications: NotificationRepository,
    @Inject(TRANSACTION_MANAGER) private readonly transactions: TransactionManager,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly tasks: TasksService,
  ) {}

  /** Gera o lembrete do dia para o usuario, se ja venceu. Devolve true se criou. */
  async deliverIfDue(userId: string): Promise<boolean> {
    const settings = await this.settings.find(userId);
    if (!settings?.dailyReminder.enabled) {
      return false;
    }
    const now = this.clock.now();
    const timezone = isValidTimezone(settings.timezone) ? settings.timezone : 'UTC';
    const day = localDate(now, timezone);
    const { time, lastSentOn } = settings.dailyReminder;
    if (localTime(now, timezone) < time || lastSentOn === day) {
      return false;
    }

    return this.transactions.run(async () => {
      // Duas consultas simultaneas (duas abas, por exemplo): so uma reserva o dia.
      if (!(await this.settings.claimReminder(userId, day))) {
        return false;
      }
      const count = await this.tasks.countPendingDueOn(userId, day);
      await this.notifications.create({
        userId,
        type: NotificationType.DailyReminder,
        title: 'Sintetiza · Hoje',
        body: reminderMessage(count),
        data: { view: 'today', date: day, pending: count },
      });
      return true;
    });
  }
}
