import { useCallback, useEffect, useRef, useState } from "react";
import { fetchDevRepoCommits } from "@/api";

function errorMessage(err, fallback) {
  return err?.error || err?.message || (typeof err === "string" ? err : null) || fallback;
}

/**
 * Load recent commits for the IDE History pane.
 * @param {number|string|null|undefined} projectId
 * @param {{ enabled?: boolean }} [opts]
 */
export function useDevRepoCommits(projectId, opts = {}) {
  const enabled = opts.enabled !== false && Boolean(projectId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [commits, setCommits] = useState([]);
  const [ref, setRef] = useState("");
  const genRef = useRef(0);

  const reload = useCallback(async () => {
    if (!enabled || !projectId) return null;
    const gen = ++genRef.current;
    setLoading(true);
    setError("");
    try {
      const data = await fetchDevRepoCommits(projectId);
      if (gen !== genRef.current) return null;
      setCommits(Array.isArray(data?.commits) ? data.commits : []);
      setRef(String(data?.ref || ""));
      return data;
    } catch (err) {
      if (gen !== genRef.current) return null;
      setCommits([]);
      setRef("");
      setError(errorMessage(err, "Could not load commit history."));
      return null;
    } finally {
      if (gen === genRef.current) setLoading(false);
    }
  }, [enabled, projectId]);

  useEffect(() => {
    if (!enabled) return;
    void reload();
  }, [enabled, reload]);

  return {
    loading,
    error,
    commits,
    ref,
    reload,
  };
}
