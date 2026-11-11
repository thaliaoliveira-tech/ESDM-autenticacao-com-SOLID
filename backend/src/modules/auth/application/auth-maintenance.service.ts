import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AuthConfig } from '../../../config/auth.config';
import { CLOCK, type Clock } from '../../../shared/domain/clock';
import { USER_REPOSITORY, type UserRepository } from '../../users/domain/contracts/user.repository';
import { PasswordResetService } from './password-reset.service';
import { SessionService } from './session.service';

export interface MaintenanceReport {
  readonly sessions: number;
  readonly passwordResets: number;
  readonly guests: number;
}

/**
 * Limpeza periodica executada pelo agendador: sessoes encerradas, links de
 * redefinicao vencidos e convidados inativos (com todos os seus dados).
 */
@Injectable()
export class AuthMaintenanceService {
  private readonly logger = new Logger(AuthMaintenanceService.name);
  private readonly guestRetentionMs: number;

  constructor(
    private readonly sessions: SessionService,
    private readonly passwordResets: PasswordResetService,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    config: ConfigService,
  ) {
    this.guestRetentionMs =
      config.getOrThrow<AuthConfig>('auth').guestRetentionDays * 24 * 60 * 60 * 1000;
  }

  async run(): Promise<MaintenanceReport> {
    const now = this.clock.now();
    const report: MaintenanceReport = {
      sessions: await this.sessions.purgeStale(),
      passwordResets: await this.passwordResets.purgeStale(),
      guests: await this.users.deleteInactiveGuests(
        new Date(now.getTime() - this.guestRetentionMs),
        now,
      ),
    };
    if (report.sessions + report.passwordResets + report.guests > 0) {
      this.logger.log(
        `Manutencao: ${report.sessions} sessoes, ${report.passwordResets} links e ${report.guests} convidados removidos.`,
      );
    }
    return report;
  }
}
