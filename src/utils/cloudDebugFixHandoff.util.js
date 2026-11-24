/** Cloud-debug → backend-code fix actions (agent mode publish overrides). */
export const CLOUD_DEBUG_FIX_ACTION = Object.freeze({
  MERGE: "fix_and_merge",
  PR: "fix_and_pr",
  PR_DEPLOY: "fix_pr_deploy",
});

/** Labels for Fix now dropdown on cloud debug chat. */
export const CLOUD_DEBUG_FIX_ACTION_OPTIONS = Object.freeze([
  { value: CLOUD_DEBUG_FIX_ACTION.MERGE, label: "Fix + merge" },
  { value: CLOUD_DEBUG_FIX_ACTION.PR, label: "Fix + PR" },
  { value: CLOUD_DEBUG_FIX_ACTION.PR_DEPLOY, label: "Fix + merge + deploy" },
]);

/** Max age for cloud-debug → backend-code fix handoff in sessionStorage. */
const CLOUD_DEBUG_FIX_HANDOFF_MAX_AGE_MS = 5 * 60 * 1000;

const STORAGE_KEY_PREFIX = "cloud_debug_fix_handoff_";

function storageKey(projectId) {
  const pid = Number(projectId);
  if (!Number.isInteger(pid) || pid < 1) return null;
  return `${STORAGE_KEY_PREFIX}${pid}`;
}

function trimText(value, maxLen = 4000) {
  const s = typeof value === "string" ? value.trim() : "";
  if (!s) return "";
  if (s.length <= maxLen) return s;
  return `${s.slice(0, maxLen)}\n\n[Truncated]`;
}

/**
 * Agent-mode backend code prompt after a cloud debugging diagnosis.
 * @param {{ diagnosis?: string, userSymptom?: string, additionalPrompt?: string }} input
 */
export function buildCloudDebugFixNowAgentPrompt({
  diagnosis = "",
  userSymptom = "",
  additionalPrompt = "",
} = {}) {
  const findings = trimText(diagnosis, 6000);
  const symptom = trimText(userSymptom, 2000);
  const extraInstructions = trimText(additionalPrompt, 2000);
  const parts = [
    "Fix this behaviour based on the cloud debugging diagnosis below. Implement the necessary code changes in the development repository.",
  ];
  if (findings) {
    parts.push("", "Diagnosis:", findings);
  }
  if (symptom) {
    parts.push("", "Original symptom:", symptom);
  }
  if (extraInstructions) {
    parts.push("", "Additional instructions:", extraInstructions);
  }
  return parts.join("\n");
}

/**
 * @param {string} raw
 * @returns {{ prompt: string, fixAction?: string, deployEnvironmentId?: string, baseBranch?: string } | null}
 */
function parseHandoff(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const prompt = typeof parsed?.prompt === "string" ? parsed.prompt.trim() : "";
    const ts = Number(parsed?.ts);
    if (!prompt) return null;
    if (Number.isFinite(ts) && Date.now() - ts > CLOUD_DEBUG_FIX_HANDOFF_MAX_AGE_MS) {
      return null;
    }
    const fixAction =
      typeof parsed?.fixAction === "string" ? parsed.fixAction.trim().toLowerCase() : "";
    const deployEnvironmentId =
      typeof parsed?.deployEnvironmentId === "string" ? parsed.deployEnvironmentId.trim() : "";
    const baseBranch =
      typeof parsed?.baseBranch === "string" ? parsed.baseBranch.trim() : "";
    return {
      prompt,
      ...(fixAction ? { fixAction } : {}),
      ...(deployEnvironmentId ? { deployEnvironmentId } : {}),
      ...(baseBranch ? { baseBranch } : {}),
    };
  } catch {
    return null;
  }
}

/**
 * Stage backend-code agent follow-up after user picks a Fix option on cloud debug chat.
 * @param {number|string} projectId
 * @param {{ diagnosis?: string, userSymptom?: string, additionalPrompt?: string, fixAction?: string, deployEnvironmentId?: string, baseBranch?: string }} payload
 */
export function persistCloudDebugFixHandoff(projectId, payload) {
  if (typeof window === "undefined") return;
  const key = storageKey(projectId);
  if (!key) return;
  const prompt = buildCloudDebugFixNowAgentPrompt(payload);
  const fixAction =
    typeof payload?.fixAction === "string" ? payload.fixAction.trim().toLowerCase() : "";
  const deployEnvironmentId =
    typeof payload?.deployEnvironmentId === "string" ? payload.deployEnvironmentId.trim() : "";
  const baseBranch =
    typeof payload?.baseBranch === "string" ? payload.baseBranch.trim() : "";
  try {
    window.sessionStorage.setItem(
      key,
      JSON.stringify({
        prompt,
        fixAction: fixAction || undefined,
        deployEnvironmentId: deployEnvironmentId || undefined,
        baseBranch: baseBranch || undefined,
        ts: Date.now(),
      }),
    );
  } catch {
    /* ignore quota / private mode */
  }
}

/**
 * Read and clear staged fix handoff (Backend Code tab consumes on mount).
 * @param {number|string} projectId
 * @returns {{ prompt: string, fixAction?: string, deployEnvironmentId?: string } | null}
 */
export function consumeCloudDebugFixHandoff(projectId) {
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

export function cloudDebugFixActionLabel(fixAction) {
  const normalized = String(fixAction || "")
    .trim()
    .toLowerCase();
  return CLOUD_DEBUG_FIX_ACTION_OPTIONS.find((opt) => opt.value === normalized)?.label ?? "Fix";
}
