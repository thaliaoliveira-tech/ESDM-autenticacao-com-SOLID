import type { AuthIdentity, AuthProvider } from '../entities/auth-session';

/** Token de injecao do array de Strategies registradas. */
export const AUTH_STRATEGIES = Symbol('AuthStrategies');

/**
 * A abstracao central do projeto.
 *
 * Cada mecanismo de autenticacao e uma implementacao substituivel deste
 * contrato. Uma Strategy responde a UMA pergunta:
 *
 *     "quem e o usuario por tras desta entrada?"
 *
 * Contrato de comportamento (Liskov) que toda implementacao deve honrar:
 *  - sucesso           -> retorna uma AuthIdentity valida;
 *  - falha de credencial -> lanca InvalidCredentialsError;
 *  - falha do provedor -> lanca AuthenticationProviderError.
 *
 * Nenhuma implementacao pode lancar "nao suportado" para `authenticate`: o
 * metodo e obrigatorio, e quem o recusasse quebraria a substituibilidade.
 */
export interface AuthStrategy<TInput = unknown> {
  /** Identifica a Strategy no registro. Deve ser unico. */
  readonly provider: AuthProvider;

  authenticate(input: TInput): Promise<AuthIdentity>;
}
