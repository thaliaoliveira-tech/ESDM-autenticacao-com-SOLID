import type { AuthIdentity } from '../entities/auth-session';

export const TOKEN_SERVICE = Symbol('TokenService');

/** Conteudo do token, ja traduzido para o vocabulario da aplicacao. */
export interface TokenPayload {
  readonly subject: string;
  readonly email: string;
  readonly provider: string;
}

/**
 * Contrato de emissao/leitura de tokens.
 *
 * A palavra "JWT" nao aparece aqui de proposito: JWT e a implementacao
 * escolhida, nao o contrato. Trocar por token opaco nao mexeria no nucleo.
 */
export interface TokenService {
  generate(identity: AuthIdentity): Promise<string>;
  verify(token: string): Promise<TokenPayload>;
  /** Tempo de vida configurado, para exibir na resposta da sessao. */
  readonly expiresIn: string;
}
