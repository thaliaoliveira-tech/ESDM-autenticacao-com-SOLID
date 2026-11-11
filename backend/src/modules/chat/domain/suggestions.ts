export interface ChatSuggestion {
  readonly text: string;
  /** question: pergunta sobre a conversa; command: aciona uma funcao do app (tarefas). */
  readonly kind: 'question' | 'command';
}

/** Ate a primeira pergunta sobre uma conversa importada (como no prototipo). */
export const CONVERSATION_STARTERS: readonly ChatSuggestion[] = [
  { text: 'Crie as tarefas desta conversa.', kind: 'command' },
  { text: 'Quais decisões foram tomadas?', kind: 'question' },
  { text: 'Resuma a conversa em 3 frases.', kind: 'question' },
];

export const CONVERSATION_FOLLOW_UPS: readonly ChatSuggestion[] = [
  { text: 'O que ficou pendente nesta conversa?', kind: 'question' },
  { text: 'Quais prazos foram combinados?', kind: 'question' },
  { text: 'Crie as tarefas desta conversa.', kind: 'command' },
];

export interface GeneralContext {
  readonly pendingToday: number;
  readonly pendingTotal: number;
  readonly overdue: number;
}

/**
 * Sem conversa aberta: comandos que remetem as funcoes do app (pedido do
 * design: "criar lista de tarefas"), ajustados ao estado das tarefas.
 */
export function generalSuggestions(context: GeneralContext): ChatSuggestion[] {
  const suggestions: ChatSuggestion[] = [];
  if (context.pendingToday > 0) {
    suggestions.push({ text: 'O que tenho para fazer hoje?', kind: 'question' });
  }
  if (context.overdue > 0) {
    suggestions.push({ text: 'Quais tarefas estão atrasadas?', kind: 'question' });
  }
  suggestions.push({ text: 'Criar lista de tarefas para esta semana.', kind: 'command' });
  if (context.pendingTotal > 0) {
    suggestions.push({
      text: 'Organize minhas tarefas pendentes por prioridade.',
      kind: 'command',
    });
  } else {
    suggestions.push({ text: 'Como importo uma conversa do WhatsApp?', kind: 'question' });
  }
  return suggestions.slice(0, 4);
}
