import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * Corpo do POST /auth/login.
 *
 * A descricao publica destes campos vive em `docs/swagger/api.swagger.yaml`,
 * nao em decorators espalhados. Aqui ficam somente as regras de validacao.
 */
export class LoginDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'email deve ser um endereco de e-mail valido.' })
  email!: string;

  @IsString({ message: 'password deve ser uma string.' })
  @MinLength(6, { message: 'password deve ter no minimo 6 caracteres.' })
  @MaxLength(128, { message: 'password deve ter no maximo 128 caracteres.' })
  password!: string;
}
