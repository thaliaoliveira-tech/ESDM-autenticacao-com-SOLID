import { PrismaClient } from '@prisma/client';
import type { PrismaService } from '../../src/database/prisma.service';
import { PrismaTransactionManager } from '../../src/database/transaction';
import { PrismaChatRepository } from '../../src/modules/chat/infrastructure/prisma-chat.repository';
import { PrismaConversationRepository } from '../../src/modules/conversations/infrastructure/prisma-conversation.repository';
import { PrismaSessionRepository } from '../../src/modules/auth/infrastructure/persistence/prisma-session.repository';
import { PrismaPasswordResetRepository } from '../../src/modules/auth/infrastructure/persistence/prisma-password-reset.repository';
import { PrismaSettingsRepository } from '../../src/modules/settings/infrastructure/prisma-settings.repository';
import { PrismaSpaceRepository } from '../../src/modules/spaces/infrastructure/prisma-space.repository';
import { PrismaTaskRepository } from '../../src/modules/tasks/infrastructure/prisma-task.repository';
import { PrismaNotificationRepository } from '../../src/modules/notifications/infrastructure/prisma-notification.repository';
import { PrismaAuditRepository } from '../../src/modules/audit/infrastructure/prisma-audit.repository';
import { PrismaUserRepository } from '../../src/modules/users/infrastructure/prisma-user.repository';
import { ConflictError } from '../../src/shared/errors/application-error';

/**
 * Repositorios contra o SQLite criado pelas migrations: constraints,
 * relacionamentos (cascade / set null), transacoes e operacoes condicionais.
 */
