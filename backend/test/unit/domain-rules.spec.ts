import 'reflect-metadata';
import {
  addDays,
  isIsoDate,
  isTimeOfDay,
  isValidTimezone,
  localDate,
  localTime,
  periodBounds,
  weekdayName,
} from '../../src/shared/domain/dates';
import { collapseSpaces, matchesSearch, normalizeSearch } from '../../src/shared/domain/text';
import { paginate, pageMeta, pageRequest } from '../../src/shared/pagination';
import { ValidationError } from '../../src/shared/errors/application-error';
import {
  conversationStats,
  fingerprint,
  parseWhatsApp,
  toIsoDate,
} from '../../src/modules/conversations/domain/whatsapp';
import { cleanSpaceName, spaceKey } from '../../src/modules/spaces/domain/space';
import { cleanTaskFields, compareTasks, type Task } from '../../src/modules/tasks/domain/task';
import { reminderMessage } from '../../src/modules/notifications/domain/notification';
import { toAccountProfile } from '../../src/modules/users/domain/entities/user';
import { InMemoryUserRepository } from '../helpers/fakes';

describe('datas de calendario', () => {
  it('valida AAAA-MM-DD existentes', () => {
    expect(isIsoDate('2026-02-28')).toBe(true);
    expect(isIsoDate('2028-02-29')).toBe(true);
    expect(isIsoDate('2026-02-29')).toBe(false);
    expect(isIsoDate('2026-13-01')).toBe(false);
    expect(isIsoDate('14/10/2026')).toBe(false);
    expect(isIsoDate(20261014)).toBe(false);
  });

  it('valida horario e fuso', () => {
    expect(isTimeOfDay('09:00')).toBe(true);
    expect(isTimeOfDay('24:00')).toBe(false);
    expect(isValidTimezone('America/Sao_Paulo')).toBe(true);
    expect(isValidTimezone('Marte/Base')).toBe(false);
    expect(isValidTimezone('')).toBe(false);
    expect(isValidTimezone(3)).toBe(false);
  });

  it('calcula data e hora locais por fuso', () => {
    const instant = new Date('2026-10-15T02:30:00Z');
    expect(localDate(instant, 'UTC')).toBe('2026-10-15');
    expect(localDate(instant, 'America/Sao_Paulo')).toBe('2026-10-14');
    expect(localTime(instant, 'America/Sao_Paulo')).toBe('23:30');
  });

  it('periodos: hoje, amanha, semana de segunda a domingo e todas', () => {
    expect(periodBounds('today', '2026-10-14')).toEqual(['2026-10-14', '2026-10-14']);
    expect(periodBounds('tomorrow', '2026-10-31')).toEqual(['2026-11-01', '2026-11-01']);
    expect(periodBounds('week', '2026-10-14')).toEqual(['2026-10-12', '2026-10-18']);
    expect(periodBounds('week', '2026-10-18')).toEqual(['2026-10-12', '2026-10-18']);
    expect(periodBounds('all', '2026-10-14')).toBeNull();
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(weekdayName('2026-10-14')).toBe('quarta-feira');
  });
});

describe('texto e busca', () => {
  it('ignora acentos, maiusculas e espacos extras', () => {
    expect(normalizeSearch('  Relatório   FINAL ')).toBe('relatorio final');
    expect(collapseSpaces('  a   b ')).toBe('a b');
  });

  it('exige todos os termos em qualquer campo', () => {
    expect(matchesSearch('relatorio thalia', 'Relatório', null, 'Thalia')).toBe(true);
    expect(matchesSearch('relatorio lucas', 'Relatório', 'Thalia')).toBe(false);
    expect(matchesSearch('   ', 'qualquer')).toBe(true);
  });
});

describe('paginacao', () => {
  it('aplica padroes e calcula meta', () => {
    expect(pageRequest({})).toEqual({ page: 1, pageSize: 20 });
    expect(pageMeta({ page: 1, pageSize: 20 }, 0)).toMatchObject({ totalPages: 1 });
    expect(paginate([1, 2, 3, 4, 5], { page: 2, pageSize: 2 })).toEqual({
      data: [3, 4],
      meta: { page: 2, pageSize: 2, total: 5, totalPages: 3 },
    });
  });
});

