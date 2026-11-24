/**
 * Display label for the latest QA App version from latest-mac.yml.
 * @param {string | null | undefined} version
 * @returns {string}
 */
export function formatQaDesktopVersionLabel(version) {
  const trimmed = String(version || "").trim();
  if (!trimmed) return "";
  return trimmed.startsWith("v") || trimmed.startsWith("V") ? trimmed : `v${trimmed}`;
}
