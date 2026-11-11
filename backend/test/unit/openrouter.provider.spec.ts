import {
  OpenRouterProvider,
  type FetchFn,
} from '../../src/modules/chat/infrastructure/openrouter.provider';
import type { AiStreamEvent } from '../../src/modules/chat/domain/ai-provider';
import {
  ServiceUnavailableError,
  UpstreamServiceError,
} from '../../src/shared/errors/application-error';
import { configStub } from '../helpers/fakes';

const aiConfig = (overrides: Record<string, unknown> = {}) =>
  configStub({
    ai: {
      apiKey: 'sk-test',
      model: 'deepseek/teste',
      baseUrl: 'http://openrouter.local/v1',
      timeoutMs: 5000,
      configured: true,
      ...overrides,
    },
  });

function sseResponse(lines: string[], status = 200): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      // Fragmentos quebrados no meio da linha, como na rede.
      const text = lines.join('\n') + '\n';
      for (let i = 0; i < text.length; i += 7) {
        controller.enqueue(encoder.encode(text.slice(i, i + 7)));
      }
      controller.close();
    },
  });
  return new Response(body, { status, headers: { 'Content-Type': 'text/event-stream' } });
}

const chunk = (delta: unknown) => `data: ${JSON.stringify({ choices: [{ delta }] })}`;

async function collect(
  provider: OpenRouterProvider,
  signal?: AbortSignal,
): Promise<AiStreamEvent[]> {
  const events: AiStreamEvent[] = [];
  for await (const event of provider.stream(
    { messages: [{ role: 'user', content: 'oi' }], tools: [] },
    signal,
  )) {
    events.push(event);
  }
  return events;
}

describe('OpenRouterProvider', () => {
  it('envia a requisicao autenticada e transmite texto e chamadas de funcao montadas', async () => {
    const fetchFn = jest.fn<ReturnType<FetchFn>, Parameters<FetchFn>>().mockResolvedValue(
      sseResponse([
        ': OPENROUTER PROCESSING',
        chunk({ content: 'Olá, ' }),
        chunk({ content: 'mundo' }),
        chunk({
          tool_calls: [
            { index: 0, function: { name: 'propor_acoes_tarefas', arguments: '{"acoes":' } },
          ],
        }),
        chunk({ tool_calls: [{ index: 0, function: { arguments: '[]}' } }] }),
        'data: [DONE]',
        chunk({ content: 'ignorado depois do DONE' }),
      ]),
    );
    const provider = new OpenRouterProvider(aiConfig(), fetchFn);

    const events = await collect(provider);

    expect(events).toEqual([
      { type: 'text', text: 'Olá, ' },
      { type: 'text', text: 'mundo' },
      { type: 'tool_call', name: 'propor_acoes_tarefas', arguments: '{"acoes":[]}' },
    ]);
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe('http://openrouter.local/v1/chat/completions');
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer sk-test');
    const body = JSON.parse(init?.body as string) as Record<string, unknown>;
    expect(body).toMatchObject({ model: 'deepseek/teste', stream: true });
    expect(body.tools).toBeUndefined();
  });

  it('inclui as ferramentas quando a requisicao as tem', async () => {
    const fetchFn = jest.fn().mockResolvedValue(sseResponse(['data: [DONE]']));
    const provider = new OpenRouterProvider(aiConfig(), fetchFn);
    const tool = {
      type: 'function' as const,
      function: { name: 'f', description: 'd', parameters: {} },
    };

    const events = [];
    for await (const event of provider.stream({ messages: [], tools: [tool] })) {
      events.push(event);
    }
    expect(events).toEqual([]);

    const body = JSON.parse(
      (fetchFn.mock.calls[0] as [string, RequestInit])[1].body as string,
    ) as Record<string, unknown>;
    expect(body).toMatchObject({ tools: [tool], tool_choice: 'auto' });
  });

  it('503 sem chave configurada', async () => {
    const provider = new OpenRouterProvider(aiConfig({ configured: false }), jest.fn());
    await expect(collect(provider)).rejects.toBeInstanceOf(ServiceUnavailableError);
  });

  it.each([
    [401, 'chave do OpenRouter e invalida'],
    [402, 'sem creditos'],
    [429, 'limite de uso'],
    [500, 'recusou a requisicao (500). Falhou'],
  ])('traduz HTTP %i do provedor', async (status, message) => {
    const fetchFn = jest
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ error: { message: 'Falhou' } }), { status }),
      );
    const provider = new OpenRouterProvider(aiConfig(), fetchFn);

    await expect(collect(provider)).rejects.toThrow(message);
  });

  it('erro sem corpo JSON e falha de conexao', async () => {
    const noJson = new OpenRouterProvider(
      aiConfig(),
      jest.fn().mockResolvedValue(new Response('oops', { status: 503 })),
    );
    await expect(collect(noJson)).rejects.toThrow('(503).');

    const offline = new OpenRouterProvider(
      aiConfig(),
      jest.fn().mockRejectedValue(new TypeError('fetch failed')),
    );
    await expect(collect(offline)).rejects.toThrow(/conectar ao OpenRouter/);
  });

  it('erro enviado no meio do streaming e chunk invalido', async () => {
    const midStream = new OpenRouterProvider(
      aiConfig(),
      jest
        .fn()
        .mockResolvedValue(
          sseResponse([chunk({ content: 'a' }), 'data: {"error":{"message":"caiu"}}']),
        ),
    );
    await expect(collect(midStream)).rejects.toThrow(/interrompeu a resposta: caiu/);

    const invalid = new OpenRouterProvider(
      aiConfig(),
      jest.fn().mockResolvedValue(sseResponse(['data: {quebrado'])),
    );
    await expect(collect(invalid)).rejects.toBeInstanceOf(UpstreamServiceError);
  });

  it('propaga o cancelamento feito pelo cliente', async () => {
    const abort = new AbortController();
    abort.abort();
    const fetchFn = jest
      .fn()
      .mockRejectedValue(Object.assign(new Error('aborted'), { name: 'AbortError' }));
    const provider = new OpenRouterProvider(aiConfig(), fetchFn);

    await expect(collect(provider, abort.signal)).rejects.toThrow('aborted');
  });

  it('conexao que cai durante a leitura vira erro do provedor', async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(chunk({ content: 'a' }) + '\n'));
        controller.error(new Error('socket hang up'));
      },
    });
    const provider = new OpenRouterProvider(
      aiConfig(),
      jest.fn().mockResolvedValue(new Response(body, { status: 200 })),
    );

    await expect(collect(provider)).rejects.toThrow(/conexao com o OpenRouter caiu/);
  });
});
