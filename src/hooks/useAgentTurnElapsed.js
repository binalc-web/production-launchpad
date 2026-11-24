import { useEffect, useState } from "react";
import { formatAgentTurnElapsed } from "@/lib/clientLinkAgentTurnTimer";

export { formatAgentTurnElapsed };

/**
 * Tick every second from `startedAtMs` until it is cleared (null).
 * Does not reset when intermediate UI phases flicker (send → poll → live).
 * @param {number | null | undefined} startedAtMs
 */
export function useAgentTurnElapsed(startedAtMs) {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (startedAtMs == null || !Number.isFinite(startedAtMs)) {
      setElapsedMs(0);
      return undefined;
    }
    const tick = () => setElapsedMs(Date.now() - startedAtMs);
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAtMs]);

  return formatAgentTurnElapsed(elapsedMs);
}
