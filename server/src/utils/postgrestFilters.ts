const MAX_SEARCH_LENGTH = 120;

function sanitizePostgrestSearchValue(value: string | undefined): string | null {
  const sanitized = String(value ?? '')
    .normalize('NFC')
    .slice(0, MAX_SEARCH_LENGTH)
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/[(),{}%_*]/g, ' ')
    .replace(/[^\p{L}\p{N}@.+\-\s']/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return sanitized.length > 0 ? sanitized : null;
}

export function buildIlikeOrFilter(search: string | undefined, columns: readonly string[]): string | null {
  const term = sanitizePostgrestSearchValue(search);
  if (!term) return null;

  for (const column of columns) {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(column)) {
      throw new Error(`Colonne de recherche invalide: ${column}`);
    }
  }

  const pattern = `%${term}%`;
  return columns.map((column) => `${column}.ilike.${pattern}`).join(',');
}
