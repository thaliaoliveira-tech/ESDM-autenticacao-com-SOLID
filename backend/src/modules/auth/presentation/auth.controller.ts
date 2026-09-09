import { Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { AuthService } from '../application/auth.service';
import type { AuthIdentity, AuthSession } from '../domain/entities/auth-session';
import { GoogleAuthGuard } from '../infrastructure/guards/google-auth.guard';
import { JwtAuthGuard } from '../infrastructure/guards/jwt-auth.guard';
import { LocalAuthGuard } from '../infrastructure/guards/local-auth.guard';
import { CurrentUser } from './current-user.decorator';

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
  constructor(private readonly auth: AuthService) {}

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

  /** GET /auth/me - rota protegida, devolve o dono do token. */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() identity: AuthIdentity): AuthIdentity {
    return identity;
  }

  /**
   * POST /auth/logout
   *
   * O token e stateless e NAO e invalidado no servidor. O logout do POC
   * consiste em o cliente descartar o access token. Revogacao de verdade
   * exigiria blacklist ou tokens de curta duracao com refresh -- infraestrutura
   * deliberadamente fora do escopo. Limitacao documentada em
   * docs/authentication-flow.md.
   */
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  logout(): void {
    return;
  }

  /** GET /auth/google - redireciona para o consentimento do Google. */
  @UseGuards(GoogleAuthGuard)
  @Get('google')
  googleLogin(): void {
    // O guard redireciona; este corpo nunca executa.
    return;
  }

  /**
   * GET /auth/google/callback
   *
   * Adaptacao consciente em relacao ao material da aula: la o cliente e Flutter
   * e o Google Sign-In basta. Aqui a API emite o proprio JWT, porque sao os
   * endpoints DESTA API que precisam ser protegidos depois.
   */
  @UseGuards(GoogleAuthGuard)
  @Get('google/callback')
  async googleCallback(@CurrentUser() identity: AuthIdentity): Promise<AuthSession> {
    return this.auth.issueSession(identity);
  }
}