describe('Repositorios de dominio (SQLite real)', () => {
  const prisma = new PrismaClient();
  const db = prisma as unknown as PrismaService;
  const transactions = new PrismaTransactionManager(db);
  const users = new PrismaUserRepository(db);
  const spaces = new PrismaSpaceRepository(db);
  const tasks = new PrismaTaskRepository(db);
  const conversations = new PrismaConversationRepository(db);
  const chat = new PrismaChatRepository(db);
  const sessions = new PrismaSessionRepository(db);
  const resets = new PrismaPasswordResetRepository(db);
  const settings = new PrismaSettingsRepository(db);
  const notifications = new PrismaNotificationRepository(db);
  const audit = new PrismaAuditRepository(db);
  let userId: string;

  beforeAll(async () => {
    await prisma.$connect();
  });

  beforeEach(async () => {
    await prisma.user.deleteMany();
    await prisma.auditLog.deleteMany();
    userId = (
      await users.createLocal({
        name: 'Ana',
        username: 'ana',
        email: 'ana@example.com',
        passwordHash: 'h',
      })
    ).id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  const newTask = (overrides: Record<string, unknown> = {}) =>
    tasks.create({
      userId,
      title: 'Tarefa',
      description: '',
      assignee: '',
      dueOn: null,
      priority: null,
      spaceId: null,
      conversationId: null,
      ...overrides,
    });

  const newConversation = (fingerprint = 'f1') =>
    conversations.create({
      userId,
      fileName: 'conversa.txt',
      sizeBytes: 10,
      content: 'conteudo com reunião',
      fingerprint,
      messageCount: 3,
      activeDays: 1,
      firstMessageOn: '2026-10-13',
      lastMessageOn: '2026-10-13',
      participants: [
        { name: 'A', messageCount: 2 },
        { name: 'B', messageCount: 1 },
      ],
    });

  describe('transacoes', () => {
    it('desfaz todas as escritas quando o trabalho falha', async () => {
      await expect(
        transactions.run(async () => {
          await spaces.create(userId, 'Trabalho', 'trabalho');
          await newTask({ title: 'dentro da transacao' });
          throw new Error('falha no meio');
        }),
      ).rejects.toThrow('falha no meio');

      expect(await prisma.space.count()).toBe(0);
      expect(await prisma.task.count()).toBe(0);
    });

    it('confirma as escritas e reaproveita a transacao externa em chamadas aninhadas', async () => {
      await transactions.run(async () => {
        await spaces.create(userId, 'A', 'a');
        await transactions.run(async () => {
          await spaces.create(userId, 'B', 'b');
        });
      });

      expect(await prisma.space.count()).toBe(2);
    });
  });

  describe('usuarios', () => {
    it('traduz unicidade de username e e-mail em ConflictError com o campo', async () => {
      await expect(
        users.createLocal({
          name: 'x',
          username: 'ana',
          email: 'outra@example.com',
          passwordHash: 'h',
        }),
      ).rejects.toMatchObject({ field: 'username' });
      await expect(
        users.createLocal({
          name: 'x',
          username: 'outra',
          email: 'ana@example.com',
          passwordHash: 'h',
        }),
      ).rejects.toMatchObject({ field: 'email' });
      const other = await users.createLocal({
        name: 'x',
        username: 'bia',
        email: 'bia@example.com',
        passwordHash: 'h',
      });
      await expect(
        users.updateProfile(other.id, { email: 'ana@example.com' }),
      ).rejects.toBeInstanceOf(ConflictError);
    });

    it('excluir o usuario apaga em cascata todos os dados dele', async () => {
      const space = await spaces.create(userId, 'X', 'x');
      await newTask({ spaceId: space.id });
      const conversation = await newConversation();
      await chat.addMessage({
        userId,
        conversationId: conversation.id,
        role: 'user',
        kind: 'chat',
        content: 'oi',
      });
      await settings.upsert(userId, { theme: 'dark' });
      await notifications.create({ userId, type: 'daily_reminder', title: 't', body: 'b' });
      await sessions.create({
        userId,
        provider: 'email',
        refreshTokenHash: 'r',
        expiresAt: new Date(),
        userAgent: null,
        ipAddress: null,
      });

      await users.delete(userId);

      for (const count of await Promise.all([
        prisma.space.count(),
        prisma.task.count(),
        prisma.conversation.count(),
        prisma.conversationParticipant.count(),
        prisma.chatMessage.count(),
        prisma.userSettings.count(),
        prisma.notification.count(),
        prisma.session.count(),
      ])) {
        expect(count).toBe(0);
      }
    });

    it('remove convidados antigos sem sessao ativa e preserva os demais', async () => {
      const old = await users.createGuest('Convidado');
      const active = await users.createGuest('Convidado');
      await prisma.user.updateMany({
        where: { isGuest: true },
        data: { createdAt: new Date('2020-01-01') },
      });
      await sessions.create({
        userId: active.id,
        provider: 'guest',
        refreshTokenHash: 'ativo',
        expiresAt: new Date(Date.now() + 60_000),
        userAgent: null,
        ipAddress: null,
      });

      expect(await users.deleteInactiveGuests(new Date('2021-01-01'), new Date())).toBe(1);
      expect(await users.findById(old.id)).toBeNull();
      expect(await users.findById(active.id)).not.toBeNull();
      expect(await users.findById(userId)).not.toBeNull();
    });
  });

  describe('espacos e tarefas', () => {
    it('nome unico por usuario (chave normalizada) e independente entre usuarios', async () => {
      await spaces.create(userId, 'Trabalho', 'trabalho');
      await expect(spaces.create(userId, 'TRABALHO', 'trabalho')).rejects.toBeInstanceOf(
        ConflictError,
      );
      const other = await users.createGuest('Convidado');
      await expect(spaces.create(other.id, 'Trabalho', 'trabalho')).resolves.toBeDefined();
      const second = await spaces.create(userId, 'Casa', 'casa');
      await expect(spaces.rename(second.id, 'Trabalho', 'trabalho')).rejects.toBeInstanceOf(
        ConflictError,
      );
    });

    it('excluir o espaco mantem as tarefas, sem espaco, e devolve quantas foram afetadas', async () => {
      const space = await spaces.create(userId, 'X', 'x');
      const task = await newTask({ spaceId: space.id });

      expect(await spaces.delete(space.id)).toBe(1);
      expect((await tasks.findById(userId, task.id))?.spaceId).toBeNull();
    });

    it('contagens por espaco e por status, incluindo sem espaco', async () => {
      const space = await spaces.create(userId, 'X', 'x');
      await newTask({ spaceId: space.id });
      const done = await newTask({ spaceId: space.id });
      await tasks.update(done.id, { status: 'done', completedOn: '2026-10-10' });
      await newTask();

      const counts = await spaces.taskCounts(userId);
      expect(counts.get(space.id)).toEqual({ pending: 1, done: 1, total: 2 });
      expect(counts.get(null)).toEqual({ pending: 1, done: 0, total: 1 });
    });

    it('escopo de prazo exclui tarefas sem prazo e respeita o intervalo', async () => {
      await newTask({ title: 'antes', dueOn: '2026-10-11' });
      await newTask({ title: 'dentro', dueOn: '2026-10-14' });
      await newTask({ title: 'sem prazo' });

      const scoped = await tasks.list(userId, { dueFrom: '2026-10-12', dueTo: '2026-10-18' });
      expect(scoped.map((t) => t.title)).toEqual(['dentro']);
      expect(await tasks.countByStatus(userId, {})).toEqual({ pending: 3, done: 0 });
      expect(await tasks.countOverdue(userId, '2026-10-12')).toBe(1);
      expect(await tasks.list(userId, { spaceId: null })).toHaveLength(3);
    });
  });

  describe('conversas e chat', () => {
    it('impede importar o mesmo arquivo duas vezes por usuario', async () => {
      await newConversation('igual');
      await expect(newConversation('igual')).rejects.toBeInstanceOf(ConflictError);
    });

    it('detalhes sem o texto; conteudo e busca em lotes', async () => {
      const created = await newConversation();
      expect(created.participants.map((p) => [p.name, p.share])).toEqual([
        ['A', 67],
        ['B', 33],
      ]);
      const details = await conversations.findDetails(userId, created.id);
      expect(JSON.stringify(details)).not.toContain('conteudo com');
      const visited: string[] = [];
      await conversations.forEachContent(userId, (item) => visited.push(item.content));
      expect(visited).toEqual(['conteudo com reunião']);
    });

    it('excluir a conversa remove o historico e desvincula as tarefas', async () => {
      const conversation = await newConversation();
      const task = await newTask({ conversationId: conversation.id });
      await chat.addMessage({
        userId,
        conversationId: conversation.id,
        role: 'user',
        kind: 'chat',
        content: 'oi',
      });

      await conversations.delete(conversation.id);

      expect(await prisma.chatMessage.count()).toBe(0);
      expect((await tasks.findById(userId, task.id))?.conversationId).toBeNull();
    });

    it('propostas: substituicao por ref no mesmo fio e resolucao condicional', async () => {
      const proposal = {
        type: 'create' as const,
        ref: 't1',
        taskId: null,
        taskTitle: null,
        payload: {
          task: {
            title: 'A',
            description: '',
            assignee: '',
            dueOn: null,
            priority: null,
            space: '',
          },
        },
      };
      const first = await chat.addMessage({
        userId,
        conversationId: null,
        role: 'assistant',
        kind: 'chat',
        content: 'a',
        proposals: [proposal],
      });
      const otherThread = await newConversation();
      await chat.addMessage({
        userId,
        conversationId: otherThread.id,
        role: 'assistant',
        kind: 'chat',
        content: 'b',
        proposals: [proposal],
      });

      expect(await chat.supersedePending(userId, null, ['t1'])).toBe(1);
      const reloaded = await chat.findMessage(userId, first.id);
      expect(reloaded?.proposals[0].status).toBe('superseded');

      const [pending] = (await chat.listThread(userId, otherThread.id))[0].proposals;
      expect(await chat.resolveProposal(pending.id, { status: 'discarded', at: new Date() })).toBe(
        true,
      );
      expect(await chat.resolveProposal(pending.id, { status: 'confirmed', at: new Date() })).toBe(
        false,
      );
      expect(await chat.findProposal('outro-usuario', pending.id)).toBeNull();
    });

    it('excluir a tarefa preserva a proposta com o titulo guardado', async () => {
      const task = await newTask({ title: 'Guardada' });
      const message = await chat.addMessage({
        userId,
        conversationId: null,
        role: 'assistant',
        kind: 'chat',
        content: 'x',
        proposals: [
          { type: 'delete', ref: 'x', taskId: task.id, taskTitle: 'Guardada', payload: {} },
        ],
      });

      await tasks.delete(task.id);

      const [proposal] = (await chat.findMessage(userId, message.id))!.proposals;
      expect(proposal).toMatchObject({ taskId: null, taskTitle: 'Guardada' });
    });

    it('recentThread devolve as ultimas N em ordem cronologica', async () => {
      for (const content of ['1', '2', '3']) {
        await chat.addMessage({
          userId,
          conversationId: null,
          role: 'user',
          kind: 'chat',
          content,
        });
      }
      expect((await chat.recentThread(userId, null, 2)).map((m) => m.content)).toEqual(['2', '3']);
      expect(await chat.hasUserMessage(userId, null)).toBe(true);
    });
  });

  describe('sessoes, links, configuracoes, notificacoes e auditoria', () => {
    it('rotacao do refresh token e condicional ao hash atual', async () => {
      const session = await sessions.create({
        userId,
        provider: 'email',
        refreshTokenHash: 'h1',
        expiresAt: new Date(Date.now() + 60_000),
        userAgent: 'jest',
        ipAddress: '::1',
      });
      const next = {
        refreshTokenHash: 'h2',
        expiresAt: new Date(Date.now() + 120_000),
        usedAt: new Date(),
      };

      expect(await sessions.rotate(session.id, 'h1', next)).toBe(true);
      expect(await sessions.rotate(session.id, 'h1', { ...next, refreshTokenHash: 'h3' })).toBe(
        false,
      );
      expect((await sessions.findByRefreshTokenHash('h2'))?.id).toBe(session.id);
      expect(await sessions.revokeAllForUser(userId, new Date())).toBe(1);
      expect(await sessions.deleteStale(new Date(Date.now() + 1000))).toBe(1);
    });

    it('link de redefinicao: uso unico e invalidacao dos anteriores', async () => {
      await resets.create({ userId, tokenHash: 't1', expiresAt: new Date(Date.now() + 60_000) });
      const record = await resets.findByTokenHash('t1');
      expect(await resets.markUsed(record!.id, new Date())).toBe(true);
      expect(await resets.markUsed(record!.id, new Date())).toBe(false);
      await resets.create({ userId, tokenHash: 't2', expiresAt: new Date(Date.now() + 60_000) });
      await resets.deleteUnusedForUser(userId);
      expect(await resets.findByTokenHash('t2')).toBeNull();
      expect(await resets.deleteStale(new Date())).toBe(1);
    });

    it('lembrete: reserva atomica de no maximo um por dia', async () => {
      await settings.upsert(userId, {
        reminderEnabled: true,
        reminderTime: '08:00',
        timezone: 'UTC',
      });

      const claims = await Promise.all([
        settings.claimReminder(userId, '2026-10-14'),
        settings.claimReminder(userId, '2026-10-14'),
      ]);
      expect(claims.filter(Boolean)).toHaveLength(1);
      expect(await settings.claimReminder(userId, '2026-10-15')).toBe(true);
    });

    it('notificacoes: a lista traz so as nao lidas; ler tira da lista', async () => {
      const page = { page: 1, pageSize: 10 };
      const created = await notifications.create({
        userId,
        type: 'daily_reminder',
        title: 't',
        body: 'b',
        data: { view: 'today' },
      });
      await notifications.create({ userId, type: 'daily_reminder', title: 't2', body: 'b2' });
      expect((await notifications.listUnread(userId, page)).total).toBe(2);

      expect(await notifications.markRead(userId, created.id, new Date())).toBe(true);
      expect(await notifications.markRead(userId, created.id, new Date())).toBe(true);
      expect(await notifications.markRead('outro', created.id, new Date())).toBe(false);
      const unread = await notifications.listUnread(userId, page);
      expect(unread.items.map((n) => n.title)).toEqual(['t2']);

      expect(await notifications.markAllRead(userId, new Date())).toBe(1);
      expect((await notifications.listUnread(userId, page)).total).toBe(0);
    });

    it('auditoria: grava e lista do mais recente para o mais antigo', async () => {
      await audit.create({
        userId,
        action: 'task.created',
        entityType: 'task',
        entityId: '1',
        metadata: { a: 1 },
        requestId: 'r1',
        ipAddress: null,
      });
      await audit.create({
        userId,
        action: 'task.deleted',
        entityType: 'task',
        requestId: null,
        ipAddress: null,
      });

      const { items, total } = await audit.listForUser(userId, { page: 1, pageSize: 10 });
      expect(total).toBe(2);
      expect(items.find((i) => i.action === 'task.created')).toMatchObject({
        metadata: { a: 1 },
        requestId: 'r1',
      });
    });
  });
});
