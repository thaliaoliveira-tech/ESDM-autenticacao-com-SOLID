import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, type Clock } from '../../../shared/domain/clock';
import { isIsoDate, localDate } from '../../../shared/domain/dates';
import { ValidationError } from '../../../shared/errors/application-error';
import { AuditService } from '../../audit/application/audit.service';
import { AuditAction } from '../../audit/domain/audit';
import {
  DEFAULT_SETTINGS,
  SETTINGS_REPOSITORY,
  type SettingsChanges,
  type SettingsRepository,
  type UserSettings,
} from '../domain/settings';

/**
 * Preferencias por perfil: aparencia, fuso horario e lembrete diario.
 *
 * Tambem e a fonte do "hoje" de cada usuario: periodos de tarefas, a tela Hoje
 * e o lembrete dependem do dia no fuso dele, nao do fuso do servidor.
 */
@Injectable()
export class SettingsService {
  constructor(
    @Inject(SETTINGS_REPOSITORY) private readonly repository: SettingsRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly audit: AuditService,
  ) {}

  async get(userId: string): Promise<UserSettings> {
    return (await this.repository.find(userId)) ?? DEFAULT_SETTINGS;
  }

  async update(userId: string, changes: SettingsChanges): Promise<UserSettings> {
    const updated = await this.repository.upsert(userId, changes);
    await this.audit.record({
      userId,
      action: AuditAction.SettingsUpdated,
      entityType: 'settings',
      entityId: userId,
      metadata: { fields: Object.keys(changes) },
    });
    return updated;
  }

  /**
   * Data de hoje (AAAA-MM-DD) para o usuario. O cliente pode informar a data do
   * dispositivo (`override`), como o prototipo fazia; caso contrario vale o
   * fuso salvo nas configuracoes.
   */
  async today(userId: string, override?: string | null): Promise<string> {
    if (override !== undefined && override !== null && override !== '') {
      if (!isIsoDate(override)) {
        throw new ValidationError('today deve ser uma data valida no formato AAAA-MM-DD.', 'today');
      }
      return override;
    }
    const { timezone } = await this.get(userId);
    return localDate(this.clock.now(), timezone);
  }
}
