import { join } from 'node:path';
import { config as loadEnv } from 'dotenv';

// Carregado antes de cada suite de integracao/E2E.
loadEnv({ path: join(process.cwd(), '.env.test'), override: true });

// Argon2 e proposital e legitimamente lento; o default de 5s aperta demais.
jest.setTimeout(30_000);
