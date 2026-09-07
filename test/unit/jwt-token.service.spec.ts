import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { SignOptions } from 'jsonwebtoken';
import { JwtTokenService } from '../../src/modules/auth/infrastructure/security/jwt-token.service';
import type { AuthIdentity } from '../../src/modules/auth/domain/entities/auth-session';

describe('JwtTokenService', () => {
  const identity: AuthIdentity = {
    userId: 'user-1',
    email: 'demo@example.com',
    name: 'Usuario Demo',
    provider: 'email',
  };

  const buildService = (expiresIn = '1h') => {
    const jwt = new JwtService({
      secret: 'segredo-de-teste',
      signOptions: { expiresIn: expiresIn as SignOptions['expiresIn'] },
    });
    const config = {
      getOrThrow: () => ({ jwtSecret: 'segredo-de-teste', jwtExpiresIn: expiresIn }),
    } as unknown as ConfigService;

    return new JwtTokenService(jwt, config);
  };

  it('expoe o tempo de expiracao configurado', () => {
    expect(buildService('15m').expiresIn).toBe('15m');
  });

  it('gera um token verificavel', async () => {
    const service = buildService();

    const token = await service.generate(identity);

    expect(token.split('.')).toHaveLength(3);
    await expect(service.verify(token)).resolves.toEqual({
      subject: 'user-1',
      email: 'demo@example.com',
      provider: 'email',
    });
  });

  it('traduz "sub" do JWT para "subject" do dominio', async () => {
    const service = buildService();
    const token = await service.generate(identity);

    const [, payload] = token.split('.');
    const claims = JSON.parse(Buffer.from(payload, 'base64').toString()) as Record<string, unknown>;

    // No fio e "sub"; para dentro do sistema e "subject".
    expect(claims.sub).toBe('user-1');
    expect((await service.verify(token)).subject).toBe('user-1');
  });

  it('rejeita token adulterado', async () => {
    const service = buildService();

    await expect(service.verify('token.invalido.aqui')).rejects.toBeDefined();
  });

  it('rejeita token expirado', async () => {
    const service = buildService('0s');
    const token = await service.generate(identity);

    await expect(service.verify(token)).rejects.toThrow(/expired/i);
  });
});
