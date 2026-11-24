import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { fetchProjectMemory, patchProjectMemorySettings, refreshProjectMemory } from "@/api";
import { formatAgentCreatedAt, formatUsd } from "@/pages/AgentAnalytics/agentAnalyticsDisplay";
import { MermaidDiagram } from "@/pages/Jobs/components/MermaidDiagram";

const POLL_MS = 3000;

/**
 * @param {object|null|undefined} refresh
 */
function isRefreshBusy(refresh) {
  const status = String(refresh?.status ?? "")
    .trim()
    .toLowerCase();
  return status === "queued" || status === "running";
}

/**
 * @param {object|null|undefined} refresh
 */
function refreshStatusLabel(refresh) {
  const status = String(refresh?.status ?? "")
    .trim()
    .toLowerCase();
  if (status === "queued") return "Queued…";
  if (status === "running") {
    const agentStatus = String(refresh?.agentStatus ?? "")
      .trim()
      .replace(/_/g, " ")
      .toLowerCase();
    return agentStatus ? `Refreshing… (${agentStatus})` : "Refreshing…";
  }
  return null;
}

/**
 * @param {unknown} items
 * @returns {string[]}
 */
function lensTexts(items) {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => (typeof item?.text === "string" ? item.text.trim() : ""))
    .filter(Boolean);
}

/**
 * @param {object|null|undefined} knowledge
 */
function hasKnowledgeContent(knowledge) {
  if (!knowledge || typeof knowledge !== "object") return false;
  if (lensTexts(knowledge.delivery).length) return true;
  if (lensTexts(knowledge.conventions).length) return true;
  if (lensTexts(knowledge.architecture).length) return true;
  const ia = knowledge.informationArchitecture;
  if (!ia || typeof ia !== "object") return false;
  if (typeof ia.summary === "string" && ia.summary.trim()) return true;
  if (typeof ia.mermaid === "string" && ia.mermaid.trim()) return true;
  if (typeof ia.notes === "string" && ia.notes.trim()) return true;
  if (Array.isArray(ia.primaryNav) && ia.primaryNav.some((x) => String(x ?? "").trim())) {
    return true;
  }
  return false;
}

/**
 * @param {{ title: string, items: string[] }} props
 */
