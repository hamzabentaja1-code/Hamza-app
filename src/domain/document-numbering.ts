export type NumberedDocument = { number?: string };

/** Normalize a user-configured series prefix without allowing whitespace-only values. */
export function normalizeSeriesPrefix(value: string, fallback: string): string {
  const normalized = value.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (!normalized) return fallback;
  if (normalized.length > 12) throw new Error('Document prefix must be 12 characters or fewer');
  return normalized;
}

/** Generate the next number in a prefix/year series without relying on timestamps. */
export function nextDocumentNumber(
  prefix: string,
  existing: NumberedDocument[],
  year = new Date().getFullYear(),
): string {
  const normalizedPrefix = normalizeSeriesPrefix(prefix, 'DOC');
  if (!Number.isInteger(year) || year < 2000 || year > 9999) {
    throw new Error('Document year is invalid');
  }
  const start = normalizedPrefix + '-' + year + '-';
  let highest = 0;
  for (const document of existing) {
    if (typeof document.number !== 'string' || !document.number.startsWith(start)) continue;
    const suffix = document.number.slice(start.length);
    if (!/^\\d{4,}$/.test(suffix)) continue;
    const sequence = Number(suffix);
    if (Number.isSafeInteger(sequence)) highest = Math.max(highest, sequence);
  }
  if (highest >= Number.MAX_SAFE_INTEGER) throw new Error('Document sequence is exhausted');
  return start + String(highest + 1).padStart(4, '0');
}
