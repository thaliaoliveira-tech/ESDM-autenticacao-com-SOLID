import { AsyncLocalStorage } from 'node:async_hooks';
import { Injectable } from '@nestjs/common';
import type { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from './prisma.service';

export const TRANSACTION_MANAGER = Symbol('TransactionManager');

/**
 * Contrato de unidade de trabalho.
 *
 * Os casos de uso dizem "isto e atomico" sem saber que existe Prisma. Os
 * repositorios executados dentro de `run` participam automaticamente da mesma
 * transacao, porque obtem o client por `dbClient()`.
 */
export interface TransactionManager {
  run<T>(work: () => Promise<T>): Promise<T>;
}

type DbClient = PrismaClient | Prisma.TransactionClient;

const storage = new AsyncLocalStorage<Prisma.TransactionClient>();

/** Client da transacao em andamento ou, fora de uma, o client base. */
export function dbClient(base: DbClient): DbClient {
  return storage.getStore() ?? base;
}

@Injectable()
export class PrismaTransactionManager implements TransactionManager {
  constructor(private readonly prisma: PrismaService) {}

  run<T>(work: () => Promise<T>): Promise<T> {
    // Transacoes aninhadas reutilizam a externa.
    if (storage.getStore()) {
      return work();
    }
    return this.prisma.$transaction((tx) => storage.run(tx, work), {
      maxWait: 10_000,
      timeout: 20_000,
    });
  }
}
