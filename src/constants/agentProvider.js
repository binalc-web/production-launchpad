/**
 * Agent runtimes a project can run new agents on (backend agentProvider.service.js).
 * Cursor is the default; platform admins can switch a project to OpenCode.
 */
export const AGENT_PROVIDERS = Object.freeze({ CURSOR: "cursor", OPENCODE: "opencode" });

const AGENT_PROVIDER_LABELS = Object.freeze({
  cursor: "Cursor",
  opencode: "OpenCode",
});

/** @param {unknown} value @returns {"cursor" | "opencode"} */
export function normalizeAgentProvider(value) {
  return String(value || "")
    .trim()
    .toLowerCase() === AGENT_PROVIDERS.OPENCODE
    ? AGENT_PROVIDERS.OPENCODE
    : AGENT_PROVIDERS.CURSOR;
}

/** Display label for a project's agent runtime. */
export function agentProviderLabel(value) {
  return AGENT_PROVIDER_LABELS[normalizeAgentProvider(value)];
}

/** Runtime that minted an agent id (`oc_` → OpenCode; `bc_` and legacy ids → Cursor). */
export function agentProviderForAgentId(agentId) {
  return /^oc_/i.test(String(agentId || "").trim())
    ? AGENT_PROVIDERS.OPENCODE
    : AGENT_PROVIDERS.CURSOR;
}
