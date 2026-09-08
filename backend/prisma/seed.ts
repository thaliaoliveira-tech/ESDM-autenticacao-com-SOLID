import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

/**
 * Seed de desenvolvimento.
 *
 * Existe para que seja possivel exercitar o login sem precisar implementar um
 * fluxo de cadastro, que esta fora do escopo deste POC.
 */
const prisma = new PrismaClient();

async function main(): Promise<void> {
  const email = process.env.SEED_USER_EMAIL ?? 'demo@example.com';
  const password = process.env.SEED_USER_PASSWORD ?? 'Demo@123';
  const name = process.env.SEED_USER_NAME ?? 'Usuario Demo';

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

  const user = await prisma.user.upsert({
    where: { email },
    update: { name, passwordHash },
    create: { email, name, passwordHash },
  });

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
