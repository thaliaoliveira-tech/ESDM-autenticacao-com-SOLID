import type { CreateGoogleUserData, User } from '../entities/user';

/**
 * Token de injecao.
 *
 * Interfaces do TypeScript desaparecem em tempo de execucao, entao o container
 * do Nest nao consegue usa-las como chave. O token e o que permite escrever
 * `@Inject(USER_REPOSITORY)` e continuar dependendo da abstracao, e nao da
 * classe concreta.
 */
export const USER_REPOSITORY = Symbol('UserRepository');

/**
 * Contrato de persistencia de usuarios.
 *
 * Proposital: nao ha `save(entity)` generico nem vazamento de tipos do Prisma.
 * Sao apenas as operacoes que a autenticacao realmente precisa.
 */
export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByGoogleId(googleId: string): Promise<User | null>;
  createFromGoogle(data: CreateGoogleUserData): Promise<User>;
  linkGoogleAccount(userId: string, googleId: string): Promise<User>;
}
