export const DEFAULT_LOCK_DEVELOPER_SUBMODULE_PATH = "launchpad-frontend";

/** @param {unknown} value */
export function isPlausibleDevRepoPath(value) {
  const t = String(value ?? "").trim();
  if (!t) return false;
  if (/^(https?:\/\/)?(github\.com|bitbucket\.org)\//i.test(t)) return true;
  return /^[\w.-]+\/[\w.-]+(\/)?$/i.test(t);
}

/** @param {string} preset @param {string} custom */
export function resolveLockDeveloperAgentRef(preset, custom) {
  if (preset === "custom") {
    const c = String(custom ?? "").trim();
    return c || undefined;
  }
  if (preset !== "default") return preset;
  return undefined;
}
