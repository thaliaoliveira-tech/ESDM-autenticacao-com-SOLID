import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from './config/app.config';
import { ApplicationErrorFilter } from './shared/errors/application-error.filter';
import { createValidationPipe } from './shared/http/validation';

/**
 * Configuracao HTTP comum a `main.ts` e aos testes E2E: os testes sobem a
 * aplicacao exatamente como ela roda.
 */
export function configureApp(app: INestApplication): void {
  const config = app.get(ConfigService).getOrThrow<AppConfig>('app');

  app.enableCors({
    origin: config.corsOrigins.length > 0 ? config.corsOrigins : true,
    exposedHeaders: ['X-Request-Id'],
  });
  app.useGlobalPipes(createValidationPipe());
  // Traduz os erros do nucleo (e os do proprio Nest) para HTTP em um unico lugar.
  app.useGlobalFilters(new ApplicationErrorFilter());
  app.enableShutdownHooks();
}
