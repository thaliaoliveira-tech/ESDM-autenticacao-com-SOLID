import { validateEnvironment } from '../../src/config/env.validation';

describe('validateEnvironment', () => {
  const valid = {
    JWT_SECRET: 'segredo',
    DATABASE_URL: 'file:./dev.db',
    PORT: '3000',
  };

  it('aceita uma configuracao valida e a devolve', () => {
    expect(validateEnvironment(valid)).toBe(valid);
  });

  it('aceita PORT ausente', () => {
    expect(() => validateEnvironment({ ...valid, PORT: undefined })).not.toThrow();
  });

  it('rejeita JWT_SECRET ausente', () => {
    expect(() => validateEnvironment({ ...valid, JWT_SECRET: undefined })).toThrow(/JWT_SECRET/);
  });

  it('rejeita JWT_SECRET vazio', () => {
    expect(() => validateEnvironment({ ...valid, JWT_SECRET: '   ' })).toThrow(/JWT_SECRET/);
  });

  it('rejeita DATABASE_URL ausente', () => {
    expect(() => validateEnvironment({ ...valid, DATABASE_URL: '' })).toThrow(/DATABASE_URL/);
  });

  it('rejeita PORT nao numerico', () => {
    expect(() => validateEnvironment({ ...valid, PORT: 'abc' })).toThrow(/PORT/);
  });

  it('aceita inteiros e booleanos opcionais validos', () => {
    expect(() =>
      validateEnvironment({
        ...valid,
        REFRESH_TOKEN_TTL_DAYS: '30',
        JOBS_ENABLED: 'false',
      }),
    ).not.toThrow();
  });

  it('rejeita inteiro positivo invalido', () => {
    expect(() => validateEnvironment({ ...valid, GUEST_RETENTION_DAYS: '0' })).toThrow(
      /GUEST_RETENTION_DAYS/,
    );
  });

  it('rejeita booleano invalido', () => {
    expect(() => validateEnvironment({ ...valid, JOBS_ENABLED: 'sim' })).toThrow(/JOBS_ENABLED/);
  });

  it('rejeita o segredo de exemplo em producao', () => {
    expect(() =>
      validateEnvironment({
        ...valid,
        NODE_ENV: 'production',
        JWT_SECRET: 'troque-este-segredo-em-producao',
      }),
    ).toThrow(/producao/);
  });

  it('acumula todos os erros em uma unica mensagem', () => {
    expect(() => validateEnvironment({})).toThrow(/JWT_SECRET[\s\S]*DATABASE_URL/);
  });
});
