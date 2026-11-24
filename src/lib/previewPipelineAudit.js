/** @param {{ ok?: boolean, pending?: boolean }} opts */
export function previewPipelineAuditEmoji(opts = {}) {
  if (opts.ok === true) return "✅";
  if (opts.ok === false) return "❌";
  if (opts.pending) return "⏳";
  return "🔹";
}

/** @param {Record<string, unknown>} meta */
function extractPreviewPort(meta = {}) {
  const direct = meta.previewPort ?? meta.port;
  if (direct != null && Number.isFinite(Number(direct))) return Number(direct);
  const src = typeof meta.src === "string" ? meta.src : "";
  const fromPath = src.match(/\/embedded\/(\d+)\b/);
  if (fromPath) return Number(fromPath[1]);
  const fromQuery = src.match(/[?&]embed_port=(\d+)/);
  if (fromQuery) return Number(fromQuery[1]);
  return null;
}

/** @param {string} detail */
function shortFailHint(detail) {
  const text = String(detail || "");
  const arrow = text.split("→").pop()?.trim() || text;
  return arrow
    .replace(/^inspect GET\s+\S+\s*/i, "")
    .replace(/^computed\s+\S+/i, "src")
    .slice(0, 48);
}

/**
 * Browser-side audit logs for the Client Link preview pipeline.
 * Pass `ok: true` → ✅, `ok: false` → ❌, `pending: true` → ⏳.
 *
 * @param {string} step
 * @param {string} detail
 * @param {Record<string, unknown> & { ok?: boolean, pending?: boolean }} [meta]
 */
export function auditPreviewPipeline(step, detail, meta = {}) {
  const { ok, pending } = meta;
  // Skip in-progress noise (health probes spam the console otherwise).
  if (pending) return;
  if (ok !== true && ok !== false) return;

  const port = extractPreviewPort(meta);
  if (port == null) return;

  const emoji = previewPipelineAuditEmoji({ ok, pending });
  const hint = ok === false ? shortFailHint(detail) : "ready";
  const level = ok === false ? "error" : "log";
  // eslint-disable-next-line no-console -- intentional pipeline audit trail
  console[level](`${emoji} :${port} ${hint}`);
}
