import { execSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { config as loadEnv } from 'dotenv';

/**
 * Roda UMA vez antes dos testes de integracao/E2E.
 *
 * Cria um banco SQLite dedicado (`prisma/test.db`) aplicando as MIGRATIONS
 * versionadas, do zero. Assim os testes tambem validam que as migrations
 * produzem exatamente o schema que o codigo espera. Um banco novo a cada
 * execucao torna os testes deterministicos.
 */
export default function globalSetup(): void {
  loadEnv({ path: join(process.cwd(), '.env.test'), override: true });

  const databaseFile = join(process.cwd(), 'prisma', 'test.db');
  for (const file of [databaseFile, `${databaseFile}-journal`]) {
    if (existsSync(file)) {
      rmSync(file);
    }
  }

  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env },
  });
}
