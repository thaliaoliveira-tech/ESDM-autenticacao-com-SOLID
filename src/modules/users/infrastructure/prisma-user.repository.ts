import { Injectable } from '@nestjs/common';
import type { User as PrismaUser } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import type { UserRepository } from '../domain/contracts/user.repository';
import type { CreateGoogleUserData, User } from '../domain/entities/user';

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

  async findById(id: string): Promise<User | null> {
    const found = await this.prisma.user.findUnique({ where: { id } });
    return found ? this.toDomain(found) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const found = await this.prisma.user.findUnique({ where: { email } });
    return found ? this.toDomain(found) : null;
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    const found = await this.prisma.user.findUnique({ where: { googleId } });
    return found ? this.toDomain(found) : null;
  }

  async createFromGoogle(data: CreateGoogleUserData): Promise<User> {
    const created = await this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        googleId: data.googleId,
      },
    });
    return this.toDomain(created);
  }

  async linkGoogleAccount(userId: string, googleId: string): Promise<User> {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { googleId },
    });
    return this.toDomain(updated);
  }

  private toDomain(record: PrismaUser): User {
    return {
      id: record.id,
      name: record.name,
      email: record.email,
      passwordHash: record.passwordHash,
      googleId: record.googleId,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
