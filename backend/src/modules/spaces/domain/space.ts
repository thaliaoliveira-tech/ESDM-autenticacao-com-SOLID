import { collapseSpaces, normalizeSearch } from '../../../shared/domain/text';
import { ValidationError } from '../../../shared/errors/application-error';

export const SPACE_REPOSITORY = Symbol('SpaceRepository');

export const SPACE_NAME_MAX = 40;
/** Atalhos oferecidos em "Novo espaco" (somente os que ainda nao existem). */
export const DEFAULT_SPACE_NAMES = ['Trabalho', 'Faculdade', 'Pessoal'] as const;
/** Rotulo do grupo virtual de tarefas sem categoria. */
export const UNASSIGNED_LABEL = 'Sem espaço';

export interface Space {
  readonly id: string;
  readonly name: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface TaskCounts {
  readonly pending: number;
  readonly done: number;
  readonly total: number;
}

export interface SpaceWithCounts extends Space {
  readonly counts: TaskCounts;
}

export const EMPTY_COUNTS: TaskCounts = { pending: 0, done: 0, total: 0 };

/** Nome limpo: espacos colapsados, nao vazio e com no maximo 40 caracteres. */
export function cleanSpaceName(value: unknown, field = 'name'): string {
  const name = collapseSpaces(value);
  if (!name) {
    throw new ValidationError('Informe o nome do espaco.', field);
  }
  if (name.length > SPACE_NAME_MAX) {
    throw new ValidationError(
      `O nome do espaco deve ter no maximo ${SPACE_NAME_MAX} caracteres.`,
      field,
    );
  }
  return name;
}

/** "Trabalho", "trabalho " e "Trabálho" sao o mesmo espaco. */
export function spaceKey(name: string): string {
  return normalizeSearch(name);
}

export interface SpaceRepository {
  listByUser(userId: string): Promise<Space[]>;
  findById(userId: string, id: string): Promise<Space | null>;
  findByKey(userId: string, key: string): Promise<Space | null>;
  /** Lanca ConflictError se outro espaco do usuario ja usa a mesma chave. */
  create(userId: string, name: string, key: string): Promise<Space>;
  rename(id: string, name: string, key: string): Promise<Space>;
  /** Exclui o espaco; as tarefas ficam sem espaco. Devolve quantas foram desvinculadas. */
  delete(id: string): Promise<number>;
  /** Contagem de tarefas por espaco; a chave `null` agrupa as tarefas sem espaco. */
  taskCounts(userId: string): Promise<Map<string | null, TaskCounts>>;
}
