import { useCallback, useRef, useState } from "react";
import { fetchDevRepoFile } from "@/api";
import {
  PLAN_TAB_KEY,
  PLAN_TAB_PATH,
  planCacheFromMarkdown,
  upsertPlanTabInList,
} from "./devIdePlanTab.util.js";
import { normalizeAgentRepoPath } from "./normalizeAgentRepoPath.js";
import { applyUnifiedDiffToContent } from "./applyUnifiedDiffToContent.js";

function errorMessage(err, fallback) {
  return err?.error || err?.message || (typeof err === "string" ? err : null) || fallback;
}

function fileTabKey(path) {
  return `file:${path}`;
}

function diffTabKey(path) {
  return `diff:${path}`;
}

/**
 * Center editor tabs: read-only files + Monaco diffs + virtual plan.md.
 * @param {number|string|null|undefined} projectId
 */
export function useDevIdeTabs(projectId) {
  const [tabs, setTabs] = useState(
    /** @type {Array<{ key: string, kind: 'file'|'diff'|'plan', path: string, status?: string, base?: string, head?: string }>} */ ([]),
  );
  const [activeKey, setActiveKey] = useState(/** @type {string|null} */ (null));
  const [fileCache, setFileCache] = useState(
    /** @type {Record<string, { content: string, language: string, loading?: boolean, error?: string }>} */ ({}),
  );
  const [diffCache, setDiffCache] = useState(
    /** @type {Record<string, { original: string, modified: string, language: string, loading?: boolean, error?: string, base: string, head: string }>} */ ({}),
  );
  const [planCache, setPlanCache] = useState(/** @type {{ markdown: string }|null} */ (null));
  const openedDiffKeysRef = useRef(/** @type {Set<string>} */ (new Set()));
  const diffLoadGenRef = useRef(/** @type {Record<string, number>} */ ({}));
  const diffCacheRef = useRef(diffCache);
  diffCacheRef.current = diffCache;

  const activeTab = tabs.find((t) => t.key === activeKey) || null;
  const activeFile = activeTab?.kind === "file" ? fileCache[activeTab.path] : null;
  const activeDiff = activeTab?.kind === "diff" ? diffCache[activeTab.path] : null;
  const activePlan = activeTab?.kind === "plan" ? planCache : null;

  const openFile = useCallback(
    async (filePath, { ref } = {}) => {
      const path = normalizeAgentRepoPath(filePath);
      if (!path || !projectId) return;
      const key = fileTabKey(path);
      setTabs((prev) =>
        prev.some((t) => t.key === key) ? prev : [...prev, { key, kind: "file", path }],
      );
      setActiveKey(key);

      setFileCache((prev) => ({
        ...prev,
        [path]: {
          content: prev[path]?.content ?? "",
          language: prev[path]?.language ?? "plaintext",
          loading: true,
          error: undefined,
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
    [projectId],
  );

  const openDiff = useCallback(
    async (file, { force = false } = {}) => {
      const path = normalizeAgentRepoPath(file?.path);
      if (!path || !projectId) return;
      const key = diffTabKey(path);
      const status = file?.status || "modified";
      const base = String(file?.base || "").trim();
      const head = String(file?.head || "").trim();
      const diffPreview =
        typeof file?.diffPreview === "string" && file.diffPreview.trim()
          ? file.diffPreview.trim()
          : "";
      const loadGen = (diffLoadGenRef.current[path] || 0) + 1;
      diffLoadGenRef.current[path] = loadGen;

      setTabs((prev) => {
        const existing = prev.find((t) => t.key === key);
        if (existing) {
          return prev.map((t) =>
            t.key === key
              ? { ...t, status, base, head, ...(diffPreview ? { diffPreview } : {}) }
              : t,
          );
        }
        return [
          ...prev,
          {
            key,
            kind: "diff",
            path,
            status,
            base,
            head,
            ...(diffPreview ? { diffPreview } : {}),
          },
        ];
      });
      setActiveKey(key);

      const cached = diffCacheRef.current[path];
      if (
        !force &&
        openedDiffKeysRef.current.has(key) &&
        cached &&
        !cached.error &&
        !cached.loading &&
        cached.base === base &&
        cached.head === head &&
        cached.original !== cached.modified &&
        (cached.original?.length > 0 || cached.modified?.length > 0)
      ) {
        return;
      }
      openedDiffKeysRef.current.add(key);

      setDiffCache((prev) => ({
        ...prev,
        [path]: {
          original: prev[path]?.original ?? "",
          modified: prev[path]?.modified ?? "",
          language: prev[path]?.language ?? "plaintext",
          loading: true,
          error: undefined,
          base,
          head,
        },
      }));

      try {
        let original = "";
        let modified = "";
        let language = "plaintext";
        let originalErr = "";
        let modifiedErr = "";

        if (status !== "added") {
          try {
            const data = await fetchDevRepoFile(projectId, path, base ? { ref: base } : undefined);
            original = String(data?.content ?? "");
            language = String(data?.language || language);
          } catch (err) {
            original = "";
            originalErr = errorMessage(err, "base fetch failed");
          }
        }

        if (status !== "removed") {
          try {
            const data = await fetchDevRepoFile(projectId, path, head ? { ref: head } : undefined);
            modified = String(data?.content ?? "");
            language = String(data?.language || language);
          } catch (err) {
            if (status === "added") throw err;
            modified = "";
            modifiedErr = errorMessage(err, "head fetch failed");
          }
        }

        // Live agent edits often open before GitHub publish — base===head yields identical panes.
        const sidesIdentical = original === modified;
        const sameRef = Boolean(base) && Boolean(head) && base === head;
        const preview =
          diffPreview ||
          (typeof file?.diffPreview === "string" ? file.diffPreview.trim() : "") ||
          "";
        if (preview && (sidesIdentical || sameRef || (!modified && original))) {
          const applied = applyUnifiedDiffToContent(original, preview);
          if (applied != null && applied !== original) {
            modified = applied;
          }
        }

        if (diffLoadGenRef.current[path] !== loadGen) {
          return;
        }

        const blankBoth = !original && !modified;
        const loadError =
          blankBoth && (originalErr || modifiedErr)
            ? originalErr || modifiedErr || "Could not load diff."
            : undefined;

        setDiffCache((prev) => ({
          ...prev,
          [path]: {
            original,
            modified,
            language,
            loading: false,
            error: loadError,
            base,
            head,
          },
        }));
      } catch (err) {
        if (diffLoadGenRef.current[path] !== loadGen) return;
        setDiffCache((prev) => ({
          ...prev,
          [path]: {
            original: "",
            modified: "",
            language: "plaintext",
            loading: false,
            error: errorMessage(err, "Could not load diff."),
            base,
            head,
          },
        }));
      }
    },
    [projectId],
  );

  const closeTab = useCallback((key) => {
    setTabs((prev) => {
      const next = prev.filter((t) => t.key !== key);
      setActiveKey((active) => {
        if (active !== key) return active;
        const idx = prev.findIndex((t) => t.key === key);
        return next[Math.max(0, idx - 1)]?.key ?? next[0]?.key ?? null;
      });
      return next;
    });
  }, []);

  const openPlan = useCallback(({ markdown } = {}) => {
    const nextCache = planCacheFromMarkdown(markdown);
    if (!nextCache) return;
    setPlanCache(nextCache);
    setTabs((prev) => upsertPlanTabInList(prev));
    setActiveKey(PLAN_TAB_KEY);
  }, []);

  const updatePlanMarkdown = useCallback((markdown) => {
    const nextCache = planCacheFromMarkdown(markdown);
    if (!nextCache) return;
    setPlanCache(nextCache);
  }, []);

  const closePlanTab = useCallback(() => {
    closeTab(PLAN_TAB_KEY);
  }, [closeTab]);

  const clearPlan = useCallback(() => {
    setPlanCache(null);
    closeTab(PLAN_TAB_KEY);
  }, [closeTab]);

  const focusPlanTab = useCallback(() => {
    setTabs((prev) => {
      if (prev.some((t) => t.key === PLAN_TAB_KEY)) return prev;
      if (!planCache?.markdown) return prev;
      return upsertPlanTabInList(prev);
    });
    if (planCache?.markdown) setActiveKey(PLAN_TAB_KEY);
  }, [planCache?.markdown]);

  const refreshOpenDiffs = useCallback(
    async ({ base, head } = {}) => {
      const diffTabs = tabs.filter((t) => t.kind === "diff");
      for (const tab of diffTabs) {
        await openDiff(
          {
            path: tab.path,
            status: tab.status,
            base: base || tab.base,
            head: head || tab.head,
            diffPreview: tab.diffPreview,
          },
          { force: true },
        );
      }
    },
    [openDiff, tabs],
  );

  return {
    tabs,
    activeKey,
    activeTab,
    activeFile,
    activeDiff,
    activePlan,
    planCache,
    setActiveKey,
    openFile,
    openDiff,
    openPlan,
    updatePlanMarkdown,
    closePlanTab,
    clearPlan,
    focusPlanTab,
    closeTab,
    refreshOpenDiffs,
    openedDiffKeysRef,
    PLAN_TAB_KEY,
    PLAN_TAB_PATH,
  };
}
