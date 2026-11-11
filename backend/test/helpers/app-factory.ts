import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import request from 'supertest';
import type { Server } from 'node:http';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/bootstrap';
import { AI_PROVIDER, type AiProvider } from '../../src/modules/chat/domain/ai-provider';
import { ScriptedAiProvider } from './scripted-ai-provider';

export interface TestContext {
  app: INestApplication;
  server: Server;
  prisma: PrismaClient;
  ai: ScriptedAiProvider;
  credentials: { email: string; password: string };
}

/**
 * Sobe a aplicacao real (mesma configuracao do main.ts) contra o SQLite de
 * teste. A unica dependencia substituida e o modelo de linguagem: em vez do
 * OpenRouter, um provedor roteirizado devolve respostas conhecidas, sem rede.
 */
export async function createTestApp(options: { ai?: AiProvider } = {}): Promise<TestContext> {
  const ai = (options.ai as ScriptedAiProvider | undefined) ?? new ScriptedAiProvider();
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(AI_PROVIDER)
    .useValue(ai)
    .compile();

  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();

  const prisma = new PrismaClient();
  await prisma.$connect();

  const credentials = { email: 'demo@example.com', password: 'Demo@123' };

  await prisma.user.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.create({
    data: {
      name: 'Usuario Demo',
      username: 'demo',
      email: credentials.email,
      passwordHash: await argon2.hash(credentials.password, { type: argon2.argon2id }),
    },
  });

  return { app, server: app.getHttpServer() as Server, prisma, ai, credentials };
}

export async function destroyTestApp(context: TestContext): Promise<void> {
  await context.prisma.user.deleteMany();
  await context.prisma.auditLog.deleteMany();
  await context.prisma.$disconnect();
  await context.app.close();
}

/** Abre uma sessao de convidado: usuario isolado e rapido (sem Argon2). */
export async function guestToken(server: Server): Promise<string> {
  const response = await request(server).post('/auth/guest').expect(201);
  return (response.body as { accessToken: string }).accessToken;
}

export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
