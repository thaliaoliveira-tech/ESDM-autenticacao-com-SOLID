import { Inject, Injectable } from '@nestjs/common';
import { TRANSACTION_MANAGER, type TransactionManager } from '../../../database/transaction';
import { isIsoDate, periodBounds, type TaskPeriod } from '../../../shared/domain/dates';
import { matchesSearch } from '../../../shared/domain/text';
import { NotFoundError, ValidationError } from '../../../shared/errors/application-error';
import { paginate, type PageRequest, type Paginated } from '../../../shared/pagination';
import { AuditService } from '../../audit/application/audit.service';
import { AuditAction } from '../../audit/domain/audit';
import { SettingsService } from '../../settings/application/settings.service';
import { SpacesService, SPACE_NOT_FOUND } from '../../spaces/application/spaces.service';
import {
  cleanTaskFields,
  compareTasks,
  TASK_REPOSITORY,
  type TaskFields,
  type TaskRepository,
  type TaskScope,
  type TaskSort,
  type TaskView,
  type UpdateTaskData,
} from '../domain/task';

export const TASK_NOT_FOUND = 'Essa tarefa nao existe mais. Ela pode ter sido excluida.';
/** Limite de tarefas enviadas como contexto para a IA (como no prototipo). */
export const ASSISTANT_TASK_LIMIT = 200;

export interface TaskInput extends TaskFields {
  /** Espaco existente; `null` remove o espaco. */
  spaceId?: string | null;
  /** "+ Criar novo espaco": encontra pelo nome ou cria junto com a tarefa. */
  spaceName?: string | null;
}

export type StatusFilter = 'pending' | 'done' | 'all';

export interface ListTasksOptions {
  readonly status: StatusFilter;
  readonly period: TaskPeriod;
  /** Id do espaco, ou 'none' para as tarefas sem espaco. */
  readonly spaceId?: string;
  readonly query?: string;
  readonly sort: TaskSort;
  readonly today?: string;
  readonly page: PageRequest;
}

export interface TaskListMeta {
  /** Contadores dos filtros de situacao, no escopo de periodo e espaco (ignoram a busca). */
  readonly counts: { pending: number; done: number; all: number };
  readonly period: TaskPeriod;
  readonly range: { from: string; to: string } | null;
  readonly today: string;
}

export interface TaskSummary {
  readonly today: string;
  readonly periods: Record<TaskPeriod, { pending: number; done: number }>;
  readonly overdue: number;
}

/**
 * Casos de uso de tarefas: lista com filtros/busca/ordenacao/paginacao,
 * criacao manual (botao +), edicao, conclusao, reabertura e exclusao.
 *
 * Os mesmos metodos atendem a confirmacao das propostas da IA: dentro de uma
 * transacao externa, eles participam dela.
 */
@Injectable()
export class TasksService {
  constructor(
    @Inject(TASK_REPOSITORY) private readonly tasks: TaskRepository,
    @Inject(TRANSACTION_MANAGER) private readonly transactions: TransactionManager,
    private readonly spaces: SpacesService,
    private readonly settings: SettingsService,
    private readonly audit: AuditService,
  ) {}

  async list(
    userId: string,
    options: ListTasksOptions,
  ): Promise<Paginated<TaskView, TaskListMeta>> {
    const today = await this.settings.today(userId, options.today);
    const bounds = periodBounds(options.period, today);
    const scope: TaskScope = {
      ...this.spaceScope(options.spaceId),
      ...(bounds ? { dueFrom: bounds[0], dueTo: bounds[1] } : {}),
    };
    if (scope.spaceId) {
      await this.spaces.requireOwned(userId, scope.spaceId);
    }

    const scoped = await this.tasks.list(userId, scope);
    const counts = {
      pending: scoped.filter((task) => task.status === 'pending').length,
      done: scoped.filter((task) => task.status === 'done').length,
      all: scoped.length,
    };
    const visible = scoped
      .filter((task) => options.status === 'all' || task.status === options.status)
      .filter((task) =>
        matchesSearch(
          options.query,
          task.title,
          task.description,
          task.assignee,
          task.space?.name,
          task.conversation?.fileName,
          task.dueOn,
        ),
      )
      .sort(compareTasks(options.sort));

    const page = paginate(visible, options.page);
    return {
      data: page.data,
      meta: {
        ...page.meta,
        counts,
        period: options.period,
        range: bounds ? { from: bounds[0], to: bounds[1] } : null,
        today,
      },
    };
  }

  /** Indicadores da tela Hoje e dos cabecalhos ("N tarefas pendentes hoje"). */
  async summary(userId: string, todayOverride?: string): Promise<TaskSummary> {
    const today = await this.settings.today(userId, todayOverride);
    const periods = {} as Record<TaskPeriod, { pending: number; done: number }>;
    for (const period of ['today', 'tomorrow', 'week', 'all'] as const) {
      const bounds = periodBounds(period, today);
      periods[period] = await this.tasks.countByStatus(
        userId,
        bounds ? { dueFrom: bounds[0], dueTo: bounds[1] } : {},
      );
    }
    return { today, periods, overdue: await this.tasks.countOverdue(userId, today) };
  }

