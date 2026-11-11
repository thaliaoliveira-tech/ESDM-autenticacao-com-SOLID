import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/** Parametros de paginacao aceitos por todas as listagens (`?page=1&pageSize=20`). */
export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page deve ser um numero inteiro.' })
  @Min(1, { message: 'page deve ser no minimo 1.' })
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'pageSize deve ser um numero inteiro.' })
  @Min(1, { message: 'pageSize deve ser no minimo 1.' })
  @Max(MAX_PAGE_SIZE, { message: `pageSize deve ser no maximo ${MAX_PAGE_SIZE}.` })
  pageSize?: number;
}

export interface PageRequest {
  readonly page: number;
  readonly pageSize: number;
}

export interface PageMeta {
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
  readonly totalPages: number;
}

/** Envelope padrao das listagens: `{ data, meta }`. */
export interface Paginated<T, M extends object = object> {
  readonly data: T[];
  readonly meta: PageMeta & M;
}

export function pageRequest(query: { page?: number; pageSize?: number }): PageRequest {
  return { page: query.page ?? 1, pageSize: query.pageSize ?? DEFAULT_PAGE_SIZE };
}

export function pageMeta(request: PageRequest, total: number): PageMeta {
  return {
    page: request.page,
    pageSize: request.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / request.pageSize)),
  };
}

/** Pagina um conjunto ja filtrado e ordenado em memoria. */
export function paginate<T>(items: readonly T[], request: PageRequest): Paginated<T> {
  const start = (request.page - 1) * request.pageSize;
  return {
    data: items.slice(start, start + request.pageSize),
    meta: pageMeta(request, items.length),
  };
}
