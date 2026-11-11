/**
 * Datas de calendario (AAAA-MM-DD) e horario local por fuso IANA.
 *
 * Prazos e conclusoes de tarefas sao datas "de parede": o que importa e o dia
 * no fuso do usuario, nao um instante UTC. Toda a aritmetica abaixo opera em
 * datas puras, sem horario de verao envolvido.
 */
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export const DEFAULT_TIMEZONE = 'America/Sao_Paulo';

/** AAAA-MM-DD de uma data de calendario existente (rejeita 2026-02-30). */
export function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }
  const match = ISO_DATE.exec(value);
  if (!match) {
    return false;
  }
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

/** HH:MM em 24 horas. */
export function isTimeOfDay(value: unknown): value is string {
  return typeof value === 'string' && TIME.test(value);
}

export function isValidTimezone(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 64) {
    return false;
  }
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

function parts(instant: Date, timeZone: string): Record<string, string> {
  const formatted = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant);
  return Object.fromEntries(formatted.map((part) => [part.type, part.value]));
}

/** Data local (AAAA-MM-DD) do instante no fuso informado. */
export function localDate(instant: Date, timeZone: string): string {
  const p = parts(instant, timeZone);
  return `${p.year}-${p.month}-${p.day}`;
}

/** Horario local (HH:MM) do instante no fuso informado. */
export function localTime(instant: Date, timeZone: string): string {
  const p = parts(instant, timeZone);
  return `${p.hour}:${p.minute}`;
}

function toUtc(date: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function fromUtc(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const value = toUtc(date);
  value.setUTCDate(value.getUTCDate() + days);
  return fromUtc(value);
}

/** 0 = segunda-feira ... 6 = domingo. */
export function weekdayIndex(date: string): number {
  return (toUtc(date).getUTCDay() + 6) % 7;
}

export const TASK_PERIODS = ['today', 'tomorrow', 'week', 'all'] as const;
export type TaskPeriod = (typeof TASK_PERIODS)[number];

/**
 * Intervalo [inicio, fim] de um periodo de tarefas, como no prototipo:
 * "Esta semana" vai de segunda a domingo; "all" nao tem limites.
 */
export function periodBounds(period: TaskPeriod, today: string): [string, string] | null {
  switch (period) {
    case 'today':
      return [today, today];
    case 'tomorrow': {
      const tomorrow = addDays(today, 1);
      return [tomorrow, tomorrow];
    }
    case 'week': {
      const monday = addDays(today, -weekdayIndex(today));
      return [monday, addDays(monday, 6)];
    }
    default:
      return null;
  }
}

const WEEKDAYS = [
  'segunda-feira',
  'terça-feira',
  'quarta-feira',
  'quinta-feira',
  'sexta-feira',
  'sábado',
  'domingo',
];

export function weekdayName(date: string): string {
  return WEEKDAYS[weekdayIndex(date)];
}
