import { ExecutionContext, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import type { AuthConfig } from '../../../../config/auth.config';

/**
 * Guard do fluxo OAuth do Google.
 *
 * As rotas do Google existem sempre, mas o OAuth so funciona com credenciais
 * configuradas. Sem esta checagem, o Passport responderia com um obscuro
 * "Unknown authentication strategy"; aqui o erro diz exatamente o que fazer.
 */
@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  constructor(private readonly config: ConfigService) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const auth = this.config.getOrThrow<AuthConfig>('auth');

    if (!auth.google.enabled) {
      throw new ServiceUnavailableException(
        'Login com Google indisponivel: defina GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET no .env.',
      );
    }

    return super.canActivate(context);
  }
}
