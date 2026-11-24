import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Code2, Loader2, Moon, RefreshCw, Sun, X } from "lucide-react";
import { useDefaultLayout } from "react-resizable-panels";
import { toast } from "sonner";
import { fetchDevRepoChangedFiles } from "@/api";
import { Button } from "@/components/ui/button";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { cn } from "@/lib/utils";
import { BackendCodeChatPanel } from "../BackendCodeChatPanel";
import { DevIdeChangesPanel } from "./DevIdeChangesPanel";
import { DevIdeEditor } from "./DevIdeEditor";
import { DevIdeFileTree } from "./DevIdeFileTree";
import { DevIdeHistoryPanel } from "./DevIdeHistoryPanel";
import {
  DEV_IDE_CHAT_DEFAULT_SIZE,
  DEV_IDE_CHAT_MAX_SIZE,
  DEV_IDE_CHAT_MIN_SIZE,
  DEV_IDE_EDITOR_DEFAULT_SIZE,
  DEV_IDE_EDITOR_MIN_SIZE,
  DEV_IDE_EDITOR_THEME_STORAGE_KEY,
  DEV_IDE_FILE_TREE_DEFAULT_SIZE,
  DEV_IDE_FILE_TREE_MAX_SIZE,
  DEV_IDE_FILE_TREE_MIN_SIZE,
  DEV_IDE_LEFT_CHANGES_DEFAULT_SIZE,
  DEV_IDE_LEFT_CHANGES_MIN_SIZE,
  DEV_IDE_LEFT_FILES_DEFAULT_SIZE,
  DEV_IDE_LEFT_FILES_MIN_SIZE,
  DEV_IDE_LEFT_HISTORY_DEFAULT_SIZE,
  DEV_IDE_LEFT_HISTORY_MIN_SIZE,
  DEV_IDE_LEFT_LAYOUT_STORAGE_ID,
  DEV_IDE_LEFT_PANEL_IDS,
} from "./devIdeLayout.constants.js";
import { normalizeAgentRepoPath } from "./normalizeAgentRepoPath.js";
import { useDevIdeTabs } from "./useDevIdeTabs";
import { useDevRepoBrowse } from "./useDevRepoBrowse";
import { useDevRepoChangedFiles } from "./useDevRepoChangedFiles";
import { useDevRepoCommits } from "./useDevRepoCommits";

function isEditableTarget(target) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return Boolean(target.closest("[contenteditable='true'], textarea, input, select"));
}

function readStoredEditorTheme() {
  try {
    const stored = localStorage.getItem(DEV_IDE_EDITOR_THEME_STORAGE_KEY);
    if (stored === "vs" || stored === "vs-dark") return stored;
  } catch {
    /* ignore */
  }
  return "vs-dark";
}

/**
 * Fullscreen Cursor-like IDE: file tree / changes / history | Monaco | backend code chat.
 */
