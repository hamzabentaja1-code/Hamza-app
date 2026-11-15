export type NumberedRecord = {number?: string};

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
