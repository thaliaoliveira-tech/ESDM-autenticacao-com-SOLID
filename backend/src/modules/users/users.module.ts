import { Module } from '@nestjs/common';
import { USER_REPOSITORY } from './domain/contracts/user.repository';
import { PrismaUserRepository } from './infrastructure/prisma-user.repository';

/**
 * O ponto exato onde a abstracao e amarrada ao detalhe.
 *
 * Todo o resto do sistema pede `USER_REPOSITORY`. Trocar Prisma por outra
 * tecnologia e trocar a linha `useClass` abaixo.
 */
@Module({
  providers: [
    {
      provide: USER_REPOSITORY,
      useClass: PrismaUserRepository,
    },
  ],
  exports: [USER_REPOSITORY],
})
export class UsersModule {}
