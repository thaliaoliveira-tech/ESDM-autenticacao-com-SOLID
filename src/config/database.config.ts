import { registerAs } from '@nestjs/config';

export interface DatabaseConfig {
  readonly url: string;
}

export const databaseConfig = registerAs('database', (): DatabaseConfig => ({
  url: process.env.DATABASE_URL ?? 'file:./dev.db',
}));
