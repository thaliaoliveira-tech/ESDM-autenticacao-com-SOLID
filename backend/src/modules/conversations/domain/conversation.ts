export const CONVERSATION_REPOSITORY = Symbol('ConversationRepository');

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const FILE_NAME_MAX = 160;

/** Item do historico "Conversas salvas" (sem o texto). */
export interface ConversationSummary {
  readonly id: string;
  readonly fileName: string;
  readonly sizeBytes: number;
  readonly messageCount: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface ConversationParticipant {
  readonly name: string;
  readonly messageCount: number;
  /** Proporcao das mensagens, em % inteiro (barra de participantes). */
  readonly share: number;
}

/** "Detalhes da conversa". */
export interface ConversationDetails extends ConversationSummary {
  readonly participantCount: number;
  readonly activeDays: number;
  readonly firstMessageOn: string | null;
  readonly lastMessageOn: string | null;
  readonly participants: ConversationParticipant[];
}

export interface CreateConversationData {
  readonly userId: string;
  readonly fileName: string;
  readonly sizeBytes: number;
  readonly content: string;
  readonly fingerprint: string;
  readonly messageCount: number;
  readonly activeDays: number;
  readonly firstMessageOn: string | null;
  readonly lastMessageOn: string | null;
  readonly participants: ReadonlyArray<{ name: string; messageCount: number }>;
}

export interface ConversationRepository {
  findByFingerprint(userId: string, fingerprint: string): Promise<ConversationSummary | null>;
  /** Lanca ConflictError se outra requisicao importou o mesmo arquivo ao mesmo tempo. */
  create(data: CreateConversationData): Promise<ConversationDetails>;
  findDetails(userId: string, id: string): Promise<ConversationDetails | null>;
  findContent(userId: string, id: string): Promise<{ fileName: string; content: string } | null>;
  /** Mais recentes primeiro. */
  listSummaries(userId: string): Promise<ConversationSummary[]>;
  /** Percorre o texto das conversas em lotes, para a busca por conteudo. */
  forEachContent(
    userId: string,
    visit: (item: { id: string; fileName: string; content: string }) => void,
  ): Promise<void>;
  rename(id: string, fileName: string): Promise<void>;
  delete(id: string): Promise<void>;
}
