import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';
import { NormalizeEmail, Trim } from '../../../shared/http/validation';
import type { AuthenticatedUser } from '../../auth/domain/entities/auth-session';
import { JwtAuthGuard } from '../../auth/infrastructure/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/presentation/current-user.decorator';
import { AccountService } from '../application/account.service';
import { USERNAME_MESSAGE, USERNAME_PATTERN, type AccountProfile } from '../domain/entities/user';

export class UpdateAccountDto {
  @IsOptional()
  @Trim()
  @IsString({ message: 'name deve ser uma string.' })
  @Length(1, 80, { message: 'name deve ter entre 1 e 80 caracteres.' })
  name?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString({ message: 'username deve ser uma string.' })
  @Matches(USERNAME_PATTERN, { message: USERNAME_MESSAGE })
  username?: string;

  @IsOptional()
  @NormalizeEmail()
  @IsEmail({}, { message: 'Informe um endereco de e-mail valido.' })
  @MaxLength(254, { message: 'Informe um endereco de e-mail valido.' })
  email?: string;
}

/** Perfil de usuario e "Gerenciar conta". */
@ApiExcludeController()
@UseGuards(JwtAuthGuard)
@Controller('account')
export class AccountController {
  constructor(private readonly accounts: AccountService) {}

  @Get()
  get(@CurrentUser() user: AuthenticatedUser): Promise<AccountProfile> {
    return this.accounts.getProfile(user.userId);
  }

  @Patch()
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateAccountDto,
  ): Promise<AccountProfile> {
    return this.accounts.updateProfile(user.userId, dto);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() user: AuthenticatedUser): Promise<void> {
    await this.accounts.deleteAccount(user.userId);
  }
}
