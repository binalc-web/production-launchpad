import { useCallback, useLayoutEffect, useRef } from "react";
import {
  isChatNearBottom,
  scrollChatToBottom,
} from "@/pages/ClientLink/chat/clientLinkChatScroll.util";

/** Pixels from bottom treated as "pinned" for orchestration log auto-scroll. */
export const STICK_TO_BOTTOM_THRESHOLD_PX = 48;

/**
 * Auto-scroll a container to the latest content unless the user scrolled up.
 * @param {unknown[]} contentDeps — re-run pin check when log/timeline content changes
 * @param {number} [thresholdPx]
 * @returns {{
 *   containerRef: import("react").RefObject<HTMLElement | null>,
 *   onScroll: () => void,
 *   pinToBottom: () => void,
 * }}
 */
export function useStickToBottomScroll(contentDeps, thresholdPx = STICK_TO_BOTTOM_THRESHOLD_PX) {
  const containerRef = useRef(null);
  const stickToBottomRef = useRef(true);

  const onScroll = useCallback(() => {
    stickToBottomRef.current = isChatNearBottom(containerRef.current, thresholdPx);
  }, [thresholdPx]);

  const pinToBottom = useCallback(() => {
    stickToBottomRef.current = true;
    scrollChatToBottom(containerRef.current, "auto");
  }, []);

  useLayoutEffect(() => {
    if (!stickToBottomRef.current) return;
    scrollChatToBottom(containerRef.current, "auto");
    // contentDeps drives when new SSE lines arrive
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, contentDeps);

  return { containerRef, onScroll, pinToBottom };
}
