export const CHAT_ATTACH_ACCEPT =
  "image/png,image/jpeg,image/webp,application/pdf,text/markdown,.png,.jpg,.jpeg,.webp,.pdf,.md,.markdown";
export const CHAT_ATTACH_MAX_FILES = 6;
export const CHAT_ATTACH_MAX_BYTES = 10 * 1024 * 1024;

const IMAGE_MIMES = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);

/**
 * @param {File} file
 * @returns {"image" | "pdf" | "markdown" | null}
 */
export function classifyChatAttachFile(file) {
  if (!file) return null;
  const name = String(file.name || "").toLowerCase();
  const mime = String(file.type || "")
    .trim()
    .toLowerCase();
  if (
    name.endsWith(".md") ||
    name.endsWith(".markdown") ||
    mime === "text/markdown" ||
    mime === "text/x-markdown"
  ) {
    return "markdown";
  }
  if (mime === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (IMAGE_MIMES.has(mime)) return "image";
  if (mime.startsWith("image/") && /\.(png|jpe?g|webp)$/i.test(name)) return "image";
  if (!mime && /\.(png|jpe?g|webp)$/i.test(name)) return "image";
  return null;
}

/**
 * @param {File} file
 * @returns {string | null}
 */
export function chatAttachFileError(file) {
  const kind = classifyChatAttachFile(file);
  if (!kind) {
    return `Unsupported file "${file?.name || "file"}". Use PNG, JPEG, WebP, PDF, or Markdown.`;
  }
  if (!file.size) return `"${file.name}" is empty.`;
  if (file.size > CHAT_ATTACH_MAX_BYTES) return `"${file.name}" is over 10 MB.`;
  return null;
}

/**
 * Image/PDF files from a paste event's clipboard (screenshots arrive as `items`, copied files as `files`).
 * @param {DataTransfer | null | undefined} clipboardData
 * @returns {File[]}
 */
export function chatAttachFilesFromClipboard(clipboardData) {
  if (!clipboardData) return [];
  const isAttachable = (type, name = "") =>
    String(type || "").startsWith("image/") ||
    type === "application/pdf" ||
    type === "text/markdown" ||
    type === "text/x-markdown" ||
    /\.(pdf|md|markdown)$/i.test(String(name || ""));
  const fromFiles = Array.from(clipboardData.files || []).filter((f) =>
    isAttachable(f?.type, f?.name),
  );
  if (fromFiles.length) return fromFiles;
  const fromItems = [];
  for (const item of Array.from(clipboardData.items || [])) {
    if (item?.kind !== "file" || !isAttachable(item.type)) continue;
    const file = item.getAsFile?.();
    if (file) fromItems.push(file);
  }
  return fromItems;
}

export function isBlobPreviewUrl(url) {
  return typeof url === "string" && url.startsWith("blob:");
}

export function revokeBlobPreviewUrl(url, revoke = (u) => URL.revokeObjectURL(u)) {
  if (!isBlobPreviewUrl(url)) return false;
  revoke(url);
  return true;
}

/**
 * @param {object[]} items
 */
export function chatAttachmentIds(items) {
  if (!Array.isArray(items)) return [];
  return items.map((item) => item?.id).filter(Boolean);
}

/**
 * @param {object[]} items
 */
export function hasChatAttachments(items) {
  return Array.isArray(items) && items.length > 0;
}

/**
 * Whether a chat composer can send: text, or finished attachments with no upload in flight.
 */
export function chatComposerCanSend({
  draft = "",
  disabled = false,
  attachEnabled = false,
  attachmentCount = 0,
  uploading = false,
} = {}) {
  if (disabled) return false;
  if (String(draft || "").trim()) return true;
  return Boolean(attachEnabled) && Number(attachmentCount) > 0 && !uploading;
}
