import { useEffect, useMemo, useState } from "react";
import { ChevronRight, FileText, Hammer, Loader2, Pencil, X } from "lucide-react";
import { AssistantMarkdown } from "@/components/chat/AssistantMarkdown";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  PLATFORM_PROMPT_BOX_RADIUS,
  PLATFORM_PROMPT_BOX_SURFACE,
} from "@/components/chat/platformPromptBox.classes";
import { cn } from "@/lib/utils";
import { MermaidDiagram } from "@/pages/Jobs/components/MermaidDiagram";
import { splitJobReportMarkdown } from "@/pages/Jobs/utils/mermaidChart.util";
import { extractPlanHeading } from "./devIde/devIdePlanTab.util.js";

/**
 * Cursor-style plan document: sticky Build top-right, markdown + mermaid preview, Edit toggle.
 */
export function BackendCodePlanDocument({
  markdown,
  onBuild,
  onDismiss,
  building = false,
  disabled = false,
  /** When true, hide Build / Dismiss / Edit — durable in-thread / post-Build plan view. */
  readOnly = false,
  fillHeight = false,
  className,
  title = "plan.md",
  /** Header toggles the body so the plan can sit in chat as a compact row. */
  collapsible = false,
  /** Controlled collapsed state (optional); falls back to internal state from defaultCollapsed. */
  collapsed: collapsedProp,
  defaultCollapsed = false,
  onCollapsedChange,
}) {
  const [draft, setDraft] = useState(String(markdown || ""));
  const [mode, setMode] = useState(/** @type {'preview'|'edit'} */ ("preview"));
  const [collapsedState, setCollapsedState] = useState(defaultCollapsed);
  const collapsed = collapsible && (collapsedProp ?? collapsedState);
  const toggleCollapsed = () => {
    setCollapsedState(!collapsed);
    onCollapsedChange?.(!collapsed);
  };

  useEffect(() => {
    setDraft(String(markdown || ""));
  }, [markdown]);

  const segments = useMemo(() => splitJobReportMarkdown(draft), [draft]);
  const canBuild = Boolean(draft.trim()) && !building && !disabled && !readOnly;
  const heading = useMemo(() => extractPlanHeading(draft), [draft]);

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col shadow-none transition-shadow",
        fillHeight
          ? "h-full rounded-none border border-border bg-background"
          : cn("mb-3 max-h-[min(60vh,28rem)]", PLATFORM_PROMPT_BOX_SURFACE),
        className,
      )}
    >
      <div
        className={cn(
          "flex shrink-0 items-center justify-between gap-2 bg-muted/30 px-3 py-2",
          !collapsed && "border-b border-border",
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          <FileText className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <p className="truncate text-xs font-semibold text-foreground">{title}</p>
          {!readOnly ? (
            <Tabs
              value={mode}
              onValueChange={(next) => setMode(/** @type {'preview'|'edit'} */ (next))}
              className="inline-flex flex-row gap-0"
            >
              <TabsList
                variant="segmented-compact"
                className={cn(
                  "h-7 min-h-0 w-auto shrink-0 gap-0.5 p-0.5",
                  PLATFORM_PROMPT_BOX_RADIUS,
                  "[&_[data-slot=tabs-trigger]]:h-5 [&_[data-slot=tabs-trigger]]:min-h-5 [&_[data-slot=tabs-trigger]]:rounded-[1.25rem] [&_[data-slot=tabs-trigger]]:px-2 [&_[data-slot=tabs-trigger]]:py-0 [&_[data-slot=tabs-trigger]]:text-[10px] [&_[data-slot=tabs-trigger]]:leading-none [&_[data-slot=tabs-trigger]]:shadow-none [&_[data-slot=tabs-trigger][data-state=active]]:shadow-none",
                )}
              >
                <TabsTrigger value="preview" disabled={building}>
                  Preview
                </TabsTrigger>
                <TabsTrigger value="edit" disabled={building || disabled} className="gap-0.5">
                  <Pencil className="size-2.5" aria-hidden />
                  Edit
                </TabsTrigger>
              </TabsList>
            </Tabs>
          ) : null}
        </div>
        {!readOnly ? (
          <div className="flex shrink-0 items-center gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="size-7"
              onClick={() => onDismiss?.()}
              disabled={building || disabled}
              aria-label="Dismiss plan"
              title="Dismiss plan"
            >
              <X className="size-3.5" aria-hidden />
            </Button>
            <Button
              type="button"
              size="sm"
              className="gap-1.5"
              disabled={!canBuild}
              onClick={() => onBuild?.(draft.trim())}
            >
              {building ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <Hammer className="size-3.5" aria-hidden />
              )}
              Build
            </Button>
          </div>
        ) : null}
      </div>

      <div className={cn("min-h-0 flex-1 overflow-y-auto", collapsed && "hidden")}>
        {mode === "edit" ? (
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={building || disabled}
            className="min-h-full resize-none rounded-none border-0 font-mono text-xs shadow-none focus-visible:ring-0"
            aria-label="Editable plan"
          />
        ) : (
          <div className="space-y-3 p-4">
            {segments.length === 0 ? (
              <p className="text-sm text-muted-foreground">(Empty plan.)</p>
            ) : (
              segments.map((segment, index) => {
                if (segment.type === "mermaid") {
                  return <MermaidDiagram key={`mermaid-${index}`} source={segment.content} />;
                }
                if (!segment.content?.trim()) return null;
                return (
                  <AssistantMarkdown
                    key={`md-${index}`}
                    text={segment.content}
                    collapsible={false}
                  />
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
