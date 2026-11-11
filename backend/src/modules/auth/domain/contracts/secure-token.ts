export const SECURE_TOKEN_GENERATOR = Symbol('SecureTokenGenerator');

/**
 * Tokens opacos (refresh token, link de redefinicao de senha).
 *
 * O valor em claro vai apenas para o cliente; o banco guarda so o `hash`.
 * Um vazamento do banco nao permite usar nenhum token.
 */
export interface SecureTokenGenerator {
  generate(): string;
  hash(token: string): string;
  /** Formato aceito, para rejeitar lixo antes de consultar o banco. */
  isWellFormed(token: string): boolean;
}
