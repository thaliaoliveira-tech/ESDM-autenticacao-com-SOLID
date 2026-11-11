import { Injectable } from '@nestjs/common';
import type { UserSettings as SettingsRow } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { dbClient } from '../../../database/transaction';
import {
  THEMES,
  type SettingsChanges,
  type SettingsRepository,
  type Theme,
  type UserSettings,
} from '../domain/settings';

@Injectable()
export class PrismaSettingsRepository implements SettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private get db() {
    return dbClient(this.prisma);
  }

  async find(userId: string): Promise<UserSettings | null> {
    const row = await this.db.userSettings.findUnique({ where: { userId } });
    return row ? this.toDomain(row) : null;
  }

  async upsert(userId: string, changes: SettingsChanges): Promise<UserSettings> {
    const data = {
      ...(changes.theme !== undefined ? { theme: changes.theme } : {}),
      ...(changes.timezone !== undefined ? { timezone: changes.timezone } : {}),
      ...(changes.reminderEnabled !== undefined
        ? { reminderEnabled: changes.reminderEnabled }
        : {}),
      ...(changes.reminderTime !== undefined ? { reminderTime: changes.reminderTime } : {}),
    };
    const row = await this.db.userSettings.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
    return this.toDomain(row);
  }

  async claimReminder(userId: string, day: string): Promise<boolean> {
    const { count } = await this.db.userSettings.updateMany({
      where: {
        userId,
        reminderEnabled: true,
        OR: [{ reminderLastSentOn: null }, { reminderLastSentOn: { not: day } }],
      },
      data: { reminderLastSentOn: day },
    });
    return count === 1;
  }

  private toDomain(row: SettingsRow): UserSettings {
    return {
      theme: THEMES.includes(row.theme as Theme) ? (row.theme as Theme) : 'system',
      timezone: row.timezone,
      dailyReminder: {
        enabled: row.reminderEnabled,
        time: row.reminderTime,
        lastSentOn: row.reminderLastSentOn,
      },
      updatedAt: row.updatedAt,
    };
  }
}
