import type { PageRequest } from '../../../shared/pagination';

export const AUDIT_REPOSITORY = Symbol('AuditRepository');

/** Acoes registradas na trilha de auditoria. */
export const AuditAction = {
  Register: 'auth.register',
  Login: 'auth.login',
  Logout: 'auth.logout',
  PasswordResetRequested: 'auth.password_reset.requested',
  PasswordResetCompleted: 'auth.password_reset.completed',
  AccountUpdated: 'account.updated',
  AccountDeleted: 'account.deleted',
  SettingsUpdated: 'settings.updated',
  SpaceCreated: 'space.created',
  SpaceRenamed: 'space.renamed',
  SpaceDeleted: 'space.deleted',
  TaskCreated: 'task.created',
  TaskUpdated: 'task.updated',
  TaskCompleted: 'task.completed',
  TaskReopened: 'task.reopened',
  TaskDeleted: 'task.deleted',
  ConversationImported: 'conversation.imported',
  ConversationRenamed: 'conversation.renamed',
  ConversationDeleted: 'conversation.deleted',
  ProposalConfirmed: 'proposal.confirmed',
  ProposalDiscarded: 'proposal.discarded',
} as const;

export type AuditActionName = (typeof AuditAction)[keyof typeof AuditAction];

export interface AuditEntry {
  readonly userId: string | null;
  readonly action: AuditActionName;
  readonly entityType: string;
  readonly entityId?: string | null;
  /** Somente dados nao sensiveis (nunca senhas, tokens ou conteudo de conversas). */
  readonly metadata?: Record<string, unknown>;
}

export interface AuditRecord {
  readonly id: string;
  readonly action: string;
  readonly entityType: string;
  readonly entityId: string | null;
  readonly metadata: Record<string, unknown> | null;
  readonly requestId: string | null;
  readonly createdAt: Date;
}

export interface AuditRepository {
  create(entry: AuditEntry & { requestId: string | null; ipAddress: string | null }): Promise<void>;
  listForUser(userId: string, page: PageRequest): Promise<{ items: AuditRecord[]; total: number }>;
}
