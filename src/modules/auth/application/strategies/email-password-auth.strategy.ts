import { Inject, Injectable } from '@nestjs/common';
import { PASSWORD_HASHER, type PasswordHasher } from '../../domain/contracts/password-hasher';
import type { AuthStrategy } from '../../domain/contracts/auth-strategy';
import type { AuthIdentity, AuthProvider } from '../../domain/entities/auth-session';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../../users/domain/contracts/user.repository';
import { InvalidCredentialsError } from '../../../../shared/errors/application-error';

/** Entrada esperada pela autenticacao local. */
export interface EmailPasswordCredentials {
  readonly email: string;
  readonly password: string;
}

/**
 * Autenticacao por e-mail e senha.
 *
 * Depende de DUAS abstracoes (UserRepository e PasswordHasher) e de nenhuma
 * classe concreta: nao ha `PrismaService` nem `import * as argon2` aqui. E por
 * isso que esta classe pode ser testada com fakes, sem banco e sem Nest.
 */
@Injectable()
export class EmailPasswordAuthStrategy implements AuthStrategy<EmailPasswordCredentials> {
  readonly provider: AuthProvider = 'email';

  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
  ) {}

  async authenticate(input: EmailPasswordCredentials): Promise<AuthIdentity> {
    const email = input.email.trim().toLowerCase();
    const user = await this.users.findByEmail(email);

    // Usuario inexistente e senha errada produzem exatamente o mesmo erro,
    // de proposito: mensagens diferentes permitiriam descobrir quais e-mails
    // estao cadastrados.
    if (!user || user.passwordHash === null) {
      throw new InvalidCredentialsError();
    }

    const passwordMatches = await this.hasher.verify(input.password, user.passwordHash);
    if (!passwordMatches) {
      throw new InvalidCredentialsError();
    }

    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      provider: this.provider,
    };
  }
}
