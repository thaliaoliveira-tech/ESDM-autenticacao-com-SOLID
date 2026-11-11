import { Inject, Injectable, Logger } from '@nestjs/common';
import { currentRequestContext } from '../../../shared/http/request-context';
import { pageMeta, type PageRequest, type Paginated } from '../../../shared/pagination';
import {
  AUDIT_REPOSITORY,
  type AuditEntry,
  type AuditRecord,
  type AuditRepository,
} from '../domain/audit';

/**
 * Registra as operacoes relevantes com o `requestId` da requisicao em curso.
 *
 * Executado dentro de uma transacao, o registro acompanha o resultado dela: se
 * a operacao for desfeita, o registro tambem e. Uma falha ao auditar nunca
 * derruba a operacao do usuario; ela e logada como erro.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger('Audit');

  constructor(@Inject(AUDIT_REPOSITORY) private readonly repository: AuditRepository) {}

  async record(entry: AuditEntry): Promise<void> {
    const context = currentRequestContext();
    try {
      await this.repository.create({
        ...entry,
        requestId: context?.requestId ?? null,
        ipAddress: context?.ipAddress ?? null,
      });
      if (process.env.NODE_ENV !== 'test') {
        this.logger.log(
          `${entry.action} user=${entry.userId ?? '-'} ${entry.entityType}:${entry.entityId ?? '-'} [${context?.requestId ?? 'job'}]`,
        );
      }
    } catch (error) {
      this.logger.error(`Falha ao registrar ${entry.action}: ${(error as Error).message}`);
    }
  }

  async listForUser(userId: string, page: PageRequest): Promise<Paginated<AuditRecord>> {
    const { items, total } = await this.repository.listForUser(userId, page);
    return { data: items, meta: pageMeta(page, total) };
  }
}
