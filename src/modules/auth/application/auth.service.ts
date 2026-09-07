import { Inject, Injectable } from '@nestjs/common';
import { AUTH_STRATEGIES, type AuthStrategy } from '../domain/contracts/auth-strategy';
import { TOKEN_SERVICE, type TokenService } from '../domain/contracts/token-service';
import type { AuthIdentity, AuthProvider, AuthSession } from '../domain/entities/auth-session';
import { UnsupportedAuthProviderError } from '../../../shared/errors/application-error';

/**
 * Orquestra o caso de uso de autenticacao.
 *
 * Repare no que NAO existe aqui:
 *
 *     if (provider === 'google') { ... } else { ... }
 *
 * A escolha da Strategy e uma consulta a um registro montado por injecao de
 * dependencia. Registrar uma terceira Strategy amanha nao muda esta classe --
 * e exatamente esse o criterio de sucesso do exercicio.
 */
@Injectable()
export class AuthService {
  private readonly registry: ReadonlyMap<AuthProvider, AuthStrategy<unknown>>;

  constructor(
    @Inject(AUTH_STRATEGIES) strategies: readonly AuthStrategy<never>[],
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenService,
  ) {
    const registry = new Map<AuthProvider, AuthStrategy<unknown>>();

    for (const strategy of strategies) {
      if (registry.has(strategy.provider)) {
        throw new Error(
          `Mais de uma AuthStrategy registrada para o provider "${strategy.provider}".`,
        );
      }
      registry.set(strategy.provider, strategy);
    }

    this.registry = registry;
  }

  /** Providers efetivamente registrados. Util para diagnostico e testes. */
  get availableProviders(): AuthProvider[] {
    return [...this.registry.keys()];
  }

  /** Etapa 1: descobrir quem e o usuario. */
  async authenticate<TInput>(provider: AuthProvider, input: TInput): Promise<AuthIdentity> {
    const strategy = this.registry.get(provider);
    if (!strategy) {
      throw new UnsupportedAuthProviderError(provider);
    }
    return strategy.authenticate(input);
  }

  /** Etapa 2: emitir a sessao para uma identidade ja confirmada. */
  async issueSession(identity: AuthIdentity): Promise<AuthSession> {
    const accessToken = await this.tokens.generate(identity);

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: this.tokens.expiresIn,
      user: identity,
    };
  }

  /**
   * Caso de uso completo. Se `authenticate` lancar, `issueSession` nunca roda:
   * nao existe caminho que emita token sem identidade confirmada.
   */
  async login<TInput>(provider: AuthProvider, input: TInput): Promise<AuthSession> {
    const identity = await this.authenticate(provider, input);
    return this.issueSession(identity);
  }
}
