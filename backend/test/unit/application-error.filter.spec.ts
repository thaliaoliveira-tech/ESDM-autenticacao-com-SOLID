import { BadRequestException, NotFoundException, type ArgumentsHost } from '@nestjs/common';
import {
  ApplicationErrorFilter,
  toErrorBody,
} from '../../src/shared/errors/application-error.filter';
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
} from '../../src/shared/errors/application-error';

class ErroDesconhecido extends ApplicationError {
  constructor() {
    super('algo inesperado');
  }
}

describe('ApplicationErrorFilter', () => {
  const buildHost = (headersSent = false) => {
    const json = jest.fn();
    const end = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status, headersSent, end }),
        getRequest: () => ({ originalUrl: '/tasks/1' }),
      }),
    } as unknown as ArgumentsHost;

    return { host, status, json, end };
  };

  it.each([
    [new InvalidCredentialsError(), 401],
    [new SessionExpiredError(), 401],
    [new UpstreamServiceError('x'), 502],
    [new UnsupportedAuthProviderError('facebook'), 400],
    [new ValidationError('x'), 400],
    [new NotFoundError(), 404],
    [new ConflictError('x'), 409],
    [new ForbiddenError(), 403],
    [new PayloadTooLargeError('x'), 413],
    [new ServiceUnavailableError('x'), 503],
    [new ErroDesconhecido(), 500],
  ])('traduz %s para o status correto', (error: ApplicationError, expected: number) => {
    const { host, status, json } = buildHost();

    new ApplicationErrorFilter().catch(error, host);

    expect(status).toHaveBeenCalledWith(expected);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: expected,
        error: error.name,
        message: error.message,
        path: '/tasks/1',
        timestamp: expect.any(String) as string,
      }),
    );
  });

  it('inclui o campo relacionado ao erro quando existe', () => {
    const { host, json } = buildHost();

    new ApplicationErrorFilter().catch(new ConflictError('duplicado', 'email'), host);

    expect(json).toHaveBeenCalledWith(expect.objectContaining({ field: 'email' }));
  });

  it('padroniza erros de validacao do Nest com a lista de detalhes', () => {
    const body = toErrorBody(new BadRequestException(['a invalido', 'b invalido']));

    expect(body).toMatchObject({
      statusCode: 400,
      error: 'ValidationError',
      message: 'a invalido',
      details: ['a invalido', 'b invalido'],
    });
  });

  it('padroniza HttpException simples', () => {
    expect(toErrorBody(new NotFoundException('Cannot GET /x'))).toMatchObject({
      statusCode: 404,
      error: 'NotFound',
      message: 'Cannot GET /x',
    });
  });

  it('esconde detalhes de erros inesperados', () => {
    const { host, status, json } = buildHost();

    new ApplicationErrorFilter().catch(new Error('segredo interno'), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(JSON.stringify(json.mock.calls[0])).not.toContain('segredo interno');
  });

  it('apenas encerra a resposta quando o streaming ja comecou', () => {
    const { host, status, end } = buildHost(true);

    new ApplicationErrorFilter().catch(new UpstreamServiceError('caiu'), host);

    expect(status).not.toHaveBeenCalled();
    expect(end).toHaveBeenCalled();
  });

  it('preserva o nome da classe do erro na resposta', () => {
    const { host, json } = buildHost();

    new ApplicationErrorFilter().catch(new InvalidCredentialsError(), host);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'InvalidCredentialsError' }),
    );
  });
});
