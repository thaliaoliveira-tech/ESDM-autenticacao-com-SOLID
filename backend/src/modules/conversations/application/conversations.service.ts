import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { Inject, Injectable } from '@nestjs/common';
import { TRANSACTION_MANAGER, type TransactionManager } from '../../../database/transaction';
import { collapseSpaces, normalizeSearch, searchTerms } from '../../../shared/domain/text';
import {
  ConflictError,
  NotFoundError,
  PayloadTooLargeError,
  ServiceUnavailableError,
  ValidationError,
} from '../../../shared/errors/application-error';
import { paginate, type PageRequest, type Paginated } from '../../../shared/pagination';
import { AuditService } from '../../audit/application/audit.service';
import { AuditAction } from '../../audit/domain/audit';
import {
  CONVERSATION_REPOSITORY,
  FILE_NAME_MAX,
  MAX_FILE_BYTES,
  type ConversationDetails,
  type ConversationRepository,
  type ConversationSummary,
} from '../domain/conversation';
import { conversationStats, fingerprint, parseWhatsApp } from '../domain/whatsapp';

export const CONVERSATION_NOT_FOUND = 'Conversa nao encontrada.';
export const SAMPLE_FILE_NAME = 'conversa-exemplo.txt';

export interface UploadedFile {
  readonly originalName: string;
  readonly size: number;
  readonly buffer: Buffer;
}

export interface ImportResult {
  /** false quando o mesmo arquivo ja tinha sido importado: o historico existente e aberto. */
  readonly created: boolean;
  readonly conversation: ConversationDetails;
}

/**
 * Conversas exportadas do WhatsApp: importacao (.txt ate 10 MB), historico com
 * busca por nome e conteudo, detalhes, renomear e excluir.
 *
 * Excluir uma conversa remove o historico do chat dela; as tarefas criadas a
 * partir dela continuam salvas, apenas sem o vinculo de origem.
 */
@Injectable()
export class ConversationsService {
  constructor(
    @Inject(CONVERSATION_REPOSITORY) private readonly conversations: ConversationRepository,
    @Inject(TRANSACTION_MANAGER) private readonly transactions: TransactionManager,
    private readonly audit: AuditService,
  ) {}

  async import(userId: string, file: UploadedFile | undefined): Promise<ImportResult> {
    if (!file) {
      throw new ValidationError('Selecione um arquivo .txt exportado do WhatsApp.', 'file');
    }
    if (!/\.txt$/i.test(file.originalName)) {
      throw new ValidationError('Selecione um arquivo .txt exportado do WhatsApp.', 'file');
    }
    if (file.size > MAX_FILE_BYTES) {
      throw new PayloadTooLargeError('Use um arquivo de ate 10 MB.');
    }
    const text = file.buffer.toString('utf8');
    if (!text.replace(/^\uFEFF/, '').trim()) {
      throw new ValidationError(
        'O arquivo esta vazio. Selecione uma conversa com mensagens.',
        'file',
      );
    }

    const messages = parseWhatsApp(text);
    const stats = conversationStats(messages);
    const digest = fingerprint(text);
    const fileName = this.cleanName(file.originalName.split(/[\\/]/).pop() ?? file.originalName);

    const existing = await this.conversations.findByFingerprint(userId, digest);
    if (existing) {
      return { created: false, conversation: await this.details(userId, existing.id) };
    }

    try {
      const conversation = await this.transactions.run(async () => {
        const created = await this.conversations.create({
          userId,
          fileName,
          sizeBytes: file.size,
          content: text,
          fingerprint: digest,
          messageCount: stats.messageCount,
          activeDays: stats.activeDays,
          firstMessageOn: stats.firstMessageOn,
          lastMessageOn: stats.lastMessageOn,
          participants: stats.participants,
        });
        await this.audit.record({
          userId,
          action: AuditAction.ConversationImported,
          entityType: 'conversation',
          entityId: created.id,
          metadata: { fileName, messages: stats.messageCount, bytes: file.size },
        });
        return created;
      });
      return { created: true, conversation };
    } catch (error) {
      // Duas importacoes simultaneas do mesmo arquivo: a segunda abre a primeira.
      if (error instanceof ConflictError) {
        const winner = await this.conversations.findByFingerprint(userId, digest);
        if (winner) {
          return { created: false, conversation: await this.details(userId, winner.id) };
        }
      }
      throw error;
    }
  }

  /** "Usar um exemplo": importa a conversa ficticia distribuida com a API. */
  async importSample(userId: string): Promise<ImportResult> {
    const path = [
      join(process.cwd(), 'assets', SAMPLE_FILE_NAME),
      join(__dirname, '..', '..', '..', '..', 'assets', SAMPLE_FILE_NAME),
    ].find((candidate) => existsSync(candidate));
    if (!path) {
      throw new ServiceUnavailableError('A conversa de exemplo nao esta disponivel no servidor.');
    }
    const buffer = await readFile(path);
    return this.import(userId, { originalName: SAMPLE_FILE_NAME, size: buffer.length, buffer });
  }

  /** Busca no nome do arquivo e no texto importado, sem acentos e sem diferenciar maiusculas. */
  async list(
    userId: string,
    query: string | undefined,
    page: PageRequest,
  ): Promise<Paginated<ConversationSummary>> {
    const summaries = await this.conversations.listSummaries(userId);
    const terms = searchTerms(query);
    if (terms.length === 0) {
      return paginate(summaries, page);
    }
    const matching = new Set<string>();
    await this.conversations.forEachContent(userId, ({ id, fileName, content }) => {
      const haystack = normalizeSearch(`${fileName} ${content}`);
      if (terms.every((term) => haystack.includes(term))) {
        matching.add(id);
      }
    });
    return paginate(
      summaries.filter((summary) => matching.has(summary.id)),
      page,
    );
  }

  async details(userId: string, id: string): Promise<ConversationDetails> {
    const conversation = await this.conversations.findDetails(userId, id);
    if (!conversation) {
      throw new NotFoundError(CONVERSATION_NOT_FOUND);
    }
    return conversation;
  }

  async content(userId: string, id: string): Promise<{ fileName: string; content: string }> {
    const found = await this.conversations.findContent(userId, id);
    if (!found) {
      throw new NotFoundError(CONVERSATION_NOT_FOUND);
    }
    return found;
  }

  async rename(userId: string, id: string, name: string): Promise<ConversationDetails> {
    const fileName = this.cleanName(name);
    await this.transactions.run(async () => {
      const conversation = await this.details(userId, id);
      await this.conversations.rename(id, fileName);
      await this.audit.record({
        userId,
        action: AuditAction.ConversationRenamed,
        entityType: 'conversation',
        entityId: id,
        metadata: { from: conversation.fileName, to: fileName },
      });
    });
    return this.details(userId, id);
  }

  async delete(userId: string, id: string): Promise<void> {
    await this.transactions.run(async () => {
      const conversation = await this.details(userId, id);
      await this.conversations.delete(id);
      await this.audit.record({
        userId,
        action: AuditAction.ConversationDeleted,
        entityType: 'conversation',
        entityId: id,
        metadata: { fileName: conversation.fileName },
      });
    });
  }

  private cleanName(value: string): string {
    const name = collapseSpaces(value);
    if (!name || name.length > FILE_NAME_MAX) {
      throw new ValidationError(`Informe um nome de ate ${FILE_NAME_MAX} caracteres.`, 'fileName');
    }
    return name;
  }
}
