import { Inject, Injectable } from '@nestjs/common';
import { TRANSACTION_MANAGER, type TransactionManager } from '../../../database/transaction';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../../shared/errors/application-error';
import { AuditService } from '../../audit/application/audit.service';
import { AuditAction } from '../../audit/domain/audit';
import { USER_REPOSITORY, type UserRepository } from '../domain/contracts/user.repository';
import {
  toAccountProfile,
  type AccountProfile,
  type UpdateUserProfileData,
  type User,
} from '../domain/entities/user';

/**
 * "Gerenciar conta" do prototipo: consultar e editar o perfil e excluir a conta.
 *
 * Excluir a conta remove em cascata sessoes, preferencias, espacos, tarefas,
 * conversas, mensagens e notificacoes: nada do usuario permanece no banco.
 */
@Injectable()
export class AccountService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(TRANSACTION_MANAGER) private readonly transactions: TransactionManager,
    private readonly audit: AuditService,
  ) {}

  async getProfile(userId: string): Promise<AccountProfile> {
    return toAccountProfile(await this.requireUser(userId));
  }

  async updateProfile(userId: string, changes: UpdateUserProfileData): Promise<AccountProfile> {
    return this.transactions.run(async () => {
      const user = await this.requireUser(userId);
      if (user.isGuest) {
        throw new ForbiddenError(
          'Contas de convidado nao tem perfil editavel. Crie uma conta para salvar seus dados.',
        );
      }

      const data: { name?: string; username?: string; email?: string } = {};
      if (changes.name !== undefined && changes.name !== user.name) {
        data.name = changes.name;
      }
      if (changes.username !== undefined && changes.username !== user.username) {
        const owner = await this.users.findByUsername(changes.username);
        if (owner && owner.id !== user.id) {
          throw new ConflictError(
            'Esse nome de usuario ja esta em uso. Escolha outro.',
            'username',
          );
        }
        data.username = changes.username;
      }
      if (changes.email !== undefined && changes.email !== user.email) {
        const owner = await this.users.findByEmail(changes.email);
        if (owner && owner.id !== user.id) {
          throw new ConflictError('Ja existe uma conta com esse e-mail.', 'email');
        }
        data.email = changes.email;
      }

      if (Object.keys(data).length === 0) {
        return toAccountProfile(user);
      }

      const updated = await this.users.updateProfile(user.id, data);
      await this.audit.record({
        userId: user.id,
        action: AuditAction.AccountUpdated,
        entityType: 'user',
        entityId: user.id,
        metadata: { fields: Object.keys(data) },
      });
      return toAccountProfile(updated);
    });
  }

  async deleteAccount(userId: string): Promise<void> {
    await this.transactions.run(async () => {
      const user = await this.requireUser(userId);
      await this.users.delete(user.id);
      // O usuario deixa de existir: o registro fica sem dono, apenas com o id removido.
      await this.audit.record({
        userId: null,
        action: AuditAction.AccountDeleted,
        entityType: 'user',
        entityId: user.id,
        metadata: { guest: user.isGuest },
      });
    });
  }

  private async requireUser(userId: string): Promise<User> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new NotFoundError('Conta nao encontrada.');
    }
    return user;
  }
}
