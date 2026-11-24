import { useCallback, useEffect, useRef, useState } from "react";
import { fetchClientLinkPromptHistory } from "@/api";

function errorMessage(err, fallback) {
  return err?.error || err?.message || (typeof err === "string" ? err : null) || fallback;
}

/**
 * Load recent Client Link agent-mode prompts for the Preview → App tab.
 * @param {number|string|null|undefined} projectId
 * @param {{ releaseId?: number|string|null, enabled?: boolean, limit?: number }} [opts]
 */
export function useClientLinkPromptHistory(projectId, opts = {}) {
  const releaseId = opts.releaseId != null ? Number(opts.releaseId) : null;
  const enabled = opts.enabled !== false && Boolean(projectId);
  const [loading, setLoading] = useState(() => enabled);
  const [error, setError] = useState("");
  const [releaseName, setReleaseName] = useState(null);
  const [resolvedReleaseId, setResolvedReleaseId] = useState(null);
  const [prompts, setPrompts] = useState([]);
  const genRef = useRef(0);

  const reload = useCallback(async () => {
    if (!enabled || !projectId) return null;
    const gen = ++genRef.current;
    setLoading(true);
    setError("");
    try {
      const data = await fetchClientLinkPromptHistory(projectId, {
        releaseId: releaseId != null && releaseId > 0 ? releaseId : undefined,
        limit: opts.limit ?? 20,
      });
      if (gen !== genRef.current) return null;
      setResolvedReleaseId(data?.releaseId ?? null);
      setReleaseName(data?.releaseName ?? null);
      setPrompts(Array.isArray(data?.prompts) ? data.prompts : []);
      return data;
    } catch (err) {
      if (gen !== genRef.current) return null;
      setResolvedReleaseId(null);
      setReleaseName(null);
      setPrompts([]);
      setError(errorMessage(err, "Could not load prompt history."));
      return null;
    } finally {
      if (gen === genRef.current) setLoading(false);
    }
  }, [enabled, projectId, releaseId, opts.limit]);

  useEffect(() => {
    if (!enabled) return;
    void reload();
  }, [enabled, reload]);

  return {
    loading,
    error,
    prompts,
    releaseId: resolvedReleaseId,
    releaseName,
    reload,
  };
}
