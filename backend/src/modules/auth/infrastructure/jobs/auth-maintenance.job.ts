import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import type { AppConfig } from '../../../../config/app.config';
import { AuthMaintenanceService } from '../../application/auth-maintenance.service';

export const AUTH_MAINTENANCE_INTERVAL_MS = 60 * 60 * 1000;

/** Agenda a limpeza de autenticacao de hora em hora (e uma vez na subida). */
@Injectable()
export class AuthMaintenanceJob implements OnApplicationBootstrap {
  private readonly logger = new Logger(AuthMaintenanceJob.name);
  private running = false;

  constructor(
    private readonly maintenance: AuthMaintenanceService,
    private readonly scheduler: SchedulerRegistry,
    private readonly config: ConfigService,
  ) {}

  onApplicationBootstrap(): void {
    if (!this.config.getOrThrow<AppConfig>('app').jobsEnabled) {
      return;
    }
    this.scheduler.addInterval(
      'auth-maintenance',
      setInterval(() => void this.tick(), AUTH_MAINTENANCE_INTERVAL_MS),
    );
    void this.tick();
  }

  async tick(): Promise<void> {
    if (this.running) {
      return;
    }
    this.running = true;
    try {
      await this.maintenance.run();
    } catch (error) {
      this.logger.error(`Falha na manutencao: ${(error as Error).message}`);
    } finally {
      this.running = false;
    }
  }
}
