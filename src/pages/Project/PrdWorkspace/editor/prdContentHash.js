/** Stable JSON string for TipTap doc comparison (order-preserving). */
export function hashTipTapContent(content) {
  try {
    return JSON.stringify(content ?? null);
  } catch {
    return "";
  }
}

export function emptyPrdDocContent() {
  return { type: "doc", content: [{ type: "paragraph" }] };
}
