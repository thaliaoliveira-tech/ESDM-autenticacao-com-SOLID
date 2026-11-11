import { AuthMaintenanceService } from '../../src/modules/auth/application/auth-maintenance.service';
import {
  ACCOUNT_NOT_FOUND_FOR_EMAIL,
  INVALID_RESET_LINK,
  PasswordResetService,
} from '../../src/modules/auth/application/password-reset.service';
import { RegistrationService } from '../../src/modules/auth/application/registration.service';
import { GuestAuthStrategy } from '../../src/modules/auth/application/strategies/guest-auth.strategy';
import type { AuthIdentity } from '../../src/modules/auth/domain/entities/auth-session';
import {
  ConflictError,
  NotFoundError,
  SessionExpiredError,
  ValidationError,
} from '../../src/shared/errors/application-error';
import {
  buildSessionKit,
  configStub,
  FakePasswordHasher,
  ImmediateTransactionManager,
  InMemoryPasswordResetRepository,
  InMemoryUserRepository,
} from '../helpers/fakes';

const DAY = 24 * 60 * 60 * 1000;
const identity: AuthIdentity = {
  userId: 'user-1',
  email: 'demo@example.com',
  name: 'Usuario Demo',
  provider: 'email',
};

describe('SessionService', () => {
  const setup = () =>
    buildSessionKit(new InMemoryUserRepository([InMemoryUserRepository.buildUser()]));

  it('start grava apenas o hash do refresh token, audita e devolve o par', async () => {
    const kit = setup();

    const session = await kit.service.start(identity);

    const [stored] = kit.sessions.sessions.values();
    expect(stored.refreshTokenHash).toBe(`hash:${session.refreshToken}`);
    expect(stored.provider).toBe('email');
    expect(kit.tokens.generateCalls[0].sessionId).toBe(stored.id);
    expect(kit.auditRepository.entries.map((e) => e.action)).toEqual(['auth.login']);
  });

  it('refresh rotaciona o token, preserva a sessao e usa os dados atuais do usuario', async () => {
    const kit = setup();
    const first = await kit.service.start(identity);
    await kit.users.updateProfile('user-1', { name: 'Nome Novo' });

    const second = await kit.service.refresh(first.refreshToken);

    expect(second.refreshToken).not.toBe(first.refreshToken);
    expect(second.user).toEqual({ ...identity, name: 'Nome Novo' });
    expect(kit.sessions.sessions.size).toBe(1);
    await expect(kit.service.refresh(first.refreshToken)).rejects.toBeInstanceOf(
      SessionExpiredError,
    );
  });

  it('refresh recusa token malformado, desconhecido, expirado, revogado ou de usuario removido', async () => {
    const kit = setup();
    await expect(kit.service.refresh('curto')).rejects.toBeInstanceOf(SessionExpiredError);
    await expect(kit.service.refresh('f'.repeat(64))).rejects.toBeInstanceOf(SessionExpiredError);

    const expired = await kit.service.start(identity);
    kit.clock.advance(31 * DAY);
    await expect(kit.service.refresh(expired.refreshToken)).rejects.toBeInstanceOf(
      SessionExpiredError,
    );

    const revoked = await kit.service.start(identity);
    const revokedId = [...kit.sessions.sessions.values()].at(-1)!.id;
    await kit.service.end(revokedId, 'user-1');
    await expect(kit.service.refresh(revoked.refreshToken)).rejects.toBeInstanceOf(
      SessionExpiredError,
    );

    const orphan = await kit.service.start(identity);
    await kit.users.delete('user-1');
    await expect(kit.service.refresh(orphan.refreshToken)).rejects.toBeInstanceOf(
      SessionExpiredError,
    );
  });

  it('refresh falha se outra requisicao rotacionou no meio do caminho', async () => {
    const kit = setup();
    const session = await kit.service.start(identity);
    jest.spyOn(kit.sessions, 'rotate').mockResolvedValueOnce(false);

    await expect(kit.service.refresh(session.refreshToken)).rejects.toBeInstanceOf(
      SessionExpiredError,
    );
  });

  it('isActive confere dono, revogacao e validade', async () => {
    const kit = setup();
    await kit.service.start(identity);

    expect(await kit.service.isActive('session-1', 'user-1')).toBe(true);
    expect(await kit.service.isActive('session-1', 'user-2')).toBe(false);
    expect(await kit.service.isActive('nao-existe', 'user-1')).toBe(false);
    kit.clock.advance(31 * DAY);
    expect(await kit.service.isActive('session-1', 'user-1')).toBe(false);
  });

  it('endAllForUser revoga todas e purgeStale remove as antigas', async () => {
    const kit = setup();
    await kit.service.start(identity);
    await kit.service.start(identity);

    expect(await kit.service.endAllForUser('user-1')).toBe(2);
    kit.clock.advance(8 * DAY);
    expect(await kit.service.purgeStale()).toBe(2);
  });
});

