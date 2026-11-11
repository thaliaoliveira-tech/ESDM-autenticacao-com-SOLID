import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  ApplicationError,
  ConflictError,
  ForbiddenError,
  InvalidCredentialsError,
  NotFoundError,
  PayloadTooLargeError,
  ServiceUnavailableError,
  SessionExpiredError,
  UnsupportedAuthProviderError,
  UpstreamServiceError,
  ValidationError,
} from './application-error';
import { currentRequestId } from '../http/request-context';

/** Formato unico de erro devolvido por toda a API. */
export interface ErrorResponseBody {
  statusCode: number;
  error: string;
  message: string;
  field?: string;
  details?: string[];
  path?: string;
  timestamp: string;
  requestId?: string;
}

const STATUS_BY_ERROR: ReadonlyArray<[new (...args: never[]) => ApplicationError, HttpStatus]> = [
  [InvalidCredentialsError, HttpStatus.UNAUTHORIZED],
  [SessionExpiredError, HttpStatus.UNAUTHORIZED],
  [UpstreamServiceError, HttpStatus.BAD_GATEWAY],
  [UnsupportedAuthProviderError, HttpStatus.BAD_REQUEST],
  [ValidationError, HttpStatus.BAD_REQUEST],
  [NotFoundError, HttpStatus.NOT_FOUND],
  [ConflictError, HttpStatus.CONFLICT],
  [ForbiddenError, HttpStatus.FORBIDDEN],
  [PayloadTooLargeError, HttpStatus.PAYLOAD_TOO_LARGE],
  [ServiceUnavailableError, HttpStatus.SERVICE_UNAVAILABLE],
];

const HTTP_ERROR_NAMES: Record<number, string> = {
  400: 'BadRequest',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'NotFound',
  405: 'MethodNotAllowed',
  409: 'Conflict',
  413: 'PayloadTooLarge',
  415: 'UnsupportedMediaType',
  422: 'UnprocessableEntity',
  429: 'TooManyRequests',
  503: 'ServiceUnavailable',
};

/**
 * Unico ponto do sistema que converte erros em respostas HTTP.
 *
 * E aqui, na borda, que o vocabulario muda de "credenciais invalidas" para
 * "401". As classes do nucleo nao precisam saber que existe HTTP. O filtro
 * tambem padroniza os erros do proprio Nest (validacao de DTO, rota
 * inexistente...) e esconde detalhes de erros inesperados.
 */
@Catch()
export class ApplicationErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApplicationErrorFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const response = http.getResponse<Response>();
    const request = http.getRequest<Request | undefined>();
    const body = toErrorBody(exception);

    body.path = request?.originalUrl ?? request?.url;
    const requestId = currentRequestId();
    if (requestId) {
      body.requestId = requestId;
    }

    if (body.statusCode === Number(HttpStatus.INTERNAL_SERVER_ERROR)) {
      // Erro nao previsto: a pilha vai para o log, nunca para o cliente.
      const stack = exception instanceof Error ? exception.stack : String(exception);
      const detail = exception instanceof Error ? exception.message : body.message;
      this.logger.error(`${body.error}: ${detail} [${requestId ?? '-'}]`, stack);
    } else if (body.statusCode > Number(HttpStatus.INTERNAL_SERVER_ERROR)) {
      // Dependencia externa indisponivel ou nao configurada: previsto, sem pilha.
      this.logger.warn(`${body.error}: ${body.message} [${requestId ?? '-'}]`);
    }

    if (response.headersSent) {
      // Streaming ja iniciado (SSE): nao ha mais como trocar o status.
      response.end();
      return;
    }

    response.status(body.statusCode).json(body);
  }
}

function toHttpStatus(exception: ApplicationError): HttpStatus {
  const match = STATUS_BY_ERROR.find(([type]) => exception instanceof type);
  return match ? match[1] : HttpStatus.INTERNAL_SERVER_ERROR;
}

/**
 * Corpo padrao de erro para qualquer excecao. Tambem usado pelo streaming do
 * chat, que relata erros como evento depois que a resposta ja comecou.
 */
export function toErrorBody(exception: unknown): ErrorResponseBody {
  const timestamp = new Date().toISOString();

  if (exception instanceof ApplicationError) {
    const statusCode = toHttpStatus(exception);
    return {
      statusCode,
      error: exception.name,
      message: exception.message,
      ...(exception.field ? { field: exception.field } : {}),
      timestamp,
    };
  }

  if (exception instanceof HttpException) {
    const statusCode = exception.getStatus();
    const payload = exception.getResponse();
    const object =
      typeof payload === 'string' ? {} : (payload as { message?: unknown; field?: unknown });
    const raw = typeof payload === 'string' ? payload : (object.message ?? exception.message);
    const details = Array.isArray(raw) ? raw.map(String) : undefined;
    const message = details
      ? (details[0] ?? exception.message)
      : typeof raw === 'string'
        ? raw
        : exception.message;
    return {
      statusCode,
      error: details ? 'ValidationError' : (HTTP_ERROR_NAMES[statusCode] ?? exception.name),
      message,
      ...(typeof object.field === 'string' ? { field: object.field } : {}),
      ...(details ? { details } : {}),
      timestamp,
    };
  }

  return {
    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    error: 'InternalServerError',
    message: 'Erro inesperado. Tente novamente em instantes.',
    timestamp,
  };
}
