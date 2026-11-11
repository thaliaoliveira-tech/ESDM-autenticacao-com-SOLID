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
  /** Nome de usuario unico; ausente para convidados. */
  readonly username: string | null;
  /** Ausente apenas para convidados. */
  readonly email: string | null;
  /** Ausente para convidados. */
  readonly passwordHash: string | null;
  readonly isGuest: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/** Cadastro por e-mail e senha (tela de cadastro do prototipo). */
export interface CreateLocalUserData {
  readonly name: string;
  readonly username: string;
  readonly email: string;
  readonly passwordHash: string;
}

/** Campos editaveis em "Gerenciar conta". */
export interface UpdateUserProfileData {
  readonly name?: string;
  readonly username?: string;
  readonly email?: string;
}

/** Visao publica da conta: nunca expoe o hash da senha. */
export interface AccountProfile {
  readonly id: string;
  readonly name: string;
  readonly username: string | null;
  readonly email: string | null;
  readonly isGuest: boolean;
  readonly hasPassword: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export function toAccountProfile(user: User): AccountProfile {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    isGuest: user.isGuest,
    hasPassword: user.passwordHash !== null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

/** Regras de nome de usuario do prototipo: 3 a 30 caracteres a-z, 0-9, ponto ou sublinhado. */
export const USERNAME_PATTERN = /^[a-z0-9._]{3,30}$/;
export const USERNAME_MESSAGE =
  'Use de 3 a 30 caracteres: letras sem acento, numeros, ponto ou sublinhado.';
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;
