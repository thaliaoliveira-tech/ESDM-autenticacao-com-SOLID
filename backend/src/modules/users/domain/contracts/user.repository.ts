import type { CreateLocalUserData, UpdateUserProfileData, User } from '../entities/user';

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
 * Sao apenas as operacoes que os casos de uso realmente precisam.
 *
 * Violacoes de unicidade (e-mail, nome de usuario) chegam como `ConflictError`
 * com o campo correspondente, mesmo em corridas entre duas requisicoes.
 */
export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  createLocal(data: CreateLocalUserData): Promise<User>;
  createGuest(name: string): Promise<User>;
  updateProfile(userId: string, data: UpdateUserProfileData): Promise<User>;
  updatePasswordHash(userId: string, passwordHash: string): Promise<User>;
  delete(userId: string): Promise<void>;
  /** Remove convidados criados antes de `createdBefore` sem nenhuma sessao ativa em `now`. */
  deleteInactiveGuests(createdBefore: Date, now: Date): Promise<number>;
}
