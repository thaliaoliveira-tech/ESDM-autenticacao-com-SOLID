import { Inject, Injectable } from '@nestjs/common';
import { ConflictError, ValidationError } from '../../../shared/errors/application-error';
import { AuditService } from '../../audit/application/audit.service';
import { AuditAction } from '../../audit/domain/audit';
import { USER_REPOSITORY, type UserRepository } from '../../users/domain/contracts/user.repository';
import { USERNAME_MESSAGE, USERNAME_PATTERN } from '../../users/domain/entities/user';
import { PASSWORD_HASHER, type PasswordHasher } from '../domain/contracts/password-hasher';
import type { AuthIdentity } from '../domain/entities/auth-session';

export interface RegistrationInput {
  readonly username: string;
  readonly email: string;
  readonly password: string;
  readonly name?: string;
}

/**
 * Cadastro por e-mail e senha (tela 3 do prototipo).
 *
 * As checagens previas dao mensagens especificas por campo; a constraint
 * unica do banco continua sendo a garantia final contra corridas, e o
 * repositorio a traduz no mesmo `ConflictError`.
 */
@Injectable()
export class RegistrationService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    private readonly audit: AuditService,
  ) {}

  async register(input: RegistrationInput): Promise<AuthIdentity> {
    const username = input.username.trim().toLowerCase();
    const email = input.email.trim().toLowerCase();
    if (!USERNAME_PATTERN.test(username)) {
      throw new ValidationError(USERNAME_MESSAGE, 'username');
    }

    if (await this.users.findByUsername(username)) {
      throw new ConflictError('Esse nome de usuario ja esta em uso. Escolha outro.', 'username');
    }
    if (await this.users.findByEmail(email)) {
      throw new ConflictError('Ja existe uma conta com esse e-mail. Use a tela Entrar.', 'email');
    }

    const user = await this.users.createLocal({
      name: input.name?.trim() || username,
      username,
      email,
      passwordHash: await this.hasher.hash(input.password),
    });

    await this.audit.record({
      userId: user.id,
      action: AuditAction.Register,
      entityType: 'user',
      entityId: user.id,
    });

    return { userId: user.id, email, name: user.name, provider: 'email' };
  }
}
