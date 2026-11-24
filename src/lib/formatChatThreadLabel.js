const PREVIEW_MAX_LEN = 60;

/**
 * Format a thread list label: date + preview snippet.
 * @param {{ archivedAt?: string | null, previewText?: string | null }} thread
 */
export function formatChatThreadLabel(thread) {
  const preview = truncatePreview(thread?.previewText);
  const dateLabel = formatThreadDate(thread?.archivedAt);
  if (dateLabel && preview) return `${dateLabel} — ${preview}`;
  return dateLabel || preview || "Older chat";
}

/**
 * @param {unknown} raw
 */
function truncatePreview(raw) {
  const text = typeof raw === "string" ? raw.trim().replace(/\s+/g, " ") : "";
  if (!text) return "";
  if (text.length <= PREVIEW_MAX_LEN) return text;
  return `${text.slice(0, PREVIEW_MAX_LEN - 1)}…`;
}

/**
 * @param {string | null | undefined} iso
 */
function formatThreadDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
