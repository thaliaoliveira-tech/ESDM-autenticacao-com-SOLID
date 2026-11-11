import { Injectable } from '@nestjs/common';
import type { Prisma, TaskProposal as ProposalRow } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { dbClient } from '../../../database/transaction';
import {
  PROPOSAL_TYPES,
  type ChatMessage,
  type ChatRepository,
  type NewChatMessage,
  type ProposalPayload,
  type ProposalStatus,
  type ProposalType,
  type TaskProposal,
} from '../domain/chat';

const include = {
  proposals: { orderBy: { position: 'asc' } },
} satisfies Prisma.ChatMessageInclude;

type MessageRow = Prisma.ChatMessageGetPayload<{ include: typeof include }>;

const STATUSES: ProposalStatus[] = ['pending', 'confirmed', 'discarded', 'superseded'];

@Injectable()
export class PrismaChatRepository implements ChatRepository {
  constructor(private readonly prisma: PrismaService) {}

  private get db() {
    return dbClient(this.prisma);
  }

  async listThread(userId: string, conversationId: string | null): Promise<ChatMessage[]> {
    const rows = await this.db.chatMessage.findMany({
      where: { userId, conversationId },
      include,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    return rows.map((row) => this.toMessage(row));
  }

  async recentThread(
    userId: string,
    conversationId: string | null,
    limit: number,
  ): Promise<ChatMessage[]> {
    const rows = await this.db.chatMessage.findMany({
      where: { userId, conversationId },
      include,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit,
    });
    return rows.reverse().map((row) => this.toMessage(row));
  }

  async hasUserMessage(userId: string, conversationId: string | null): Promise<boolean> {
    const count = await this.db.chatMessage.count({
      where: { userId, conversationId, role: 'user' },
    });
    return count > 0;
  }

  async addMessage(message: NewChatMessage): Promise<ChatMessage> {
    const row = await this.db.chatMessage.create({
      data: {
        userId: message.userId,
        conversationId: message.conversationId,
        role: message.role,
        kind: message.kind,
        content: message.content,
        interrupted: message.interrupted ?? false,
        proposals: {
          create: (message.proposals ?? []).map((proposal, position) => ({
            position,
            ref: proposal.ref,
            type: proposal.type,
            taskId: proposal.taskId,
            taskTitle: proposal.taskTitle,
            payload: JSON.stringify(proposal.payload),
          })),
        },
      },
      include,
    });
    return this.toMessage(row);
  }

  async supersedePending(
    userId: string,
    conversationId: string | null,
    refs: string[],
  ): Promise<number> {
    const { count } = await this.db.taskProposal.updateMany({
      where: { status: 'pending', ref: { in: refs }, message: { userId, conversationId } },
      data: { status: 'superseded' },
    });
    return count;
  }

  async findMessage(userId: string, messageId: string): Promise<ChatMessage | null> {
    const row = await this.db.chatMessage.findFirst({ where: { id: messageId, userId }, include });
    return row ? this.toMessage(row) : null;
  }

  async findProposal(
    userId: string,
    proposalId: string,
  ): Promise<{ proposal: TaskProposal; conversationId: string | null } | null> {
    const row = await this.db.taskProposal.findFirst({
      where: { id: proposalId, message: { userId } },
      include: { message: { select: { conversationId: true } } },
    });
    return row
      ? { proposal: this.toProposal(row), conversationId: row.message.conversationId }
      : null;
  }

  async resolveProposal(
    proposalId: string,
    resolution: {
      status: Exclude<ProposalStatus, 'pending'>;
      result?: Record<string, unknown>;
      taskId?: string;
      at: Date;
    },
  ): Promise<boolean> {
    const { count } = await this.db.taskProposal.updateMany({
      where: { id: proposalId, status: 'pending' },
      data: {
        status: resolution.status,
        resolvedAt: resolution.at,
        ...(resolution.result ? { result: JSON.stringify(resolution.result) } : {}),
        ...(resolution.taskId ? { taskId: resolution.taskId } : {}),
      },
    });
    return count === 1;
  }

  private toMessage(row: MessageRow): ChatMessage {
    return {
      id: row.id,
      conversationId: row.conversationId,
      role: row.role === 'assistant' ? 'assistant' : 'user',
      kind: row.kind === 'analysis' ? 'analysis' : 'chat',
      content: row.content,
      interrupted: row.interrupted,
      createdAt: row.createdAt,
      proposals: row.proposals.map((proposal) => this.toProposal(proposal)),
    };
  }

  private toProposal(row: ProposalRow): TaskProposal {
    return {
      id: row.id,
      messageId: row.messageId,
      position: row.position,
      ref: row.ref,
      type: PROPOSAL_TYPES.includes(row.type as ProposalType)
        ? (row.type as ProposalType)
        : 'create',
      status: STATUSES.includes(row.status as ProposalStatus)
        ? (row.status as ProposalStatus)
        : 'pending',
      taskId: row.taskId,
      taskTitle: row.taskTitle,
      payload: JSON.parse(row.payload) as ProposalPayload,
      result: row.result ? (JSON.parse(row.result) as Record<string, unknown>) : null,
      resolvedAt: row.resolvedAt,
      createdAt: row.createdAt,
    };
  }
}
