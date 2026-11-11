import { registerAs } from '@nestjs/config';

export interface AiConfig {
  /** Chave do OpenRouter. Sem ela o chat responde 503 com instrucao clara. */
  readonly apiKey: string;
  readonly model: string;
  readonly baseUrl: string;
  readonly timeoutMs: number;
  readonly configured: boolean;
}

export const DEFAULT_AI_MODEL = 'deepseek/deepseek-v4.1-flash';
export const DEFAULT_AI_BASE_URL = 'https://openrouter.ai/api/v1';

export const aiConfig = registerAs('ai', (): AiConfig => {
  const apiKey = process.env.OPENROUTER_API_KEY ?? '';
  const timeout = Number.parseInt(process.env.OPENROUTER_TIMEOUT_MS ?? '', 10);
  return {
    apiKey,
    model: process.env.OPENROUTER_MODEL || DEFAULT_AI_MODEL,
    baseUrl: (process.env.OPENROUTER_BASE_URL || DEFAULT_AI_BASE_URL).replace(/\/+$/, ''),
    timeoutMs: Number.isFinite(timeout) && timeout > 0 ? timeout : 120_000,
    configured: apiKey.length > 0,
  };
});
