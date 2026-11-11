import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { PrismaTransactionManager, TRANSACTION_MANAGER } from './transaction';

@Global()
@Module({
  providers: [PrismaService, { provide: TRANSACTION_MANAGER, useClass: PrismaTransactionManager }],
  exports: [PrismaService, TRANSACTION_MANAGER],
})
export class PrismaModule {}
