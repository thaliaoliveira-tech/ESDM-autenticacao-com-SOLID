import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './bootstrap';
import type { AppConfig } from './config/app.config';
import type { AiConfig } from './config/ai.config';
import { setupSwagger } from './swagger';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  configureApp(app);
  setupSwagger(app);

  const config = app.get(ConfigService);
  const { port } = config.getOrThrow<AppConfig>('app');
  const ai = config.getOrThrow<AiConfig>('ai');

  await app.listen(port);
  const logger = new Logger('Bootstrap');
  logger.log(`API ouvindo em http://localhost:${port} (docs em /docs)`);
  logger.log(
    ai.configured
      ? `IA: ${ai.model} via OpenRouter`
      : 'IA: defina OPENROUTER_API_KEY no .env para ativar o chat',
  );
}

void bootstrap();
