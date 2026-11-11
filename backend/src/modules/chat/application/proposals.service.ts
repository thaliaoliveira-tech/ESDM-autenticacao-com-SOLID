import { Inject, Injectable } from '@nestjs/common';
import { TRANSACTION_MANAGER, type TransactionManager } from '../../../database/transaction';
import { CLOCK, type Clock } from '../../../shared/domain/clock';
import {
  ApplicationError,
  ConflictError,
  NotFoundError,
} from '../../../shared/errors/application-error';
import { AuditService } from '../../audit/application/audit.service';
import { AuditAction } from '../../audit/domain/audit';
import { SpacesService } from '../../spaces/application/spaces.service';
import {
  TASK_NOT_FOUND,
  TasksService,
  type TaskInput,
} from '../../tasks/application/tasks.service';
import type { Priority, TaskView } from '../../tasks/domain/task';
import { CHAT_REPOSITORY, type ChatRepository, type TaskProposal } from '../domain/chat';
import {
  toMessageView,
  toProposalView,
  type ChatMessageView,
  type ProposalView,
} from './chat.views';
import { spaceKey } from '../../spaces/domain/space';

export const PROPOSAL_NOT_AVAILABLE = 'Essa proposta nao esta disponivel.';
export const PROPOSAL_RESOLVED = 'Essa proposta ja foi resolvida.';

/** Ajustes feitos pela pessoa em "Editar" antes de confirmar. */
export interface ProposalEdits {
  title?: string;
  description?: string | null;
  assignee?: string | null;
  dueOn?: string | null;
  priority?: Priority | null;
  spaceId?: string | null;
  spaceName?: string | null;
  completedOn?: string | null;
}

export interface ConfirmResult {
  readonly proposal: ProposalView;
  /** Tarefa resultante (nula quando a proposta excluiu a tarefa). */
  readonly task: TaskView | null;
}

export interface ConfirmAllResult {
  readonly confirmed: number;
  readonly failures: ReadonlyArray<{ proposalId: string; message: string }>;
  readonly message: ChatMessageView;
}

/**
 * Confirmacao das propostas da IA ("Confirmar", "Editar", "Descartar",
 * "Confirmar todas"). Nada muda nas tarefas antes da confirmacao; cada
 * confirmacao e atomica: a tarefa e alterada e a proposta resolvida juntas.
 */
@Injectable()
export class ProposalsService {
  constructor(
    @Inject(CHAT_REPOSITORY) private readonly chat: ChatRepository,
    @Inject(TRANSACTION_MANAGER) private readonly transactions: TransactionManager,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly tasks: TasksService,
    private readonly spaces: SpacesService,
    private readonly audit: AuditService,
  ) {}

  async confirm(userId: string, proposalId: string, edits?: ProposalEdits): Promise<ConfirmResult> {
    const { proposal, task } = await this.transactions.run(async () => {
      const found = await this.chat.findProposal(userId, proposalId);
      if (!found) {
        throw new NotFoundError(PROPOSAL_NOT_AVAILABLE);
      }
      const { proposal: current, conversationId } = found;
      if (current.status !== 'pending') {
        throw new ConflictError(PROPOSAL_RESOLVED);
      }

      const applied = await this.apply(userId, current, conversationId, edits);
      const resolved = await this.chat.resolveProposal(current.id, {
        status: 'confirmed',
        result: applied.result,
        ...(current.type === 'create' && applied.task ? { taskId: applied.task.id } : {}),
        at: this.clock.now(),
      });
      if (!resolved) {
        throw new ConflictError(PROPOSAL_RESOLVED);
      }
      await this.audit.record({
        userId,
        action: AuditAction.ProposalConfirmed,
        entityType: 'task_proposal',
        entityId: current.id,
        metadata: { type: current.type, ref: current.ref, edited: Boolean(edits) },
      });
      return {
        proposal: (await this.chat.findProposal(userId, proposalId))!.proposal,
        task: applied.task,
      };
    });
    return { proposal: await this.view(userId, proposal), task };
  }

  async discard(userId: string, proposalId: string): Promise<ProposalView> {
    const proposal = await this.transactions.run(async () => {
      const found = await this.chat.findProposal(userId, proposalId);
      if (!found) {
        throw new NotFoundError(PROPOSAL_NOT_AVAILABLE);
      }
      if (found.proposal.status !== 'pending') {
        throw new ConflictError(PROPOSAL_RESOLVED);
      }
      await this.chat.resolveProposal(proposalId, { status: 'discarded', at: this.clock.now() });
      await this.audit.record({
        userId,
        action: AuditAction.ProposalDiscarded,
        entityType: 'task_proposal',
        entityId: proposalId,
        metadata: { type: found.proposal.type, ref: found.proposal.ref },
      });
      return (await this.chat.findProposal(userId, proposalId))!.proposal;
    });
    return this.view(userId, proposal);
  }

