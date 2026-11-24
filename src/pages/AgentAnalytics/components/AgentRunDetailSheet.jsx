import { useEffect, useMemo, useState } from "react";
import { Square } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { agentProviderForAgentId, agentProviderLabel } from "@/constants/agentProvider";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AgentRunDetailActivity } from "./AgentRunDetailActivity";
import { fetchProjectAgentAnalyticsRunDetail } from "@/api";
import { useAgentRunDetailStream } from "../hooks/useAgentRunDetailStream";
import {
  formatModelSelectReason,
  getCursorModelLabel,
  isAgentRunActive,
  mergeAgentAnalyticsRun,
} from "../agentAnalyticsDisplay";

/**
 * Side drawer for a single agent run (project analytics tab).
 * @param {object} props
 * @param {string|null} props.selectedAgentId
 * @param {object|null} props.selectedRun
 * @param {number|null|undefined} props.projectId
 * @param {(agentId: string) => object} [props.getRunStream]
 * @param {(run: object, opts?: { clearFollowups?: boolean }) => void} [props.onStop]
 * @param {boolean} [props.stopping]
 * @param {() => void} props.onClose
 */
export function AgentRunDetailSheet({
  selectedAgentId,
  selectedRun,
  projectId,
  getRunStream,
  onStop,
  stopping = false,
  onClose,
}) {
  const resolvedProjectId = projectId ?? selectedRun?.projectId ?? null;
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(() =>
    Boolean(selectedAgentId && (projectId ?? selectedRun?.projectId)),
  );

  useEffect(() => {
    const id = selectedAgentId;
    if (!id || !resolvedProjectId) {
      setDetail(null);
      setDetailLoading(false);
      return undefined;
    }
    let cancelled = false;
    setDetailLoading(true);
    setDetail(null);
    void fetchProjectAgentAnalyticsRunDetail(resolvedProjectId, id)
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch(() => {
        if (!cancelled) setDetail(null);
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedAgentId, resolvedProjectId]);

  const drawerStream = useAgentRunDetailStream(resolvedProjectId, selectedAgentId, {
    enabled: Boolean(selectedAgentId && resolvedProjectId),
  });

  const selectedStream = useMemo(() => {
    const fromProject =
      selectedAgentId && typeof getRunStream === "function"
        ? getRunStream(selectedAgentId)
        : { streamText: "", streamPhase: "", streamTimeline: [] };
    const fromDrawer = {
      streamText: drawerStream.streamText,
      streamPhase: drawerStream.streamPhase,
      streamTimeline: drawerStream.streamTimeline,
    };
    return mergeAgentAnalyticsRun(fromProject, fromDrawer) ?? fromDrawer;
  }, [drawerStream, getRunStream, selectedAgentId]);

  /** Model + router reason for the drawer title area. */
  const modelId =
    (typeof detail?.agent?.model === "string" && detail.agent.model.trim()) ||
    (typeof detail?.run?.model === "string" && detail.run.model.trim()) ||
    (typeof detail?.usage?.model === "string" && detail.usage.model.trim()) ||
    (typeof selectedRun?.model === "string" && selectedRun.model.trim()) ||
    null;
  const modelLabel = getCursorModelLabel(modelId || "Auto");
  const selectReasonRaw =
    (typeof detail?.modelSelectReason === "string" && detail.modelSelectReason.trim()) ||
    (typeof detail?.run?.modelSelectReason === "string" && detail.run.modelSelectReason.trim()) ||
    (typeof selectedRun?.modelSelectReason === "string" && selectedRun.modelSelectReason.trim()) ||
    "";
  const selectReason = formatModelSelectReason(selectReasonRaw);
  const followupQueueDepth = Math.max(
    0,
    Number(detail?.followupQueueDepth ?? selectedRun?.followupQueueDepth ?? 0) || 0,
  );
  /** Backend run status already folds in fresh Cursor status while the registry is active. */
  const runForActive = useMemo(() => {
    if (!selectedRun && !detail?.agent && !detail?.run) return selectedRun;
    const cursorStatus =
      (typeof detail?.run?.agentStatus === "string" && detail.run.agentStatus.trim()) ||
      (typeof detail?.run?.statusHint === "string" && detail.run.statusHint.trim()) ||
      (typeof detail?.agent?.status === "string" && detail.agent.status.trim()) ||
      "";
    const summary =
      (typeof detail?.agent?.summary === "string" && detail.agent.summary.trim()) ||
      (typeof selectedRun?.summary === "string" && selectedRun.summary.trim()) ||
      (typeof selectedRun?.pipelineDetail === "string" && selectedRun.pipelineDetail.trim()) ||
      "";
    if (!cursorStatus && !summary) return selectedRun;
    return {
      ...(selectedRun ?? {}),
      ...(cursorStatus
        ? {
            agentStatus: cursorStatus,
            statusHint: selectedRun?.statusHint ?? cursorStatus,
          }
        : {}),
      ...(summary ? { summary, pipelineDetail: summary } : {}),
      followupQueueDepth,
      finishedAt: selectedRun?.finishedAt ?? detail?.run?.finishedAt ?? null,
      updatedAt: selectedRun?.updatedAt ?? detail?.run?.updatedAt ?? null,
      source: selectedRun?.source ?? detail?.run?.source ?? null,
    };
  }, [selectedRun, detail, followupQueueDepth]);
  const isActive = isAgentRunActive(runForActive);
  const canStopAgent = Boolean(selectedAgentId) && typeof onStop === "function" && isActive;
  const canStopQueue =
    Boolean(selectedAgentId) &&
    typeof onStop === "function" &&
    (isActive || followupQueueDepth > 0);

  return (
    <Sheet open={Boolean(selectedAgentId)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
      >
        <SheetHeader className="shrink-0 border-b border-border px-6 py-4">
          <div className="flex items-start justify-between gap-3 pr-8">
            <div className="min-w-0 space-y-1">
              <SheetTitle>{selectedRun?.label || "Agent run"}</SheetTitle>
              <SheetDescription className="font-mono text-xs">{selectedAgentId}</SheetDescription>
              <p className="text-xs text-muted-foreground">
                {agentProviderLabel(agentProviderForAgentId(selectedAgentId))} · Model: {modelLabel}
                {selectReason ? ` — ${selectReason}` : ""}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <Badge variant="outline" className="tabular-nums">
                {followupQueueDepth} queued follow-up{followupQueueDepth === 1 ? "" : "s"}
              </Badge>
              {canStopAgent ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  disabled={stopping}
                  onClick={() =>
                    onStop({
                      ...(selectedRun ?? {}),
                      cursorAgentId: selectedAgentId,
                      followupQueueDepth,
                    })
                  }
                >
                  <Square className="size-3.5 fill-current" aria-hidden />
                  {stopping ? "Stopping…" : "Stop agent"}
                </Button>
              ) : null}
              {canStopQueue ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  disabled={stopping}
                  onClick={() =>
                    onStop(
                      {
                        ...(selectedRun ?? {}),
                        cursorAgentId: selectedAgentId,
                        followupQueueDepth,
                      },
                      { clearFollowups: true },
                    )
                  }
                >
                  <Square className="size-3.5 fill-current" aria-hidden />
                  {stopping ? "Stopping…" : "Stop & clear queue"}
                </Button>
              ) : null}
            </div>
          </div>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <AgentRunDetailActivity
            selectedRun={runForActive ?? selectedRun}
            detail={detail}
            selectedStream={selectedStream}
            detailLoading={detailLoading}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
