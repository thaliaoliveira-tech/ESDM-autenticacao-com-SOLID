import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import type { AppConfig } from './config/app.config';
import { ApplicationErrorFilter } from './shared/errors/application-error.filter';
import { setupSwagger } from './swagger';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Traduz os erros do nucleo para HTTP em um unico lugar.
  app.useGlobalFilters(new ApplicationErrorFilter());

  setupSwagger(app);

  const config = app.get(ConfigService);
  const { port } = config.getOrThrow<AppConfig>('app');

  await app.listen(port);
  new Logger('Bootstrap').log(`API ouvindo em http://localhost:${port} (docs em /docs)`);
}

void bootstrap();
