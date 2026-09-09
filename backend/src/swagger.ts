import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Logger, type INestApplication } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';
import { parse } from 'yaml';

/**
 * A documentacao da API e escrita a mao em `docs/swagger/api.swagger.yaml` e
 * apenas SERVIDA pelo Nest -- ela nao e gerada a partir de decorators.
 *
 * A troca e consciente: um unico arquivo versionado e mais facil de revisar e
 * estudar do que dezenas de `@ApiResponse` espalhados. O preco e que o arquivo
 * pode divergir do codigo, e por isso existem `npm run docs:lint` e os testes
 * E2E, que exercitam os contratos descritos ali.
 */
export function setupSwagger(app: INestApplication): void {
  const logger = new Logger('Swagger');

  // Funciona tanto rodando de src/ (ts-node/jest) quanto de dist/ (build).
  const candidates = [
    join(process.cwd(), 'docs', 'swagger', 'api.swagger.yaml'),
    join(__dirname, '..', 'docs', 'swagger', 'api.swagger.yaml'),
  ];

  const specPath = candidates.find((candidate) => existsSync(candidate));

  if (!specPath) {
    logger.warn('api.swagger.yaml nao encontrado; /docs nao sera publicado.');
    return;
  }

  const document = parse(readFileSync(specPath, 'utf8')) as Record<string, unknown>;

  SwaggerModule.setup('docs', app, document as never, {
    swaggerOptions: { persistAuthorization: true },
  });

  logger.log('Documentacao interativa disponivel em /docs');
}
