/**
 * Erro de aplicacao independente de HTTP.
 *
 * O nucleo (dominio + aplicacao) nao deve lancar `UnauthorizedException` do
 * Nest: isso amarraria as regras de negocio ao framework HTTP. Ele lanca estes
 * erros, e um filtro na borda os traduz para respostas HTTP.
 */
export abstract class ApplicationError extends Error {
  protected constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** Credenciais invalidas: usuario inexistente OU senha incorreta. */
export class InvalidCredentialsError extends ApplicationError {
  constructor(message = 'Credenciais invalidas.') {
    super(message);
  }
}

/** O provedor de autenticacao externo falhou ou devolveu um perfil inutilizavel. */
export class AuthenticationProviderError extends ApplicationError {
  constructor(message = 'Falha ao autenticar no provedor externo.') {
    super(message);
  }
}

/** Nenhuma Strategy registrada atende ao provider solicitado. */
export class UnsupportedAuthProviderError extends ApplicationError {
  constructor(provider: string) {
    super(`Provedor de autenticacao nao suportado: "${provider}".`);
  }
}
