import Editor from "@/lib/monacoEditor";
import { FileCode2, FileDiff, FileText, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { BackendCodePlanDocument } from "../BackendCodePlanDocument";
import { DevIdeDiffEditor } from "./DevIdeDiffEditor";
import { PLAN_TAB_PATH } from "./devIdePlanTab.util.js";

function fileName(path) {
  const parts = String(path || "").split("/");
  return parts[parts.length - 1] || path;
}

export function DevIdeEditor({
  tabs,
  activeKey,
  activeTab,
  activeFile,
  activeDiff,
  activePlan,
  editorTheme = "vs-dark",
  onSelectTab,
  onCloseTab,
  onBuildPlan,
  onDismissPlan,
  buildingPlan = false,
  planDisabled = false,
  /** After Build clears pendingPlan, keep plan.md visible but hide Build/Dismiss. */
  planReadOnly = false,
}) {
  if (!tabs.length) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center gap-2 bg-background px-6 text-center">
        <FileCode2 className="size-8 text-muted-foreground/70" aria-hidden />
        <p className="text-sm font-medium text-foreground">Open a file to browse</p>
        <p className="max-w-sm text-xs text-muted-foreground">
          Files are read-only. Ask the agent in the chat panel to make changes in your development
          repo. Changed files open as diffs.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex shrink-0 items-stretch gap-0.5 overflow-x-auto border-b border-border bg-muted/30 px-1">
        {tabs.map((tab) => {
          const active = tab.key === activeKey;
          const label =
            tab.kind === "diff"
              ? `${fileName(tab.path)} (diff)`
              : tab.kind === "plan"
                ? PLAN_TAB_PATH
                : fileName(tab.path);
          return (
            <div
              key={tab.key}
              className={cn(
                "group flex max-w-[16rem] items-center gap-1 border-b-2 px-2 py-1.5 text-xs",
                active
                  ? "border-foreground bg-background text-foreground"
                  : "border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground",
              )}
            >
              {tab.kind === "diff" ? (
                <FileDiff className="size-3 shrink-0 opacity-70" aria-hidden />
              ) : tab.kind === "plan" ? (
                <FileText className="size-3 shrink-0 opacity-70" aria-hidden />
              ) : null}
              <button
                type="button"
                className="min-w-0 truncate text-left"
                title={tab.path}
                onClick={() => onSelectTab?.(tab.key)}
              >
                {label}
              </button>
              <button
                type="button"
                className="rounded p-0.5 opacity-60 hover:bg-muted hover:opacity-100"
                aria-label={`Close ${label}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab?.(tab.key);
                }}
              >
                <X className="size-3" />
              </button>
            </div>
          );
        })}
      </div>

      <div className="min-h-0 flex-1">
        {activeTab?.kind === "plan" ? (
          <BackendCodePlanDocument
            markdown={activePlan?.markdown ?? ""}
            fillHeight
            building={buildingPlan}
            disabled={planDisabled}
            readOnly={planReadOnly}
            onBuild={(md) => onBuildPlan?.(md)}
            onDismiss={() => onDismissPlan?.()}
          />
        ) : activeTab?.kind === "diff" ? (
          <DevIdeDiffEditor
            path={activeTab.path}
            diff={activeDiff}
            base={activeTab.base || activeDiff?.base}
            head={activeTab.head || activeDiff?.head}
            theme={editorTheme}
          />
        ) : activeFile?.loading ? (
          <div className="space-y-2 p-4" role="status" aria-busy="true" aria-label="Loading file">
            {["w-1/3", "w-3/4", "w-full", "w-5/6", "w-2/3", "w-full", "w-1/2", "w-3/4"].map(
              (width, i) => (
                <Skeleton key={i} className={`h-3 ${width}`} />
              ),
            )}
          </div>
        ) : activeFile?.error ? (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-destructive">
            {activeFile.error}
          </div>
        ) : (
          <Editor
            key={activeTab?.path}
            path={activeTab?.path || undefined}
            language={activeFile?.language || "plaintext"}
            value={activeFile?.content ?? ""}
            theme={editorTheme}
            options={{
              readOnly: true,
              minimap: { enabled: false },
              fontSize: 13,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              wordWrap: "on",
              renderWhitespace: "none",
              domReadOnly: true,
            }}
          />
        )}
      </div>
    </div>
  );
}
