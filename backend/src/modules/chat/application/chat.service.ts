import { Inject, Injectable } from '@nestjs/common';
import { TRANSACTION_MANAGER, type TransactionManager } from '../../../database/transaction';
import {
  ConflictError,
  ServiceUnavailableError,
  UpstreamServiceError,
  ValidationError,
} from '../../../shared/errors/application-error';
import { ConversationsService } from '../../conversations/application/conversations.service';
import { SettingsService } from '../../settings/application/settings.service';
import { SpacesService } from '../../spaces/application/spaces.service';
import { TasksService } from '../../tasks/application/tasks.service';
import { AI_PROVIDER, type AiProvider, type AiToolCall } from '../domain/ai-provider';
import {
  buildAiRequest,
  MAX_HISTORY,
  parseProposals,
  toHistoryEntry,
} from '../domain/assistant-prompt';
import {
  CHAT_REPOSITORY,
  type ChatMessage,
  type ChatRepository,
  type MessageKind,
} from '../domain/chat';
import {
  CONVERSATION_FOLLOW_UPS,
  CONVERSATION_STARTERS,
  generalSuggestions,
  type ChatSuggestion,
} from '../domain/suggestions';
import { toMessageView, type ChatMessageView } from './chat.views';

export const QUESTION_MAX = 4000;
export const AI_NOT_CONFIGURED =
  'A IA nao esta configurada. Defina OPENROUTER_API_KEY no arquivo .env e reinicie o servidor.';
const EMPTY_ANSWER = 'A IA nao retornou uma resposta. Tente novamente.';
const PROPOSALS_ONLY = 'Confira as propostas abaixo e confirme as que estiverem certas.';
const INTERRUPTED = '\n\n*(resposta interrompida)*';

/** Eventos do streaming de uma resposta. */
export type ChatEvent =
  | { readonly type: 'user_message'; readonly message: ChatMessageView }
  | { readonly type: 'delta'; readonly text: string }
  | { readonly type: 'assistant_message'; readonly message: ChatMessageView };

/**
 * Chat com a IA sobre uma conversa importada (ou geral, sem conversa).
 *
 * O servidor monta todo o contexto a partir do banco: texto da conversa,
 * ultimas 20 mensagens do fio (com o destino de cada proposta), tarefas,
 * espacos e a data de hoje do usuario. A resposta e transmitida em fragmentos;
 * se o cliente interromper, o trecho recebido e salvo como interrompido.
 */
@Injectable()
export class ChatService {
  constructor(
    @Inject(CHAT_REPOSITORY) private readonly chat: ChatRepository,
    @Inject(AI_PROVIDER) private readonly ai: AiProvider,
    @Inject(TRANSACTION_MANAGER) private readonly transactions: TransactionManager,
    private readonly conversations: ConversationsService,
    private readonly tasks: TasksService,
    private readonly spaces: SpacesService,
    private readonly settings: SettingsService,
  ) {}

  status(): { configured: boolean; model: string } {
    return { configured: this.ai.configured, model: this.ai.model };
  }

  async listMessages(userId: string, conversationId: string | null): Promise<ChatMessageView[]> {
    if (conversationId) {
      await this.conversations.details(userId, conversationId);
    }
    const [messages, spaceNames] = await Promise.all([
      this.chat.listThread(userId, conversationId),
      this.spaces.listNames(userId),
    ]);
    return messages.map((message) => toMessageView(message, spaceNames));
  }

  async suggestions(userId: string, conversationId: string | null): Promise<ChatSuggestion[]> {
    if (conversationId) {
      await this.conversations.details(userId, conversationId);
      return (await this.chat.hasUserMessage(userId, conversationId))
        ? [...CONVERSATION_FOLLOW_UPS]
        : [...CONVERSATION_STARTERS];
    }
    const summary = await this.tasks.summary(userId);
    return generalSuggestions({
      pendingToday: summary.periods.today.pending,
      pendingTotal: summary.periods.all.pending,
      overdue: summary.overdue,
    });
  }

