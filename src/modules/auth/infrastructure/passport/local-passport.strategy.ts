import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../../application/auth.service';
import type { AuthIdentity } from '../../domain/entities/auth-session';

/**
 * ADAPTADOR. Nao confundir com a `AuthStrategy` do dominio.
 *
 * Existem duas coisas chamadas "strategy" neste projeto:
 *
 *   - `EmailPasswordAuthStrategy` -> regra de negocio (application/)
 *   - `LocalPassportStrategy`     -> plumbing HTTP do Passport (infrastructure/)
 *
 * Esta classe nao decide nada: ela extrai `email` e `password` da request e
 * delega. Se o Passport fosse removido amanha, a regra continuaria intacta.
 */
@Injectable()
export class LocalPassportStrategy extends PassportStrategy(Strategy, 'local') {
  constructor(private readonly auth: AuthService) {
    super({ usernameField: 'email', passwordField: 'password' });
  }

  /** O retorno vira `request.user`. */
  async validate(email: string, password: string): Promise<AuthIdentity> {
    return this.auth.authenticate('email', { email, password });
  }
}
