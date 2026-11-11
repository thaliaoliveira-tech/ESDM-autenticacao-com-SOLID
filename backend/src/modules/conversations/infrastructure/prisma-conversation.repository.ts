import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { uniqueViolationFields } from '../../../database/prisma-errors';
import { dbClient } from '../../../database/transaction';
import { ConflictError } from '../../../shared/errors/application-error';
import type {
  ConversationDetails,
  ConversationRepository,
  ConversationSummary,
  CreateConversationData,
} from '../domain/conversation';

const summarySelect = {
  id: true,
  fileName: true,
  sizeBytes: true,
  messageCount: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ConversationSelect;

const detailsInclude = {
  participants: { orderBy: [{ messageCount: 'desc' }, { name: 'asc' }] },
} satisfies Prisma.ConversationInclude;

type DetailsRow = Prisma.ConversationGetPayload<{ include: typeof detailsInclude }>;

/** Conversas por lote na busca por conteudo: limita a memoria com arquivos grandes. */
const CONTENT_BATCH = 20;

@Injectable()
export class PrismaConversationRepository implements ConversationRepository {
  constructor(private readonly prisma: PrismaService) {}

  private get db() {
    return dbClient(this.prisma);
  }

  async findByFingerprint(
    userId: string,
    fingerprint: string,
  ): Promise<ConversationSummary | null> {
    return this.db.conversation.findUnique({
      where: { userId_fingerprint: { userId, fingerprint } },
      select: summarySelect,
    });
  }

  async create(data: CreateConversationData): Promise<ConversationDetails> {
    const { participants, ...conversation } = data;
    try {
      const row = await this.db.conversation.create({
        data: {
          ...conversation,
          participantCount: participants.length,
          participants: { create: participants.map((p) => ({ ...p })) },
        },
        include: detailsInclude,
      });
      return this.toDetails(row);
    } catch (error) {
      if (uniqueViolationFields(error)) {
        throw new ConflictError('Essa conversa ja foi importada.', 'file');
      }
      throw error;
    }
  }

  async findDetails(userId: string, id: string): Promise<ConversationDetails | null> {
    const row = await this.db.conversation.findFirst({
      where: { id, userId },
      include: detailsInclude,
      omit: { content: true },
    });
    return row ? this.toDetails(row as DetailsRow) : null;
  }

  async findContent(
    userId: string,
    id: string,
  ): Promise<{ fileName: string; content: string } | null> {
    return this.db.conversation.findFirst({
      where: { id, userId },
      select: { fileName: true, content: true },
    });
  }

  async listSummaries(userId: string): Promise<ConversationSummary[]> {
    return this.db.conversation.findMany({
      where: { userId },
      select: summarySelect,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  }

  async forEachContent(
    userId: string,
    visit: (item: { id: string; fileName: string; content: string }) => void,
  ): Promise<void> {
    let cursor: string | undefined;
    for (;;) {
      const batch = await this.db.conversation.findMany({
        where: { userId },
        select: { id: true, fileName: true, content: true },
        orderBy: { id: 'asc' },
        take: CONTENT_BATCH,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      });
      batch.forEach(visit);
      if (batch.length < CONTENT_BATCH) {
        return;
      }
      cursor = batch[batch.length - 1].id;
    }
  }

  async rename(id: string, fileName: string): Promise<void> {
    await this.db.conversation.update({ where: { id }, data: { fileName } });
  }

  async delete(id: string): Promise<void> {
    await this.db.conversation.delete({ where: { id } });
  }

  private toDetails(row: DetailsRow): ConversationDetails {
    const total = row.messageCount || 1;
    return {
      id: row.id,
      fileName: row.fileName,
      sizeBytes: row.sizeBytes,
      messageCount: row.messageCount,
      participantCount: row.participantCount,
      activeDays: row.activeDays,
      firstMessageOn: row.firstMessageOn,
      lastMessageOn: row.lastMessageOn,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      participants: row.participants.map((participant) => ({
        name: participant.name,
        messageCount: participant.messageCount,
        share: Math.round((participant.messageCount * 100) / total),
      })),
    };
  }
}
