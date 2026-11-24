import { useCallback, useEffect, useState } from "react";
import { fetchPlatformDeployMode } from "@/api";
import { isPlatformDeployModeBlocking } from "@/constants/platformDeployMode";

/**
 * Polls admin deploy-mode details while the platform is in prepare/ready.
 * @param {{ enabled?: boolean, deployMode?: string, isLocallyActive?: boolean }} options
 */
export function usePlatformDeployAdminDetails({
  enabled = false,
  deployMode = "normal",
  isLocallyActive = false,
} = {}) {
  const [details, setDetails] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [loading, setLoading] = useState(false);

  const shouldPoll = enabled && (isLocallyActive || isPlatformDeployModeBlocking(deployMode));

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const data = await fetchPlatformDeployMode();
      setDetails(data);
      setLoadError(null);
    } catch (error) {
      setLoadError(typeof error?.error === "string" ? error.error : "Failed to load deploy status");
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!shouldPoll) {
      setDetails(null);
      setLoadError(null);
      return undefined;
    }
    refresh();
    const id = setInterval(refresh, 5_000);
    return () => clearInterval(id);
  }, [shouldPoll, refresh]);

  return { details, loadError, loading, refresh };
}
