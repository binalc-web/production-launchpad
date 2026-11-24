import { useCallback, useEffect, useRef, useState } from "react";
import { fetchDevRepoFile, fetchDevRepoTree } from "@/api";

function errorMessage(err, fallback) {
  return err?.error || err?.message || (typeof err === "string" ? err : null) || fallback;
}

/**
 * Load developer-repo tree + open file cache for the browser IDE.
 * @param {number|string|null|undefined} projectId
 * @param {{ enabled?: boolean }} [opts]
 */
export function useDevRepoBrowse(projectId, opts = {}) {
  const enabled = opts.enabled !== false && Boolean(projectId);
  const [treeLoading, setTreeLoading] = useState(false);
  const [treeError, setTreeError] = useState("");
  const [paths, setPaths] = useState([]);
  const [repo, setRepo] = useState("");
  const [ref, setRef] = useState("");
  const [truncated, setTruncated] = useState(false);

  const [openTabs, setOpenTabs] = useState(/** @type {string[]} */ ([]));
  const [activePath, setActivePath] = useState(/** @type {string|null} */ (null));
  const [fileCache, setFileCache] = useState(
    /** @type {Record<string, { content: string, language: string, loading?: boolean, error?: string }>} */ ({}),
  );

  const fileCacheRef = useRef(fileCache);
  fileCacheRef.current = fileCache;
  const loadGenRef = useRef(0);

  const loadTree = useCallback(async () => {
    if (!enabled || !projectId) return;
    const gen = ++loadGenRef.current;
    setTreeLoading(true);
    setTreeError("");
    try {
      const data = await fetchDevRepoTree(projectId);
      if (gen !== loadGenRef.current) return;
      setPaths(Array.isArray(data?.paths) ? data.paths : []);
      setRepo(String(data?.repo || ""));
      setRef(String(data?.ref || ""));
      setTruncated(Boolean(data?.truncated));
    } catch (err) {
      if (gen !== loadGenRef.current) return;
      setPaths([]);
      setRepo("");
      setRef("");
      setTruncated(false);
      setTreeError(errorMessage(err, "Could not load repository file tree."));
    } finally {
      if (gen === loadGenRef.current) setTreeLoading(false);
    }
  }, [enabled, projectId]);

  useEffect(() => {
    if (!enabled) return;
    void loadTree();
  }, [enabled, loadTree]);

  const openFile = useCallback(
    async (filePath) => {
      const path = String(filePath || "").trim();
      if (!path || !projectId) return;

      setOpenTabs((prev) => (prev.includes(path) ? prev : [...prev, path]));
      setActivePath(path);

      const existing = fileCacheRef.current[path];
      if (existing && !existing.error && existing.content != null && !existing.loading) {
        return;
      }

      setFileCache((prev) => ({
        ...prev,
        [path]: {
          content: prev[path]?.content ?? "",
          language: prev[path]?.language ?? "plaintext",
          loading: true,
        },
      }));

      try {
        const data = await fetchDevRepoFile(projectId, path, ref ? { ref } : undefined);
        setFileCache((prev) => ({
          ...prev,
          [path]: {
            content: String(data?.content ?? ""),
            language: String(data?.language || "plaintext"),
            loading: false,
          },
        }));
      } catch (err) {
        setFileCache((prev) => ({
          ...prev,
          [path]: {
            content: "",
            language: "plaintext",
            loading: false,
            error: errorMessage(err, "Could not load file."),
          },
        }));
      }
    },
    [projectId, ref],
  );

  const closeTab = useCallback((filePath) => {
    const path = String(filePath || "").trim();
    setOpenTabs((prev) => {
      const next = prev.filter((p) => p !== path);
      setActivePath((active) => {
        if (active !== path) return active;
        const idx = prev.indexOf(path);
        return next[Math.max(0, idx - 1)] ?? next[0] ?? null;
      });
      return next;
    });
  }, []);

  const refresh = useCallback(async () => {
    if (!projectId) return;
    const open = openTabs.slice();
    const active = activePath;
    setFileCache({});
    let nextRef = "";
    try {
      const data = await fetchDevRepoTree(projectId);
      setPaths(Array.isArray(data?.paths) ? data.paths : []);
      setRepo(String(data?.repo || ""));
      nextRef = String(data?.ref || "");
      setRef(nextRef);
      setTruncated(Boolean(data?.truncated));
      setTreeError("");
    } catch (err) {
      setTreeError(errorMessage(err, "Could not load repository file tree."));
    }
    for (const path of open) {
      try {
        const data = await fetchDevRepoFile(
          projectId,
          path,
          nextRef ? { ref: nextRef } : undefined,
        );
        setFileCache((prev) => ({
          ...prev,
          [path]: {
            content: String(data?.content ?? ""),
            language: String(data?.language || "plaintext"),
            loading: false,
          },
        }));
      } catch (err) {
        setFileCache((prev) => ({
          ...prev,
          [path]: {
            content: "",
            language: "plaintext",
            loading: false,
            error: errorMessage(err, "Could not load file."),
          },
        }));
      }
    }
    if (active) setActivePath(active);
  }, [activePath, openTabs, projectId]);

  const activeFile = activePath ? fileCache[activePath] : null;

  return {
    treeLoading,
    treeError,
    paths,
    repo,
    ref,
    truncated,
    openTabs,
    activePath,
    activeFile,
    fileCache,
    loadTree,
    openFile,
    closeTab,
    setActivePath,
    refresh,
  };
}
