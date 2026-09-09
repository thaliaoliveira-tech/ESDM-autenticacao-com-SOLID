import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import type { Response } from 'express';
import {
  ApplicationError,
  AuthenticationProviderError,
  InvalidCredentialsError,
  UnsupportedAuthProviderError,
} from './application-error';

/**
 * Unico ponto do sistema que converte erro de aplicacao em status HTTP.
 *
 * E aqui, na borda, que o vocabulario muda de "credenciais invalidas" para
 * "401". As classes do nucleo nao precisam saber que existe HTTP.
 */
@Catch(ApplicationError)
export class ApplicationErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApplicationErrorFilter.name);

  catch(exception: ApplicationError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status = this.toHttpStatus(exception);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(exception.message, exception.stack);
    }

    response.status(status).json({
      statusCode: status,
      error: exception.name,
      message: exception.message,
    });
  }

  private toHttpStatus(exception: ApplicationError): HttpStatus {
    if (exception instanceof InvalidCredentialsError) {
      return HttpStatus.UNAUTHORIZED;
    }
    if (exception instanceof AuthenticationProviderError) {
      return HttpStatus.BAD_GATEWAY;
    }
    if (exception instanceof UnsupportedAuthProviderError) {
      return HttpStatus.BAD_REQUEST;
    }
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }
}
