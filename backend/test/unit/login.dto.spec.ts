import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { LoginDto } from '../../src/modules/auth/presentation/dto/login.dto';

const build = (payload: unknown) => plainToInstance(LoginDto, payload);
const errorsOf = (payload: unknown) =>
  validateSync(build(payload), { whitelist: true, forbidNonWhitelisted: true });

describe('LoginDto', () => {
  it('aceita um corpo valido', () => {
    expect(errorsOf({ email: 'demo@example.com', password: 'Demo@123' })).toHaveLength(0);
  });

  it('normaliza o e-mail (apara e converte para minusculas)', () => {
    expect(build({ email: '  DEMO@Example.COM  ', password: 'Demo@123' }).email).toBe(
      'demo@example.com',
    );
  });

  it('deixa passar valores nao-string para o validador acusar', () => {
    // O Transform so normaliza strings; um numero chega intacto e vira erro
    // de validacao, em vez de quebrar dentro do transform.
    const dto = build({ email: 42, password: 'Demo@123' });

    expect(dto.email).toBe(42 as unknown as string);
    expect(errorsOf({ email: 42, password: 'Demo@123' })).not.toHaveLength(0);
  });

  it('recusa e-mail malformado', () => {
    expect(errorsOf({ email: 'nao-e-email', password: 'Demo@123' })).not.toHaveLength(0);
  });

  it('recusa senha curta demais', () => {
    expect(errorsOf({ email: 'demo@example.com', password: '123' })).not.toHaveLength(0);
  });

  it('recusa senha longa demais', () => {
    expect(errorsOf({ email: 'demo@example.com', password: 'x'.repeat(129) })).not.toHaveLength(0);
  });

  it('recusa campos desconhecidos', () => {
    expect(
      errorsOf({ email: 'demo@example.com', password: 'Demo@123', isAdmin: true }),
    ).not.toHaveLength(0);
  });

  it('recusa corpo vazio', () => {
    expect(errorsOf({})).not.toHaveLength(0);
  });
});
