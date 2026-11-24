/** Max age for infra-analysis suggestion → chat fix handoff in sessionStorage. */
const INFRA_ANALYSIS_FIX_HANDOFF_MAX_AGE_MS = 5 * 60 * 1000;

const STORAGE_KEY_PREFIX = "infra_analysis_fix_handoff_";

function storageKey(projectId) {
  const pid = Number(projectId);
  if (!Number.isInteger(pid) || pid < 1) return null;
  return `${STORAGE_KEY_PREFIX}${pid}`;
}

function trimText(value, maxLen = 6000) {
  const s = typeof value === "string" ? value.trim() : "";
  if (!s) return "";
  if (s.length <= maxLen) return s;
  return `${s.slice(0, maxLen)}\n\n[Truncated]`;
}

function formatList(values, maxItems = 20) {
  if (!Array.isArray(values) || !values.length) return "";
  return values
    .map((v) => String(v ?? "").trim())
    .filter(Boolean)
    .slice(0, maxItems)
    .join(", ");
}

/**
 * Agent-mode infra chat prompt from an analysis suggestion.
 * @param {{
 *   title?: string,
 *   detail?: string,
 *   description?: string,
 *   reason?: string,
 *   severity?: string,
 *   category?: string,
 *   actionType?: string,
 *   affectedFiles?: string[],
 *   relatedNodeIds?: string[],
 *   relatedNodeLabels?: string[],
 * }} suggestion
 */
export function buildInfraAnalysisFixPrompt(suggestion = {}) {
  const title = trimText(suggestion.title, 500);
  const detailSource = trimText(suggestion.detail || suggestion.description || "", 6000);
  const detail = detailSource || trimText(suggestion.reason || "", 6000);
  /** Separate Reason block only when detail/description already provided a primary body. */
  const reason = detailSource ? trimText(suggestion.reason || "", 4000) : "";
  const severity = trimText(suggestion.severity, 50);
  const category = trimText(suggestion.category, 50);
  const actionType = trimText(suggestion.actionType, 80);
  const affectedFiles = formatList(suggestion.affectedFiles);
  const relatedNodeIds = formatList(suggestion.relatedNodeIds);
  const relatedNodeLabels = formatList(suggestion.relatedNodeLabels);

  const parts = [
    "Implement the infrastructure improvement from the analysis suggestion below. Apply the necessary IaC, architecture diagram, and related changes.",
  ];

  if (title) {
    parts.push("", `Suggestion: ${title}`);
  }
  if (severity) {
    parts.push(`Severity: ${severity}`);
  }
  if (category) {
    parts.push(`Category: ${category}`);
  }
  if (actionType) {
    parts.push(`Action type: ${actionType}`);
  }
  if (detail) {
    parts.push("", "Details:", detail);
  }
  if (reason) {
    parts.push("", "Reason:", reason);
  }
  if (affectedFiles) {
    parts.push("", `Affected files: ${affectedFiles}`);
  }
  if (relatedNodeLabels) {
    parts.push(`Related components: ${relatedNodeLabels}`);
  }
  if (relatedNodeIds) {
    parts.push(`Related node IDs: ${relatedNodeIds}`);
  }

  return parts.join("\n");
}

/**
 * @param {string} raw
 * @returns {{ prompt: string } | null}
 */
function parseHandoff(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const prompt = typeof parsed?.prompt === "string" ? parsed.prompt.trim() : "";
    const ts = Number(parsed?.ts);
    if (!prompt) return null;
    if (Number.isFinite(ts) && Date.now() - ts > INFRA_ANALYSIS_FIX_HANDOFF_MAX_AGE_MS) {
      return null;
    }
    return { prompt };
  } catch {
    return null;
  }
}

/**
 * Stage infra-analysis chat agent follow-up from a suggestion Fix click.
 * @param {number|string} projectId
 * @param {Parameters<typeof buildInfraAnalysisFixPrompt>[0]} payload
 */
export function persistInfraAnalysisFixHandoff(projectId, payload) {
  if (typeof window === "undefined") return;
  const key = storageKey(projectId);
  if (!key) return;
  const prompt = buildInfraAnalysisFixPrompt(payload);
  if (!prompt.trim()) return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify({ prompt, ts: Date.now() }));
  } catch {
    /* ignore quota / private mode */
  }
}

/**
 * Read and clear staged infra-analysis fix handoff.
 * @param {number|string} projectId
 * @returns {{ prompt: string } | null}
 */
export function consumeInfraAnalysisFixHandoff(projectId) {
  if (typeof window === "undefined") return null;
  const key = storageKey(projectId);
  if (!key) return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    window.sessionStorage.removeItem(key);
    return parseHandoff(raw);
  } catch {
    return null;
  }
}
