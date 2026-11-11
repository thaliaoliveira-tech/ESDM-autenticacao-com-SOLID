import type { ConfigService } from '@nestjs/config';
import type { AiConfig } from '../../../config/ai.config';
import {
  ServiceUnavailableError,
  UpstreamServiceError,
} from '../../../shared/errors/application-error';
import type { AiProvider, AiRequest, AiStreamEvent } from '../domain/ai-provider';
import { AI_NOT_CONFIGURED } from '../application/chat.service';

export type FetchFn = typeof fetch;

interface StreamChunk {
  error?: { message?: string };
  choices?: Array<{
    delta?: {
      content?: string | null;
      tool_calls?: Array<{ index?: number; function?: { name?: string; arguments?: string } }>;
    };
  }>;
}

const UPSTREAM_MESSAGES: Record<number, string> = {
  401: 'A chave do OpenRouter e invalida. Confira OPENROUTER_API_KEY no arquivo .env.',
  402: 'A conta do OpenRouter esta sem creditos.',
  429: 'O limite de uso do OpenRouter foi atingido. Aguarde um pouco e tente novamente.',
};

/**
 * Cliente do OpenRouter (API compativel com OpenAI) com streaming SSE.
 *
 * O texto chega em fragmentos; chamadas de funcao chegam em pedacos (o nome
 * primeiro, depois o JSON dos argumentos) e sao entregues inteiras no fim.
 * A chave nunca sai do servidor. Instanciado por fabrica no modulo; o `fetch`
 * e injetavel para os testes simularem o OpenRouter sem rede.
 */
export class OpenRouterProvider implements AiProvider {
  readonly configured: boolean;
  readonly model: string;
  private readonly config: AiConfig;

  constructor(
    config: ConfigService,
    private readonly fetchFn: FetchFn = fetch,
  ) {
    this.config = config.getOrThrow<AiConfig>('ai');
    this.configured = this.config.configured;
    this.model = this.config.model;
  }

  async *stream(request: AiRequest, signal?: AbortSignal): AsyncGenerator<AiStreamEvent> {
    if (!this.configured) {
      throw new ServiceUnavailableError(AI_NOT_CONFIGURED);
    }

    const timeout = AbortSignal.timeout(this.config.timeoutMs);
    const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
    const body: Record<string, unknown> = {
      model: this.model,
      messages: request.messages,
      stream: true,
      temperature: 0.3,
    };
    if (request.tools.length > 0) {
      body.tools = request.tools;
      body.tool_choice = 'auto';
    }

    let response: Response;
    try {
      response = await this.fetchFn(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'X-Title': 'Sintetiza',
        },
        body: JSON.stringify(body),
        signal: combined,
      });
    } catch (error) {
      if (signal?.aborted) {
        throw error;
      }
      throw new UpstreamServiceError(
        'Nao foi possivel conectar ao OpenRouter. Confira a conexao com a internet.',
      );
    }

    if (!response.ok || !response.body) {
      throw await this.upstreamError(response);
    }

    const calls = new Map<number, { name: string; arguments: string }>();
    const decoder = new TextDecoder();
    let buffer = '';
    let done = false;
    const reader = response.body.getReader();
    try {
      while (!done) {
        const { value, done: finished } = await reader.read();
        if (finished) {
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        let newline: number;
        while ((newline = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, newline).trim();
          buffer = buffer.slice(newline + 1);
          // O OpenRouter envia comentarios ": OPENROUTER PROCESSING" enquanto o modelo aquece.
          if (!line.startsWith('data:')) {
            continue;
          }
          const data = line.slice(5).trim();
          if (data === '[DONE]') {
            done = true;
            break;
          }
          const chunk = this.parseChunk(data);
          if (chunk.error) {
            throw new UpstreamServiceError(
              `O OpenRouter interrompeu a resposta: ${chunk.error.message ?? 'erro desconhecido'}`,
            );
          }
          const delta = chunk.choices?.[0]?.delta;
          if (delta?.content) {
            yield { type: 'text', text: delta.content };
          }
          for (const call of delta?.tool_calls ?? []) {
            const index = call.index ?? 0;
            const entry = calls.get(index) ?? { name: '', arguments: '' };
            if (call.function?.name) {
              entry.name = call.function.name;
            }
            entry.arguments += call.function?.arguments ?? '';
            calls.set(index, entry);
          }
        }
      }
    } catch (error) {
      if (signal?.aborted || error instanceof UpstreamServiceError) {
        throw error;
      }
      if (timeout.aborted) {
        throw new UpstreamServiceError(
          'O OpenRouter demorou demais para responder. Tente novamente.',
        );
      }
      throw new UpstreamServiceError('A conexao com o OpenRouter caiu durante a resposta.');
    } finally {
      reader.releaseLock();
    }

    for (const index of [...calls.keys()].sort((a, b) => a - b)) {
      const call = calls.get(index)!;
      yield { type: 'tool_call', name: call.name, arguments: call.arguments };
    }
  }

  private parseChunk(data: string): StreamChunk {
    try {
      return JSON.parse(data) as StreamChunk;
    } catch {
      throw new UpstreamServiceError('O OpenRouter enviou uma resposta invalida.');
    }
  }

  private async upstreamError(response: Response): Promise<UpstreamServiceError> {
    let detail = '';
    try {
      detail = ((await response.json()) as { error?: { message?: string } }).error?.message ?? '';
    } catch {
      detail = '';
    }
    return new UpstreamServiceError(
      UPSTREAM_MESSAGES[response.status] ??
        `O OpenRouter recusou a requisicao (${response.status}). ${detail}`.trim(),
    );
  }
}
