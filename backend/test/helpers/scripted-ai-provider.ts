import type {
  AiProvider,
  AiRequest,
  AiStreamEvent,
} from '../../src/modules/chat/domain/ai-provider';

export type Script = AiStreamEvent[] | Error | { events: AiStreamEvent[]; failAfter: Error };

/**
 * Dublê de teste do modelo de linguagem: devolve, em ordem, as respostas
 * roteirizadas e registra as requisicoes recebidas (para verificar o prompt).
 * Existe apenas em test/; a aplicacao usa o OpenRouterProvider.
 */
export class ScriptedAiProvider implements AiProvider {
  configured = true;
  readonly model = 'roteiro/teste';
  readonly requests: AiRequest[] = [];
  private readonly scripts: Script[] = [];

  enqueue(...scripts: Script[]): void {
    this.scripts.push(...scripts);
  }

  reset(): void {
    this.scripts.length = 0;
    this.requests.length = 0;
    this.configured = true;
  }

  async *stream(request: AiRequest, signal?: AbortSignal): AsyncGenerator<AiStreamEvent> {
    this.requests.push(request);
    const script = this.scripts.shift() ?? [{ type: 'text', text: 'Resposta padrao.' }];
    if (script instanceof Error) {
      throw script;
    }
    const events = Array.isArray(script) ? script : script.events;
    for (const event of events) {
      if (signal?.aborted) {
        throw Object.assign(new Error('aborted'), { name: 'AbortError' });
      }
      await Promise.resolve();
      yield event;
    }
    if (!Array.isArray(script)) {
      throw script.failAfter;
    }
  }
}

export const text = (value: string): AiStreamEvent => ({ type: 'text', text: value });

export const proposeActions = (acoes: Array<Record<string, unknown>>): AiStreamEvent => ({
  type: 'tool_call',
  name: 'propor_acoes_tarefas',
  arguments: JSON.stringify({ acoes }),
});
