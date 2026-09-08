/**
 * Validacao das variaveis de ambiente na subida da aplicacao.
 *
 * Falhar aqui, com mensagem clara, e muito melhor do que falhar mais tarde com
 * um `secretOrPrivateKey must have a value` vindo do fundo do jsonwebtoken.
 */
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

  if (errors.length > 0) {
    throw new Error(`Configuracao invalida:\n  - ${errors.join('\n  - ')}`);
  }

  return config;
}
