import { Prisma } from '@prisma/client';

/**
 * Campos envolvidos em uma violacao de unicidade (P2002), ou `null` se o erro
 * for outro. Normaliza os dois formatos que o Prisma usa em `meta.target`.
 */
export function uniqueViolationFields(error: unknown): string[] | null {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
    return null;
  }
  const target = (error.meta as { target?: unknown } | undefined)?.target;
  if (Array.isArray(target)) {
    return target.map(String);
  }
  return typeof target === 'string' ? [target] : [];
}

/** Registro alvo de update/delete nao existe (P2025). */
export function isRecordNotFound(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025';
}
