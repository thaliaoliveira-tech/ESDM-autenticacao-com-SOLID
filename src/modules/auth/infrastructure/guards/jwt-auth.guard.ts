import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Protege rotas exigindo um Bearer token valido.
 *
 * A subclasse existe para dar um nome de dominio ao guard: `@UseGuards(JwtAuthGuard)`
 * comunica muito mais nos controllers do que `@UseGuards(AuthGuard('jwt'))`.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