  /** Salva a pergunta e transmite a resposta. */
  async *ask(
    userId: string,
    conversationId: string | null,
    question: string,
    signal?: AbortSignal,
  ): AsyncGenerator<ChatEvent> {
    const content = question.trim();
    if (!content || content.length > QUESTION_MAX) {
      throw new ValidationError(`Envie uma pergunta de 1 a ${QUESTION_MAX} caracteres.`, 'content');
    }
    this.requireConfigured();
    if (conversationId) {
      await this.conversations.details(userId, conversationId);
    }
    const message = await this.chat.addMessage({
      userId,
      conversationId,
      role: 'user',
      kind: 'chat',
      content,
    });
    yield { type: 'user_message', message: toMessageView(message, []) };
    yield* this.generate(userId, conversationId, 'chat', signal);
  }

  /** "Tentar novamente": responde a ultima pergunta do fio, que ficou sem resposta. */
  async *retry(
    userId: string,
    conversationId: string | null,
    signal?: AbortSignal,
  ): AsyncGenerator<ChatEvent> {
    this.requireConfigured();
    if (conversationId) {
      await this.conversations.details(userId, conversationId);
    }
    const [last] = await this.chat.recentThread(userId, conversationId, 1);
    if (!last || last.role !== 'user') {
      throw new ConflictError('Nao ha pergunta sem resposta para tentar novamente.');
    }
    yield* this.generate(userId, conversationId, 'chat', signal);
  }

  /** Analise automatica apos importar: resumo, participantes, decisoes, tarefas... */
  async *analyze(
    userId: string,
    conversationId: string,
    signal?: AbortSignal,
  ): AsyncGenerator<ChatEvent> {
    this.requireConfigured();
    await this.conversations.details(userId, conversationId);
    yield* this.generate(userId, conversationId, 'analysis', signal);
  }

  private requireConfigured(): void {
    if (!this.ai.configured) {
      throw new ServiceUnavailableError(AI_NOT_CONFIGURED);
    }
  }

  private async *generate(
    userId: string,
    conversationId: string | null,
    mode: 'chat' | 'analysis',
    signal?: AbortSignal,
  ): AsyncGenerator<ChatEvent> {
    const kind: MessageKind = mode === 'analysis' ? 'analysis' : 'chat';
    const [conversation, today, tasks, spaces, history] = await Promise.all([
      conversationId ? this.conversations.content(userId, conversationId) : null,
      this.settings.today(userId),
      this.tasks.listForAssistant(userId),
      this.spaces.listNames(userId),
      mode === 'chat' ? this.chat.recentThread(userId, conversationId, MAX_HISTORY) : [],
    ]);
    const request = buildAiRequest({
      mode,
      conversation,
      today,
      tasks,
      spaces,
      history: history.map(toHistoryEntry),
    });

    let text = '';
    const calls: AiToolCall[] = [];
    try {
      for await (const event of this.ai.stream(request, signal)) {
        if (event.type === 'text') {
          text += event.text;
          yield { type: 'delta', text: event.text };
        } else {
          calls.push({ name: event.name, arguments: event.arguments });
        }
      }
    } catch (error) {
      if (signal?.aborted) {
        await this.saveInterrupted(userId, conversationId, kind, text);
        return;
      }
      throw error;
    }
    if (signal?.aborted) {
      await this.saveInterrupted(userId, conversationId, kind, text);
      return;
    }

    const proposals = parseProposals(calls, new Set(tasks.map((task) => task.id)), today);
    if (!text.trim() && proposals.length === 0) {
      throw new UpstreamServiceError(EMPTY_ANSWER);
    }
    const titles = new Map(tasks.map((task) => [task.id, task.title]));

    const saved: ChatMessage = await this.transactions.run(async () => {
      if (proposals.length > 0) {
        await this.chat.supersedePending(
          userId,
          conversationId,
          proposals.map((proposal) => proposal.ref),
        );
      }
      return this.chat.addMessage({
        userId,
        conversationId,
        role: 'assistant',
        kind,
        content: text.trim() ? text : PROPOSALS_ONLY,
        proposals: proposals.map((proposal) => ({
          ...proposal,
          taskTitle: proposal.taskId ? (titles.get(proposal.taskId) ?? null) : null,
        })),
      });
    });
    yield { type: 'assistant_message', message: toMessageView(saved, spaces) };
  }

  private async saveInterrupted(
    userId: string,
    conversationId: string | null,
    kind: MessageKind,
    text: string,
  ): Promise<void> {
    if (!text.trim()) {
      return;
    }
    await this.chat.addMessage({
      userId,
      conversationId,
      role: 'assistant',
      kind,
      content: text + INTERRUPTED,
      interrupted: true,
    });
  }
}
