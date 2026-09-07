import { registerAs } from '@nestjs/config';

export interface AppConfig {
  readonly env: string;
  readonly port: number;
}

export const appConfig = registerAs('app', (): AppConfig => ({
  env: process.env.NODE_ENV ?? 'development',
  port: Number.parseInt(process.env.PORT ?? '3000', 10),
}));
