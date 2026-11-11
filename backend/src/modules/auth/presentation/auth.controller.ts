import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiExcludeController } from '@nestjs/swagger';
import type { AuthConfig } from '../../../config/auth.config';
import { AuthService } from '../application/auth.service';
import { PasswordResetService } from '../application/password-reset.service';
import { RegistrationService } from '../application/registration.service';
import { SessionService } from '../application/session.service';
import type { AuthenticatedUser, AuthIdentity, AuthSession } from '../domain/entities/auth-session';
import { JwtAuthGuard } from '../infrastructure/guards/jwt-auth.guard';
import { LocalAuthGuard } from '../infrastructure/guards/local-auth.guard';
import { CurrentUser } from './current-user.decorator';
import { ForgotPasswordDto, RefreshTokenDto, RegisterDto, ResetPasswordDto } from './dto/auth.dto';

/**
 * Sem servico de e-mail, o link de redefinicao e os dados da solicitacao voltam
 * na propria resposta: esta e a unica forma de entrega.
 */
export interface ForgotPasswordResponse {
  message: string;
  email: string;
  name: string;
  resetToken: string;
  resetUrl: string;
  expiresAt: string;
  expiresInMinutes: number;
}

/**
 * Borda HTTP. Repare no que este controller NAO faz:
 *
 *   - nao escolhe provedor com if/else;
 *   - nao conhece Prisma, Argon2 nem a classe JwtService;
 *   - nao contem regra de autenticacao.
 *
 * Ele traduz HTTP para chamadas de caso de uso, e so.
 *
 * `@ApiExcludeController` esta aqui de proposito: a documentacao oficial da API
 * e o arquivo `docs/swagger/api.swagger.yaml`, e nao decorators espalhados pelo
 * codigo. Ver docs/README.md.
 */
@ApiExcludeController()
@Controller('auth')
export class AuthController {
  private readonly resetConfig: AuthConfig['passwordReset'];

  constructor(
    private readonly auth: AuthService,
    private readonly sessions: SessionService,
    private readonly registration: RegistrationService,
    private readonly passwordReset: PasswordResetService,
    config: ConfigService,
  ) {
    this.resetConfig = config.getOrThrow<AuthConfig>('auth').passwordReset;
  }

  /** POST /auth/register - cria a conta e ja devolve a sessao. */
  @HttpCode(HttpStatus.CREATED)
  @Post('register')
  async register(@Body() dto: RegisterDto): Promise<AuthSession> {
    const identity = await this.registration.register(dto);
    return this.auth.issueSession(identity);
  }

  /**
   * POST /auth/login
   * O guard ja autenticou via EmailPasswordAuthStrategy; resta emitir a sessao.
   */
  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@CurrentUser() identity: AuthIdentity): Promise<AuthSession> {
    return this.auth.issueSession(identity);
  }

  /** POST /auth/guest - "Continue como convidado". */
  @HttpCode(HttpStatus.CREATED)
  @Post('guest')
  async guest(): Promise<AuthSession> {
    return this.auth.login('guest', undefined);
  }

  /** POST /auth/refresh - troca o refresh token por um novo par (rotacao). */
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(@Body() dto: RefreshTokenDto): Promise<AuthSession> {
    return this.sessions.refresh(dto.refreshToken);
  }

  /** GET /auth/me - rota protegida, devolve o dono do token. */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser): AuthIdentity {
    return { userId: user.userId, email: user.email, name: user.name, provider: user.provider };
  }

  /** POST /auth/logout - revoga a sessao do token: ele deixa de valer na hora. */
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  async logout(@CurrentUser() user: AuthenticatedUser): Promise<void> {
    await this.sessions.end(user.sessionId, user.userId);
  }

  /**
   * POST /auth/password/forgot - gera o link de redefinicao (uso unico, 30 min)
   * e o devolve na resposta, junto com os dados da solicitacao.
   */
  @HttpCode(HttpStatus.OK)
  @Post('password/forgot')
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<ForgotPasswordResponse> {
    const link = await this.passwordReset.request(dto.email);
    const minutes = this.resetConfig.ttlMinutes;
    return {
      message: `Link de redefinicao gerado. Ele vale por ${minutes} minutos e so pode ser usado uma vez.`,
      email: link.email,
      name: link.name,
      resetToken: link.token,
      resetUrl: link.resetUrl,
      expiresAt: link.expiresAt.toISOString(),
      expiresInMinutes: minutes,
    };
  }

  /** POST /auth/password/reset - troca a senha e encerra todas as sessoes. */
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('password/reset')
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<void> {
    await this.passwordReset.reset(dto.token, dto.password);
  }
}
