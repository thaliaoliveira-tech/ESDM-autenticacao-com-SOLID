import { Inject, Injectable } from '@nestjs/common';
import { TRANSACTION_MANAGER, type TransactionManager } from '../../../database/transaction';
import { matchesSearch } from '../../../shared/domain/text';
import { ConflictError, NotFoundError } from '../../../shared/errors/application-error';
import { paginate, type PageRequest, type Paginated } from '../../../shared/pagination';
import { AuditService } from '../../audit/application/audit.service';
import { AuditAction } from '../../audit/domain/audit';
import {
  cleanSpaceName,
  DEFAULT_SPACE_NAMES,
  EMPTY_COUNTS,
  SPACE_REPOSITORY,
  spaceKey,
  UNASSIGNED_LABEL,
  type Space,
  type SpaceRepository,
  type SpaceWithCounts,
  type TaskCounts,
} from '../domain/space';

export interface SpaceListMeta {
  /** Tarefas sem espaco ("Sem espaco" na tela). */
  readonly unassigned: TaskCounts;
  /** Como no prototipo: mostrar "Sem espaco" quando ha tarefas sem categoria e a busca combina. */
  readonly showUnassigned: boolean;
}

export const SPACE_NOT_FOUND = 'Esse espaco nao existe mais.';
const DUPLICATE = 'Ja existe um espaco com esse nome.';

/**
 * Espacos agrupam tarefas por categoria. Nomes sao unicos por usuario sem
 * diferenciar maiusculas, espacos extras e acentos.
 */
@Injectable()
export class SpacesService {
  constructor(
    @Inject(SPACE_REPOSITORY) private readonly spaces: SpaceRepository,
    @Inject(TRANSACTION_MANAGER) private readonly transactions: TransactionManager,
    private readonly audit: AuditService,
  ) {}

  async list(
    userId: string,
    query: string | undefined,
    page: PageRequest,
  ): Promise<Paginated<SpaceWithCounts, SpaceListMeta>> {
    const [spaces, counts] = await Promise.all([
      this.spaces.listByUser(userId),
      this.spaces.taskCounts(userId),
    ]);
    const visible = spaces
      .filter((space) => matchesSearch(query, space.name))
      .map((space) => this.withCounts(space, counts));
    const unassigned = counts.get(null) ?? EMPTY_COUNTS;
    const result = paginate(visible, page);
    return {
      data: result.data,
      meta: {
        ...result.meta,
        unassigned,
        showUnassigned: unassigned.total > 0 && matchesSearch(query, UNASSIGNED_LABEL),
      },
    };
  }

  async get(userId: string, id: string): Promise<SpaceWithCounts> {
    const space = await this.requireOwned(userId, id);
    return this.withCounts(space, await this.spaces.taskCounts(userId));
  }

  /** Atalhos de "Novo espaco" que o usuario ainda nao criou. */
  async suggestions(userId: string): Promise<string[]> {
    const existing = new Set((await this.spaces.listByUser(userId)).map((s) => spaceKey(s.name)));
    return DEFAULT_SPACE_NAMES.filter((name) => !existing.has(spaceKey(name)));
  }

  async create(userId: string, rawName: string): Promise<SpaceWithCounts> {
    const name = cleanSpaceName(rawName);
    const space = await this.transactions.run(async () => {
      if (await this.spaces.findByKey(userId, spaceKey(name))) {
        throw new ConflictError(DUPLICATE, 'name');
      }
      const created = await this.spaces.create(userId, name, spaceKey(name));
      await this.audit.record({
        userId,
        action: AuditAction.SpaceCreated,
        entityType: 'space',
        entityId: created.id,
        metadata: { name },
      });
      return created;
    });
    return { ...space, counts: EMPTY_COUNTS };
  }

  async rename(userId: string, id: string, rawName: string): Promise<SpaceWithCounts> {
    const name = cleanSpaceName(rawName);
    await this.transactions.run(async () => {
      const space = await this.requireOwned(userId, id);
      const existing = await this.spaces.findByKey(userId, spaceKey(name));
      if (existing && existing.id !== space.id) {
        throw new ConflictError(DUPLICATE, 'name');
      }
      await this.spaces.rename(space.id, name, spaceKey(name));
      await this.audit.record({
        userId,
        action: AuditAction.SpaceRenamed,
        entityType: 'space',
        entityId: space.id,
        metadata: { from: space.name, to: name },
      });
    });
    return this.get(userId, id);
  }

  /** Exclui o espaco; as tarefas continuam salvas, sem espaco. */
  async delete(userId: string, id: string): Promise<{ detachedTasks: number }> {
    return this.transactions.run(async () => {
      const space = await this.requireOwned(userId, id);
      const detachedTasks = await this.spaces.delete(space.id);
      await this.audit.record({
        userId,
        action: AuditAction.SpaceDeleted,
        entityType: 'space',
        entityId: space.id,
        metadata: { name: space.name, detachedTasks },
      });
      return { detachedTasks };
    });
  }

  /**
   * Encontra o espaco pelo nome ou o cria. Usado ao criar tarefa com
   * "+ Criar novo espaco" e ao confirmar propostas da IA. Participa da
   * transacao de quem chamou.
   */
  async resolveByName(userId: string, rawName: string, field = 'spaceName'): Promise<Space> {
    const name = cleanSpaceName(rawName, field);
    const existing = await this.spaces.findByKey(userId, spaceKey(name));
    if (existing) {
      return existing;
    }
    const created = await this.spaces.create(userId, name, spaceKey(name));
    await this.audit.record({
      userId,
      action: AuditAction.SpaceCreated,
      entityType: 'space',
      entityId: created.id,
      metadata: { name, implicit: true },
    });
    return created;
  }

  async requireOwned(userId: string, id: string): Promise<Space> {
    const space = await this.spaces.findById(userId, id);
    if (!space) {
      throw new NotFoundError(SPACE_NOT_FOUND);
    }
    return space;
  }

  async listNames(userId: string): Promise<string[]> {
    return (await this.spaces.listByUser(userId)).map((space) => space.name);
  }

  private withCounts(space: Space, counts: Map<string | null, TaskCounts>): SpaceWithCounts {
    return { ...space, counts: counts.get(space.id) ?? EMPTY_COUNTS };
  }
}