  async get(userId: string, id: string): Promise<TaskView> {
    const task = await this.tasks.findById(userId, id);
    if (!task) {
      throw new NotFoundError(TASK_NOT_FOUND);
    }
    return task;
  }

  async create(
    userId: string,
    input: TaskInput,
    origin: { conversationId?: string | null } = {},
  ): Promise<TaskView> {
    const fields = cleanTaskFields({ ...input, title: input.title ?? '' });
    return this.transactions.run(async () => {
      const spaceId = (await this.resolveSpace(userId, input)) ?? null;
      const task = await this.tasks.create({
        userId,
        title: fields.title as string,
        description: fields.description ?? '',
        assignee: fields.assignee ?? '',
        dueOn: fields.dueOn ?? null,
        priority: fields.priority ?? null,
        spaceId,
        conversationId: origin.conversationId ?? null,
      });
      await this.record(userId, AuditAction.TaskCreated, task, {
        fromConversation: Boolean(origin.conversationId),
      });
      return task;
    });
  }

  async update(userId: string, id: string, input: TaskInput): Promise<TaskView> {
    const fields = cleanTaskFields(input);
    return this.transactions.run(async () => {
      await this.get(userId, id);
      const data: UpdateTaskData = { ...fields };
      const spaceId = await this.resolveSpace(userId, input);
      if (spaceId !== undefined) {
        data.spaceId = spaceId;
      }
      const task = await this.tasks.update(id, data);
      await this.record(userId, AuditAction.TaskUpdated, task, { fields: Object.keys(data) });
      return task;
    });
  }

  /** Conclui com a data informada ou, sem ela, com o dia de hoje do usuario. */
  async complete(userId: string, id: string, completedOn?: string | null): Promise<TaskView> {
    if (completedOn && !isIsoDate(completedOn)) {
      throw new ValidationError('Use uma data de conclusao valida.', 'completedOn');
    }
    const date = completedOn || (await this.settings.today(userId));
    return this.transactions.run(async () => {
      await this.get(userId, id);
      const task = await this.tasks.update(id, { status: 'done', completedOn: date });
      await this.record(userId, AuditAction.TaskCompleted, task, { completedOn: date });
      return task;
    });
  }

  async reopen(userId: string, id: string): Promise<TaskView> {
    return this.transactions.run(async () => {
      await this.get(userId, id);
      const task = await this.tasks.update(id, { status: 'pending', completedOn: null });
      await this.record(userId, AuditAction.TaskReopened, task);
      return task;
    });
  }

  async delete(userId: string, id: string): Promise<TaskView> {
    return this.transactions.run(async () => {
      const task = await this.get(userId, id);
      await this.tasks.delete(id);
      await this.record(userId, AuditAction.TaskDeleted, task);
      return task;
    });
  }

  /** Lista enviada a IA: pendentes primeiro, por urgencia e prazo. */
  async listForAssistant(userId: string): Promise<TaskView[]> {
    const all = await this.tasks.list(userId, {});
    return all.sort(compareTasks('priority')).slice(0, ASSISTANT_TASK_LIMIT);
  }

  async countPendingDueOn(userId: string, day: string): Promise<number> {
    return (await this.tasks.countByStatus(userId, { dueFrom: day, dueTo: day })).pending;
  }

  private spaceScope(spaceId: string | undefined): Pick<TaskScope, 'spaceId'> {
    if (spaceId === undefined || spaceId === '' || spaceId === 'all') {
      return {};
    }
    return { spaceId: spaceId === 'none' ? null : spaceId };
  }

  /** `undefined` = nao mexer no espaco; `null` = sem espaco; string = id do espaco. */
  private async resolveSpace(userId: string, input: TaskInput): Promise<string | null | undefined> {
    const hasId = input.spaceId !== undefined && input.spaceId !== null && input.spaceId !== '';
    const hasName =
      input.spaceName !== undefined && input.spaceName !== null && input.spaceName.trim() !== '';
    if (hasId && hasName) {
      throw new ValidationError('Informe spaceId ou spaceName, nao os dois.', 'spaceId');
    }
    if (hasName) {
      return (await this.spaces.resolveByName(userId, input.spaceName as string)).id;
    }
    if (hasId) {
      try {
        return (await this.spaces.requireOwned(userId, input.spaceId as string)).id;
      } catch (error) {
        if (error instanceof NotFoundError) {
          throw new ValidationError(SPACE_NOT_FOUND, 'spaceId');
        }
        throw error;
      }
    }
    if (input.spaceId === null || input.spaceId === '' || input.spaceName !== undefined) {
      return null;
    }
    return undefined;
  }

  private record(
    userId: string,
    action: (typeof AuditAction)[keyof typeof AuditAction],
    task: TaskView,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    return this.audit.record({
      userId,
      action,
      entityType: 'task',
      entityId: task.id,
      metadata: { title: task.title, ...metadata },
    });
  }
}