describe('RegistrationService', () => {
  const setup = () => {
    const users = new InMemoryUserRepository([InMemoryUserRepository.buildUser()]);
    const kit = buildSessionKit(users);
    return {
      users,
      kit,
      service: new RegistrationService(users, new FakePasswordHasher(), kit.audit),
    };
  };

  it('normaliza, faz hash da senha e usa o username como nome padrao', async () => {
    const { service, users, kit } = setup();

    const result = await service.register({
      username: ' Nova.Conta ',
      email: ' NOVA@example.com ',
      password: 'Senha@123',
    });

    expect(result).toMatchObject({
      email: 'nova@example.com',
      name: 'nova.conta',
      provider: 'email',
    });
    const stored = await users.findByUsername('nova.conta');
    expect(stored?.passwordHash).toBe('hashed:Senha@123');
    expect(kit.auditRepository.entries[0].action).toBe('auth.register');
  });

  it('respeita o nome informado', async () => {
    const { service } = setup();
    const result = await service.register({
      username: 'abc',
      email: 'a@b.com',
      password: 'x',
      name: ' Ana ',
    });
    expect(result.name).toBe('Ana');
  });

  it('recusa nome de usuario invalido, ja usado, e e-mail ja usado', async () => {
    const { service } = setup();

    await expect(
      service.register({ username: 'a b', email: 'x@y.com', password: 'x' }),
    ).rejects.toBeInstanceOf(ValidationError);
    await expect(
      service.register({ username: 'demo', email: 'x@y.com', password: 'x' }),
    ).rejects.toMatchObject({ field: 'username' });
    await expect(
      service.register({ username: 'outro', email: 'demo@example.com', password: 'x' }),
    ).rejects.toBeInstanceOf(ConflictError);
  });
});

describe('GuestAuthStrategy', () => {
  it('cria um usuario convidado sem e-mail', async () => {
    const users = new InMemoryUserRepository();

    const result = await new GuestAuthStrategy(users).authenticate();

    expect(result).toMatchObject({ email: null, name: 'Convidado', provider: 'guest' });
    expect((await users.findById(result.userId))?.isGuest).toBe(true);
  });
});

