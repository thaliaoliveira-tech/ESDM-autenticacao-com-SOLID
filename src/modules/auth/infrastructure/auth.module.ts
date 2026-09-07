import { Module, type Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type { SignOptions } from 'jsonwebtoken';
import type { AuthConfig } from '../../../config/auth.config';
import { UsersModule } from '../../users/users.module';
import { AuthService } from '../application/auth.service';
import { EmailPasswordAuthStrategy } from '../application/strategies/email-password-auth.strategy';
import { GoogleAuthStrategy } from '../application/strategies/google-auth.strategy';
import { AUTH_STRATEGIES } from '../domain/contracts/auth-strategy';
import { PASSWORD_HASHER } from '../domain/contracts/password-hasher';
import { TOKEN_SERVICE } from '../domain/contracts/token-service';
import { AuthController } from '../presentation/auth.controller';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { GooglePassportStrategy } from './passport/google-passport.strategy';
import { JwtPassportStrategy } from './passport/jwt-passport.strategy';
import { LocalPassportStrategy } from './passport/local-passport.strategy';
import { Argon2PasswordHasher } from './security/argon2-password-hasher';
import { JwtTokenService } from './security/jwt-token.service';

/**
 * Registro das AuthStrategies.
 *
 * ESTE array e a resposta a pergunta "como o AuthService escolhe a Strategy sem
 * if/else?". Adicionar um provedor amanha = adicionar uma classe e uma linha
 * aqui. Nenhuma classe existente muda.
 */
const authStrategiesProvider: Provider = {
  provide: AUTH_STRATEGIES,
  useFactory: (email: EmailPasswordAuthStrategy, google: GoogleAuthStrategy) => [email, google],
  inject: [EmailPasswordAuthStrategy, GoogleAuthStrategy],
};

/**
 * O adaptador do Passport para Google so e instanciado quando ha credenciais.
 * Sem elas, `passport-google-oauth20` lanca ainda na construcao.
 */
const googlePassportProvider: Provider = {
  provide: GooglePassportStrategy,
  useFactory: (config: ConfigService, auth: AuthService): GooglePassportStrategy | null => {
    const authConfig = config.getOrThrow<AuthConfig>('auth');
    return authConfig.google.enabled ? new GooglePassportStrategy(config, auth) : null;
  },
  inject: [ConfigService, AuthService],
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
    EmailPasswordAuthStrategy,
    GoogleAuthStrategy,
    authStrategiesProvider,

    // --- infraestrutura: contratos -> implementacoes concretas ---
    { provide: PASSWORD_HASHER, useClass: Argon2PasswordHasher },
    { provide: TOKEN_SERVICE, useClass: JwtTokenService },

    // --- infraestrutura: adaptadores do Passport ---
    LocalPassportStrategy,
    JwtPassportStrategy,
    googlePassportProvider,

    // --- infraestrutura: guards ---
    LocalAuthGuard,
    JwtAuthGuard,
    GoogleAuthGuard,
  ],
  exports: [AuthService],
})
export class AuthModule {}
