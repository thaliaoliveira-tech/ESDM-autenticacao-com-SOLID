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

  it('acumula todos os erros em uma unica mensagem', () => {
    expect(() => validateEnvironment({})).toThrow(/JWT_SECRET[\s\S]*DATABASE_URL/);
  });
});
