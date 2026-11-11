export type CsvCell = string | number | boolean | null | undefined;

const formulaPrefix = /^[\s\uFEFF]*[=+@-]/;

function escapeCell(value: CsvCell): string {
  let text = value == null ? '' : String(value);
  // Spreadsheet apps may execute cells beginning with formula operators.
  if (typeof value === 'string' && formulaPrefix.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

/** Builds a semicolon-separated UTF-8 CSV that opens reliably in Excel locales using comma decimals. */
export function buildCsv(headers: readonly CsvCell[], rows: readonly (readonly CsvCell[])[]): string {
  const lines = [headers, ...rows].map(row => row.map(escapeCell).join(';'));
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}
