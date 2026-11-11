import { SchedulerRegistry } from '@nestjs/schedule';
import { AuthMaintenanceJob } from '../../src/modules/auth/infrastructure/jobs/auth-maintenance.job';
import type { AuthMaintenanceService } from '../../src/modules/auth/application/auth-maintenance.service';
import { DailyReminderService } from '../../src/modules/notifications/application/daily-reminder.service';
import type { NotificationRepository } from '../../src/modules/notifications/domain/notification';
import {
  DEFAULT_SETTINGS,
  type SettingsRepository,
  type UserSettings,
} from '../../src/modules/settings/domain/settings';
import { ChatService } from '../../src/modules/chat/application/chat.service';
import type {
  ChatMessage,
  ChatRepository,
  NewChatMessage,
} from '../../src/modules/chat/domain/chat';
import type { ConversationsService } from '../../src/modules/conversations/application/conversations.service';
import type { SettingsService } from '../../src/modules/settings/application/settings.service';
import type { SpacesService } from '../../src/modules/spaces/application/spaces.service';
import type { TasksService } from '../../src/modules/tasks/application/tasks.service';
import { ValidationError } from '../../src/shared/errors/application-error';
import { configStub, FixedClock, ImmediateTransactionManager } from '../helpers/fakes';
import { ScriptedAiProvider, text } from '../helpers/scripted-ai-provider';

const appConfig = (jobsEnabled: boolean) =>
  configStub({ app: { env: 'test', port: 0, corsOrigins: [], jobsEnabled } });

describe('Job de manutencao de autenticacao', () => {
  afterEach(() => jest.useRealTimers());

  it('agenda e executa so com JOBS_ENABLED', () => {
    jest.useFakeTimers();
    const scheduler = new SchedulerRegistry();
    const run = jest.fn().mockResolvedValue(undefined);
    const build = (enabled: boolean) =>
      new AuthMaintenanceJob(
        { run } as unknown as AuthMaintenanceService,
        scheduler,
        appConfig(enabled),
      );

    build(false).onApplicationBootstrap();
    expect(scheduler.getIntervals()).toEqual([]);
    expect(run).not.toHaveBeenCalled();

    build(true).onApplicationBootstrap();
    expect(scheduler.getIntervals()).toEqual(['auth-maintenance']);
    expect(run).toHaveBeenCalledTimes(1);
    clearInterval(scheduler.getInterval('auth-maintenance') as NodeJS.Timeout);
  });

  it('nao sobrepoe execucoes e sobrevive a falhas', async () => {
    let release: () => void = () => undefined;
    const run = jest
      .fn()
      .mockImplementationOnce(() => new Promise<void>((resolve) => (release = resolve)))
      .mockRejectedValueOnce(new Error('banco indisponivel'));
    const job = new AuthMaintenanceJob(
      { run } as unknown as AuthMaintenanceService,
      new SchedulerRegistry(),
      appConfig(false),
    );

    const first = job.tick();
    await job.tick();
    expect(run).toHaveBeenCalledTimes(1);
    release();
    await first;

    await expect(job.tick()).resolves.toBeUndefined();
  });
});

