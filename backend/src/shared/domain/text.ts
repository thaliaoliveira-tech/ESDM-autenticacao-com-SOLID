/** Texto de entrada: strings e numeros; o resto vira vazio. */
function toText(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}

/**
 * Normalizacao de texto usada em buscas e chaves unicas.
 *
 * Mesmas regras do prototipo: ignora acentos e maiusculas, colapsa espacos.
 * "Trabalho", " trabalho " e "Trabálho" sao equivalentes.
 */
export function normalizeSearch(value: unknown): string {
  return toText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036F]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Termos de busca normalizados; todos precisam aparecer no texto. */
export function searchTerms(query: string | undefined | null): string[] {
  return normalizeSearch(query).split(' ').filter(Boolean);
}

/** Verdadeiro quando todos os termos da busca aparecem em algum dos campos. */
export function matchesSearch(
  query: string | undefined | null,
  ...fields: Array<string | null | undefined>
): boolean {
  const terms = searchTerms(query);
  if (terms.length === 0) {
    return true;
  }
  const haystack = normalizeSearch(fields.filter(Boolean).join(' '));
  return terms.every((term) => haystack.includes(term));
}

/** Remove espacos das pontas e colapsa sequencias internas. */
export function collapseSpaces(value: unknown): string {
  return toText(value).trim().replace(/\s+/g, ' ');
}
