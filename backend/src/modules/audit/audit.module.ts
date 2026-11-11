import { Global, Module } from '@nestjs/common';
import { AuditService } from './application/audit.service';
import { AUDIT_REPOSITORY } from './domain/audit';
import { PrismaAuditRepository } from './infrastructure/prisma-audit.repository';
import { AuditController } from './presentation/audit.controller';

/** Global: qualquer caso de uso pode registrar auditoria sem importar o modulo. */
@Global()
@Module({
  controllers: [AuditController],
  providers: [AuditService, { provide: AUDIT_REPOSITORY, useClass: PrismaAuditRepository }],
  exports: [AuditService],
})
export class AuditModule {}
