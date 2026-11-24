/** Client code from the serverless compatibility 422. */
export const SERVERLESS_INCOMPATIBLE_CODE = "SERVERLESS_INCOMPATIBLE";

const HANDOFF_MAX_AGE_MS = 5 * 60 * 1000;
const STORAGE_KEY_PREFIX = "serverless_compatibility_fix_handoff_";

function storageKey(projectId) {
  const pid = Number(projectId);
  if (!Number.isInteger(pid) || pid < 1) return null;
  return `${STORAGE_KEY_PREFIX}${pid}`;
}

function stringList(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean);
}

/**
 * @param {unknown} err — axios error or the `{ error }` body thrown by updateProject
 * @returns {{ summary: string, blockers: string[], message: string } | null}
 */
export function readServerlessCompatibilityFailure(err) {
  const data =
    err && typeof err === "object" && err.response?.data && typeof err.response.data === "object"
      ? err.response.data
      : err && typeof err === "object"
        ? err
        : null;
  if (!data) return null;

  const message = typeof data.error === "string" ? data.error.trim() : "";
  const structured = data.code === SERVERLESS_INCOMPATIBLE_CODE;
  const blockers = stringList(data.blockers);
  const summary =
    typeof data.summary === "string" && data.summary.trim() ? data.summary.trim() : "";

  if (structured) {
    return {
      summary: summary || message || "This app repository cannot switch to Serverless yet.",
      blockers,
      message: message || summary,
    };
  }

  const marker = " Blockers: ";
  const idx = message.indexOf(marker);
  if (idx < 0) return null;
  const parsedSummary = message.slice(0, idx).trim();
  const parsedBlockers = message
    .slice(idx + marker.length)
    .replace(/\.\s*$/, "")
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean);
  if (!parsedSummary && !parsedBlockers.length) return null;
  return {
    summary: parsedSummary || message,
    blockers: parsedBlockers,
    message,
  };
}

/**
 * Agent prompt that asks the app repository chat to remove serverless blockers.
 * @param {{ summary?: string, blockers?: string[] }} input
 */
export function buildServerlessCompatibilityFixPrompt({ summary = "", blockers = [] } = {}) {
  const lines = [
    "Switch this project's backend hosting to Serverless (AWS Lambda + API Gateway + DynamoDB).",
    "A compatibility scan blocked the switch. Update the development repository so every blocker below is resolved.",
    "Keep existing product behavior. Change only what the blockers require.",
  ];
  const findings = typeof summary === "string" ? summary.trim() : "";
  if (findings) {
    lines.push("", "Findings:", findings);
  }
  const items = stringList(blockers);
  if (items.length) {
    lines.push("", "Blockers:");
    for (const item of items) {
      lines.push(`- ${item}`);
    }
  }
  return lines.join("\n");
}

/**
 * @param {number|string} projectId
 * @param {{ summary?: string, blockers?: string[] }} failure
 */
export function persistServerlessCompatibilityFixHandoff(projectId, failure) {
  if (typeof window === "undefined") return;
  const key = storageKey(projectId);
  if (!key) return;
  const prompt = buildServerlessCompatibilityFixPrompt(failure);
  try {
    window.sessionStorage.setItem(key, JSON.stringify({ prompt, ts: Date.now() }));
  } catch {
    /* ignore quota / private mode */
  }
}

/**
 * @param {number|string} projectId
 * @returns {{ prompt: string } | null}
 */
export function consumeServerlessCompatibilityFixHandoff(projectId) {
  if (typeof window === "undefined") return null;
  const key = storageKey(projectId);
  if (!key) return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    window.sessionStorage.removeItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const prompt = typeof parsed?.prompt === "string" ? parsed.prompt.trim() : "";
    const ts = Number(parsed?.ts);
    if (!prompt) return null;
    if (Number.isFinite(ts) && Date.now() - ts > HANDOFF_MAX_AGE_MS) return null;
    return { prompt };
  } catch {
    return null;
  }
}
