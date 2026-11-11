import { registerAs } from '@nestjs/config';

export interface AuthConfig {
  readonly jwtSecret: string;
  readonly jwtExpiresIn: string;
  /** Validade do refresh token (rotativo) em dias. */
  readonly refreshTokenTtlDays: number;
  readonly passwordReset: {
    readonly ttlMinutes: number;
    /**
     * Base do link de redefinicao; o token e anexado ao final. Nao ha envio de
     * e-mail: o link e devolvido na propria resposta de POST /auth/password/forgot.
     */
    readonly url: string;
  };
  /** Convidados sem sessao ativa ha mais que isso sao removidos pela manutencao. */
  readonly guestRetentionDays: number;
}

function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const authConfig = registerAs('auth', (): AuthConfig => {
  return {
    jwtSecret: process.env.JWT_SECRET ?? '',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '1h',
    refreshTokenTtlDays: positiveInt(process.env.REFRESH_TOKEN_TTL_DAYS, 30),
    passwordReset: {
      ttlMinutes: positiveInt(process.env.PASSWORD_RESET_TTL_MINUTES, 30),
      url: process.env.PASSWORD_RESET_URL || 'sintetiza://redefinir-senha?token=',
    },
    guestRetentionDays: positiveInt(process.env.GUEST_RETENTION_DAYS, 30),
  };
});