describe('parser do WhatsApp', () => {
  it('reconhece Android, iOS, sistema, BOM, marcas de direcao e continuacoes', () => {
    const messages = parseWhatsApp(
      '\uFEFF13/10/2026 09:00 - Aviso do sistema\r\n' +
        '\u200E13/10/2026 09:05 - Thalia: Linha 1\r\nLinha 2\r\n' +
        '[14/10/26, 11:05:00] Lucas: iOS\u202Fok',
    );

    expect(messages).toEqual([
      { date: '13/10/2026', time: '09:00', author: '', text: 'Aviso do sistema' },
      { date: '13/10/2026', time: '09:05', author: 'Thalia', text: 'Linha 1\nLinha 2' },
      { date: '14/10/26', time: '11:05:00', author: 'Lucas', text: 'iOS ok' },
    ]);
  });

  it('rejeita texto sem data e hora reconheciveis', () => {
    expect(() => parseWhatsApp('ola\nmundo')).toThrow(ValidationError);
  });

  it('datas dia/mes (pt-BR) e mes/dia (en-US) quando o dia passa de 12', () => {
    expect(toIsoDate('13/10/2026')).toBe('2026-10-13');
    expect(toIsoDate('10/13/2026')).toBe('2026-10-13');
    expect(toIsoDate('05/06/26')).toBe('2026-06-05');
    expect(toIsoDate('40/40/2026')).toBe('');
  });

  it('calcula participantes, periodo e dias ativos', () => {
    const stats = conversationStats(
      parseWhatsApp('13/10/2026 09:00 - A: 1\n13/10/2026 09:01 - B: 2\n15/10/2026 10:00 - A: 3'),
    );
    expect(stats).toEqual({
      messageCount: 3,
      participants: [
        { name: 'A', messageCount: 2 },
        { name: 'B', messageCount: 1 },
      ],
      firstMessageOn: '2026-10-13',
      lastMessageOn: '2026-10-15',
      activeDays: 2,
    });
  });

  it('impressao digital ignora diferencas de quebra de linha e BOM', () => {
    expect(fingerprint('\uFEFFa\r\nb')).toBe(fingerprint('a\nb'));
    expect(fingerprint('a')).not.toBe(fingerprint('b'));
  });
});

describe('regras de espacos', () => {
  it('limpa o nome, exige conteudo e limita a 40 caracteres', () => {
    expect(cleanSpaceName('  Meu   espaço ')).toBe('Meu espaço');
    expect(() => cleanSpaceName('  ')).toThrow('Informe o nome do espaco.');
    expect(() => cleanSpaceName('x'.repeat(41))).toThrow(/40/);
    expect(spaceKey('Trabálho ')).toBe(spaceKey('trabalho'));
  });
});

describe('regras de tarefas', () => {
  it('limpa e valida campos', () => {
    expect(
      cleanTaskFields({
        title: ' A ',
        description: null,
        assignee: ' B ',
        dueOn: '',
        priority: null,
      }),
    ).toEqual({ title: 'A', description: '', assignee: 'B', dueOn: null, priority: null });
    expect(() => cleanTaskFields({ title: '' })).toThrow('Informe o titulo da tarefa.');
    expect(() => cleanTaskFields({ title: 'x'.repeat(161) })).toThrow(/160/);
    expect(() => cleanTaskFields({ description: 'x'.repeat(2001) })).toThrow(/2000/);
    expect(() => cleanTaskFields({ assignee: 'x'.repeat(81) })).toThrow(/80/);
    expect(() => cleanTaskFields({ dueOn: '2026-02-30' })).toThrow(/prazo/);
    expect(() => cleanTaskFields({ priority: 'max' as never })).toThrow(/prioridade/);
    expect(cleanTaskFields({ priority: '' as never })).toEqual({ priority: null });
  });

  const task = (overrides: Partial<Task>): Task => ({
    id: 'id',
    title: 't',
    description: '',
    assignee: '',
    dueOn: null,
    priority: null,
    status: 'pending',
    completedOn: null,
    spaceId: null,
    conversationId: null,
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
    ...overrides,
  });

  it('ordena: pendentes primeiro; por prazo; por prioridade; por criacao', () => {
    const a = task({
      id: 'a',
      dueOn: '2026-10-20',
      priority: 'low',
      createdAt: new Date('2026-10-03'),
    });
    const b = task({
      id: 'b',
      dueOn: '2026-10-15',
      priority: 'high',
      createdAt: new Date('2026-10-02'),
    });
    const c = task({ id: 'c', createdAt: new Date('2026-10-04') });
    const d = task({ id: 'd', status: 'done', completedOn: '2026-10-05' });
    const e = task({ id: 'e', status: 'done', completedOn: '2026-10-09' });

    const ids = (sort: 'created' | 'due' | 'priority') =>
      [a, b, c, d, e].sort(compareTasks(sort)).map((t) => t.id);
    expect(ids('created')).toEqual(['c', 'a', 'b', 'e', 'd']);
    expect(ids('due')).toEqual(['b', 'a', 'c', 'e', 'd']);
    expect(ids('priority')).toEqual(['b', 'a', 'c', 'e', 'd']);
  });
});

describe('outras regras', () => {
  it('mensagem do lembrete no singular e no plural', () => {
    expect(reminderMessage(0)).toBe('Voce tem 0 tarefas pendentes para hoje.');
    expect(reminderMessage(1)).toBe('Voce tem 1 tarefa pendente para hoje.');
  });

  it('perfil publico nunca expoe o hash da senha', () => {
    const profile = toAccountProfile(InMemoryUserRepository.buildUser());
    expect(profile).toMatchObject({ hasPassword: true });
    expect(JSON.stringify(profile)).not.toContain('hash-valido');
  });
});
