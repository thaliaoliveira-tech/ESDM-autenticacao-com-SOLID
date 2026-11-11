/**
 * Erro de aplicacao independente de HTTP.
 *
 * O nucleo (dominio + aplicacao) nao deve lancar `UnauthorizedException` do
 * Nest: isso amarraria as regras de negocio ao framework HTTP. Ele lanca estes
 * erros, e um filtro na borda os traduz para respostas HTTP.
 *
 * `field` aponta o campo do formulario relacionado ao erro (quando houver),
 * permitindo que o frontend destaque o campo certo, como o prototipo faz.
 */
export abstract class ApplicationError extends Error {
  readonly field?: string;

  protected constructor(message: string, field?: string) {
    super(message);
    this.name = new.target.name;
    if (field) {
      this.field = field;
    }
  }
}

/** Credenciais invalidas: usuario inexistente OU senha incorreta. */
export class InvalidCredentialsError extends ApplicationError {
  constructor(message = 'Credenciais invalidas.') {
    super(message);
  }
}

/** Nenhuma Strategy registrada atende ao provider solicitado. */
export class UnsupportedAuthProviderError extends ApplicationError {
  constructor(provider: string) {
    super(`Provedor de autenticacao nao suportado: "${provider}".`);
  }
}

/** Dado de entrada viola uma regra de negocio (ex.: data invalida, nome vazio). */
export class ValidationError extends ApplicationError {
  constructor(message: string, field?: string) {
    super(message, field);
  }
}

/** O recurso nao existe ou nao pertence ao usuario autenticado. */
export class NotFoundError extends ApplicationError {
  constructor(message = 'Recurso nao encontrado.') {
    super(message);
  }
}

/** Conflito com o estado atual (duplicidade, proposta ja resolvida...). */
export class ConflictError extends ApplicationError {
  constructor(message: string, field?: string) {
    super(message, field);
  }
}

/** Operacao nao permitida para este usuario (ex.: convidado editando e-mail). */
export class ForbiddenError extends ApplicationError {
  constructor(message = 'Operacao nao permitida.') {
    super(message);
  }
}

/** Sessao expirada, revogada ou refresh token invalido. */
export class SessionExpiredError extends ApplicationError {
  constructor(message = 'Sua sessao expirou. Entre novamente.') {
    super(message);
  }
}

/** Arquivo grande demais para ser processado. */
export class PayloadTooLargeError extends ApplicationError {
  constructor(message: string) {
    super(message);
  }
}

/** Uma dependencia necessaria nao esta configurada (ex.: chave da IA ausente). */
export class ServiceUnavailableError extends ApplicationError {
  constructor(message: string) {
    super(message);
  }
}

/** Um servico externo (ex.: OpenRouter) recusou ou interrompeu a operacao. */
export class UpstreamServiceError extends ApplicationError {
  constructor(message: string) {
    super(message);
  }
}
