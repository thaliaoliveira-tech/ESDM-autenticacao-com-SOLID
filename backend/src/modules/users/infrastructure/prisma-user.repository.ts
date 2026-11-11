import { Injectable } from '@nestjs/common';
import type { User as PrismaUser } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { uniqueViolationFields } from '../../../database/prisma-errors';
import { dbClient } from '../../../database/transaction';
import { ConflictError } from '../../../shared/errors/application-error';
import type { UserRepository } from '../domain/contracts/user.repository';
import type { CreateLocalUserData, UpdateUserProfileData, User } from '../domain/entities/user';

/**
 * Implementacao concreta do contrato `UserRepository`.
 *
 * Este e o unico arquivo do modulo de usuarios que sabe que existe Prisma. A
 * funcao `toDomain` e a fronteira: dali para dentro, o resto do sistema so
 * conhece a entidade `User` do dominio.
 */
@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  private get db() {
    return dbClient(this.prisma);
  }

  async findById(id: string): Promise<User | null> {
    const found = await this.db.user.findUnique({ where: { id } });
    return found ? this.toDomain(found) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const found = await this.db.user.findUnique({ where: { email } });
    return found ? this.toDomain(found) : null;
  }

  async findByUsername(username: string): Promise<User | null> {
    const found = await this.db.user.findUnique({ where: { username } });
    return found ? this.toDomain(found) : null;
  }

  async createLocal(data: CreateLocalUserData): Promise<User> {
    return this.translateConflicts(async () =>
      this.toDomain(
        await this.db.user.create({
          data: {
            name: data.name,
            username: data.username,
            email: data.email,
            passwordHash: data.passwordHash,
          },
        }),
      ),
    );
  }

  async createGuest(name: string): Promise<User> {
    const created = await this.db.user.create({ data: { name, isGuest: true } });
    return this.toDomain(created);
  }

  async updateProfile(userId: string, data: UpdateUserProfileData): Promise<User> {
    return this.translateConflicts(async () =>
      this.toDomain(await this.db.user.update({ where: { id: userId }, data })),
    );
  }

  async updatePasswordHash(userId: string, passwordHash: string): Promise<User> {
    const updated = await this.db.user.update({ where: { id: userId }, data: { passwordHash } });
    return this.toDomain(updated);
  }

  async delete(userId: string): Promise<void> {
    await this.db.user.deleteMany({ where: { id: userId } });
  }

  async deleteInactiveGuests(createdBefore: Date, now: Date): Promise<number> {
    const { count } = await this.db.user.deleteMany({
      where: {
        isGuest: true,
        createdAt: { lt: createdBefore },
        sessions: { none: { revokedAt: null, expiresAt: { gt: now } } },
      },
    });
    return count;
  }

  /** Corridas entre requisicoes chegam aqui como P2002; viram erro de dominio. */
  private async translateConflicts<T>(work: () => Promise<T>): Promise<T> {
    try {
      return await work();
    } catch (error) {
      const fields = uniqueViolationFields(error);
      if (fields?.some((field) => field.includes('username'))) {
        throw new ConflictError('Esse nome de usuario ja esta em uso. Escolha outro.', 'username');
      }
      if (fields?.some((field) => field.includes('email'))) {
        throw new ConflictError('Ja existe uma conta com esse e-mail.', 'email');
      }
      throw error;
    }
  }

  private toDomain(record: PrismaUser): User {
    return {
      id: record.id,
      name: record.name,
      username: record.username,
      email: record.email,
      passwordHash: record.passwordHash,
      isGuest: record.isGuest,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
