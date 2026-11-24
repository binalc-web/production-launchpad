export const DUPLICATE_AUTOMATION_NAME_MESSAGE =
  "A project report with this name already exists. Choose a different name.";

/**
 * @param {unknown} err
 * @returns {string|null}
 */
export function duplicateAutomationNameError(err) {
  const msg = typeof err?.error === "string" ? err.error.trim() : "";
  if (!msg) return null;
  return /already exists/i.test(msg) ? msg : null;
}
