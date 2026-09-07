/** Provedores de autenticacao suportados. */
export const AUTH_PROVIDERS = ['email', 'google'] as const;

export type AuthProvider = (typeof AUTH_PROVIDERS)[number];

/**
 * Resposta de uma AuthStrategy: "quem e esse usuario?".
 *
 * Repare que nao ha token aqui. Emitir token e outra responsabilidade, de
 * outro contrato (TokenService). Misturar as duas coisas produziria uma
 * interface gorda e amarraria toda Strategy ao formato JWT.
 */
export interface AuthIdentity {
  readonly userId: string;
  readonly email: string;
  readonly name: string;
  readonly provider: AuthProvider;
}

/** Sessao emitida pela aplicacao apos uma identidade ser confirmada. */
export interface AuthSession {
  readonly accessToken: string;
  readonly tokenType: 'Bearer';
  readonly expiresIn: string;
  readonly user: AuthIdentity;
}
