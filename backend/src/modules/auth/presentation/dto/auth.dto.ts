import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches as MatchesPattern,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Matches, NormalizeEmail, Trim } from '../../../../shared/http/validation';
import {
  PASSWORD_MAX,
  PASSWORD_MIN,
  USERNAME_MESSAGE,
  USERNAME_PATTERN,
} from '../../../users/domain/entities/user';
import { Transform } from 'class-transformer';

const passwordRules = (property: string) => [
  IsString({ message: `${property} deve ser uma string.` }),
  MinLength(PASSWORD_MIN, {
    message: `Use uma senha entre ${PASSWORD_MIN} e ${PASSWORD_MAX} caracteres.`,
  }),
  MaxLength(PASSWORD_MAX, {
    message: `Use uma senha entre ${PASSWORD_MIN} e ${PASSWORD_MAX} caracteres.`,
  }),
];

function applyAll(decorators: PropertyDecorator[]): PropertyDecorator {
  return (target, key) => decorators.forEach((decorator) => decorator(target, key));
}

/** POST /auth/register - tela de cadastro do prototipo. */
export class RegisterDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString({ message: 'username deve ser uma string.' })
  @MatchesPattern(USERNAME_PATTERN, { message: USERNAME_MESSAGE })
  username!: string;

  @NormalizeEmail()
  @IsEmail({}, { message: 'Informe um endereco de e-mail valido.' })
  @MaxLength(254, { message: 'Informe um endereco de e-mail valido.' })
  email!: string;

  @applyAll(passwordRules('password'))
  password!: string;

  @IsString({ message: 'confirmPassword deve ser uma string.' })
  @Matches('password', { message: 'As senhas precisam ser iguais.' })
  confirmPassword!: string;

  @IsOptional()
  @Trim()
  @IsString({ message: 'name deve ser uma string.' })
  @Length(1, 80, { message: 'name deve ter entre 1 e 80 caracteres.' })
  name?: string;
}

/** POST /auth/refresh */
export class RefreshTokenDto {
  @IsString({ message: 'refreshToken deve ser uma string.' })
  @IsNotEmpty({ message: 'Informe o refreshToken.' })
  @MaxLength(200, { message: 'refreshToken invalido.' })
  refreshToken!: string;
}

/** POST /auth/password/forgot */
export class ForgotPasswordDto {
  @NormalizeEmail()
  @IsEmail({}, { message: 'Informe um endereco de e-mail valido.' })
  email!: string;
}

/** POST /auth/password/reset */
export class ResetPasswordDto {
  @IsString({ message: 'token deve ser uma string.' })
  @IsNotEmpty({ message: 'Informe o token do link de redefinicao.' })
  @MaxLength(200, { message: 'token invalido.' })
  token!: string;

  @applyAll(passwordRules('password'))
  password!: string;

  @IsString({ message: 'confirmPassword deve ser uma string.' })
  @Matches('password', { message: 'As senhas precisam ser iguais.' })
  confirmPassword!: string;
}
