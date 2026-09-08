import { BadRequestException, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { Request } from 'express';
import { LoginDto } from '../../presentation/dto/login.dto';

/**
 * Guard do login local.
 *
 * Detalhe importante: no Nest, guards rodam ANTES dos pipes. Sem a validacao
 * abaixo, um corpo malformado (`{}`) seria rejeitado pelo Passport como 401,
 * quando o correto e 400 -- o cliente errou a requisicao, nao a senha.
 *
 * Entao o guard valida a forma primeiro e so depois entrega ao Passport:
 *
 *   corpo invalido    -> 400 Bad Request
 *   credencial errada -> 401 Unauthorized
 */
@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const dto = plainToInstance(LoginDto, request.body ?? {});
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });

    if (errors.length > 0) {
      const messages = errors.flatMap((error) => Object.values(error.constraints ?? {}));
      throw new BadRequestException(messages);
    }

    return (await super.canActivate(context)) as boolean;
  }
}
