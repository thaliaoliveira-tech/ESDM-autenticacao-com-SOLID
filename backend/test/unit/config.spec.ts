import { appConfig } from '../../src/config/app.config';
import { authConfig } from '../../src/config/auth.config';
import { databaseConfig } from '../../src/config/database.config';

describe('configuracao', () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it('appConfig aplica defaults', () => {
    delete process.env.NODE_ENV;
    delete process.env.PORT;

    expect(appConfig()).toEqual({ env: 'development', port: 3000 });
  });

  it('appConfig respeita as variaveis definidas', () => {
    process.env.NODE_ENV = 'production';
    process.env.PORT = '8080';

    expect(appConfig()).toEqual({ env: 'production', port: 8080 });
  });

  it('databaseConfig aplica default', () => {
    delete process.env.DATABASE_URL;

    expect(databaseConfig()).toEqual({ url: 'file:./dev.db' });
  });

  it('marca o Google como desabilitado sem credenciais', () => {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;

    expect(authConfig().google.enabled).toBe(false);
  });

  it('marca o Google como habilitado com credenciais completas', () => {
    process.env.GOOGLE_CLIENT_ID = 'id';
    process.env.GOOGLE_CLIENT_SECRET = 'secret';

    expect(authConfig().google.enabled).toBe(true);
  });

  it('exige as duas credenciais do Google', () => {
    process.env.GOOGLE_CLIENT_ID = 'id';
    process.env.GOOGLE_CLIENT_SECRET = '';

    expect(authConfig().google.enabled).toBe(false);
  });
});
