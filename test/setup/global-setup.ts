import { execSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { config as loadEnv } from 'dotenv';

/**
 * Roda UMA vez antes dos testes de integracao/E2E.
 *
 * Cria um banco SQLite dedicado (`prisma/test.db`) a partir do schema, do zero.
 * Um banco novo a cada execucao e o que torna os testes deterministicos: eles
 * nao herdam nada da rodada anterior nem do banco de desenvolvimento.
 */
export default function globalSetup(): void {
  loadEnv({ path: join(process.cwd(), '.env.test'), override: true });

  // Apagar o arquivo antes torna o `db push` seguinte uma criacao, e nao um
  // reset destrutivo: nao precisamos de `--force-reset` e o banco de
  // desenvolvimento nunca corre risco.
  const databaseFile = join(process.cwd(), 'prisma', 'test.db');
  for (const file of [databaseFile, `${databaseFile}-journal`]) {
    if (existsSync(file)) {
      rmSync(file);
    }
  }

  execSync('npx prisma db push --skip-generate', {
    stdio: 'inherit',
    env: { ...process.env },
  });
}
