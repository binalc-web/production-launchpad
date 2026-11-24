/**
 * Post-turn preview refresh helpers (mode parsing + freshest-outcome selection).
 */

/**
 * Normalize a backend preview-refresh outcome to a known mode. Used as a non-authoritative
 * UI hint only — the authoritative decision always comes from the live sync's return value.
 * @param {object | null | undefined} outcome
 * @returns {'none' | 'hmr' | 'restart' | 'full'}
 */
export function readPreviewRefreshMode(outcome) {
  const mode = typeof outcome?.mode === "string" ? outcome.mode.trim() : "";
  if (mode === "none" || mode === "hmr" || mode === "restart") return mode;
  return "full";
}

/**
 * @param {object | null | undefined} a
 * @param {object | null | undefined} b
 * @returns {object | null | undefined}
 */
export function pickNewerPreviewRefreshOutcome(a, b) {
  if (!a?.at) return b ?? null;
  if (!b?.at) return a ?? null;
  return Date.parse(String(a.at)) >= Date.parse(String(b.at)) ? a : b;
}
