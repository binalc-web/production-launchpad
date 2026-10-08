export type CsvRow = Record<string, string | number | boolean | null | undefined>;

function cell(value: CsvRow[string]): string {
  let s = value == null ? '' : String(value);
  // Neutralize spreadsheet formula injection (=, +, -, @, tab, CR at start).
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: CsvRow[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  return [headers, ...rows.map(r => headers.map(h => r[h]))]
    .map(line => line.map(cell).join(','))
    .join('\r\n');
}

export function downloadCsv(filename: string, rows: CsvRow[]): void {
  // BOM so Excel opens UTF-8 (em dashes, ampersands) correctly.
  const blob = new Blob(['\uFEFF' + toCsv(rows)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
