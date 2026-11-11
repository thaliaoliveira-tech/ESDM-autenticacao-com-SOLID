import { DEFAULT_TIMEZONE } from '../../../shared/domain/dates';

export const SETTINGS_REPOSITORY = Symbol('SettingsRepository');

export const THEMES = ['system', 'light', 'dark'] as const;
export type Theme = (typeof THEMES)[number];

export interface DailyReminderSettings {
  readonly enabled: boolean;
  /** HH:MM no fuso do usuario. */
  readonly time: string;
  /** Ultimo dia em que o lembrete foi gerado (no maximo um por dia). */
  readonly lastSentOn: string | null;
}

export interface UserSettings {
  readonly theme: Theme;
  readonly timezone: string;
  readonly dailyReminder: DailyReminderSettings;
  readonly updatedAt: Date | null;
}

export interface SettingsChanges {
  readonly theme?: Theme;
  readonly timezone?: string;
  readonly reminderEnabled?: boolean;
  readonly reminderTime?: string;
}

export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'system',
  timezone: DEFAULT_TIMEZONE,
  dailyReminder: { enabled: false, time: '09:00', lastSentOn: null },
  updatedAt: null,
};

export interface SettingsRepository {
  find(userId: string): Promise<UserSettings | null>;
  upsert(userId: string, changes: SettingsChanges): Promise<UserSettings>;
  /**
   * Reserva o lembrete do dia: grava `day` somente se ainda nao foi gerado hoje.
   * Devolve false quando outra consulta ja reservou (sem duplicidade).
   */
  claimReminder(userId: string, day: string): Promise<boolean>;
}
