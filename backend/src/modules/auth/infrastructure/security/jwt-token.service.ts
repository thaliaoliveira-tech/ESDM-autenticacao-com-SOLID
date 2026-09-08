import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { TokenPayload, TokenService } from '../../domain/contracts/token-service';
import type { AuthIdentity } from '../../domain/entities/auth-session';
import type { AuthConfig } from '../../../../config/auth.config';

/** Formato do JWT no fio. Fica confinado a esta classe. */
interface JwtClaims {
  sub: string;
  email: string;
  provider: string;
}

/**
 * Implementacao de `TokenService` com JWT.
 *
 * A traducao entre o vocabulario da aplicacao (`subject`) e o do JWT (`sub`)
 * acontece aqui, e so aqui.
 */
@Injectable()
export class JwtTokenService implements TokenService {
  readonly expiresIn: string;

  constructor(
    private readonly jwt: JwtService,
    config: ConfigService,
  ) {
    const auth = config.getOrThrow<AuthConfig>('auth');
    this.expiresIn = auth.jwtExpiresIn;
  }

  async generate(identity: AuthIdentity): Promise<string> {
    const claims: JwtClaims = {
      sub: identity.userId,
      email: identity.email,
      provider: identity.provider,
    };
    return this.jwt.signAsync(claims);
  }

  async verify(token: string): Promise<TokenPayload> {
    const claims = await this.jwt.verifyAsync<JwtClaims>(token);

    return {
      subject: claims.sub,
      email: claims.email,
      provider: claims.provider,
    };
  }
}
