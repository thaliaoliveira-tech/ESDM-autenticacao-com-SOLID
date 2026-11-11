import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

/**
 * Seed de desenvolvimento.
 *
 * Cria (ou atualiza) um usuario local para exercitar o login sem passar pelo
 * cadastro, com o espaco "Trabalho" e uma tarefa de exemplo. Nao cria dados
 * ficticios em massa: tudo o mais nasce do uso real da API.
 */
const prisma = new PrismaClient();

async function main(): Promise<void> {
  const email = process.env.SEED_USER_EMAIL ?? 'demo@example.com';
  const password = process.env.SEED_USER_PASSWORD ?? 'Demo@123';
  const name = process.env.SEED_USER_NAME ?? 'Usuario Demo';
  const username = process.env.SEED_USER_USERNAME ?? 'demo';

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

  const user = await prisma.user.upsert({
    where: { email },
    update: { name, passwordHash },
    create: { email, name, username, passwordHash },
  });

  const space = await prisma.space.upsert({
    where: { userId_nameKey: { userId: user.id, nameKey: 'trabalho' } },
    update: {},
    create: { userId: user.id, name: 'Trabalho', nameKey: 'trabalho' },
  });

  if ((await prisma.task.count({ where: { userId: user.id } })) === 0) {
    await prisma.task.create({
      data: {
        userId: user.id,
        spaceId: space.id,
        title: 'Explorar o Sintetiza',
        description: 'Importe uma conversa do WhatsApp e peca a IA para criar as tarefas.',
        priority: 'medium',
      },
    });
  }

  console.log(`Usuario de desenvolvimento pronto: ${user.email} / ${password}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