describe('DailyReminderService (sob demanda, sem job)', () => {
  const build = (settings: UserSettings | null, now: string) => {
    let lastSentOn = settings?.dailyReminder.lastSentOn ?? null;
    const repository = {
      find: jest.fn(() => Promise.resolve(settings)),
      claimReminder: jest.fn((_userId: string, day: string) => {
        if (lastSentOn === day) return Promise.resolve(false);
        lastSentOn = day;
        return Promise.resolve(true);
      }),
    } as unknown as SettingsRepository;
    const created: unknown[] = [];
    const notifications = {
      create: jest.fn((notification: unknown) => {
        created.push(notification);
        return Promise.resolve(notification);
      }),
    } as unknown as NotificationRepository;
    const tasks = { countPendingDueOn: jest.fn().mockResolvedValue(2) } as unknown as TasksService;
    const service = new DailyReminderService(
      repository,
      notifications,
      new ImmediateTransactionManager(),
      new FixedClock(new Date(now)),
      tasks,
    );
    return { service, created, tasks };
  };
  const enabled = (
    time: string,
    timezone = 'America/Sao_Paulo',
    lastSentOn: string | null = null,
  ) => ({
    ...DEFAULT_SETTINGS,
    timezone,
    dailyReminder: { enabled: true, time, lastSentOn },
  });

  it('gera o lembrete quando o horario ja passou no fuso do usuario, uma vez por dia', async () => {
    // 12:00 UTC = 09:00 em Sao Paulo
    const { service, created, tasks } = build(enabled('08:30'), '2026-10-14T12:00:00Z');

    expect(await service.deliverIfDue('u')).toBe(true);
    expect(await service.deliverIfDue('u')).toBe(false);
    expect(created).toEqual([
      expect.objectContaining({
        body: 'Voce tem 2 tarefas pendentes para hoje.',
        data: { view: 'today', date: '2026-10-14', pending: 2 },
      }),
    ]);
    expect(tasks.countPendingDueOn).toHaveBeenCalledWith('u', '2026-10-14');
  });

  it('nao gera antes do horario, desligado, sem configuracao ou ja enviado hoje', async () => {
    expect(await build(enabled('09:30'), '2026-10-14T12:00:00Z').service.deliverIfDue('u')).toBe(
      false,
    );
    expect(await build(DEFAULT_SETTINGS, '2026-10-14T23:00:00Z').service.deliverIfDue('u')).toBe(
      false,
    );
    expect(await build(null, '2026-10-14T23:00:00Z').service.deliverIfDue('u')).toBe(false);
    expect(
      await build(
        enabled('08:00', 'UTC', '2026-10-14'),
        '2026-10-14T12:00:00Z',
      ).service.deliverIfDue('u'),
    ).toBe(false);
  });

  it('usa o dia do fuso do usuario e cai para UTC com fuso invalido', async () => {
    // 02:00 UTC do dia 15 ainda e dia 14 em Sao Paulo (23:00)
    const late = build(enabled('22:00'), '2026-10-15T02:00:00Z');
    await late.service.deliverIfDue('u');
    expect(late.created[0]).toMatchObject({ data: { date: '2026-10-14' } });

    const invalid = build(enabled('01:00', 'Marte/Base'), '2026-10-15T02:00:00Z');
    await invalid.service.deliverIfDue('u');
    expect(invalid.created[0]).toMatchObject({ data: { date: '2026-10-15' } });
  });
});

describe('ChatService: interrupcao da resposta', () => {
  const build = () => {
    const saved: NewChatMessage[] = [];
    const repository = {
      addMessage: jest.fn((message: NewChatMessage) => {
        saved.push(message);
        return Promise.resolve({
          id: `m${saved.length}`,
          conversationId: message.conversationId,
          role: message.role,
          kind: message.kind,
          content: message.content,
          interrupted: message.interrupted ?? false,
          createdAt: new Date(),
          proposals: [],
        } satisfies ChatMessage);
      }),
      recentThread: jest.fn().mockResolvedValue([]),
    } as unknown as ChatRepository;
    const ai = new ScriptedAiProvider();
    const service = new ChatService(
      repository,
      ai,
      new ImmediateTransactionManager(),
      {} as ConversationsService,
      { listForAssistant: jest.fn().mockResolvedValue([]) } as unknown as TasksService,
      { listNames: jest.fn().mockResolvedValue([]) } as unknown as SpacesService,
      { today: jest.fn().mockResolvedValue('2026-10-14') } as unknown as SettingsService,
    );
    return { service, ai, saved };
  };

  it('salva o trecho recebido como interrompido quando o cliente cancela', async () => {
    const { service, ai, saved } = build();
    ai.enqueue([text('Parte 1. '), text('Parte 2.')]);
    const abort = new AbortController();

    const events = [];
    for await (const event of service.ask('u', null, 'Pergunta', abort.signal)) {
      events.push(event.type);
      if (event.type === 'delta') abort.abort();
    }

    expect(events).toEqual(['user_message', 'delta']);
    expect(saved.at(-1)).toMatchObject({
      role: 'assistant',
      interrupted: true,
      content: 'Parte 1. \n\n*(resposta interrompida)*',
    });
  });

  it('nao salva nada quando o cancelamento chega antes do primeiro trecho', async () => {
    const { service, ai, saved } = build();
    ai.enqueue([text('nunca lido')]);
    const abort = new AbortController();
    abort.abort();

    const events: string[] = [];
    for await (const event of service.ask('u', null, 'Pergunta', abort.signal)) {
      events.push(event.type);
    }

    expect(events).toEqual(['user_message']);
    expect(saved.map((m) => m.role)).toEqual(['user']);
  });

  it('valida a pergunta antes de qualquer gravacao', async () => {
    const { service, saved } = build();
    await expect(service.ask('u', null, '   ').next()).rejects.toBeInstanceOf(ValidationError);
    expect(saved).toHaveLength(0);
  });
});
