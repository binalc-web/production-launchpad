import { useEffect, useRef, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { downloadCsv, type CsvRow } from '../lib/csv';

type Status = { kind: 'idle' } | { kind: 'exporting' } | { kind: 'success'; text: string } | { kind: 'error'; text: string };

interface ExportButtonProps {
  label?: string;
  /** File name without extension; a date stamp and .csv are appended. */
  fileBase: string;
  rows: CsvRow[];
  /** Shown when there is nothing to export, telling the user what to do. */
  emptyHint: string;
  size?: 'sm' | 'md';
}

export default function ExportButton({ label = 'Export', fileBase, rows, emptyHint, size = 'md' }: ExportButtonProps) {
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);

  const empty = rows.length === 0;
  const busy = status.kind === 'exporting';
  const text = size === 'sm' ? 'text-[12px]' : 'text-[13px]';
  const icon = size === 'sm' ? 12 : 13;

  const handleExport = async () => {
    if (empty || busy) return;
    clearTimeout(timer.current);
    setStatus({ kind: 'exporting' });
    try {
      // DUMMY: simulated export preparation. Replace with server-side export job at backend lock.
      await new Promise(r => setTimeout(r, 300));
      const filename = `${fileBase}-${new Date().toISOString().slice(0, 10)}.csv`;
      downloadCsv(filename, rows);
      setStatus({ kind: 'success', text: `Downloaded ${rows.length} row${rows.length !== 1 ? 's' : ''} · ${filename}` });
    } catch {
      setStatus({ kind: 'error', text: 'Export failed. Try again, or allow downloads for this site in your browser.' });
    }
    timer.current = setTimeout(() => setStatus({ kind: 'idle' }), 4000);
  };

  const message =
    status.kind === 'success' || status.kind === 'error' ? status.text : empty ? emptyHint : '';
  const messageColor =
    status.kind === 'error' ? 'text-[#DC2626]' : status.kind === 'success' ? 'text-[#16A34A]' : 'text-[#9CA3AF]';

  return (
    <div className="flex items-center gap-2">
      <span role="status" aria-live="polite" className={`${text} ${messageColor} max-w-[320px] truncate`} title={message}>
        {message}
      </span>
      <button
        type="button"
        onClick={handleExport}
        disabled={empty || busy}
        aria-busy={busy}
        title={empty ? emptyHint : 'Download the rows shown as CSV'}
        className={`flex items-center gap-1.5 px-3 py-1.5 border border-[#E5E7EB] rounded ${text} text-[#374151] bg-white hover:bg-[#F9FAFB] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white`}
      >
        {busy ? <Loader2 size={icon} className="animate-spin" /> : <Download size={icon} />}
        {busy ? 'Exporting…' : label}
      </button>
    </div>
  );
}
