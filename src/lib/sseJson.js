import { isAbortError } from "./abortError.util.js";

const SSE_FIELD_RE = /^(data|event|id|retry):/;

/**
 * `reader.read()` that treats AbortController teardown as a clean end-of-stream.
 * Avoids AbortError: signal is aborted without reason becoming an unhandledrejection
 * when React effect cleanup aborts an in-flight SSE body (Sentry RND-LAUNCHPAD-FE-E).
 * @param {ReadableStreamDefaultReader<Uint8Array>} reader
 * @returns {Promise<ReadableStreamReadResult<Uint8Array>>}
 */
export async function readAbortableSseChunk(reader) {
  try {
    return await reader.read();
  } catch (err) {
    if (isAbortError(err)) return { done: true, value: undefined };
    throw err;
  }
}

/**
 * Split an SSE event block into lines, normalizing CRLF.
 * @param {string} raw
 * @returns {string[]}
 */
function splitSseLines(raw) {
  return String(raw ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n");
}

/**
 * Reconstruct the `data` payload from one SSE event block.
 * Joins every `data:` line (no extra delimiter) so large JSON can be split
 * across lines, and appends proxy-wrapped continuation lines that lost the
 * `data:` prefix. Only real SSE fields (`data`/`event`/`id`/`retry`) are
 * treated as fields — JSON property names like `updatedAt:` are continuations.
 * @param {string} rawEvent
 * @returns {string}
 */
export function extractSseDataPayload(rawEvent) {
  const parts = [];
  let seenData = false;
  for (const line of splitSseLines(rawEvent)) {
    if (line.startsWith(":") && !seenData) continue;
    const match = SSE_FIELD_RE.exec(line);
    if (match) {
      const field = match[1];
      if (seenData && field !== "data") {
        parts[parts.length - 1] += line;
        continue;
      }
      let value = line.slice(match[0].length);
      if (value.startsWith(" ")) value = value.slice(1);
      if (field === "data") {
        parts.push(value);
        seenData = true;
      }
      continue;
    }
    if (seenData && parts.length > 0) {
      parts[parts.length - 1] += line;
    }
  }
  return parts.join("");
}

/**
 * True when JSON.parse failed because the payload is still unclosed.
 * @param {string} text
 * @returns {boolean}
 */
export function sseJsonLooksIncomplete(text) {
  const s = String(text ?? "").trim();
  if (!s) return false;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = 0; i < s.length; i += 1) {
    const ch = s[i];
    if (inStr) {
      if (esc) {
        esc = false;
        continue;
      }
      if (ch === "\\") {
        esc = true;
        continue;
      }
      if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') {
      inStr = true;
      continue;
    }
    if (ch === "{" || ch === "[") depth += 1;
    else if (ch === "}" || ch === "]") depth -= 1;
  }
  return inStr || depth > 0;
}

/**
 * Pull complete JSON SSE events from a buffer. Incomplete frames stay in `rest`.
 * Heartbeats are consumed and omitted from `events`.
 * @param {string} buf
 * @returns {{ events: object[], rest: string }}
 */
export function pullSseJsonEvents(buf) {
  const events = [];
  let rest = String(buf ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");

  while (rest.length > 0) {
    const sep = rest.indexOf("\n\n");
    if (sep === -1) break;
    const rawEvent = rest.slice(0, sep);
    const remainder = rest.slice(sep + 2);
    const payload = extractSseDataPayload(rawEvent);
    if (!payload) {
      rest = remainder;
      continue;
    }

    let parsed = tryParseSseJson(payload);
    if (parsed === "incomplete") {
      const combined = combineIncompleteSseJson(payload, remainder);
      if (!combined) break;
      parsed = combined.parsed;
      rest = combined.rest;
    } else {
      rest = remainder;
    }

    if (parsed === "invalid" || parsed == null) continue;
    if (parsed.type === "heartbeat") continue;
    if (parsed && typeof parsed === "object") events.push(parsed);
  }

  return { events, rest };
}

/**
 * @param {string} payload
 * @returns {object|"incomplete"|"invalid"|null}
 */
function tryParseSseJson(payload) {
  try {
    return JSON.parse(payload);
  } catch {
    return sseJsonLooksIncomplete(payload) ? "incomplete" : "invalid";
  }
}

/**
 * A premature `\\n\\n` can split one JSON object across SSE frames. Glue following
 * frames until the object parses, or wait if the buffer still has no complete JSON.
 * @param {string} payload
 * @param {string} remainder
 * @returns {{ parsed: object|"invalid", rest: string }|null}
 */
function combineIncompleteSseJson(payload, remainder) {
  let combined = payload;
  let cursor = remainder;
  while (sseJsonLooksIncomplete(combined)) {
    const nextSep = cursor.indexOf("\n\n");
    if (nextSep === -1) return null;
    const nextRaw = cursor.slice(0, nextSep);
    cursor = cursor.slice(nextSep + 2);
    const nextPayload = extractSseDataPayload(nextRaw);
    combined += nextPayload || nextRaw;
  }
  try {
    return { parsed: JSON.parse(combined), rest: cursor };
  } catch {
    return { parsed: "invalid", rest: cursor };
  }
}

/**
 * Read a fetch() SSE response body and emit parsed JSON events.
 * @param {Response} res
 * @param {{ onEvent?: (evt: object) => void }} [handlers]
 */
export async function readSseJsonStream(res, handlers = {}) {
  const { onEvent } = handlers;
  if (!res?.body) return null;
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  try {
    while (true) {
      const { done, value } = await readAbortableSseChunk(reader);
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const pulled = pullSseJsonEvents(buf);
      buf = pulled.rest;
      for (const data of pulled.events) {
        onEvent?.(data);
      }
    }
    if (buf.trim()) {
      const pulled = pullSseJsonEvents(`${buf}\n\n`);
      for (const data of pulled.events) {
        onEvent?.(data);
      }
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  return null;
}
