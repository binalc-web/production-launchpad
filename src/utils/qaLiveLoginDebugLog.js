/** In-memory ring buffer for QA live login — use "Copy debug logs" in the viewer to share. */

const MAX = 400;

/** @type {{ ts: string, level: string, source: string, event: string, detail?: unknown }[]} */
const entries = [];

function push(level, source, event, detail) {
  const row = {
    ts: new Date().toISOString(),
    level,
    source,
    event,
    ...(detail !== undefined ? { detail } : {}),
  };
  entries.push(row);
  if (entries.length > MAX) entries.shift();
  if (typeof window !== "undefined") {
    const verbose =
      window.localStorage?.getItem("qa_live_login_debug") === "1" ||
      window.localStorage?.getItem("qa_live_login_debug") === "true";
    if (verbose) {
      // eslint-disable-next-line no-console -- intentional debug channel
      console.log(`[qa-live-login][${source}] ${event}`, detail ?? "");
    }
  }
  return row;
}

export function qaLiveDebugInfo(source, event, detail) {
  return push("info", source, event, detail);
}

export function qaLiveDebugWarn(source, event, detail) {
  return push("warn", source, event, detail);
}

export function qaLiveDebugError(source, event, detail) {
  return push("error", source, event, detail);
}

/** Redact viewer token in ws paths / URLs for safe sharing. */
export function redactQaLiveToken(value) {
  if (value == null) return value;
  const s = String(value);
  return s.replace(/token=([a-f0-9]+)/gi, (_, t) => `token=${t.slice(0, 6)}…${t.slice(-4)}`);
}

export function formatQaLiveDebugLog() {
  const lines = [
    "=== LaunchPad QA Live Login debug log ===",
    `exportedAt: ${new Date().toISOString()}`,
    `userAgent: ${typeof navigator !== "undefined" ? navigator.userAgent : "n/a"}`,
    `apiUrl: ${typeof window !== "undefined" ? redactQaLiveToken(window.__LAUNCHPAD_API_URL__ || "") : ""}`,
    "---",
  ];
  for (const e of entries) {
    let detail = "";
    if (e.detail !== undefined) {
      try {
        detail = ` ${JSON.stringify(e.detail, (_, v) => (typeof v === "string" ? redactQaLiveToken(v) : v))}`;
      } catch {
        detail = ` ${String(e.detail)}`;
      }
    }
    lines.push(`${e.ts} [${e.level}] ${e.source} ${e.event}${detail}`);
  }
  lines.push("=== end ===");
  return lines.join("\n");
}

export function clearQaLiveDebugLog() {
  entries.length = 0;
}

export function getQaLiveDebugEntryCount() {
  return entries.length;
}
