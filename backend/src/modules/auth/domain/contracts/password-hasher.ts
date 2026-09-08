export const PASSWORD_HASHER = Symbol('PasswordHasher');

/**
 * Contrato de hashing de senha.
 *
 * Duas operacoes, nada alem disso. O algoritmo (Argon2 hoje, outro amanha) e
 * um detalhe que vive na infraestrutura.
 */
export interface PasswordHasher {
  hash(plainPassword: string): Promise<string>;
  verify(plainPassword: string, hash: string): Promise<boolean>;
}