function KnowledgeLensSection({ title, items }) {
  if (!items.length) return null;
  return (
    <div className="space-y-1.5">
      <h4 className="text-xs font-medium text-foreground">{title}</h4>
      <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
        {items.map((text) => (
          <li key={text}>{text}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * @param {{ ia: object|null|undefined }} props
 */
function KnowledgeIaSection({ ia }) {
  if (!ia || typeof ia !== "object") return null;
  const summary = typeof ia.summary === "string" ? ia.summary.trim() : "";
  const notes = typeof ia.notes === "string" ? ia.notes.trim() : "";
  const mermaid = typeof ia.mermaid === "string" ? ia.mermaid.trim() : "";
  const primaryNav = Array.isArray(ia.primaryNav)
    ? ia.primaryNav.map((x) => String(x ?? "").trim()).filter(Boolean)
    : [];
  if (!summary && !notes && !mermaid && !primaryNav.length) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-medium text-foreground">Product IA</h4>
      {summary ? <p className="text-xs text-muted-foreground">{summary}</p> : null}
      {primaryNav.length ? (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Primary nav:</span> {primaryNav.join(" · ")}
        </p>
      ) : null}
      {notes ? (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Notes:</span> {notes}
        </p>
      ) : null}
      {mermaid ? <MermaidDiagram source={mermaid} className="my-1" /> : null}
    </div>
  );
}

/**
 * Enable project-knowledge Cursor distillation on development repos + refresh enqueue.
 * Rendered on the project AI Agents tab.
 */
export function ProjectMemoryKnowledgeCard({ project }) {
  const projectId = project?.id;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [hasDevelopmentRepo, setHasDevelopmentRepo] = useState(false);
  const [knowledgeRefresh, setKnowledgeRefresh] = useState(null);
  const [knowledge, setKnowledge] = useState(null);
  const [showKnowledge, setShowKnowledge] = useState(false);

  const applyMemoryPayload = useCallback((data) => {
    setEnabled(data?.knowledgeEnabled !== false);
    setHasDevelopmentRepo(Boolean(data?.hasDevelopmentRepo));
    if (data?.knowledgeRefresh && typeof data.knowledgeRefresh === "object") {
      setKnowledgeRefresh(data.knowledgeRefresh);
    }
    if (data?.knowledge && typeof data.knowledge === "object") {
      setKnowledge(data.knowledge);
    } else {
      setKnowledge(null);
    }
  }, []);

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!projectId) return;
      if (!silent) setLoading(true);
      try {
        const data = await fetchProjectMemory(projectId);
        applyMemoryPayload(data);
      } catch (error) {
        if (!silent) {
          toast.error(
            error?.message || error?.error || "Could not load project knowledge settings.",
          );
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [applyMemoryPayload, projectId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const busy = isRefreshBusy(knowledgeRefresh) || refreshing;

  useEffect(() => {
    if (!projectId || !isRefreshBusy(knowledgeRefresh)) return undefined;
    const id = window.setInterval(() => {
      void load({ silent: true });
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [knowledgeRefresh, load, projectId]);

  const onToggle = async (next) => {
    if (!hasDevelopmentRepo) return;
    setSaving(true);
    const previous = enabled;
    setEnabled(next);
    try {
      const data = await patchProjectMemorySettings(projectId, { knowledgeEnabled: next });
      setEnabled(data?.knowledgeEnabled !== false);
      setHasDevelopmentRepo(Boolean(data?.hasDevelopmentRepo));
      toast.success(next ? "Project knowledge enabled." : "Project knowledge disabled.");
    } catch (error) {
      setEnabled(previous);
      toast.error(error?.message || error?.error || "Could not update project knowledge settings.");
    } finally {
      setSaving(false);
    }
  };

  const onRefresh = async () => {
    if (!enabled || !hasDevelopmentRepo || busy) return;
    setRefreshing(true);
    try {
      const data = await refreshProjectMemory(projectId);
      const k = data?.knowledge;
      if (data?.knowledgeRefresh) {
        setKnowledgeRefresh(data.knowledgeRefresh);
      }
      if (k?.enqueued) {
        toast.success("Knowledge refresh queued. A Cursor agent will run on the development repo.");
        void load({ silent: true });
      } else {
        const reason = k?.reason || "unknown";
        const messages = {
          disabled: "Enable project knowledge first.",
          no_dev_repo: "Configure a development repository first.",
          already_queued: "A knowledge refresh is already queued.",
          platform_disabled: "Project memory is disabled on the platform.",
          not_found: "Project not found.",
        };
        toast.error(messages[reason] || `Could not queue refresh (${reason}).`);
        void load({ silent: true });
      }
    } catch (error) {
      toast.error(error?.message || error?.error || "Could not refresh project knowledge.");
    } finally {
      setRefreshing(false);
    }
  };

  const canEnable = hasDevelopmentRepo;
  const canRefresh = enabled && hasDevelopmentRepo && !busy && !saving;
  const statusLabel = refreshStatusLabel(knowledgeRefresh);
  const lastUpdatedAt = formatAgentCreatedAt(knowledgeRefresh?.lastUpdatedAt);
  const lastRefreshedAt = formatAgentCreatedAt(knowledgeRefresh?.lastRefreshedAt);
  const lastUpdatedLabel = lastUpdatedAt?.compact ?? null;
  const lastRefreshedLabel = lastRefreshedAt?.compact ?? null;
  const showLastRefreshed =
    lastRefreshedLabel &&
    knowledgeRefresh?.lastRefreshedAt &&
    knowledgeRefresh?.lastRefreshedAt !== knowledgeRefresh?.lastUpdatedAt;
  const lastCost =
    knowledgeRefresh?.lastCostUsd != null && Number(knowledgeRefresh.lastCostUsd) > 0
      ? formatUsd(knowledgeRefresh.lastCostUsd)
      : null;
  const failedReason =
    String(knowledgeRefresh?.status ?? "")
      .trim()
      .toLowerCase() === "failed"
      ? knowledgeRefresh?.reason
      : null;

  const delivery = lensTexts(knowledge?.delivery);
  const conventions = lensTexts(knowledge?.conventions);
  const architecture = lensTexts(knowledge?.architecture);
  const knowledgeHasContent = hasKnowledgeContent(knowledge);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project knowledge</CardTitle>
        <CardDescription>
          Cursor agent distills living knowledge and product IA from this project&apos;s{" "}
          <strong className="font-medium text-foreground">development repositories</strong>. Result
          is stored for injected{" "}
          <code className="text-xs">launchpad-project-memory/project-knowledge/SKILL.md</code> on
          agent runs.
          {!hasDevelopmentRepo && !loading
            ? " Configure a development repository to enable this."
            : null}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div
            className="space-y-3"
            role="status"
            aria-busy="true"
            aria-label="Loading project knowledge settings"
          >
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-9 w-32" />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label htmlFor="project-memory-knowledge-enabled">Enable project knowledge</Label>
                <p className="text-xs text-muted-foreground">
                  Nightly jobs and manual refresh only run when enabled and a development repo is
                  linked.
                </p>
              </div>
              {canEnable ? (
                <Switch
                  id="project-memory-knowledge-enabled"
                  checked={enabled}
                  disabled={saving || busy}
                  onCheckedChange={(v) => void onToggle(Boolean(v))}
                />
              ) : (
                <Tooltip delayDuration={200}>
                  <TooltipTrigger asChild>
                    <span className="inline-flex">
                      <Switch id="project-memory-knowledge-enabled" checked={false} disabled />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs">
                    Configure a development repository on this project first.
                  </TooltipContent>
                </Tooltip>
              )}
            </div>

            {(statusLabel || lastUpdatedLabel || lastCost || failedReason) && (
              <div className="space-y-1 text-xs text-muted-foreground">
                {statusLabel ? (
                  <p className="flex items-center gap-1.5 text-foreground">
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                    {statusLabel}
                  </p>
                ) : null}
                {failedReason ? (
                  <p className="text-destructive">
                    Last refresh failed
                    {failedReason !== "agent_failed" ? ` (${failedReason.replace(/_/g, " ")})` : ""}
                    .
                  </p>
                ) : null}
                {lastUpdatedLabel ? <p>Last updated {lastUpdatedLabel}</p> : null}
                {showLastRefreshed ? <p>Last refreshed {lastRefreshedLabel}</p> : null}
                {lastCost ? <p>Last cost {lastCost}</p> : null}
              </div>
            )}

            <div>
              {canRefresh ? (
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={() => void onRefresh()}
                >
                  <RefreshCw className="size-4" aria-hidden />
                  Refresh now
                </Button>
              ) : (
                <Tooltip delayDuration={200}>
                  <TooltipTrigger asChild>
                    <span className="inline-block">
                      <Button type="button" variant="outline" className="gap-2" disabled>
                        {busy ? (
                          <Loader2 className="size-4 animate-spin" aria-hidden />
                        ) : (
                          <RefreshCw className="size-4" aria-hidden />
                        )}
                        Refresh now
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs">
                    {!hasDevelopmentRepo
                      ? "Configure a development repository first."
                      : !enabled
                        ? "Enable project knowledge first."
                        : busy
                          ? "Refresh in progress."
                          : "Refresh unavailable."}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>

            <Collapsible open={showKnowledge} onOpenChange={setShowKnowledge}>
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className="flex h-auto w-full items-center justify-between rounded-lg border border-border/60 px-3 py-2.5 text-sm font-medium hover:bg-muted/50"
                >
                  <span>{showKnowledge ? "Hide knowledge" : "Show knowledge"}</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                      showKnowledge && "rotate-180",
                    )}
                    aria-hidden
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-3">
                {!enabled ? (
                  <p className="text-xs text-muted-foreground">Enable project knowledge first.</p>
                ) : !knowledgeHasContent ? (
                  <p className="text-xs text-muted-foreground">
                    No knowledge distilled yet. Use Refresh now.
                  </p>
                ) : (
                  <div className="max-h-96 space-y-4 overflow-y-auto rounded-lg border border-border/60 bg-muted/20 p-3">
                    <KnowledgeLensSection title="Feature list so far" items={delivery} />
                    <KnowledgeLensSection title="Coding conventions" items={conventions} />
                    <KnowledgeLensSection title="Architecture map" items={architecture} />
                    <KnowledgeIaSection ia={knowledge?.informationArchitecture} />
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          </>
        )}
      </CardContent>
    </Card>
  );
}
