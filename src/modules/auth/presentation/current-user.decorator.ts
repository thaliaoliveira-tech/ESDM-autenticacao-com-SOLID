import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthIdentity } from '../domain/entities/auth-session';

/**
 * Le a identidade que o guard depositou em `request.user`.
 *
 * Evita que cada handler faca `req.user as AuthIdentity` e mantem o controller
 * livre de detalhes do Express.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthIdentity => {
    const request = context.switchToHttp().getRequest<Request & { user: AuthIdentity }>();
    return request.user;
  },
);
