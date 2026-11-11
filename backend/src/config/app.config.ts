import { registerAs } from '@nestjs/config';

export interface AppConfig {
  readonly env: string;
  readonly port: number;
  /** Origens liberadas no CORS (app Expo web, painel...). Vazio = qualquer origem. */
  readonly corsOrigins: string[];
  /** Liga o job de manutencao de autenticacao. Desligado nos testes. */
  readonly jobsEnabled: boolean;
}

export const appConfig = registerAs('app', (): AppConfig => {
  const env = process.env.NODE_ENV ?? 'development';
  const jobs = process.env.JOBS_ENABLED;
  return {
    env,
    port: Number.parseInt(process.env.PORT ?? '3000', 10),
    corsOrigins: (process.env.CORS_ORIGINS ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    jobsEnabled: jobs === undefined || jobs === '' ? env !== 'test' : jobs === 'true',
  };
});
