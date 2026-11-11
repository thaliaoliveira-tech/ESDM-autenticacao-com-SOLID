import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, ValidateNested } from 'class-validator';
import { IsTimeOfDay, IsTimezone } from '../../../shared/http/validation';
import type { AuthenticatedUser } from '../../auth/domain/entities/auth-session';
import { JwtAuthGuard } from '../../auth/infrastructure/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/presentation/current-user.decorator';
import { SettingsService } from '../application/settings.service';
import { THEMES, type Theme, type UserSettings } from '../domain/settings';

export class DailyReminderDto {
  @IsOptional()
  @IsBoolean({ message: 'dailyReminder.enabled deve ser booleano.' })
  enabled?: boolean;

  @IsOptional()
  @IsTimeOfDay({ message: 'Escolha um horario valido para o lembrete (HH:MM).' })
  time?: string;
}

export class UpdateSettingsDto {
  @IsOptional()
  @IsIn(THEMES, { message: 'theme deve ser system, light ou dark.' })
  theme?: Theme;

  @IsOptional()
  @IsTimezone()
  timezone?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => DailyReminderDto)
  dailyReminder?: DailyReminderDto;
}

/** Conta -> Configuracoes: aparencia, fuso e lembrete diario. */
@ApiExcludeController()
@UseGuards(JwtAuthGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  get(@CurrentUser() user: AuthenticatedUser): Promise<UserSettings> {
    return this.settings.get(user.userId);
  }

  @Patch()
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateSettingsDto,
  ): Promise<UserSettings> {
    return this.settings.update(user.userId, {
      theme: dto.theme,
      timezone: dto.timezone,
      reminderEnabled: dto.dailyReminder?.enabled,
      reminderTime: dto.dailyReminder?.time,
    });
  }
}
