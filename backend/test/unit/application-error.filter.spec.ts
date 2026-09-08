import type { ArgumentsHost } from '@nestjs/common';
import { ApplicationErrorFilter } from '../../src/shared/errors/application-error.filter';
import {
  ApplicationError,
  AuthenticationProviderError,
  InvalidCredentialsError,
  UnsupportedAuthProviderError,
} from '../../src/shared/errors/application-error';

class ErroDesconhecido extends ApplicationError {
  constructor() {
    super('algo inesperado');
  }
}

describe('ApplicationErrorFilter', () => {
  const buildHost = () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const host = {
      switchToHttp: () => ({ getResponse: () => ({ status }) }),
    } as unknown as ArgumentsHost;

    return { host, status, json };
  };

  it.each([
    [new InvalidCredentialsError(), 401],
    [new AuthenticationProviderError(), 502],
    [new UnsupportedAuthProviderError('facebook'), 400],
    [new ErroDesconhecido(), 500],
  ])('traduz %s para o status correto', (error: ApplicationError, expected: number) => {
    const { host, status, json } = buildHost();

    new ApplicationErrorFilter().catch(error, host);

    expect(status).toHaveBeenCalledWith(expected);
    expect(json).toHaveBeenCalledWith({
      statusCode: expected,
      error: error.name,
      message: error.message,
    });
  });

  it('preserva o nome da classe do erro na resposta', () => {
    const { host, json } = buildHost();

    new ApplicationErrorFilter().catch(new InvalidCredentialsError(), host);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'InvalidCredentialsError' }),
    );
  });
});
