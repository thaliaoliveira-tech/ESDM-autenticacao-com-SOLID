import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, type Profile, type VerifyCallback } from 'passport-google-oauth20';
import type { AuthConfig } from '../../../../config/auth.config';
import { AuthService } from '../../application/auth.service';
import type { GoogleProfile } from '../../application/strategies/google-auth.strategy';

/**
 * ADAPTADOR do OAuth do Google.
 *
 * Toda a traducao do `Profile` da biblioteca para o `GoogleProfile` do dominio
 * acontece nesta classe. `GoogleAuthStrategy` nunca ve um tipo da lib.
 */
@Injectable()
export class GooglePassportStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    config: ConfigService,
    private readonly auth: AuthService,
  ) {
    const authConfig = config.getOrThrow<AuthConfig>('auth');

    super({
      clientID: authConfig.google.clientId,
      clientSecret: authConfig.google.clientSecret,
      callbackURL: authConfig.google.callbackUrl,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    try {
      const normalized: GoogleProfile = {
        googleId: profile.id,
        email: profile.emails?.[0]?.value ?? '',
        name: profile.displayName ?? '',
      };

      const identity = await this.auth.authenticate('google', normalized);
      done(null, identity);
    } catch (error) {
      done(error, false);
    }
  }
}