  /**
   * "Confirmar todas": confirma cada proposta pendente cuja tarefa ainda
   * existe. Cada uma e independente; falhas sao relatadas sem desfazer as outras.
   */
  async confirmAll(userId: string, messageId: string): Promise<ConfirmAllResult> {
    const message = await this.chat.findMessage(userId, messageId);
    if (!message) {
      throw new NotFoundError('Mensagem nao encontrada.');
    }
    let confirmed = 0;
    const failures: Array<{ proposalId: string; message: string }> = [];
    for (const proposal of message.proposals) {
      if (proposal.status !== 'pending' || (proposal.type !== 'create' && !proposal.taskId)) {
        continue;
      }
      try {
        await this.confirm(userId, proposal.id);
        confirmed += 1;
      } catch (error) {
        if (!(error instanceof ApplicationError)) {
          throw error;
        }
        failures.push({ proposalId: proposal.id, message: error.message });
      }
    }
    const updated = (await this.chat.findMessage(userId, messageId))!;
    return {
      confirmed,
      failures,
      message: toMessageView(updated, await this.spaces.listNames(userId)),
    };
  }

  private async apply(
    userId: string,
    proposal: TaskProposal,
    conversationId: string | null,
    edits: ProposalEdits | undefined,
  ): Promise<{ task: TaskView | null; result: Record<string, unknown> }> {
    if (proposal.type === 'create') {
      const proposed = proposal.payload.task;
      const input: TaskInput = {
        title: edits?.title ?? proposed?.title ?? '',
        description: edits?.description !== undefined ? edits.description : proposed?.description,
        assignee: edits?.assignee !== undefined ? edits.assignee : proposed?.assignee,
        dueOn: edits?.dueOn !== undefined ? edits.dueOn : (proposed?.dueOn ?? null),
        priority: edits?.priority !== undefined ? edits.priority : (proposed?.priority ?? null),
        ...this.spaceInput(edits, proposed?.space ?? ''),
      };
      const task = await this.tasks.create(userId, input, { conversationId });
      return { task, result: this.snapshot(task) };
    }

    if (!proposal.taskId) {
      throw new NotFoundError(TASK_NOT_FOUND);
    }
    switch (proposal.type) {
      case 'update': {
        const { space, ...changes } = proposal.payload.changes ?? {};
        const input: TaskInput = { ...changes, ...this.withoutSpace(edits) };
        Object.assign(input, this.spaceInput(edits, space));
        const task = await this.tasks.update(userId, proposal.taskId, input);
        return { task, result: this.snapshot(task) };
      }
      case 'complete': {
        const completedOn = edits?.completedOn || proposal.payload.completedOn || null;
        const task = await this.tasks.complete(userId, proposal.taskId, completedOn);
        return { task, result: { completedOn: task.completedOn } };
      }
      case 'reopen': {
        const task = await this.tasks.reopen(userId, proposal.taskId);
        return { task, result: { status: task.status } };
      }
      default: {
        const task = await this.tasks.delete(userId, proposal.taskId);
        return { task: null, result: { deletedTitle: task.title } };
      }
    }
  }

  /** Espaco escolhido na edicao (id ou nome novo) ou, sem edicao, o sugerido pela IA. */
  private spaceInput(
    edits: ProposalEdits | undefined,
    proposedSpace: string | undefined,
  ): Pick<TaskInput, 'spaceId' | 'spaceName'> {
    if (edits && (edits.spaceId !== undefined || edits.spaceName !== undefined)) {
      return edits.spaceId ? { spaceId: edits.spaceId } : { spaceName: edits.spaceName ?? null };
    }
    return proposedSpace === undefined ? {} : { spaceName: proposedSpace };
  }

  private withoutSpace(edits: ProposalEdits | undefined): TaskInput {
    if (!edits) {
      return {};
    }
    const fields: TaskInput = { ...edits };
    delete fields.spaceId;
    delete fields.spaceName;
    delete (fields as ProposalEdits).completedOn;
    return fields;
  }

  private snapshot(task: TaskView): Record<string, unknown> {
    return {
      taskId: task.id,
      title: task.title,
      description: task.description,
      assignee: task.assignee,
      dueOn: task.dueOn,
      priority: task.priority,
      space: task.space?.name ?? '',
    };
  }

  private async view(userId: string, proposal: TaskProposal): Promise<ProposalView> {
    const keys = new Set((await this.spaces.listNames(userId)).map(spaceKey));
    return toProposalView(proposal, keys);
  }
}
