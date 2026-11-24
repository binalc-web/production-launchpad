/** Distance from bottom (px) treated as "pinned" for auto-scroll. */
export const CHAT_STICK_TO_BOTTOM_THRESHOLD_PX = 80;

/**
 * True when the scroll container is near its bottom edge.
 * @param {HTMLElement | null | undefined} el
 * @param {number} [threshold]
 */
export function isChatNearBottom(
  el,
  threshold = CHAT_STICK_TO_BOTTOM_THRESHOLD_PX,
) {
  if (!el) return true;
  const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
  return distanceFromBottom <= threshold;
}

/**
 * Scroll chat list to the latest content.
 * @param {HTMLElement | null | undefined} el
 * @param {"auto" | "smooth"} [behavior]
 */
export function scrollChatToBottom(el, behavior = "auto") {
  if (!el) return;
  if (behavior === "smooth" && typeof el.scrollTo === "function") {
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    return;
  }
  el.scrollTop = el.scrollHeight;
}
