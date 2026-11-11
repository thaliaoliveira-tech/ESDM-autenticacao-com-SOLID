import { Module } from '@nestjs/common';
import { SettingsService } from './application/settings.service';
import { SETTINGS_REPOSITORY } from './domain/settings';
import { PrismaSettingsRepository } from './infrastructure/prisma-settings.repository';
import { SettingsController } from './presentation/settings.controller';

@Module({
  controllers: [SettingsController],
  providers: [
    SettingsService,
    { provide: SETTINGS_REPOSITORY, useClass: PrismaSettingsRepository },
  ],
  exports: [SettingsService, SETTINGS_REPOSITORY],
})
export class SettingsModule {}
