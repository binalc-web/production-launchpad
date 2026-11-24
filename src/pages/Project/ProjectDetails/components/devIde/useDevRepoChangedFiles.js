import { useCallback, useEffect, useRef, useState } from "react";
import { fetchDevRepoChangedFiles } from "@/api";

function errorMessage(err, fallback) {
  return err?.error || err?.message || (typeof err === "string" ? err : null) || fallback;
}

/**
 * Load GitHub compare changed-files for the IDE Changes pane.
 * @param {number|string|null|undefined} projectId
 * @param {{ enabled?: boolean }} [opts]
 */
export function useDevRepoChangedFiles(projectId, opts = {}) {
  const enabled = opts.enabled !== false && Boolean(projectId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [files, setFiles] = useState([]);
  const [base, setBase] = useState("");
  const [head, setHead] = useState("");
  const [status, setStatus] = useState("");
  const [aheadBy, setAheadBy] = useState(0);
  const [behindBy, setBehindBy] = useState(0);
  const [truncated, setTruncated] = useState(false);
  const genRef = useRef(0);

  const reload = useCallback(async () => {
    if (!enabled || !projectId) return null;
    const gen = ++genRef.current;
    setLoading(true);
    setError("");
    try {
      const data = await fetchDevRepoChangedFiles(projectId);
      if (gen !== genRef.current) return null;
      setFiles(Array.isArray(data?.files) ? data.files : []);
      setBase(String(data?.base || ""));
      setHead(String(data?.head || ""));
      setStatus(String(data?.status || ""));
      setAheadBy(Number(data?.aheadBy) || 0);
      setBehindBy(Number(data?.behindBy) || 0);
      setTruncated(Boolean(data?.truncated));
      return data;
    } catch (err) {
      if (gen !== genRef.current) return null;
      setFiles([]);
      setBase("");
      setHead("");
      setStatus("");
      setAheadBy(0);
      setBehindBy(0);
      setTruncated(false);
      setError(errorMessage(err, "Could not load changed files."));
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
    files,
    base,
    head,
    status,
    aheadBy,
    behindBy,
    truncated,
    reload,
  };
}
