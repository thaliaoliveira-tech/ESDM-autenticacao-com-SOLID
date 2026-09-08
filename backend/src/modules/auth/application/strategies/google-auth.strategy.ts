import { Inject, Injectable } from '@nestjs/common';
import type { AuthStrategy } from '../../domain/contracts/auth-strategy';
import type { AuthIdentity, AuthProvider } from '../../domain/entities/auth-session';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../../users/domain/contracts/user.repository';
import { AuthenticationProviderError } from '../../../../shared/errors/application-error';

/**
 * Perfil vindo do Google, ja normalizado.
 *
 * Note que este tipo NAO e o `Profile` da biblioteca passport-google-oauth20.
 * O adaptador de infraestrutura traduz um no outro, e assim a regra de negocio
 * nao depende do formato da lib.
 */
export interface GoogleProfile {
  readonly googleId: string;
  readonly email: string;
  readonly name: string;
}

/**
 * Autenticacao via Google.
 *
 * Esta e a classe que prova, na pratica, o Open/Closed: para adiciona-la nao
 * foi preciso alterar uma linha de `EmailPasswordAuthStrategy`, `AuthService`,
 * `AuthController`, `JwtTokenService` ou `PrismaUserRepository`.
 */
@Injectable()
export class GoogleAuthStrategy implements AuthStrategy<GoogleProfile> {
  readonly provider: AuthProvider = 'google';

  constructor(@Inject(USER_REPOSITORY) private readonly users: UserRepository) {}

  async authenticate(input: GoogleProfile): Promise<AuthIdentity> {
    if (!input.googleId || !input.email) {
      throw new AuthenticationProviderError('Perfil do Google incompleto.');
    }

    const email = input.email.trim().toLowerCase();

    // 1. Ja autenticou por Google antes.
    const byGoogleId = await this.users.findByGoogleId(input.googleId);
    if (byGoogleId) {
      return this.toIdentity(byGoogleId.id, byGoogleId.email, byGoogleId.name);
    }

    // 2. Existe uma conta local com o mesmo e-mail: vinculamos as duas.
    const byEmail = await this.users.findByEmail(email);
    if (byEmail) {
      const linked = await this.users.linkGoogleAccount(byEmail.id, input.googleId);
      return this.toIdentity(linked.id, linked.email, linked.name);
    }

    // 3. Primeiro acesso: criamos o usuario sem senha local.
    const created = await this.users.createFromGoogle({
      googleId: input.googleId,
      email,
      name: input.name || email,
    });
    return this.toIdentity(created.id, created.email, created.name);
  }

  private toIdentity(userId: string, email: string, name: string): AuthIdentity {
    return { userId, email, name, provider: this.provider };
  }
}
