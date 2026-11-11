/** Provedores de autenticacao suportados. */
export const AUTH_PROVIDERS = ['email', 'guest'] as const;

export type AuthProvider = (typeof AUTH_PROVIDERS)[number];

export function isAuthProvider(value: unknown): value is AuthProvider {
  return AUTH_PROVIDERS.includes(value as AuthProvider);
}

/**
 * Resposta de uma AuthStrategy: "quem e esse usuario?".
 *
 * Repare que nao ha token aqui. Emitir token e outra responsabilidade, de
 * outro contrato (TokenService). Misturar as duas coisas produziria uma
 * interface gorda e amarraria toda Strategy ao formato JWT.
 */
export interface AuthIdentity {
  readonly userId: string;
  /** Nulo para convidados. */
  readonly email: string | null;
  readonly name: string;
  readonly provider: AuthProvider;
}

/** Identidade de uma requisicao autenticada: inclui a sessao que emitiu o token. */
export interface AuthenticatedUser extends AuthIdentity {
  readonly sessionId: string;
}

/** Sessao emitida pela aplicacao apos uma identidade ser confirmada. */
export interface AuthSession {
  readonly accessToken: string;
  /** Opaco e rotativo: cada uso em /auth/refresh devolve um novo e invalida o anterior. */
  readonly refreshToken: string;
  readonly tokenType: 'Bearer';
  readonly expiresIn: string;
  readonly refreshTokenExpiresAt: string;
  readonly user: AuthIdentity;
}
