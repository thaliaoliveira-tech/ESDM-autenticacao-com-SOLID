import type { Priority } from '../../tasks/domain/task';

export const CHAT_REPOSITORY = Symbol('ChatRepository');

export type ChatRole = 'user' | 'assistant';
export type MessageKind = 'chat' | 'analysis';

export const PROPOSAL_TYPES = ['create', 'update', 'complete', 'reopen', 'delete'] as const;
export type ProposalType = (typeof PROPOSAL_TYPES)[number];
export type ProposalStatus = 'pending' | 'confirmed' | 'discarded' | 'superseded';

/** Dados de uma tarefa nova proposta pela IA. `space` e um nome (pode ainda nao existir). */
export interface ProposedTask {
  readonly title: string;
  readonly description: string;
  readonly assignee: string;
  readonly dueOn: string | null;
  readonly priority: Priority | null;
  readonly space: string;
}

export interface ProposedChanges {
  readonly title?: string;
  readonly description?: string;
  readonly assignee?: string;
  readonly dueOn?: string | null;
  readonly priority?: Priority | null;
  readonly space?: string;
}

export interface ProposalPayload {
  readonly task?: ProposedTask;
  readonly changes?: ProposedChanges;
  readonly completedOn?: string;
}

/** Proposta validada, pronta para ser salva junto com a resposta. */
export interface ParsedProposal {
  readonly type: ProposalType;
  readonly ref: string;
  readonly taskId: string | null;
  readonly payload: ProposalPayload;
}

export interface TaskProposal {
  readonly id: string;
  readonly messageId: string;
  readonly position: number;
  readonly ref: string;
  readonly type: ProposalType;
  readonly status: ProposalStatus;
  readonly taskId: string | null;
  /** Titulo da tarefa no momento da proposta (historico legivel apos exclusoes). */
  readonly taskTitle: string | null;
  readonly payload: ProposalPayload;
  readonly result: Record<string, unknown> | null;
  readonly resolvedAt: Date | null;
  readonly createdAt: Date;
}

export interface ChatMessage {
  readonly id: string;
  readonly conversationId: string | null;
  readonly role: ChatRole;
  readonly kind: MessageKind;
  readonly content: string;
  readonly interrupted: boolean;
  readonly createdAt: Date;
  readonly proposals: TaskProposal[];
}

export interface NewChatMessage {
  readonly userId: string;
  readonly conversationId: string | null;
  readonly role: ChatRole;
  readonly kind: MessageKind;
  readonly content: string;
  readonly interrupted?: boolean;
  readonly proposals?: ReadonlyArray<ParsedProposal & { taskTitle: string | null }>;
}

export interface ChatRepository {
  /** Historico completo do fio, mais antigas primeiro. */
  listThread(userId: string, conversationId: string | null): Promise<ChatMessage[]>;
  /** Ultimas `limit` mensagens do fio, mais antigas primeiro. */
  recentThread(
    userId: string,
    conversationId: string | null,
    limit: number,
  ): Promise<ChatMessage[]>;
  hasUserMessage(userId: string, conversationId: string | null): Promise<boolean>;
  addMessage(message: NewChatMessage): Promise<ChatMessage>;
  /** Propostas pendentes do mesmo fio com os mesmos refs passam a "substituida". */
  supersedePending(userId: string, conversationId: string | null, refs: string[]): Promise<number>;
  findMessage(userId: string, messageId: string): Promise<ChatMessage | null>;
  findProposal(
    userId: string,
    proposalId: string,
  ): Promise<{ proposal: TaskProposal; conversationId: string | null } | null>;
  /** Resolve somente se ainda estiver pendente; false em corrida. */
  resolveProposal(
    proposalId: string,
    resolution: {
      status: Exclude<ProposalStatus, 'pending'>;
      result?: Record<string, unknown>;
      taskId?: string;
      at: Date;
    },
  ): Promise<boolean>;
}
