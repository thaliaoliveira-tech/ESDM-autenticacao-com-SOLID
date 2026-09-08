import { registerAs } from '@nestjs/config';

export interface AuthConfig {
  readonly jwtSecret: string;
  readonly jwtExpiresIn: string;
  readonly google: {
    readonly clientId: string;
    readonly clientSecret: string;
    readonly callbackUrl: string;
    /** A Strategy do Google so e registrada quando ha credenciais. */
    readonly enabled: boolean;
  };
}

export const authConfig = registerAs('auth', (): AuthConfig => {
  const clientId = process.env.GOOGLE_CLIENT_ID ?? '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? '';

  return {
    jwtSecret: process.env.JWT_SECRET ?? '',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '1h',
    google: {
      clientId,
      clientSecret,
      callbackUrl: process.env.GOOGLE_CALLBACK_URL ?? 'http://localhost:3000/auth/google/callback',
      enabled: clientId.length > 0 && clientSecret.length > 0,
    },
  };
});
