/**
 * @param {unknown} lines
 * @returns {string}
 */
function formatConsoleBlock(lines) {
  const list = (Array.isArray(lines) ? lines : [])
    .map((line) => String(line || "").trim())
    .filter(Boolean)
    .slice(0, 8);
  if (!list.length) return "";
  return `Browser console:\n${list.join("\n").slice(0, 2400)}`;
}

/**
 * Append detected preview diagnosis to an agent prompt.
 * Console lines are appended separately from the 800-character server detail cap.
 * @param {string} basePrompt
 * @param {{ kind?: string, summary?: string, detail?: string, consoleLines?: string[] } | null | undefined} diagnosis
 * @param {string[] | null | undefined} [consoleLines]
 */
export function appendPreviewDiagnosisToAgentPrompt(basePrompt, diagnosis, consoleLines) {
  const base = String(basePrompt || "").trim();
  const consoleBlock = formatConsoleBlock(diagnosis?.consoleLines || consoleLines);
  if (!diagnosis?.summary && !diagnosis?.detail && !consoleBlock) return base;
  const kind = String(diagnosis?.kind || "unknown").trim();
  const summary = String(diagnosis?.summary || "").trim();
  const detail = String(diagnosis?.detail || "")
    .trim()
    .slice(0, 800);
  const block = [
    diagnosis?.summary || diagnosis?.detail
      ? `Detected issue (${kind}): ${summary || "Preview failed."}`
      : "",
    detail ? `Details:\n${detail}` : "",
    consoleBlock,
  ]
    .filter(Boolean)
    .join("\n");
  return base ? `${base}\n\n${block}` : block;
}

/**
 * Pull the most useful error slice from a raw preview response (any framework).
 * @param {string} raw
 */
function extractErrorSliceFromRaw(raw) {
  const sample = String(raw || "");
  if (!sample) return "";
  const patterns = [
    /Build Error[\s\S]{0,4000}?(?=Import traces|Call Stack|Next\.js|$)/i,
    /Failed to compile[\s\S]{0,4000}?(?=Import traces|Call Stack|$)/i,
    /Parsing ecmascript source code failed[\s\S]{0,2000}/i,
    /Failed to resolve import[\s\S]{0,1500}/i,
    /Module not found[\s\S]{0,1500}/i,
    /Internal Server Error[\s\S]{0,2000}/i,
    /Cannot reach preview[\s\S]{0,800}/i,
    /Preview is not running on port[\s\S]{0,800}/i,
  ];
  let best = "";
  for (const re of patterns) {
    const m = sample.match(re);
    if (m?.[0] && m[0].length > best.length) best = m[0].trim();
  }
  return best;
}

/**
 * Plain text from a preview server response body (HTML or text).
 * Strips embed rewrite chrome and prefers real error messages when present.
 * @param {unknown} bodyText
 */
export function extractPlainTextFromPreviewResponse(bodyText) {
  const raw = String(bodyText ?? "");
  if (!raw.trim()) return "";

  const errorSlice = extractErrorSliceFromRaw(raw);
  if (errorSlice.length >= 24) return errorSlice.replace(/\s+/g, " ").trim();

  if (!/<[a-zA-Z!/?]/.test(raw)) return raw.trim();

  const stripped = raw
    // Drop scripts even when truncated / unclosed (common in proxied error HTML).
    .replace(/<script\b[^>]*>[\s\S]*?(?:<\/script>|$)/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?(?:<\/style>|$)/gi, " ")
    .replace(/<base\b[^>]*>/gi, " ")
    .replace(/<!DOCTYPE[^>]*>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

  // Ignore leftover embed-guard / minified JS / Next portal CSS noise.
  if (
    !stripped ||
    stripped.length < 24 ||
    /data-embed-guard|searchParams\.delete|embed_frame/i.test(stripped) ||
    (/Bootstrap Reboot|:host\s*\{/i.test(stripped) &&
      !/\bBuild Error\b|Failed to compile|Parsing ecmascript/i.test(stripped))
  ) {
    return errorSlice || "";
  }
  return stripped;
}

/**
 * Build a full-viewport HTML document that shows the exact preview-port error text.
 *
 * @param {{ httpStatus?: number, bodyText?: string, title?: string }} opts
 * @returns {string}
 */
export function buildPreviewErrorDocumentHtml(opts = {}) {
  const httpStatus = Number(opts.httpStatus) || 0;
  const raw = String(opts.bodyText ?? "");
  const plain = extractPlainTextFromPreviewResponse(raw);
  const statusLabel = httpStatus > 0 ? `HTTP ${httpStatus}` : "Preview error";
  const title = String(opts.title || statusLabel).trim() || "Preview error";
  const bodyForDisplay =
    plain ||
    (raw.trim()
      ? "The preview server returned an error, but the response body did not include readable error text."
      : "The preview server returned an error with an empty body.");

  const escaped = bodyForDisplay
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  const safeTitle = title.replace(/</g, "");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${safeTitle}</title>
  <style>
    html, body {
      height: 100%;
      margin: 0;
    }
    body {
      box-sizing: border-box;
      min-height: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      /* Leave room for the floating Client Link error banner overlay. */
      padding: 56px 16px 16px;
      font-family: system-ui, sans-serif;
      background: Canvas;
      color: CanvasText;
      line-height: 1.5;
    }
    h1 {
      margin: 0 0 6px;
      font-size: 1.125rem;
      font-weight: 650;
      color: crimson;
      flex: 0 0 auto;
    }
    .meta {
      margin: 0 0 12px;
      font-size: 0.8125rem;
      color: GrayText;
      flex: 0 0 auto;
    }
    pre {
      margin: 0;
      padding: 16px;
      border: 1px solid GrayText;
      border-radius: 10px;
      background: Field;
      color: FieldText;
      font-family: monospace;
      font-size: 12px;
      white-space: pre-wrap;
      word-break: break-word;
      overflow: auto;
      flex: 1 1 auto;
      min-height: 0;
      width: 100%;
      box-sizing: border-box;
    }
  </style>
</head>
<body>
  <h1>${safeTitle}</h1>
  <p class="meta">Exact response from the preview app server${httpStatus > 0 ? ` (${statusLabel})` : ""}.</p>
  <pre>${escaped}</pre>
</body>
</html>`;
}
