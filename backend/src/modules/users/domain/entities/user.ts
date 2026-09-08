/**
 * Usuario como o dominio o enxerga.
 *
 * Note que este tipo NAO e o tipo gerado pelo Prisma. Se ele fosse, o dominio
 * inteiro passaria a depender do ORM, e trocar de banco exigiria reescrever as
 * regras. O repositorio concreto e quem traduz uma coisa na outra.
 */
export interface User {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  /** Ausente quando o usuario so existe via provedor externo (Google). */
  readonly passwordHash: string | null;
  /** Ausente quando o usuario nunca autenticou via Google. */
  readonly googleId: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/** Dados necessarios para criar um usuario a partir de um perfil do Google. */
export interface CreateGoogleUserData {
  readonly name: string;
  readonly email: string;
  readonly googleId: string;
}
