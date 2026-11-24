import { useEffect, useRef } from "react";

const POLL_INTERVAL_MS = 4000;

/**
 * Polls while `enabled` is true; calls `onTick` immediately and every 4s.
 * @param {boolean} enabled
 * @param {() => void | Promise<void>} onTick
 */
export function useAutomationRunPolling(enabled, onTick) {
  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;

    const tick = async () => {
      if (cancelled) return;
      try {
        await onTickRef.current();
      } catch {
        /* silent poll */
      }
    };

    void tick();
    const id = setInterval(() => void tick(), POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [enabled]);
}
