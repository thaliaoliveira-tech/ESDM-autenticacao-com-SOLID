import { PrismaClient } from '@prisma/client';
import { PrismaUserRepository } from '../../src/modules/users/infrastructure/prisma-user.repository';
import type { PrismaService } from '../../src/database/prisma.service';

/**
 * Testes de integracao usam SQLite DE VERDADE.
 *
 * Mockar o Prisma aqui seria testar o mock: o valor deste nivel esta justamente
 * em verificar que o schema, a constraint de unicidade e o mapeamento para a
 * entidade de dominio funcionam de fato.
 */
describe('PrismaUserRepository (SQLite real)', () => {
  const prisma = new PrismaClient();
  const repository = new PrismaUserRepository(prisma as unknown as PrismaService);

  beforeAll(async () => {
    await prisma.$connect();
  });

  beforeEach(async () => {
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  const seedLocalUser = () =>
    prisma.user.create({
      data: { name: 'Usuario Demo', email: 'demo@example.com', passwordHash: 'hash' },
    });

  it('busca por id', async () => {
    const created = await seedLocalUser();

    await expect(repository.findById(created.id)).resolves.toMatchObject({
      id: created.id,
      email: 'demo@example.com',
    });
  });

  it('devolve null para id inexistente', async () => {
    await expect(repository.findById('nao-existe')).resolves.toBeNull();
  });

  it('busca por e-mail', async () => {
    await seedLocalUser();

    await expect(repository.findByEmail('demo@example.com')).resolves.toMatchObject({
      name: 'Usuario Demo',
    });
  });

  it('devolve null para e-mail inexistente', async () => {
    await expect(repository.findByEmail('ninguem@example.com')).resolves.toBeNull();
  });

  it('busca por googleId', async () => {
    await prisma.user.create({
      data: { name: 'Google User', email: 'g@example.com', googleId: 'google-1' },
    });

    await expect(repository.findByGoogleId('google-1')).resolves.toMatchObject({
      email: 'g@example.com',
    });
  });

  it('devolve null para googleId inexistente', async () => {
    await expect(repository.findByGoogleId('nao-existe')).resolves.toBeNull();
  });

  it('cria usuario a partir do Google, sem senha local', async () => {
    const created = await repository.createFromGoogle({
      name: 'Novo Google',
      email: 'novo@example.com',
      googleId: 'google-novo',
    });

    expect(created.passwordHash).toBeNull();
    expect(created.googleId).toBe('google-novo');
    expect(created.id).toEqual(expect.any(String));
  });

  it('vincula conta Google a um usuario local existente', async () => {
    const local = await seedLocalUser();

    const linked = await repository.linkGoogleAccount(local.id, 'google-vinculado');

    expect(linked.googleId).toBe('google-vinculado');
    // A senha local continua valendo: o usuario pode entrar pelos dois caminhos.
    expect(linked.passwordHash).toBe('hash');
  });

  it('respeita a unicidade de e-mail', async () => {
    await seedLocalUser();

    await expect(
      repository.createFromGoogle({
        name: 'Duplicado',
        email: 'demo@example.com',
        googleId: 'outro-google',
      }),
    ).rejects.toBeDefined();
  });

  it('respeita a unicidade de googleId', async () => {
    await repository.createFromGoogle({
      name: 'Primeiro',
      email: 'primeiro@example.com',
      googleId: 'google-unico',
    });

    await expect(
      repository.createFromGoogle({
        name: 'Segundo',
        email: 'segundo@example.com',
        googleId: 'google-unico',
      }),
    ).rejects.toBeDefined();
  });

  it('mapeia o registro do Prisma para a entidade de dominio', async () => {
    const created = await seedLocalUser();

    const user = await repository.findById(created.id);

    expect(Object.keys(user ?? {}).sort()).toEqual(
      ['createdAt', 'email', 'googleId', 'id', 'name', 'passwordHash', 'updatedAt'].sort(),
    );
    expect(user?.createdAt).toBeInstanceOf(Date);
  });
});
