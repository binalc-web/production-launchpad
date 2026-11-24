import { useEffect } from "react";
import { fetchClientDetails } from "@/api";

const POLL_MS = 5000;

export function useProfileUpdatePoll(projectId, enabled, onPayload) {
  useEffect(() => {
    if (!projectId || !enabled) return undefined;
    let cancelled = false;

    const tick = async () => {
      try {
        const data = await fetchClientDetails(projectId);
        if (!cancelled && data) onPayload(data);
      } catch {
        /* silent poll */
      }
    };

    tick();
    const id = setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [projectId, enabled, onPayload]);
}
