/**
 * Validacao das variaveis de ambiente na subida da aplicacao.
 *
 * Falhar aqui, com mensagem clara, e muito melhor do que falhar mais tarde com
 * um `secretOrPrivateKey must have a value` vindo do fundo do jsonwebtoken.
 */
const POSITIVE_INTEGERS = [
  'REFRESH_TOKEN_TTL_DAYS',
  'PASSWORD_RESET_TTL_MINUTES',
  'GUEST_RETENTION_DAYS',
  'OPENROUTER_TIMEOUT_MS',
] as const;

const BOOLEANS = ['JOBS_ENABLED'] as const;

/** Texto de um valor escalar do ambiente; objetos nunca sao validos aqui. */
function scalar(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
    ? String(value)
    : '';
}

export function validateEnvironment(config: Record<string, unknown>): Record<string, unknown> {
  const errors: string[] = [];

  const jwtSecret = config.JWT_SECRET;
  if (typeof jwtSecret !== 'string' || jwtSecret.trim().length === 0) {
    errors.push('JWT_SECRET e obrigatorio.');
  }

  const databaseUrl = config.DATABASE_URL;
  if (typeof databaseUrl !== 'string' || databaseUrl.trim().length === 0) {
    errors.push('DATABASE_URL e obrigatorio.');
  }

  const port = config.PORT;
  if (port !== undefined && Number.isNaN(Number(port))) {
    errors.push('PORT deve ser numerico.');
  }

  for (const name of POSITIVE_INTEGERS) {
    const value = config[name];
    if (value !== undefined && value !== '' && !/^[1-9]\d*$/.test(scalar(value))) {
      errors.push(`${name} deve ser um inteiro positivo.`);
    }
  }

  for (const name of BOOLEANS) {
    const value = config[name];
    if (value !== undefined && value !== '' && !['true', 'false'].includes(scalar(value))) {
      errors.push(`${name} deve ser "true" ou "false".`);
    }
  }

  if (config.NODE_ENV === 'production' && jwtSecret === 'troque-este-segredo-em-producao') {
    errors.push('JWT_SECRET de exemplo nao pode ser usado em producao.');
  }

  if (errors.length > 0) {
    throw new Error(`Configuracao invalida:\n  - ${errors.join('\n  - ')}`);
  }

  return config;
}
