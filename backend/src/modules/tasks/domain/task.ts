import { isIsoDate } from '../../../shared/domain/dates';
import { ValidationError } from '../../../shared/errors/application-error';

export const TASK_REPOSITORY = Symbol('TaskRepository');

export const TASK_STATUSES = ['pending', 'done'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

/** Prioridade por cor, opcional: Urgente (vermelho), Pouco urgente (amarelo), Nao urgente (azul). */
export const PRIORITIES = { high: 'Urgente', medium: 'Pouco urgente', low: 'Nao urgente' } as const;
export type Priority = keyof typeof PRIORITIES;
export const PRIORITY_VALUES = Object.keys(PRIORITIES) as Priority[];
const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

export const TITLE_MAX = 160;
export const DESCRIPTION_MAX = 2000;
export const ASSIGNEE_MAX = 80;

export function isPriority(value: unknown): value is Priority {
  return typeof value === 'string' && value in PRIORITIES;
}

export interface Task {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly assignee: string;
  readonly dueOn: string | null;
  readonly priority: Priority | null;
  readonly status: TaskStatus;
  readonly completedOn: string | null;
  readonly spaceId: string | null;
  readonly conversationId: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/** Tarefa como as telas a consomem: com nome do espaco e da conversa de origem. */
export interface TaskView extends Task {
  readonly space: { readonly id: string; readonly name: string } | null;
  readonly conversation: { readonly id: string; readonly fileName: string } | null;
}

/** Campos editaveis. `undefined` = nao alterar; `null` = limpar. */
export interface TaskFields {
  title?: string;
  description?: string | null;
  assignee?: string | null;
  dueOn?: string | null;
  priority?: Priority | null;
}

export interface CleanTaskFields {
  title?: string;
  description?: string;
  assignee?: string;
  dueOn?: string | null;
  priority?: Priority | null;
}

/**
 * Regras de campo do prototipo: titulo obrigatorio (ate 160), descricao ate
 * 2000, responsavel ate 80, prazo AAAA-MM-DD e prioridade valida.
 */
export function cleanTaskFields(fields: TaskFields): CleanTaskFields {
  const clean: CleanTaskFields = {};
  if (fields.title !== undefined) {
    const title = String(fields.title ?? '').trim();
    if (!title) {
      throw new ValidationError('Informe o titulo da tarefa.', 'title');
    }
    if (title.length > TITLE_MAX) {
      throw new ValidationError(`Use um titulo de ate ${TITLE_MAX} caracteres.`, 'title');
    }
    clean.title = title;
  }
  if (fields.description !== undefined) {
    const description = String(fields.description ?? '').trim();
    if (description.length > DESCRIPTION_MAX) {
      throw new ValidationError(
        `Use uma descricao de ate ${DESCRIPTION_MAX} caracteres.`,
        'description',
      );
    }
    clean.description = description;
  }
  if (fields.assignee !== undefined) {
    const assignee = String(fields.assignee ?? '').trim();
    if (assignee.length > ASSIGNEE_MAX) {
      throw new ValidationError(
        `Use um responsavel de ate ${ASSIGNEE_MAX} caracteres.`,
        'assignee',
      );
    }
    clean.assignee = assignee;
  }
  if (fields.dueOn !== undefined) {
    if (fields.dueOn !== null && fields.dueOn !== '' && !isIsoDate(fields.dueOn)) {
      throw new ValidationError('Use uma data de prazo valida.', 'dueOn');
    }
    clean.dueOn = fields.dueOn || null;
  }
  if (fields.priority !== undefined) {
    const priority = (fields.priority as unknown) === '' ? null : fields.priority;
    if (priority !== null && !isPriority(priority)) {
      throw new ValidationError('Escolha uma prioridade valida.', 'priority');
    }
    clean.priority = priority;
  }
  return clean;
}

export const TASK_SORTS = ['created', 'due', 'priority'] as const;
export type TaskSort = (typeof TASK_SORTS)[number];

const statusOrder = (a: Task, b: Task): number =>
  a.status === b.status ? 0 : a.status === 'pending' ? -1 : 1;
const dueOrder = (a: Task, b: Task): number =>
  (a.dueOn ?? '9999-99-99').localeCompare(b.dueOn ?? '9999-99-99');
const newestFirst = (a: Task, b: Task): number =>
  b.createdAt.getTime() - a.createdAt.getTime() || b.id.localeCompare(a.id);

/**
 * Ordenacoes do prototipo. Pendentes sempre antes das concluidas.
 *  - created: mais recentes primeiro;
 *  - due: prazo mais proximo primeiro (sem prazo por ultimo);
 *  - priority: urgencia, depois prazo; concluidas pela data de conclusao.
 */
export function compareTasks(sort: TaskSort): (a: Task, b: Task) => number {
  switch (sort) {
    case 'due':
      return (a, b) => statusOrder(a, b) || dueOrder(a, b) || newestFirst(a, b);
    case 'priority':
      return (a, b) => {
        const byStatus = statusOrder(a, b);
        if (byStatus) {
          return byStatus;
        }
        if (a.status === 'done') {
          return (b.completedOn ?? '').localeCompare(a.completedOn ?? '') || newestFirst(a, b);
        }
        const rank = (task: Task) => (task.priority ? PRIORITY_RANK[task.priority] : 3);
        return rank(a) - rank(b) || dueOrder(a, b) || a.createdAt.getTime() - b.createdAt.getTime();
      };
    default:
      return (a, b) => statusOrder(a, b) || newestFirst(a, b);
  }
}

export interface CreateTaskData extends Required<Omit<CleanTaskFields, 'title'>> {
  readonly userId: string;
  readonly title: string;
  readonly spaceId: string | null;
  readonly conversationId: string | null;
}

export interface UpdateTaskData extends CleanTaskFields {
  spaceId?: string | null;
  status?: TaskStatus;
  completedOn?: string | null;
}

export interface TaskScope {
  /** `undefined` = todos; `null` = somente sem espaco. */
  readonly spaceId?: string | null;
  readonly dueFrom?: string;
  readonly dueTo?: string;
}

export interface TaskRepository {
  create(data: CreateTaskData): Promise<TaskView>;
  findById(userId: string, id: string): Promise<TaskView | null>;
  update(id: string, data: UpdateTaskData): Promise<TaskView>;
  delete(id: string): Promise<void>;
  list(userId: string, scope: TaskScope): Promise<TaskView[]>;
  countByStatus(userId: string, scope: TaskScope): Promise<{ pending: number; done: number }>;
  /** Pendentes com prazo anterior a `before` (atrasadas). */
  countOverdue(userId: string, before: string): Promise<number>;
}
