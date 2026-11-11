export const AI_PROVIDER = Symbol('AiProvider');

export interface AiMessage {
  readonly role: 'system' | 'user' | 'assistant';
  readonly content: string;
}

export interface AiToolDefinition {
  readonly type: 'function';
  readonly function: {
    readonly name: string;
    readonly description: string;
    readonly parameters: Record<string, unknown>;
  };
}

export interface AiRequest {
  readonly messages: AiMessage[];
  readonly tools: AiToolDefinition[];
}

export interface AiToolCall {
  readonly name: string;
  readonly arguments: string;
}

/** Fragmentos da resposta em streaming: texto e, ao final, chamadas de funcao. */
export type AiStreamEvent =
  { readonly type: 'text'; readonly text: string } | ({ readonly type: 'tool_call' } & AiToolCall);

/**
 * Contrato do modelo de linguagem. A implementacao atual usa o OpenRouter
 * (DeepSeek); qualquer endpoint compativel pode ser plugado no modulo.
 *
 * Falhas viram `UpstreamServiceError` (recusa/indisponibilidade do provedor) ou
 * `ServiceUnavailableError` (sem configuracao). Cancelamentos propagam o
 * `AbortError` do `signal`.
 */
export interface AiProvider {
  readonly configured: boolean;
  readonly model: string;
  stream(request: AiRequest, signal?: AbortSignal): AsyncIterable<AiStreamEvent>;
}
