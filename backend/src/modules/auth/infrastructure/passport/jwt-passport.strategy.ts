import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AuthConfig } from '../../../../config/auth.config';
import type { AuthIdentity, AuthProvider } from '../../domain/entities/auth-session';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../../users/domain/contracts/user.repository';

interface JwtClaims {
  sub: string;
  email: string;
  provider: AuthProvider;
}

/**
 * Adaptador que protege as rotas: le o Bearer token e reconstroi a identidade.
 *
 * A consulta ao repositorio e proposital. Um token continua criptograficamente
 * valido depois que o usuario e removido do banco; sem esta checagem, ele ainda
 * abriria `/auth/me`.
 */
@Injectable()
export class JwtPassportStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {
    const auth = config.getOrThrow<AuthConfig>('auth');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: auth.jwtSecret,
    });
  }

  async validate(claims: JwtClaims): Promise<AuthIdentity> {
    const user = await this.users.findById(claims.sub);
    if (!user) {
      throw new UnauthorizedException('Usuario do token nao existe mais.');
    }

    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      provider: claims.provider,
    };
  }
}
