import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Film,
  Globe,
  ImageIcon,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

function StatChip({ label, value, tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium tabular-nums",
        tone === "danger" && "bg-destructive/10 text-destructive",
        tone === "success" && "bg-emerald-500/10 text-emerald-700",
        tone === "muted" && "bg-muted text-muted-foreground",
        !tone && "bg-muted/60 text-foreground",
      )}
    >
      <span className="font-normal opacity-70">{label}</span>
      {value}
    </span>
  );
}

function MetaItem({ label, value, mono }) {
  if (!value) return null;
  return (
    <div className="flex min-w-0 items-start gap-1.5 text-xs">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span
        className={cn("min-w-0 truncate text-foreground", mono && "font-mono text-[11px]")}
        title={typeof value === "string" ? value : undefined}
      >
        {value}
      </span>
    </div>
  );
}

function ArtifactStrip({ artifact }) {
  const screenshotUrl =
    artifact.screenshotUrl || (artifact.kind === "screenshot" ? artifact.url : null);
  const videoUrl = artifact.videoUrl || (artifact.kind === "video" ? artifact.url : null);
  const traceUrl = artifact.traceUrl || (artifact.kind === "trace" ? artifact.url : null);
  if (!screenshotUrl && !videoUrl && !traceUrl) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {screenshotUrl ? (
        <a
          href={screenshotUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative block size-20 overflow-hidden rounded-md border border-border bg-muted/30"
        >
          <img src={screenshotUrl} alt="Screenshot" className="size-full object-cover" />
        </a>
      ) : null}
      {videoUrl ? (
        <a
          href={videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex size-20 flex-col items-center justify-center gap-1 rounded-md border border-border bg-muted/30 text-[10px]"
        >
          <Film className="size-4" />
          Video
        </a>
      ) : null}
      {traceUrl ? (
        <a
          href={traceUrl}
          download
          target="_blank"
          rel="noopener noreferrer"
          className="flex size-20 flex-col items-center justify-center gap-1 rounded-md border border-border bg-muted/30 text-[10px]"
        >
          <Layers className="size-4" />
          Trace
        </a>
      ) : null}
    </div>
  );
}

function FailureRow({ failure, index, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  const title = failure.title || failure.label || `Failure ${index + 1}`;
  const path = failure.specFile || failure.folder;
  const hasMedia = failure.screenshotUrl || failure.videoUrl || failure.traceUrl;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-lg border border-border/70 bg-background">
        <CollapsibleTrigger asChild>
          <button type="button" className="flex w-full items-start gap-2 px-3 py-2.5 text-left">
            <ChevronRight className={cn("mt-0.5 size-4 shrink-0", open && "rotate-90")} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{title}</p>
              {path ? (
                <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                  {path}
                </p>
              ) : null}
            </div>
            {hasMedia ? (
              <Badge variant="outline" className="shrink-0 text-[10px]">
                Media
              </Badge>
            ) : null}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-2 border-t border-border/60 px-3 py-2.5">
            {failure.error ? (
              <pre className="max-h-36 overflow-auto rounded-md bg-destructive/5 px-2.5 py-2 text-xs text-destructive whitespace-pre-wrap">
                {failure.error}
              </pre>
            ) : null}
            {hasMedia ? <ArtifactStrip artifact={failure} /> : null}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export function QaReportSnapshotPanel({ snapshot }) {
  const [contextOpen, setContextOpen] = useState(false);
  if (!snapshot || typeof snapshot !== "object") return null;

  const failures = Array.isArray(snapshot.failures) ? snapshot.failures : [];
  const context = snapshot.context && typeof snapshot.context === "object" ? snapshot.context : {};
  const contextItems = [
    context.selectedEnvironment
      ? { label: "Environment", value: context.selectedEnvironment }
      : null,
    context.selectedBranch ? { label: "Branch", value: context.selectedBranch, mono: true } : null,
    context.baseUrl ? { label: "URL", value: context.baseUrl, mono: true } : null,
    context.chatTitle ? { label: "Chat", value: context.chatTitle } : null,
    context.topicName ? { label: "Topic", value: context.topicName } : null,
  ].filter(Boolean);

  return (
    <div className="space-y-3 rounded-xl border border-border/60 bg-muted/10 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold">QA Report</p>
        {snapshot.hasReport && snapshot.reportUrl ? (
          <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" asChild>
            <a href={snapshot.reportUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-3" />
              View Report
            </a>
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <StatChip label="Failed" value={snapshot.failed ?? "—"} tone="danger" />
        <StatChip label="Passed" value={snapshot.passed ?? "—"} tone="success" />
        <StatChip label="Total" value={snapshot.totalTests ?? "—"} tone="muted" />
      </div>

      {context.userPrompt ? (
        <p className="rounded-lg border border-border/60 bg-background px-3 py-2 text-xs leading-relaxed">
          <span className="font-medium">User prompt · </span>
          {context.userPrompt}
        </p>
      ) : null}

      {contextItems.length > 0 ? (
        <Collapsible open={contextOpen} onOpenChange={setContextOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 w-full justify-between text-xs">
              <span className="inline-flex items-center gap-1.5">
                <Globe className="size-3.5" />
                Run context
              </span>
              <ChevronDown className={cn("size-3.5", contextOpen && "rotate-180")} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-1 space-y-1.5 rounded-lg border border-border/50 bg-background px-3 py-2">
              {contextItems.map((item) => (
                <MetaItem
                  key={item.label}
                  label={`${item.label}:`}
                  value={item.value}
                  mono={item.mono}
                />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      ) : null}

      <div>
        <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          <AlertCircle className="size-3.5 text-destructive" />
          Failures ({failures.length})
        </p>
        <div className="space-y-1.5">
          {failures.map((failure, i) => (
            <FailureRow
              key={`${failure.title}-${i}`}
              failure={failure}
              index={i}
              defaultOpen={failures.length === 1}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