describe('PasswordResetService', () => {
  const setup = () => {
    const users = new InMemoryUserRepository([
      InMemoryUserRepository.buildUser({ passwordHash: 'hashed:Antiga@123' }),
      InMemoryUserRepository.buildUser({
        id: 'sem-senha',
        email: 'sem-senha@example.com',
        passwordHash: null,
        username: null,
      }),
    ]);
    const kit = buildSessionKit(users);
    const resets = new InMemoryPasswordResetRepository();
    const transactions = new ImmediateTransactionManager();
    const service = new PasswordResetService(
      users,
      resets,
      new FakePasswordHasher(),
      kit.secureTokens,
      transactions,
      kit.clock,
      kit.service,
      kit.audit,
      configStub(),
    );
    return { service, users, kit, resets, transactions };
  };

  it('gera link de 30 minutos, guarda so o hash e devolve o link com os dados', async () => {
    const { service, resets } = setup();

    const result = await service.request(' DEMO@example.com ');

    expect(result.token).toMatch(/^[a-f0-9]{64}$/);
    expect(result).toEqual({
      email: 'demo@example.com',
      name: 'Usuario Demo',
      token: result.token,
      resetUrl: `sintetiza://redefinir?token=${result.token}`,
      expiresAt: new Date('2026-10-14T12:30:00.000Z'),
    });
    expect([...resets.records.values()][0].tokenHash).toBe(`hash:${result.token}`);
  });

  it('responde NotFound para e-mail desconhecido, sem gerar link', async () => {
    const { service, resets } = setup();

    await expect(service.request('ninguem@example.com')).rejects.toBeInstanceOf(NotFoundError);
    await expect(service.request('ninguem@example.com')).rejects.toThrow(
      ACCOUNT_NOT_FOUND_FOR_EMAIL,
    );
    expect(resets.records.size).toBe(0);
  });

  it('permite definir uma senha em conta que ainda nao tem senha local', async () => {
    const { service, users } = setup();

    const { token } = await service.request('sem-senha@example.com');
    await service.reset(token, 'Nova@1234');

    expect((await users.findById('sem-senha'))?.passwordHash).toBe('hashed:Nova@1234');
  });

  it('redefine a senha, invalida o link, encerra sessoes e audita', async () => {
    const { service, users, kit } = setup();
    await kit.service.start(identity);
    const { token } = await service.request('demo@example.com');

    await service.reset(token, 'Nova@1234');

    expect((await users.findById('user-1'))?.passwordHash).toBe('hashed:Nova@1234');
    expect(await kit.service.isActive('session-1', 'user-1')).toBe(false);
    await expect(service.reset(token, 'Outra@1234')).rejects.toThrow(INVALID_RESET_LINK);
    expect(kit.auditRepository.entries.map((e) => e.action)).toContain(
      'auth.password_reset.completed',
    );
  });

  it('recusa link malformado, desconhecido, expirado ou substituido', async () => {
    const { service, kit } = setup();
    await expect(service.reset('abc', 'x')).rejects.toBeInstanceOf(ValidationError);
    await expect(service.reset('a'.repeat(64), 'x')).rejects.toThrow(INVALID_RESET_LINK);

    const old = await service.request('demo@example.com');
    await service.request('demo@example.com');
    await expect(service.reset(old.token, 'x')).rejects.toThrow(INVALID_RESET_LINK);

    const fresh = await service.request('demo@example.com');
    kit.clock.advance(31 * 60 * 1000);
    await expect(service.reset(fresh.token, 'x')).rejects.toThrow(INVALID_RESET_LINK);
  });

  it('recusa quando o link foi usado em paralelo ou a conta deixou de existir', async () => {
    const { service, resets, users } = setup();
    const raced = await service.request('demo@example.com');
    jest.spyOn(resets, 'markUsed').mockResolvedValueOnce(false);
    await expect(service.reset(raced.token, 'x')).rejects.toThrow(INVALID_RESET_LINK);

    const orphan = await service.request('demo@example.com');
    await users.delete('user-1');
    await expect(service.reset(orphan.token, 'x')).rejects.toThrow(INVALID_RESET_LINK);
  });

  it('purgeStale remove links vencidos', async () => {
    const { service, kit } = setup();
    await service.request('demo@example.com');
    kit.clock.advance(60 * 60 * 1000);

    expect(await service.purgeStale()).toBe(1);
  });
});

describe('AuthMaintenanceService', () => {
  it('limpa sessoes, links e convidados inativos e registra no log quando ha algo', async () => {
    const users = new InMemoryUserRepository([
      InMemoryUserRepository.buildUser({
        id: 'guest-old',
        isGuest: true,
        email: null,
        createdAt: new Date('2026-01-01'),
      }),
      InMemoryUserRepository.buildUser({
        id: 'guest-new',
        isGuest: true,
        email: null,
        createdAt: new Date('2026-10-13'),
      }),
    ]);
    const kit = buildSessionKit(users);
    const resets = new InMemoryPasswordResetRepository();
    const passwordResets = new PasswordResetService(
      users,
      resets,
      new FakePasswordHasher(),
      kit.secureTokens,
      new ImmediateTransactionManager(),
      kit.clock,
      kit.service,
      kit.audit,
      configStub(),
    );
    const maintenance = new AuthMaintenanceService(
      kit.service,
      passwordResets,
      users,
      kit.clock,
      configStub(),
    );

    expect(await maintenance.run()).toEqual({ sessions: 0, passwordResets: 0, guests: 1 });
    expect(await users.findById('guest-new')).not.toBeNull();
    expect(await maintenance.run()).toEqual({ sessions: 0, passwordResets: 0, guests: 0 });
  });
});
