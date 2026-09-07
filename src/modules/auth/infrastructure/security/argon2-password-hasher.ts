import { Injectable, Logger } from '@nestjs/common';
import * as argon2 from 'argon2';
import type { PasswordHasher } from '../../domain/contracts/password-hasher';

/**
 * Implementacao de `PasswordHasher` com Argon2id.
 *
 * Trocar Argon2 por bcrypt significaria criar uma nova classe aqui e mudar uma
 * linha do modulo. Nenhuma Strategy, nenhum service e nenhum teste de dominio
 * precisaria ser tocado -- e esse o ganho concreto de depender do contrato.
 */
@Injectable()
export class Argon2PasswordHasher implements PasswordHasher {
  private readonly logger = new Logger(Argon2PasswordHasher.name);

  private readonly options: argon2.Options = {
    type: argon2.argon2id,
    memoryCost: 19456, // 19 MiB, recomendacao OWASP
    timeCost: 2,
    parallelism: 1,
  };

  async hash(plainPassword: string): Promise<string> {
    return argon2.hash(plainPassword, this.options);
  }

  async verify(plainPassword: string, hash: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plainPassword);
    } catch (error) {
      // Hash corrompido ou em formato desconhecido nao deve derrubar a request:
      // do ponto de vista de quem chamou, a senha simplesmente nao confere.
      this.logger.warn(`Falha ao verificar hash: ${(error as Error).message}`);
      return false;
    }
  }
}
