import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import { Injectable, Logger, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

/** Dados da requisicao em andamento, disponiveis em qualquer camada sem passar parametros. */
export interface RequestContext {
  readonly requestId: string;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
}

const storage = new AsyncLocalStorage<RequestContext>();

export function currentRequestContext(): RequestContext | undefined {
  return storage.getStore();
}

export function currentRequestId(): string | undefined {
  return storage.getStore()?.requestId;
}

const REQUEST_ID = /^[A-Za-z0-9._-]{8,100}$/;

/**
 * Rastreabilidade: cada requisicao recebe um `X-Request-Id` (o do cliente, se
 * valido, ou um novo UUID), devolvido no cabecalho da resposta, gravado na
 * trilha de auditoria e incluido nos erros e nos logs de acesso.
 */
@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(request: Request, response: Response, next: NextFunction): void {
    const incoming = request.header('x-request-id');
    const requestId = incoming && REQUEST_ID.test(incoming) ? incoming : randomUUID();
    const started = process.hrtime.bigint();
    response.setHeader('X-Request-Id', requestId);

    response.on('finish', () => {
      const elapsed = Number(process.hrtime.bigint() - started) / 1_000_000;
      const line = `${request.method} ${request.originalUrl} ${response.statusCode} ${elapsed.toFixed(1)}ms [${requestId}]`;
      if (response.statusCode >= 500) {
        this.logger.warn(line);
      } else if (process.env.NODE_ENV !== 'test') {
        this.logger.log(line);
      }
    });

    storage.run(
      {
        requestId,
        ipAddress: request.ip ?? null,
        userAgent: request.header('user-agent')?.slice(0, 300) ?? null,
      },
      next,
    );
  }
}
