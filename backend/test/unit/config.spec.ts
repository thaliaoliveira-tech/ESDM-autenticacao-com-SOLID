import { aiConfig, DEFAULT_AI_BASE_URL, DEFAULT_AI_MODEL } from '../../src/config/ai.config';
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
    delete process.env.CORS_ORIGINS;
    delete process.env.JOBS_ENABLED;

    expect(appConfig()).toEqual({
      env: 'development',
      port: 3000,
      corsOrigins: [],
      jobsEnabled: true,
    });
  });

  it('appConfig respeita as variaveis definidas', () => {
    process.env.NODE_ENV = 'production';
    process.env.PORT = '8080';
    process.env.CORS_ORIGINS = 'http://localhost:8081, https://app.example.com';
    process.env.JOBS_ENABLED = 'false';

    expect(appConfig()).toEqual({
      env: 'production',
      port: 8080,
      corsOrigins: ['http://localhost:8081', 'https://app.example.com'],
      jobsEnabled: false,
    });
  });

  it('appConfig desliga os jobs por padrao nos testes', () => {
    process.env.NODE_ENV = 'test';
    delete process.env.JOBS_ENABLED;

    expect(appConfig().jobsEnabled).toBe(false);
  });

  it('databaseConfig aplica default', () => {
    delete process.env.DATABASE_URL;

    expect(databaseConfig()).toEqual({ url: 'file:./dev.db' });
  });

  it('authConfig aplica defaults de sessao, recuperacao e convidados', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.REFRESH_TOKEN_TTL_DAYS;
    delete process.env.PASSWORD_RESET_TTL_MINUTES;
    delete process.env.PASSWORD_RESET_URL;
    delete process.env.GUEST_RETENTION_DAYS;

    const config = authConfig();

    expect(config.refreshTokenTtlDays).toBe(30);
    expect(config.passwordReset).toEqual({
      ttlMinutes: 30,
      url: 'sintetiza://redefinir-senha?token=',
    });
    expect(config.guestRetentionDays).toBe(30);
  });

  it('respeita PASSWORD_RESET_URL e ignora inteiros invalidos', () => {
    process.env.PASSWORD_RESET_URL = 'https://app.example.com/redefinir?token=';
    process.env.REFRESH_TOKEN_TTL_DAYS = 'abc';

    const config = authConfig();
    expect(config.passwordReset.url).toBe('https://app.example.com/redefinir?token=');
    expect(config.refreshTokenTtlDays).toBe(30);
  });

  it('aiConfig fica desconfigurada sem chave e aplica defaults', () => {
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.OPENROUTER_MODEL;
    delete process.env.OPENROUTER_BASE_URL;
    delete process.env.OPENROUTER_TIMEOUT_MS;

    expect(aiConfig()).toEqual({
      apiKey: '',
      model: DEFAULT_AI_MODEL,
      baseUrl: DEFAULT_AI_BASE_URL,
      timeoutMs: 120_000,
      configured: false,
    });
  });

  it('aiConfig respeita chave, modelo, endpoint e timeout', () => {
    process.env.OPENROUTER_API_KEY = 'sk-test';
    process.env.OPENROUTER_MODEL = 'outro/modelo';
    process.env.OPENROUTER_BASE_URL = 'http://localhost:9999/v1/';
    process.env.OPENROUTER_TIMEOUT_MS = '5000';

    expect(aiConfig()).toEqual({
      apiKey: 'sk-test',
      model: 'outro/modelo',
      baseUrl: 'http://localhost:9999/v1',
      timeoutMs: 5000,
      configured: true,
    });
  });
});
