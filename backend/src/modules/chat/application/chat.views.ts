import { spaceKey } from '../../spaces/domain/space';
import type {
  ChatMessage,
  ChatRole,
  MessageKind,
  ProposalPayload,
  ProposalStatus,
  ProposalType,
  TaskProposal,
} from '../domain/chat';

export interface ProposalView {
  readonly id: string;
  readonly position: number;
  readonly ref: string;
  readonly type: ProposalType;
  readonly status: ProposalStatus;
  readonly taskId: string | null;
  readonly taskTitle: string | null;
  readonly payload: ProposalPayload;
  readonly result: Record<string, unknown> | null;
  readonly resolvedAt: Date | null;
  /** Proposta de criacao com um espaco que ainda nao existe: o cartao mostra "(novo)". */
  readonly spaceIsNew: boolean;
}

export interface ChatMessageView {
  readonly id: string;
  readonly conversationId: string | null;
  readonly role: ChatRole;
  readonly kind: MessageKind;
  readonly content: string;
  readonly interrupted: boolean;
  readonly createdAt: Date;
  readonly proposals: ProposalView[];
}

export function toProposalView(
  proposal: TaskProposal,
  spaceKeys: ReadonlySet<string>,
): ProposalView {
  const space = proposal.payload.task?.space ?? proposal.payload.changes?.space ?? '';
  return {
    id: proposal.id,
    position: proposal.position,
    ref: proposal.ref,
    type: proposal.type,
    status: proposal.status,
    taskId: proposal.taskId,
    taskTitle: proposal.taskTitle,
    payload: proposal.payload,
    result: proposal.result,
    resolvedAt: proposal.resolvedAt,
    spaceIsNew: proposal.status === 'pending' && space !== '' && !spaceKeys.has(spaceKey(space)),
  };
}

export function toMessageView(
  message: ChatMessage,
  spaceNames: readonly string[],
): ChatMessageView {
  const keys = new Set(spaceNames.map(spaceKey));
  return {
    id: message.id,
    conversationId: message.conversationId,
    role: message.role,
    kind: message.kind,
    content: message.content,
    interrupted: message.interrupted,
    createdAt: message.createdAt,
    proposals: message.proposals.map((proposal) => toProposalView(proposal, keys)),
  };
}
