import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Ciclo de vida do PrismaClient amarrado ao ciclo de vida do modulo Nest.
 *
 * Esta classe e infraestrutura pura: nenhuma regra de negocio mora aqui, e
 * somente os repositorios concretos a enxergam.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Conectado ao banco de dados.');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
