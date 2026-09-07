import { Argon2PasswordHasher } from '../../src/modules/auth/infrastructure/security/argon2-password-hasher';

// Argon2 e proposital e legitimamente lento; o default de 5s do Jest aperta demais.
jest.setTimeout(30_000);

describe('Argon2PasswordHasher', () => {
  const hasher = new Argon2PasswordHasher();

  it('gera um hash no formato argon2id', async () => {
    const hash = await hasher.hash('Demo@123');

    expect(hash.startsWith('$argon2id$')).toBe(true);
    expect(hash).not.toContain('Demo@123');
  });

  it('gera hashes diferentes para a mesma senha (salt aleatorio)', async () => {
    const [primeiro, segundo] = await Promise.all([
      hasher.hash('Demo@123'),
      hasher.hash('Demo@123'),
    ]);

    expect(primeiro).not.toBe(segundo);
  });

  it('confirma a senha correta', async () => {
    const hash = await hasher.hash('Demo@123');

    await expect(hasher.verify('Demo@123', hash)).resolves.toBe(true);
  });

  it('recusa a senha incorreta', async () => {
    const hash = await hasher.hash('Demo@123');

    await expect(hasher.verify('errada', hash)).resolves.toBe(false);
  });

  it('retorna false (em vez de explodir) diante de um hash corrompido', async () => {
    await expect(hasher.verify('Demo@123', 'isto-nao-e-um-hash')).resolves.toBe(false);
  });
});
