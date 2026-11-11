import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AccountService } from '../../src/modules/users/application/account.service';
import { RegisterDto, ResetPasswordDto } from '../../src/modules/auth/presentation/dto/auth.dto';
import {
  CreateTaskDto,
  ListTasksQueryDto,
  UpdateTaskDto,
} from '../../src/modules/tasks/presentation/tasks.dto';
import { UpdateSettingsDto } from '../../src/modules/settings/presentation/settings.controller';
import { ProposalEditsDto, StreamQueryDto } from '../../src/modules/chat/presentation/chat.dto';
import { createValidationPipe } from '../../src/shared/http/validation';
import { BadRequestException } from '@nestjs/common';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../src/shared/errors/application-error';
import { AuditService } from '../../src/modules/audit/application/audit.service';
import {
  ImmediateTransactionManager,
  InMemoryAuditRepository,
  InMemoryUserRepository,
} from '../helpers/fakes';

describe('AccountService', () => {
  const setup = () => {
    const users = new InMemoryUserRepository([
      InMemoryUserRepository.buildUser(),
      InMemoryUserRepository.buildUser({
        id: 'user-2',
        username: 'outra',
        email: 'outra@example.com',
      }),
      InMemoryUserRepository.buildUser({
        id: 'guest',
        username: null,
        email: null,
        isGuest: true,
        passwordHash: null,
      }),
    ]);
    const audit = new InMemoryAuditRepository();
    const service = new AccountService(
      users,
      new ImmediateTransactionManager(),
      new AuditService(audit),
    );
    return { users, audit, service };
  };

  it('devolve o perfil publico', async () => {
    const { service } = setup();
    await expect(service.getProfile('user-1')).resolves.toMatchObject({
      username: 'demo',
      hasPassword: true,
    });
    await expect(service.getProfile('x')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('atualiza somente o que mudou e audita os campos', async () => {
    const { service, audit } = setup();

    const updated = await service.updateProfile('user-1', {
      name: 'Novo',
      username: 'demo',
      email: 'novo@example.com',
    });

    expect(updated).toMatchObject({ name: 'Novo', email: 'novo@example.com' });
    expect(audit.entries[0].metadata).toEqual({ fields: ['name', 'email'] });
  });

  it('sem mudancas nao grava nem audita', async () => {
    const { service, audit } = setup();
    await service.updateProfile('user-1', { email: 'demo@example.com' });
    expect(audit.entries).toHaveLength(0);
  });

  it('recusa username/e-mail de outra conta e edicao por convidado', async () => {
    const { service } = setup();
    await expect(service.updateProfile('user-1', { username: 'outra' })).rejects.toBeInstanceOf(
      ConflictError,
    );
    await expect(
      service.updateProfile('user-1', { email: 'outra@example.com' }),
    ).rejects.toMatchObject({
      field: 'email',
    });
    await expect(service.updateProfile('guest', { name: 'x' })).rejects.toBeInstanceOf(
      ForbiddenError,
    );
    await expect(service.updateProfile('user-1', { username: 'livre' })).resolves.toMatchObject({
      username: 'livre',
    });
  });

  it('exclui a conta e registra a auditoria sem dono', async () => {
    const { service, users, audit } = setup();

    await service.deleteAccount('user-1');

    expect(await users.findById('user-1')).toBeNull();
    expect(audit.entries[0]).toMatchObject({
      userId: null,
      action: 'account.deleted',
      entityId: 'user-1',
    });
    await expect(service.deleteAccount('user-1')).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('AuditService', () => {
  it('nunca derruba a operacao quando a gravacao falha', async () => {
    const repository = new InMemoryAuditRepository();
    jest.spyOn(repository, 'create').mockRejectedValueOnce(new Error('disco cheio'));

    await expect(
      new AuditService(repository).record({
        userId: 'u',
        action: 'task.created',
        entityType: 'task',
      }),
    ).resolves.toBeUndefined();
  });

  it('pagina a trilha do usuario', async () => {
    const repository = new InMemoryAuditRepository();
    const audit = new AuditService(repository);
    await audit.record({ userId: 'u', action: 'task.created', entityType: 'task' });
    await audit.record({ userId: 'u', action: 'task.deleted', entityType: 'task' });

    const page = await audit.listForUser('u', { page: 1, pageSize: 1 });
    expect(page.meta).toMatchObject({ total: 2, totalPages: 2 });
  });
});

describe('Validacao dos DTOs', () => {
  const errorsOf = async <T extends object>(type: new () => T, plain: object) =>
    (
      await validate(plainToInstance(type, plain), { whitelist: true, forbidNonWhitelisted: true })
    ).map((error) => error.property);

  it('RegisterDto normaliza e valida usuario, e-mail, senha e confirmacao', async () => {
    const dto = plainToInstance(RegisterDto, {
      username: ' Ana.Silva ',
      email: ' ANA@Example.com ',
      password: 'Senha@123',
      confirmPassword: 'Senha@123',
    });
    expect(dto).toMatchObject({ username: 'ana.silva', email: 'ana@example.com' });
    expect(await validate(dto)).toHaveLength(0);

    expect(
      await errorsOf(RegisterDto, {
        username: 'a',
        email: 'x',
        password: '123',
        confirmPassword: '321',
      }),
    ).toEqual(['username', 'email', 'password', 'confirmPassword']);
  });

  it('ResetPasswordDto exige confirmacao igual', async () => {
    expect(
      await errorsOf(ResetPasswordDto, {
        token: 't',
        password: 'Senha@123',
        confirmPassword: 'Outra@123',
      }),
    ).toEqual(['confirmPassword']);
  });

  it('CreateTaskDto/UpdateTaskDto: titulo obrigatorio, null limpa, campos extras recusados', async () => {
    expect(await errorsOf(CreateTaskDto, { title: ' ' })).toEqual(['title']);
    expect(await errorsOf(UpdateTaskDto, { dueOn: null, priority: '', spaceId: '' })).toEqual([]);
    expect(await errorsOf(UpdateTaskDto, { dueOn: '2026-02-30', priority: 'x' })).toEqual([
      'dueOn',
      'priority',
    ]);
    expect(await errorsOf(CreateTaskDto, { title: 'ok', userId: 'outro' })).toEqual(['userId']);
  });

  it('ListTasksQueryDto valida filtros e converte paginacao', async () => {
    const dto = plainToInstance(ListTasksQueryDto, { page: '2', pageSize: '10', today: '' });
    expect(dto).toMatchObject({ page: 2, pageSize: 10, today: undefined });
    expect(
      (await errorsOf(ListTasksQueryDto, { status: 'x', sort: 'y', page: '0' })).sort(),
    ).toEqual(['page', 'sort', 'status']);
  });

  it('UpdateSettingsDto valida tema, fuso e lembrete aninhado', async () => {
    expect(
      await errorsOf(UpdateSettingsDto, {
        theme: 'dark',
        timezone: 'UTC',
        dailyReminder: { enabled: true, time: '07:00' },
      }),
    ).toEqual([]);
    expect(await errorsOf(UpdateSettingsDto, { dailyReminder: { time: '7h' } })).toEqual([
      'dailyReminder',
    ]);
  });

  it('ProposalEditsDto e StreamQueryDto', async () => {
    expect(
      await errorsOf(ProposalEditsDto, { completedOn: '2026-10-10', spaceName: null }),
    ).toEqual([]);
    expect(plainToInstance(StreamQueryDto, { stream: 'true' }).stream).toBe(true);
    expect(plainToInstance(StreamQueryDto, { stream: '0' }).stream).toBe(false);
    expect(await errorsOf(StreamQueryDto, { stream: 'talvez' })).toEqual(['stream']);
  });

  it('o pipe global indica o primeiro campo invalido, inclusive aninhado', async () => {
    const pipe = createValidationPipe();
    const error: unknown = await pipe
      .transform(
        { dailyReminder: { time: '99:99' } },
        { type: 'body', metatype: UpdateSettingsDto },
      )
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(BadRequestException);
    expect((error as BadRequestException).getResponse()).toMatchObject({
      field: 'dailyReminder.time',
    });
  });
});
