import { useEffect } from "react";
import { fetchClientDetails } from "@/api";

const POLL_MS = 5000;

export function useDiscoveryResponsesPoll(projectId, enabled, onDiscoveryData) {
  useEffect(() => {
    if (!projectId || !enabled) return undefined;
    let cancelled = false;

    const tick = async () => {
      try {
        const data = await fetchClientDetails(projectId);
        if (!cancelled && data?.discoveryData) onDiscoveryData(data.discoveryData);
      } catch {
        /* silent poll */
      }
    };

    const id = setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [projectId, enabled, onDiscoveryData]);
}
