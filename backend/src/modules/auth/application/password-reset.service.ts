import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AuthConfig } from '../../../config/auth.config';
import { TRANSACTION_MANAGER, type TransactionManager } from '../../../database/transaction';
import { CLOCK, type Clock } from '../../../shared/domain/clock';
import { NotFoundError, ValidationError } from '../../../shared/errors/application-error';
import { AuditService } from '../../audit/application/audit.service';
import { AuditAction } from '../../audit/domain/audit';
import { USER_REPOSITORY, type UserRepository } from '../../users/domain/contracts/user.repository';
import { PASSWORD_HASHER, type PasswordHasher } from '../domain/contracts/password-hasher';
import {
  PASSWORD_RESET_REPOSITORY,
  type PasswordResetRepository,
} from '../domain/contracts/password-reset';
import {
  SECURE_TOKEN_GENERATOR,
  type SecureTokenGenerator,
} from '../domain/contracts/secure-token';
import { SessionService } from './session.service';

export const INVALID_RESET_LINK =
  'Esse link expirou, ja foi usado ou e invalido. Solicite um novo link.';

export const ACCOUNT_NOT_FOUND_FOR_EMAIL = 'Nao ha conta cadastrada com esse e-mail.';

/** Link de redefinicao gerado, devolvido diretamente a quem o solicitou. */
export interface PasswordResetLink {
  readonly email: string;
  readonly name: string;
  readonly token: string;
  readonly resetUrl: string;
  readonly expiresAt: Date;
}

/**
 * "Esqueceu a senha?" do prototipo, agora com garantias reais:
 *  - link de uso unico, valido por 30 minutos (configuravel);
 *  - gerar outro link invalida o anterior;
 *  - o banco guarda apenas o hash do token;
 *  - redefinir a senha encerra todas as sessoes da conta.
 *
 * O projeto nao tem servico de e-mail: o link e devolvido na propria resposta
 * de POST /auth/password/forgot (como no prototipo: "o link aparecera aqui").
 * Por isso um e-mail desconhecido responde 404 -- nao ha o que esconder quando
 * o proprio link vai na resposta.
 */
@Injectable()
export class PasswordResetService {
  private readonly ttlMs: number;
  private readonly baseUrl: string;

  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_RESET_REPOSITORY) private readonly resets: PasswordResetRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(SECURE_TOKEN_GENERATOR) private readonly secureTokens: SecureTokenGenerator,
    @Inject(TRANSACTION_MANAGER) private readonly transactions: TransactionManager,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly sessions: SessionService,
    private readonly audit: AuditService,
    config: ConfigService,
  ) {
    const auth = config.getOrThrow<AuthConfig>('auth');
    this.ttlMs = auth.passwordReset.ttlMinutes * 60_000;
    this.baseUrl = auth.passwordReset.url;
  }

  async request(emailInput: string): Promise<PasswordResetLink> {
    const email = emailInput.trim().toLowerCase();
    const expiresAt = new Date(this.clock.now().getTime() + this.ttlMs);
    const user = await this.users.findByEmail(email);
    if (!user) {
      throw new NotFoundError(ACCOUNT_NOT_FOUND_FOR_EMAIL);
    }

    const token = this.secureTokens.generate();
    await this.transactions.run(async () => {
      await this.resets.deleteUnusedForUser(user.id);
      await this.resets.create({
        userId: user.id,
        tokenHash: this.secureTokens.hash(token),
        expiresAt,
      });
      await this.audit.record({
        userId: user.id,
        action: AuditAction.PasswordResetRequested,
        entityType: 'user',
        entityId: user.id,
      });
    });

    return {
      email,
      name: user.name,
      token,
      resetUrl: `${this.baseUrl}${token}`,
      expiresAt,
    };
  }

  async reset(token: string, newPassword: string): Promise<void> {
    if (!this.secureTokens.isWellFormed(token)) {
      throw new ValidationError(INVALID_RESET_LINK, 'token');
    }
    const now = this.clock.now();
    const record = await this.resets.findByTokenHash(this.secureTokens.hash(token));
    if (!record || record.usedAt !== null || record.expiresAt.getTime() <= now.getTime()) {
      throw new ValidationError(INVALID_RESET_LINK, 'token');
    }

    // Argon2 e lento de proposito: calculado fora da transacao.
    const passwordHash = await this.hasher.hash(newPassword);

    await this.transactions.run(async () => {
      if (!(await this.resets.markUsed(record.id, now))) {
        throw new ValidationError(INVALID_RESET_LINK, 'token');
      }
      const user = await this.users.findById(record.userId);
      if (!user) {
        throw new ValidationError(INVALID_RESET_LINK, 'token');
      }
      await this.users.updatePasswordHash(user.id, passwordHash);
      await this.resets.deleteUnusedForUser(user.id);
      await this.sessions.endAllForUser(user.id);
      await this.audit.record({
        userId: user.id,
        action: AuditAction.PasswordResetCompleted,
        entityType: 'user',
        entityId: user.id,
      });
    });
  }

  async purgeStale(): Promise<number> {
    return this.resets.deleteStale(this.clock.now());
  }
}
