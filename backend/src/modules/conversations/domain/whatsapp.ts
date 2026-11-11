import { createHash } from 'node:crypto';
import { ValidationError } from '../../../shared/errors/application-error';

export interface ParsedMessage {
  readonly date: string;
  readonly time: string;
  /** Vazio para linhas de sistema ("Mensagens e ligacoes sao protegidas..."). */
  readonly author: string;
  text: string;
}

/**
 * Android: `dia/mes/ano hora - Nome: mensagem`
 * iOS:     `[dia/mes/ano, hora] Nome: mensagem`
 */
const LINE =
  /^\[?(\d{1,2}\/\d{1,2}\/\d{2,4})[, ]+\s*(\d{1,2}:\d{2}(?::\d{2})?)\]?\s*(?:-\s*)?(.*)$/;
const DIRECTION_MARKS = /[\u200E\u200F\u202A-\u202E]/g;

export const NOT_WHATSAPP =
  'Nao reconheci uma conversa exportada do WhatsApp. Use um .txt com data, hora e mensagens.';

/** Remove BOM e normaliza quebras de linha (Windows/Mac antigo). */
export function normalizeExport(text: string): string {
  return text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
}

/**
 * Parser das exportacoes do WhatsApp, fiel ao prototipo: reconhece Android e
 * iOS, linhas de sistema, marcas de direcao, espaco fino e continuacoes de
 * mensagens em varias linhas.
 */
export function parseWhatsApp(text: string): ParsedMessage[] {
  const messages: ParsedMessage[] = [];
  for (const original of normalizeExport(text).split('\n')) {
    const line = original.replace(DIRECTION_MARKS, '').replace(/\u202F/g, ' ');
    const match = LINE.exec(line);
    if (match) {
      const body = match[3];
      const separator = body.indexOf(': ');
      messages.push({
        date: match[1],
        time: match[2],
        author: separator >= 0 ? body.slice(0, separator).trim() : '',
        text: separator >= 0 ? body.slice(separator + 2) : body,
      });
    } else if (messages.length > 0 && line.trim()) {
      messages[messages.length - 1].text += `\n${line}`;
    }
  }
  if (messages.length === 0) {
    throw new ValidationError(NOT_WHATSAPP, 'file');
  }
  return messages;
}

/** SHA-256 do texto normalizado: reimportar o mesmo arquivo abre o historico existente. */
export function fingerprint(text: string): string {
  return createHash('sha256').update(normalizeExport(text)).digest('hex');
}

/**
 * Exportacoes usam o formato de data do telefone: pt-BR e dia/mes, en-US e
 * mes/dia. Quando o segundo numero passa de 12, so pode ser mes/dia.
 */
export function toIsoDate(value: string): string {
  let [first, second, year] = value.split('/').map(Number);
  if (second > 12 && first <= 12) {
    [first, second] = [second, first];
  }
  if (!first || !second || second > 12 || first > 31) {
    return '';
  }
  if (year < 100) {
    year += 2000;
  }
  return `${year}-${String(second).padStart(2, '0')}-${String(first).padStart(2, '0')}`;
}

export interface ConversationStats {
  readonly messageCount: number;
  readonly participants: ReadonlyArray<{ name: string; messageCount: number }>;
  readonly firstMessageOn: string | null;
  readonly lastMessageOn: string | null;
  readonly activeDays: number;
}

/** Numeros dos "Detalhes da conversa", calculados sem a IA. */
export function conversationStats(messages: readonly ParsedMessage[]): ConversationStats {
  const counts = new Map<string, number>();
  for (const message of messages) {
    if (message.author) {
      counts.set(message.author, (counts.get(message.author) ?? 0) + 1);
    }
  }
  const dates = messages
    .map((message) => toIsoDate(message.date))
    .filter(Boolean)
    .sort();
  return {
    messageCount: messages.length,
    participants: [...counts]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([name, messageCount]) => ({ name, messageCount })),
    firstMessageOn: dates[0] ?? null,
    lastMessageOn: dates[dates.length - 1] ?? null,
    activeDays: new Set(dates).size,
  };
}
