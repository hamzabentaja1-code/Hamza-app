export type NumberedRecord = {number?: string};
export type DocumentNumberSeries = 'quote'|'invoice'|'delivery'|'proforma'|'creditNote';
export type DocumentNumberPrefixes = Record<DocumentNumberSeries,string>;

export const DEFAULT_DOCUMENT_NUMBER_PREFIXES: DocumentNumberPrefixes = {
  quote: 'DEV', invoice: 'FV', delivery: 'BS', proforma: 'PRO', creditNote: 'AV',
};

export function normalizeDocumentNumberPrefixes(value: unknown): DocumentNumberPrefixes {
  const source = typeof value === 'object' && value !== null ? value as Partial<Record<DocumentNumberSeries,unknown>> : {};
  const normalize = (candidate: unknown, fallback: string) => {
    if (typeof candidate !== 'string') return fallback;
    const result = candidate.trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 20);
    return result || fallback;
  };
  return {
    quote: normalize(source.quote, DEFAULT_DOCUMENT_NUMBER_PREFIXES.quote),
    invoice: normalize(source.invoice, DEFAULT_DOCUMENT_NUMBER_PREFIXES.invoice),
    delivery: normalize(source.delivery, DEFAULT_DOCUMENT_NUMBER_PREFIXES.delivery),
    proforma: normalize(source.proforma, DEFAULT_DOCUMENT_NUMBER_PREFIXES.proforma),
    creditNote: normalize(source.creditNote, DEFAULT_DOCUMENT_NUMBER_PREFIXES.creditNote),
  };
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Finds the next human-readable number without changing existing records. */
export function nextDocumentNumber(prefix: string, records: readonly NumberedRecord[]): string {
  const safePrefix = prefix.trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 20);
  if (!safePrefix) throw new Error('بادئة رقم الوثيقة غير صالحة.');
  const pattern = new RegExp(`^${escapeRegExp(safePrefix)}-(\\d+)$`, 'i');
  const highest = records.reduce((max, record) => {
    const match = typeof record.number === 'string' ? pattern.exec(record.number.trim()) : null;
    if (!match) return max;
    const value = Number(match[1]);
    return Number.isSafeInteger(value) ? Math.max(max, value) : max;
  }, 0);
  if (highest >= Number.MAX_SAFE_INTEGER) throw new Error('وصل تسلسل أرقام الوثائق إلى الحد الأقصى.');
  return `${safePrefix}-${String(highest + 1).padStart(5, '0')}`;
}
