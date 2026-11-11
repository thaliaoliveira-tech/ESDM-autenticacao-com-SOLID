import { Module } from '@nestjs/common';
import { AccountService } from './application/account.service';
import { USER_REPOSITORY } from './domain/contracts/user.repository';
import { PrismaUserRepository } from './infrastructure/prisma-user.repository';
import { AccountController } from './presentation/account.controller';

/**
 * O ponto exato onde a abstracao e amarrada ao detalhe.
 *
 * Todo o resto do sistema pede `USER_REPOSITORY`. Trocar Prisma por outra
 * tecnologia e trocar a linha `useClass` abaixo.
 */
@Module({
  controllers: [AccountController],
  providers: [
    AccountService,
    {
      provide: USER_REPOSITORY,
      useClass: PrismaUserRepository,
    },
  ],
  exports: [USER_REPOSITORY],
})
export class UsersModule {}
