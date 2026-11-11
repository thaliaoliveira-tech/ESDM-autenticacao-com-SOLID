import { Module, type Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type { SignOptions } from 'jsonwebtoken';
import type { AuthConfig } from '../../../config/auth.config';
import { UsersModule } from '../../users/users.module';
import { AuthMaintenanceService } from '../application/auth-maintenance.service';
import { AuthService } from '../application/auth.service';
import { PasswordResetService } from '../application/password-reset.service';
import { RegistrationService } from '../application/registration.service';
import { SessionService } from '../application/session.service';
import { EmailPasswordAuthStrategy } from '../application/strategies/email-password-auth.strategy';
import { GuestAuthStrategy } from '../application/strategies/guest-auth.strategy';
import { AUTH_STRATEGIES } from '../domain/contracts/auth-strategy';
import { PASSWORD_HASHER } from '../domain/contracts/password-hasher';
import { PASSWORD_RESET_REPOSITORY } from '../domain/contracts/password-reset';
import { SECURE_TOKEN_GENERATOR } from '../domain/contracts/secure-token';
import { SESSION_REPOSITORY } from '../domain/contracts/session.repository';
import { TOKEN_SERVICE } from '../domain/contracts/token-service';
import { AuthController } from '../presentation/auth.controller';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { AuthMaintenanceJob } from './jobs/auth-maintenance.job';
import { JwtPassportStrategy } from './passport/jwt-passport.strategy';
import { LocalPassportStrategy } from './passport/local-passport.strategy';
import { PrismaPasswordResetRepository } from './persistence/prisma-password-reset.repository';
import { PrismaSessionRepository } from './persistence/prisma-session.repository';
import { Argon2PasswordHasher } from './security/argon2-password-hasher';
import { CryptoSecureTokenGenerator } from './security/crypto-secure-token.generator';
import { JwtTokenService } from './security/jwt-token.service';

/**
 * Registro das AuthStrategies.
 *
 * ESTE array e a resposta a pergunta "como o AuthService escolhe a Strategy sem
 * if/else?". O convidado foi o segundo provedor: uma classe nova e uma linha
 * aqui. Nenhuma classe existente mudou.
 */
const authStrategiesProvider: Provider = {
  provide: AUTH_STRATEGIES,
  useFactory: (email: EmailPasswordAuthStrategy, guest: GuestAuthStrategy) => [email, guest],
  inject: [EmailPasswordAuthStrategy, GuestAuthStrategy],
};

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const auth = config.getOrThrow<AuthConfig>('auth');
        return {
          secret: auth.jwtSecret,
          // `JWT_EXPIRES_IN` chega do ambiente como string livre; o jsonwebtoken
          // espera um literal de duracao ("1h", "30m"). O cast fica aqui, na
          // fronteira com a lib, e nao espalhado pela configuracao.
          signOptions: { expiresIn: auth.jwtExpiresIn as SignOptions['expiresIn'] },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    // --- aplicacao ---
    AuthService,
    SessionService,
    RegistrationService,
    PasswordResetService,
    AuthMaintenanceService,
    EmailPasswordAuthStrategy,
    GuestAuthStrategy,
    authStrategiesProvider,

    // --- infraestrutura: contratos -> implementacoes concretas ---
    { provide: PASSWORD_HASHER, useClass: Argon2PasswordHasher },
    { provide: TOKEN_SERVICE, useClass: JwtTokenService },
    { provide: SECURE_TOKEN_GENERATOR, useClass: CryptoSecureTokenGenerator },
    { provide: SESSION_REPOSITORY, useClass: PrismaSessionRepository },
    { provide: PASSWORD_RESET_REPOSITORY, useClass: PrismaPasswordResetRepository },

    // --- infraestrutura: adaptadores do Passport ---
    LocalPassportStrategy,
    JwtPassportStrategy,

    // --- infraestrutura: guards e jobs ---
    LocalAuthGuard,
    JwtAuthGuard,
    AuthMaintenanceJob,
  ],
  exports: [AuthService, SessionService],
})
export class AuthModule {}
