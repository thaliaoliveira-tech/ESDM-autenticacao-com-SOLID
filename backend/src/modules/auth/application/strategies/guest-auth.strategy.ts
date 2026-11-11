import { Inject, Injectable } from '@nestjs/common';
import type { AuthStrategy } from '../../domain/contracts/auth-strategy';
import type { AuthIdentity, AuthProvider } from '../../domain/entities/auth-session';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../../users/domain/contracts/user.repository';

export const GUEST_NAME = 'Convidado';

/**
 * "Continue como convidado".
 *
 * Terceira Strategy do sistema, adicionada sem tocar em AuthService,
 * AuthController ou nas Strategies existentes (Open/Closed). Cada convidado
 * ganha um usuario proprio, sem credenciais: seus dados ficam isolados dos
 * demais e sao removidos pela manutencao apos a retencao configurada.
 */
@Injectable()
export class GuestAuthStrategy implements AuthStrategy<void> {
  readonly provider: AuthProvider = 'guest';

  constructor(@Inject(USER_REPOSITORY) private readonly users: UserRepository) {}

  async authenticate(): Promise<AuthIdentity> {
    const guest = await this.users.createGuest(GUEST_NAME);
    return { userId: guest.id, email: null, name: guest.name, provider: this.provider };
  }
}
