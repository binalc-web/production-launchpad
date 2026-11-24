export const DEV_IDE_REPO_PATH_MIME = "application/x-launchpad-repo-path";

/**
 * @param {DragEvent} event
 * @param {string} path
 */
export function setRepoPathDragData(event, path) {
  const value = String(path || "").trim();
  if (!value || !event?.dataTransfer) return;
  event.dataTransfer.setData(DEV_IDE_REPO_PATH_MIME, value);
  event.dataTransfer.setData("text/plain", value);
  event.dataTransfer.effectAllowed = "copy";
}

/**
 * @param {DragEvent} event
 * @returns {string}
 */
export function readRepoPathDragData(event) {
  const dt = event?.dataTransfer;
  if (!dt) return "";
  const custom = String(dt.getData(DEV_IDE_REPO_PATH_MIME) || "").trim();
  if (custom) return custom;
  return String(dt.getData("text/plain") || "").trim();
}

/**
 * Format a repo-relative path for insertion into the chat prompt.
 * @param {string} path
 */
export function formatRepoPathForPrompt(path) {
  const value = String(path || "").trim();
  if (!value) return "";
  return `\`${value}\``;
}
