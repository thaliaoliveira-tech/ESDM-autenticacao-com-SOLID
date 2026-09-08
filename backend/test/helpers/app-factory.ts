import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { AppModule } from '../../src/app.module';
import { ApplicationErrorFilter } from '../../src/shared/errors/application-error.filter';

export interface TestContext {
  app: INestApplication;
  prisma: PrismaClient;
  credentials: { email: string; password: string };
}

/**
 * Sobe a aplicacao real (mesmos pipes e filtros do main.ts) contra o SQLite de
 * teste. Nada e mockado: se o E2E passa, o fluxo funciona de ponta a ponta.
 */
export async function createTestApp(): Promise<TestContext> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

  const app = moduleRef.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.useGlobalFilters(new ApplicationErrorFilter());
  await app.init();

  const prisma = new PrismaClient();
  await prisma.$connect();

  const credentials = { email: 'demo@example.com', password: 'Demo@123' };

  await prisma.user.deleteMany();
  await prisma.user.create({
    data: {
      name: 'Usuario Demo',
      email: credentials.email,
      passwordHash: await argon2.hash(credentials.password, { type: argon2.argon2id }),
    },
  });

  return { app, prisma, credentials };
}

export async function destroyTestApp(context: TestContext): Promise<void> {
  await context.prisma.user.deleteMany();
  await context.prisma.$disconnect();
  await context.app.close();
}
