import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AuthConfig } from '../../../../config/auth.config';
import { SessionService } from '../../application/session.service';
import { isAuthProvider, type AuthenticatedUser } from '../../domain/entities/auth-session';
import type { JwtClaims } from '../security/jwt-token.service';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../../users/domain/contracts/user.repository';

/**
 * Adaptador que protege as rotas: le o Bearer token e reconstroi a identidade.
 *
 * Duas consultas sao propositais:
 *  - o usuario precisa existir (um token continua criptograficamente valido
 *    depois que a conta e excluida);
 *  - a sessao (`sid`) precisa estar ativa, o que torna o logout e a troca de
 *    senha efetivos mesmo com JWT.
 */
@Injectable()
export class JwtPassportStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    private readonly sessions: SessionService,
  ) {
    const auth = config.getOrThrow<AuthConfig>('auth');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: auth.jwtSecret,
    });
  }

  async validate(claims: JwtClaims): Promise<AuthenticatedUser> {
    if (!claims.sid || !isAuthProvider(claims.provider)) {
      throw new UnauthorizedException('Token sem sessao valida.');
    }

    const user = await this.users.findById(claims.sub);
    if (!user) {
      throw new UnauthorizedException('Usuario do token nao existe mais.');
    }

    if (!(await this.sessions.isActive(claims.sid, user.id))) {
      throw new UnauthorizedException('Sessao encerrada. Entre novamente.');
    }

    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      provider: claims.provider,
      sessionId: claims.sid,
    };
  }
}