export function BackendCodeIdeWorkspace({
  open,
  onClose,
  onNewChatStarted,
  projectId,
  canSend,
  disabledHint,
}) {
  const [inFlightFiles, setInFlightFiles] = useState(
    /** @type {Array<{ path: string, status: string, additions: number, deletions: number }>} */ ([]),
  );
  const [editorTheme, setEditorTheme] = useState(readStoredEditorTheme);
  const [selectedCommitSha, setSelectedCommitSha] = useState(/** @type {string|null} */ (null));
  const [commitDiffLoading, setCommitDiffLoading] = useState(false);
  const [commitReview, setCommitReview] = useState(
    /** @type {null | {
      sha: string,
      shaShort: string,
      parentSha: string,
      messageFirstLine: string,
      files: Array<{ path: string, status: string, additions?: number, deletions?: number, base: string, head: string }>,
      truncated: boolean,
      base: string,
      head: string,
    }} */ (null),
  );

  const browse = useDevRepoBrowse(projectId, { enabled: open });
  const changed = useDevRepoChangedFiles(projectId, { enabled: open });
  const history = useDevRepoCommits(projectId, { enabled: open });
  const editorTabs = useDevIdeTabs(projectId);
  const { defaultLayout: leftDefaultLayout, onLayoutChanged: onLeftLayoutChanged } =
    useDefaultLayout({
      id: DEV_IDE_LEFT_LAYOUT_STORAGE_ID,
      panelIds: DEV_IDE_LEFT_PANEL_IDS,
      storage: typeof localStorage !== "undefined" ? localStorage : undefined,
    });

  const browseRefreshRef = useRef(browse.refresh);
  browseRefreshRef.current = browse.refresh;
  const changedReloadRef = useRef(changed.reload);
  changedReloadRef.current = changed.reload;
  const historyReloadRef = useRef(history.reload);
  historyReloadRef.current = history.reload;
  const refreshDiffsRef = useRef(editorTabs.refreshOpenDiffs);
  refreshDiffsRef.current = editorTabs.refreshOpenDiffs;
  const openDiffRef = useRef(editorTabs.openDiff);
  openDiffRef.current = editorTabs.openDiff;
  const openedAutoPathsRef = useRef(/** @type {Set<string>} */ (new Set()));
  const prevActiveRunRef = useRef(false);
  const refreshingRef = useRef(false);
  const planChromeRef = useRef(
    /** @type {{ building?: boolean, disabled?: boolean, hasPendingPlan?: boolean, build?: Function, dismiss?: Function }} */ ({}),
  );
  const [planChrome, setPlanChrome] = useState({
    building: false,
    disabled: false,
    hasPendingPlan: false,
  });

  const handleOpenPlan = useCallback(
    (markdown) => {
      editorTabs.openPlan({ markdown });
    },
    [editorTabs.openPlan],
  );

  const handleUpdatePlan = useCallback(
    (markdown) => {
      editorTabs.updatePlanMarkdown(markdown);
    },
    [editorTabs.updatePlanMarkdown],
  );

  const handlePendingPlanCleared = useCallback(() => {
    editorTabs.clearPlan();
  }, [editorTabs.clearPlan]);

  const handleFocusPlan = useCallback(() => {
    editorTabs.focusPlanTab();
  }, [editorTabs.focusPlanTab]);

  const handlePlanChromeChange = useCallback((next) => {
    planChromeRef.current = next && typeof next === "object" ? next : {};
    setPlanChrome({
      building: Boolean(next?.building),
      disabled: Boolean(next?.disabled),
      hasPendingPlan: Boolean(next?.hasPendingPlan),
    });
  }, []);

  const handleEditorBuildPlan = useCallback((markdown) => {
    planChromeRef.current.build?.(markdown);
  }, []);

  const handleEditorDismissPlan = useCallback(() => {
    planChromeRef.current.dismiss?.();
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      if (isEditableTarget(event.target)) return;
      event.preventDefault();
      onClose?.();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const toggleEditorTheme = useCallback(() => {
    setEditorTheme((prev) => {
      const next = prev === "vs-dark" ? "vs" : "vs-dark";
      try {
        localStorage.setItem(DEV_IDE_EDITOR_THEME_STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const mergedChangeFiles = useMemo(() => {
    const byPath = new Map();
    for (const f of changed.files) {
      byPath.set(f.path, {
        ...f,
        base: changed.base,
        head: changed.head,
      });
    }
    for (const f of inFlightFiles) {
      if (!byPath.has(f.path)) {
        byPath.set(f.path, {
          ...f,
          base: changed.base,
          head: changed.head,
        });
      }
    }
    return Array.from(byPath.values()).sort((a, b) => a.path.localeCompare(b.path));
  }, [changed.base, changed.files, changed.head, inFlightFiles]);

  const clearCommitReview = useCallback(() => {
    setSelectedCommitSha(null);
    setCommitReview(null);
  }, []);

  const handleRefreshAll = useCallback(async () => {
    clearCommitReview();
    const [, latest] = await Promise.all([
      browseRefreshRef.current(),
      changedReloadRef.current(),
      historyReloadRef.current(),
    ]);
    const githubFiles = Array.isArray(latest?.files) ? latest.files : [];
    const githubPaths = new Set(githubFiles.map((f) => f.path));
    // Keep agent in-flight rows when GitHub compare is empty (no push yet / identical refs).
    setInFlightFiles((prev) => {
      if (githubPaths.size === 0) {
        return prev.map((f) => (f.status === "editing" ? { ...f, status: "modified" } : f));
      }
      return prev.filter((f) => !githubPaths.has(f.path));
    });
    await refreshDiffsRef.current({
      base: latest?.base || changed.base,
      head: latest?.head || changed.head,
    });
  }, [changed.base, changed.head, clearCommitReview]);

  const handleActiveRunChange = useCallback(
    (hasActiveRun) => {
      const wasActive = prevActiveRunRef.current;
      prevActiveRunRef.current = Boolean(hasActiveRun);
      if (hasActiveRun && !wasActive) {
        setInFlightFiles([]);
        openedAutoPathsRef.current = new Set();
      }
      if (!hasActiveRun) {
        openedAutoPathsRef.current = new Set();
      }
      if (wasActive && !hasActiveRun && !refreshingRef.current) {
        refreshingRef.current = true;
        void handleRefreshAll().finally(() => {
          refreshingRef.current = false;
        });
      }
    },
    [handleRefreshAll],
  );

  const handleAgentFileChange = useCallback(
    ({ path, toolKind, status, diffPreview }) => {
      const normalized = normalizeAgentRepoPath(path);
      if (!normalized) return;
      if (toolKind !== "edit" && toolKind !== "write") return;
      const preview =
        typeof diffPreview === "string" && diffPreview.trim() ? diffPreview.trim() : "";

      setInFlightFiles((prev) => {
        const existing = prev.find((f) => f.path === normalized);
        if (existing) {
          return prev.map((f) =>
            f.path === normalized
              ? {
                  ...f,
                  status:
                    status === "success"
                      ? "modified"
                      : f.status === "editing"
                        ? "editing"
                        : f.status,
                  ...(preview ? { diffPreview: preview } : {}),
                }
              : f,
          );
        }
        return [
          ...prev,
          {
            path: normalized,
            status: status === "success" ? "modified" : "editing",
            additions: 0,
            deletions: 0,
            ...(preview ? { diffPreview: preview } : {}),
          },
        ];
      });

      if (status === "success") {
        const alreadyOpened = openedAutoPathsRef.current.has(normalized);
        if (!alreadyOpened) openedAutoPathsRef.current.add(normalized);
        if (!alreadyOpened || preview) {
          void openDiffRef.current(
            {
              path: normalized,
              status: "modified",
              base: changed.base,
              head: changed.head,
              diffPreview: preview || undefined,
            },
            { force: alreadyOpened && Boolean(preview) },
          );
        }
      }
    },
    [changed.base, changed.head],
  );

  const handleOpenPathFromChat = useCallback(
    (path) => {
      const normalized = normalizeAgentRepoPath(path);
      if (!normalized) return;
      const inFlight = inFlightFiles.find((f) => f.path === normalized);
      void openDiffRef.current({
        path: normalized,
        status: "modified",
        base: changed.base,
        head: changed.head,
        diffPreview: inFlight?.diffPreview,
      });
    },
    [changed.base, changed.head, inFlightFiles],
  );

  const handleOpenChange = useCallback(
    (file) => {
      const base = file.base || commitReview?.base || changed.base;
      const head = file.head || commitReview?.head || changed.head;
      void openDiffRef.current(
        {
          path: file.path,
          status: file.status,
          base,
          head,
          diffPreview: file.diffPreview,
        },
        { force: Boolean(commitReview) },
      );
    },
    [changed.base, changed.head, commitReview],
  );

  const handleSelectCommit = useCallback(
    async (commit) => {
      const sha = String(commit?.sha || "").trim();
      const parentSha = String(commit?.parentSha || "").trim();
      const shaShort = commit?.shaShort || sha.slice(0, 7);
      const messageFirstLine = String(commit?.messageFirstLine || "");
      if (!sha || !projectId) return;

      if (!parentSha) {
        toast.error("No parent to diff against");
        return;
      }

      setSelectedCommitSha(sha);
      setCommitReview({
        sha,
        shaShort,
        parentSha,
        messageFirstLine,
        files: [],
        truncated: false,
        base: parentSha,
        head: sha,
      });
      setCommitDiffLoading(true);
      try {
        const data = await fetchDevRepoChangedFiles(projectId, { base: parentSha, head: sha });
        const files = (Array.isArray(data?.files) ? data.files : []).map((f) => ({
          ...f,
          base: parentSha,
          head: sha,
        }));
        setCommitReview({
          sha,
          shaShort,
          parentSha,
          messageFirstLine,
          files,
          truncated: Boolean(data?.truncated),
          base: parentSha,
          head: sha,
        });
        if (files.length === 0) {
          toast.message(`Commit ${shaShort}`, {
            description: messageFirstLine || "No file changes in this commit.",
          });
        }
      } catch (err) {
        setSelectedCommitSha(null);
        setCommitReview(null);
        const message =
          err?.error ||
          err?.message ||
          (typeof err === "string" ? err : null) ||
          "Could not load commit diff.";
        toast.error(message);
      } finally {
        setCommitDiffLoading(false);
      }
    },
    [projectId],
  );

  const handleRefreshFiles = useCallback(async () => {
    await browseRefreshRef.current();
  }, []);

  const handleRefreshChanges = useCallback(async () => {
    clearCommitReview();
    const latest = await changedReloadRef.current();
    await refreshDiffsRef.current({
      base: latest?.base || changed.base,
      head: latest?.head || changed.head,
    });
  }, [changed.base, changed.head, clearCommitReview]);

  const handleRefreshHistory = useCallback(async () => {
    clearCommitReview();
    await historyReloadRef.current();
  }, [clearCommitReview]);

  const activeChangePath = editorTabs.activeTab?.kind === "diff" ? editorTabs.activeTab.path : null;
  const changesFiles = commitReview ? commitReview.files : mergedChangeFiles;
  const refreshBusy = browse.treeLoading || changed.loading || history.loading || commitDiffLoading;

  if (!open) return null;

  const ideDark = editorTheme === "vs-dark";

  const overlay = (
    <div
      className={cn(
        "fixed inset-0 z-[60] flex flex-col bg-background text-foreground",
        // Scope Tailwind dark tokens + CSS variables to the IDE chrome (Monaco uses editorTheme).
        // text-foreground must be set here: inherited color from body is already computed
        // and would stay light-theme (dark ink) after .dark remaps --foreground.
        ideDark && "dark",
      )}
      data-ide-theme={ideDark ? "dark" : "light"}
      role="dialog"
      aria-modal="true"
      aria-label="Development repository IDE"
    >
      <header className="flex h-11 shrink-0 items-center gap-3 border-b border-border px-3 text-foreground">
        <Code2 className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {browse.repo || "Development repository"}
            {changed.head || browse.ref ? (
              <span className="ml-2 font-normal text-muted-foreground">
                @{changed.head || browse.ref}
              </span>
            ) : null}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-xs text-foreground"
          onClick={toggleEditorTheme}
          aria-label={ideDark ? "Switch IDE to light theme" : "Switch IDE to dark theme"}
          title={ideDark ? "Light theme" : "Dark theme"}
        >
          {ideDark ? (
            <Sun className="size-3.5" aria-hidden />
          ) : (
            <Moon className="size-3.5" aria-hidden />
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-xs text-foreground"
          onClick={() => void handleRefreshAll()}
          disabled={refreshBusy}
        >
          {refreshBusy ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <RefreshCw className="size-3.5" aria-hidden />
          )}
          Refresh
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs text-foreground"
          onClick={onClose}
        >
          <X className="size-3.5" aria-hidden />
          Exit IDE
        </Button>
      </header>

      <div className="min-h-0 flex-1">
        <ResizablePanelGroup orientation="horizontal" className="flex h-full min-h-0 w-full">
          <ResizablePanel
            id="dev-ide-files"
            defaultSize={DEV_IDE_FILE_TREE_DEFAULT_SIZE}
            minSize={DEV_IDE_FILE_TREE_MIN_SIZE}
            maxSize={DEV_IDE_FILE_TREE_MAX_SIZE}
            className="min-h-0 min-w-[200px]"
            style={{ overflow: "hidden" }}
          >
            <ResizablePanelGroup
              id={DEV_IDE_LEFT_LAYOUT_STORAGE_ID}
              orientation="vertical"
              className="flex h-full min-h-0 w-full"
              defaultLayout={leftDefaultLayout}
              onLayoutChanged={onLeftLayoutChanged}
            >
              <ResizablePanel
                id="dev-ide-left-files"
                defaultSize={DEV_IDE_LEFT_FILES_DEFAULT_SIZE}
                minSize={DEV_IDE_LEFT_FILES_MIN_SIZE}
                className="min-h-0"
                style={{ overflow: "hidden" }}
              >
                <DevIdeFileTree
                  paths={browse.paths}
                  loading={browse.treeLoading}
                  error={browse.treeError}
                  activePath={
                    editorTabs.activeTab?.kind === "file" ? editorTabs.activeTab.path : null
                  }
                  onOpenFile={(path) => void editorTabs.openFile(path, { ref: browse.ref })}
                  truncated={browse.truncated}
                  onRefresh={handleRefreshFiles}
                  refreshing={browse.treeLoading}
                />
              </ResizablePanel>
              <ResizableHandle withHandle className="bg-border hover:bg-muted" />
              <ResizablePanel
                id="dev-ide-left-changes"
                defaultSize={DEV_IDE_LEFT_CHANGES_DEFAULT_SIZE}
                minSize={DEV_IDE_LEFT_CHANGES_MIN_SIZE}
                className="min-h-0"
                style={{ overflow: "hidden" }}
              >
                <DevIdeChangesPanel
                  files={changesFiles}
                  loading={commitReview ? commitDiffLoading : changed.loading}
                  error={commitReview ? "" : changed.error}
                  base={commitReview ? commitReview.base : changed.base}
                  head={commitReview ? commitReview.head : changed.head}
                  truncated={commitReview ? commitReview.truncated : changed.truncated}
                  activePath={activeChangePath}
                  onOpenFile={handleOpenChange}
                  title={commitReview ? `Commit ${commitReview.shaShort}` : "Changes"}
                  subtitle={commitReview?.messageFirstLine || undefined}
                  emptyLabel={commitReview ? "No files in this commit" : "No changes vs base"}
                  onClear={commitReview ? clearCommitReview : undefined}
                  onRefresh={handleRefreshChanges}
                  refreshing={commitReview ? commitDiffLoading : changed.loading}
                />
              </ResizablePanel>
              <ResizableHandle withHandle className="bg-border hover:bg-muted" />
              <ResizablePanel
                id="dev-ide-left-history"
                defaultSize={DEV_IDE_LEFT_HISTORY_DEFAULT_SIZE}
                minSize={DEV_IDE_LEFT_HISTORY_MIN_SIZE}
                className="min-h-0"
                style={{ overflow: "hidden" }}
              >
                <DevIdeHistoryPanel
                  commits={history.commits}
                  loading={history.loading || commitDiffLoading}
                  error={history.error}
                  selectedSha={selectedCommitSha}
                  onSelectCommit={(c) => void handleSelectCommit(c)}
                  onRefresh={handleRefreshHistory}
                  refreshing={history.loading}
                />
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
          <ResizableHandle withHandle className="bg-border hover:bg-muted" />
          <ResizablePanel
            id="dev-ide-editor"
            defaultSize={DEV_IDE_EDITOR_DEFAULT_SIZE}
            minSize={DEV_IDE_EDITOR_MIN_SIZE}
            className="min-h-0 min-w-0"
            style={{ overflow: "hidden" }}
          >
            <DevIdeEditor
              tabs={editorTabs.tabs}
              activeKey={editorTabs.activeKey}
              activeTab={editorTabs.activeTab}
              activeFile={editorTabs.activeFile}
              activeDiff={editorTabs.activeDiff}
              activePlan={editorTabs.activePlan}
              editorTheme={editorTheme}
              onSelectTab={editorTabs.setActiveKey}
              onCloseTab={editorTabs.closeTab}
              onBuildPlan={handleEditorBuildPlan}
              onDismissPlan={handleEditorDismissPlan}
              buildingPlan={planChrome.building}
              planDisabled={planChrome.disabled}
              planReadOnly={!planChrome.hasPendingPlan}
            />
          </ResizablePanel>
          <ResizableHandle withHandle className="bg-border hover:bg-muted" />
          <ResizablePanel
            id="dev-ide-chat"
            defaultSize={DEV_IDE_CHAT_DEFAULT_SIZE}
            minSize={DEV_IDE_CHAT_MIN_SIZE}
            maxSize={DEV_IDE_CHAT_MAX_SIZE}
            className="min-h-0 min-w-[280px]"
            style={{ overflow: "hidden" }}
          >
            <div className="flex h-full min-h-0 w-full flex-col border-l border-border bg-background">
              <BackendCodeChatPanel
                projectId={projectId}
                canSend={canSend}
                disabledHint={disabledHint}
                embeddedInIde
                onActiveRunChange={handleActiveRunChange}
                onAgentFileChange={handleAgentFileChange}
                onOpenPath={handleOpenPathFromChat}
                onOpenPlan={handleOpenPlan}
                onUpdatePlan={handleUpdatePlan}
                onPendingPlanCleared={handlePendingPlanCleared}
                onFocusPlan={handleFocusPlan}
                onPlanChromeChange={handlePlanChromeChange}
                onNewChatStarted={onNewChatStarted}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
