import React, { useCallback, useEffect, useState } from "react";
import {
  fetchProjectQaReportDetail,
  fetchProjectQaReports,
  moveQaReportToFeedbackFix,
} from "@/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ImagePreviewDialog } from "@/components/images/ImagePreviewDialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  ExternalLink,
  Film,
  FolderKanban,
  Globe,
  ImageIcon,
  ImageOff,
  Inbox,
  Layers,
  Loader2,
  MessageSquare,
  Tag,
} from "lucide-react";
import { toast } from "sonner";
import { logger } from "@/utils/logger";
import { cn } from "@/lib/utils";

function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const date = d.toLocaleString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const time = d.toLocaleString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${date}, ${time}`;
}

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

function MetaItem({ icon: Icon, label, value, mono }) {
  if (!value) return null;
  return (
    <div className="flex min-w-0 items-start gap-1.5 text-xs">
      {Icon ? <Icon className="mt-0.5 size-3 shrink-0 text-muted-foreground" aria-hidden /> : null}
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

function ExpandableText({ label, text, maxLines = 2 }) {
  const [open, setOpen] = useState(false);
  if (!text) return null;
  const long = text.length > 120 || text.split("\n").length > maxLines;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          {long ? (
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 gap-0.5 px-1.5 text-[11px] text-muted-foreground"
              >
                {open ? "Less" : "More"}
                <ChevronDown className={cn("size-3 transition-transform", open && "rotate-180")} />
              </Button>
            </CollapsibleTrigger>
          ) : null}
        </div>
        <p
          className={cn(
            "mt-1 text-sm leading-relaxed text-foreground/90",
            !open && long && "line-clamp-2",
            "whitespace-pre-wrap",
          )}
        >
          {text}
        </p>
        {long ? (
          <CollapsibleContent>
            <p className="mt-2 border-t border-border/50 pt-2 text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
              {text}
            </p>
          </CollapsibleContent>
        ) : null}
      </div>
    </Collapsible>
  );
}

function ScreenshotThumb({ artifact, screenshotUrl, onPreview }) {
  const [status, setStatus] = useState("loading");
  const fileName = artifact.fileName || artifact.name || artifact.relativePath || "Screenshot";
  if (status === "error") {
    return (
      <span className="flex size-20 flex-col items-center justify-center gap-1 rounded-md border border-border bg-muted/30 px-1 text-center text-[10px] text-muted-foreground">
        <ImageOff className="size-4" aria-hidden />
        <span className="max-w-full truncate">{fileName}</span>
        <span>PNG</span>
      </span>
    );
  }
  return (
    <button
      type="button"
      aria-label={`Preview ${fileName}`}
      onClick={() => onPreview?.({ url: screenshotUrl, fileName })}
      className="group relative block size-20 overflow-hidden rounded-md border border-border bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <img
        src={screenshotUrl}
        alt="Screenshot"
        className="size-full object-cover transition-opacity group-hover:opacity-90"
        onLoad={() => setStatus("loaded")}
        onError={() => setStatus("error")}
      />
      {status === "loading" ? (
        <span className="absolute inset-0 animate-pulse bg-muted" aria-hidden />
      ) : null}
      <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-0.5 bg-black/55 py-0.5 text-[10px] text-white">
        <ImageIcon className="size-2.5" />
        PNG
      </span>
    </button>
  );
}

function ArtifactStrip({ artifact, onPreview }) {
  const screenshotUrl =
    artifact.screenshotUrl || (artifact.kind === "screenshot" ? artifact.url : null);
  const videoUrl = artifact.videoUrl || (artifact.kind === "video" ? artifact.url : null);
  const traceUrl = artifact.traceUrl || (artifact.kind === "trace" ? artifact.url : null);

  if (!screenshotUrl && !videoUrl && !traceUrl) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {screenshotUrl ? (
        <ScreenshotThumb artifact={artifact} screenshotUrl={screenshotUrl} onPreview={onPreview} />
      ) : null}
      {videoUrl ? (
        <a
          href={videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex size-20 flex-col items-center justify-center gap-1 rounded-md border border-border bg-muted/30 text-[10px] text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
        >
          <Film className="size-4" />
          Video
        </a>
      ) : null}
      {traceUrl ? (
        <Button
          variant="outline"
          size="sm"
          className="h-20 w-20 flex-col gap-1 px-1 text-[10px]"
          asChild
        >
          <a href={traceUrl} download target="_blank" rel="noopener noreferrer">
            <Layers className="size-4" />
            Trace
          </a>
        </Button>
      ) : null}
    </div>
  );
}

function FailureRow({ failure, index, defaultOpen, onMoveToFeedback, moveBusy, onPreview }) {
  const [open, setOpen] = useState(defaultOpen);
  const title = failure.title || failure.label || `Failure ${index + 1}`;
  const path = failure.specFile || failure.folder;
  const hasMedia = failure.screenshotUrl || failure.videoUrl || failure.traceUrl;
  const errorText = String(failure.error || "").trim();
  const stackText = String(failure.stack || "").trim();
  const showStack = Boolean(stackText && stackText !== errorText);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div
        className={cn(
          "rounded-lg border transition-colors duration-200",
          open ? "border-destructive/25 bg-destructive/[0.03]" : "border-border/70 bg-background",
        )}
      >
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full cursor-pointer items-start gap-2 px-3 py-2.5 text-left"
          >
            <ChevronRight
              className={cn(
                "mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform duration-200",
                open && "rotate-90",
              )}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-snug text-foreground">{title}</p>
              {path ? (
                <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                  {path}
                </p>
              ) : null}
              {!open && failure.error ? (
                <p className="mt-1 line-clamp-1 text-xs text-destructive/90">{failure.error}</p>
              ) : null}
            </div>
            {hasMedia ? (
              <Badge variant="outline" className="shrink-0 text-[10px] font-normal">
                Media
              </Badge>
            ) : null}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-2 border-t border-border/60 px-3 py-2.5">
            {errorText ? (
              <pre className="max-h-36 overflow-auto rounded-md bg-destructive/5 px-2.5 py-2 text-xs leading-relaxed whitespace-pre-wrap text-destructive">
                {errorText}
              </pre>
            ) : null}
            {showStack ? (
              <pre className="max-h-32 overflow-auto rounded-md bg-muted/50 px-2.5 py-2 font-mono text-[10px] leading-relaxed text-muted-foreground">
                {stackText}
              </pre>
            ) : null}
            {hasMedia ? <ArtifactStrip artifact={failure} onPreview={onPreview} /> : null}
            {onMoveToFeedback ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="mt-2 gap-1.5 rounded-lg"
                disabled={moveBusy}
                onClick={() => onMoveToFeedback(index)}
              >
                {moveBusy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
                Move to Feedback Fix
              </Button>
            ) : null}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function latestRecordedAt(items) {
  return items.reduce((latest, item) => {
    const ts = item.recordedAt ? new Date(item.recordedAt).getTime() : 0;
    return ts > latest ? ts : latest;
  }, 0);
}

function groupReportsByTopicAndChat(items) {
  const topicMap = new Map();

  for (const item of items) {
    const topicKey = String(item.topicId ?? item.topicName ?? "unknown-topic");
    const chatKey = String(item.chatId ?? item.chatTitle ?? "unknown-chat");

    if (!topicMap.has(topicKey)) {
      topicMap.set(topicKey, {
        topicId: item.topicId ?? null,
        topicName: item.topicName || "Untitled topic",
        chats: new Map(),
        items: [],
      });
    }

    const topic = topicMap.get(topicKey);
    topic.items.push(item);

    if (!topic.chats.has(chatKey)) {
      topic.chats.set(chatKey, {
        chatId: item.chatId ?? null,
        chatTitle: item.chatTitle || "Untitled chat",
        items: [],
      });
    }

    topic.chats.get(chatKey).items.push(item);
  }

  return [...topicMap.values()]
    .map((topic) => ({
      ...topic,
      chats: [...topic.chats.values()].sort(
        (a, b) => latestRecordedAt(b.items) - latestRecordedAt(a.items),
      ),
    }))
    .sort((a, b) => latestRecordedAt(b.items) - latestRecordedAt(a.items));
}

function ReportListRow({ item, onSelect, nested = false }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(item.messageId)}
      className={cn(
        "group flex w-full cursor-pointer items-center gap-3 rounded-lg border text-left transition-all duration-200",
        nested
          ? "border-border/50 bg-muted/10 px-3 py-2 hover:border-primary/25 hover:bg-muted/25"
          : "border-border/70 bg-background px-3 py-2.5 hover:border-primary/30 hover:bg-muted/30",
      )}
    >
      <span className="flex size-2 shrink-0 rounded-full bg-destructive" aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="text-xs font-semibold tabular-nums text-destructive">
            {item.failed ?? 0} failed
          </span>
          {item.totalTests != null ? (
            <span className="text-[11px] text-muted-foreground">
              {item.passed ?? 0}/{item.totalTests} passed
            </span>
          ) : null}
          {item.executionTime ? (
            <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground">
              <Clock className="size-2.5" />
              {item.executionTime}
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 truncate text-sm font-medium text-foreground">
          {item.userPromptPreview || "Test run"}
        </p>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
          {[formatDateTime(item.recordedAt), item.selectedEnvironment].filter(Boolean).join(" · ")}
        </p>
      </div>
      <ChevronRight
        className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
        aria-hidden
      />
    </button>
  );
}

function ChatReportsGroup({ chat, onSelect, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  const failedCount = chat.items.reduce((sum, item) => sum + (item.failed ?? 0), 0);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-lg border border-border/60 bg-background/80">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-muted/20"
          >
            <ChevronRight
              className={cn(
                "size-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
                open && "rotate-90",
              )}
              aria-hidden
            />
            <MessageSquare className="size-3.5 shrink-0 text-primary/70" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{chat.chatTitle}</p>
              <p className="text-[11px] text-muted-foreground">
                {chat.items.length} run{chat.items.length === 1 ? "" : "s"} · {failedCount} failure
                {failedCount === 1 ? "" : "s"}
              </p>
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-1.5 border-t border-border/50 px-2.5 py-2.5">
            {chat.items.map((item) => (
              <ReportListRow key={item.messageId} item={item} onSelect={onSelect} nested />
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function TopicReportsGroup({ topic, onSelect, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const runCount = topic.items.length;
  const failedCount = topic.items.reduce((sum, item) => sum + (item.failed ?? 0), 0);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="overflow-hidden rounded-xl border border-border/70 bg-muted/10">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex w-full cursor-pointer items-center gap-3 border-b px-4 py-3 text-left transition-colors hover:bg-muted/25",
              open ? "border-border/50" : "border-transparent",
            )}
          >
            <ChevronRight
              className={cn(
                "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
                open && "rotate-90",
              )}
              aria-hidden
            />
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-primary/15 bg-primary/5 text-primary">
              <Tag className="size-4" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">{topic.topicName}</p>
              <p className="text-xs text-muted-foreground">
                {topic.chats.length} chat{topic.chats.length === 1 ? "" : "s"} · {runCount} failed
                run{runCount === 1 ? "" : "s"} · {failedCount} failure{failedCount === 1 ? "" : "s"}
              </p>
            </div>
            <Badge
              variant="outline"
              className="shrink-0 border-destructive/20 bg-destructive/5 text-[10px] font-medium text-destructive"
            >
              {runCount}
            </Badge>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-2 px-3 py-3">
            {topic.chats.map((chat, index) => (
              <ChatReportsGroup
                key={chat.chatId ?? chat.chatTitle ?? index}
                chat={chat}
                onSelect={onSelect}
                defaultOpen={topic.chats.length === 1 || index === 0}
              />
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export function ProjectQaReportsPanel({ projectId, embedded = false, onNavigateToFeedback }) {
  const resolvedProjectId = projectId ? String(projectId) : "";
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [moveBusyIndex, setMoveBusyIndex] = useState(null);
  const [moveAllBusy, setMoveAllBusy] = useState(false);

  const loadItems = useCallback(async (pid) => {
    if (!pid) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchProjectQaReports(pid, { page: 1, pageSize: 100 });
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (err) {
      logger.error("qa_reports_list", err);
      toast.error(err?.error || "Failed to load Playwright run reports");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadItems(resolvedProjectId);
  }, [resolvedProjectId, loadItems]);

  useEffect(() => {
    if (!resolvedProjectId || !selectedMessageId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setDetailLoading(true);
      try {
        const data = await fetchProjectQaReportDetail(resolvedProjectId, selectedMessageId);
        if (!cancelled) setDetail(data);
      } catch (err) {
        if (!cancelled) {
          logger.error("qa_reports_detail", err);
          toast.error(err?.error || "Failed to load report details");
          setSelectedMessageId(null);
        }
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [resolvedProjectId, selectedMessageId]);

  const handleMoveToFeedback = useCallback(
    async (failureIndex) => {
      if (!resolvedProjectId || !selectedMessageId) return;
      if (failureIndex !== undefined) {
        setMoveBusyIndex(failureIndex);
      } else {
        setMoveAllBusy(true);
      }
      try {
        const result = await moveQaReportToFeedbackFix(
          resolvedProjectId,
          selectedMessageId,
          failureIndex !== undefined ? { failureIndex } : {},
        );
        toast.success(result.created ? "Moved to Feedback queue" : "Already in Feedback queue");
        onNavigateToFeedback?.();
      } catch (err) {
        logger.error("qa_report_move_to_feedback", err);
        toast.error(err?.error || "Failed to move to feedback");
      } finally {
        setMoveBusyIndex(null);
        setMoveAllBusy(false);
      }
    },
    [resolvedProjectId, selectedMessageId, onNavigateToFeedback],
  );

  const failures = Array.isArray(detail?.failures) ? detail.failures : [];
  const failuresHaveMedia = failures.some((f) => f.screenshotUrl || f.videoUrl || f.traceUrl);
  const testResultArtifacts = Array.isArray(detail?.testResultArtifacts)
    ? detail.testResultArtifacts
    : [];

  const groupedItems = groupReportsByTopicAndChat(items);

  const reportListContent = loading ? (
    <div className="space-y-3" role="status" aria-busy="true" aria-label="Loading failed runs">
      {[1, 2].map((i) => (
        <div key={i} className="space-y-2 rounded-xl border border-border/60 p-3">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
      ))}
    </div>
  ) : items.length === 0 ? (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 px-6 py-14 text-center">
      <Inbox className="mb-2 size-8 text-muted-foreground/50" aria-hidden />
      <p className="text-sm font-medium text-foreground">No failed runs</p>
      <p className="mt-1 max-w-xs text-xs text-muted-foreground">
        Failed QA Automation test runs will appear here with failure details.
      </p>
    </div>
  ) : (
    <div className="space-y-3">
      {groupedItems.map((topic, index) => (
        <TopicReportsGroup
          key={topic.topicId ?? topic.topicName ?? index}
          topic={topic}
          onSelect={setSelectedMessageId}
          defaultOpen={index === 0 || groupedItems.length === 1}
        />
      ))}
    </div>
  );

  const qaSummarySidebar = embedded ? (
    <aside className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-4 xl:sticky xl:top-4 xl:self-start">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Summary
      </p>
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground">Failed runs</span>
          <span className="font-semibold tabular-nums">{items.length}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground">Modules</span>
          <span className="font-semibold tabular-nums">{groupedItems.length}</span>
        </div>
      </div>
      {onNavigateToFeedback ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={onNavigateToFeedback}
        >
          Open Feedbacks
        </Button>
      ) : null}
    </aside>
  ) : null;

  const contextItems = detail?.context
    ? [
        detail.context.selectedEnvironment && {
          label: "Env",
          value: detail.context.selectedEnvironment,
        },
        detail.context.selectedBranch && {
          label: "Branch",
          value: detail.context.selectedBranch,
        },
        detail.context.baseUrl && {
          label: "URL",
          value: detail.context.baseUrl,
          mono: true,
        },
        Array.isArray(detail.context.generatedSpecPaths) &&
          detail.context.generatedSpecPaths.length > 0 && {
            label: "Specs",
            value: detail.context.generatedSpecPaths.join(", "),
            mono: true,
          },
      ].filter(Boolean)
    : [];

  return (
    <>
      <section className={cn(embedded ? "" : "mx-auto max-w-6xl px-4 py-6")}>
        <div className="mb-3">
          <h2 className="text-base font-semibold tracking-tight text-foreground">
            Failed Playwright runs
          </h2>
          <p className="text-xs text-muted-foreground">Screenshots, traces, and HTML reports.</p>
        </div>

        {embedded ? (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(280px,20rem)_minmax(0,1fr)] xl:items-start">
            {qaSummarySidebar}
            <div className="min-w-0">{reportListContent}</div>
          </div>
        ) : (
          reportListContent
        )}
      </section>

      <Dialog
        open={Boolean(selectedMessageId)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedMessageId(null);
            setContextOpen(false);
          }
        }}
      >
        <DialogContent className="flex max-h-[90vh] w-[calc(100%-2rem)] max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl">
          <DialogHeader className="shrink-0 space-y-0 border-b border-border/60 px-4 py-3 pr-12">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
              <DialogTitle className="text-base font-semibold leading-tight">
                Failed test run
              </DialogTitle>
              <span className="text-muted-foreground/50" aria-hidden>
                ·
              </span>
              <DialogDescription className="text-xs">
                {detail?.recordedAt
                  ? formatDateTime(detail.recordedAt)
                  : detailLoading
                    ? null
                    : "—"}
              </DialogDescription>
            </div>
            {detail && !detailLoading ? (
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                {detail.totalTests != null ? (
                  <StatChip label="Total" value={detail.totalTests} tone="muted" />
                ) : null}
                <StatChip label="Failed" value={detail.failed ?? 0} tone="danger" />
                {detail.passed != null ? (
                  <StatChip label="Passed" value={detail.passed} tone="success" />
                ) : null}
                {detail.executionTime || detail.reportUrl ? (
                  <div className="inline-flex items-center gap-1.5">
                    {detail.executionTime ? (
                      <StatChip label="Total run time:" value={detail.executionTime} tone="muted" />
                    ) : null}
                    {detail.reportUrl ? (
                      <Button
                        variant="default"
                        size="sm"
                        className={cn(
                          "h-7 shrink-0 gap-1 rounded-lg px-2.5 text-xs font-medium",
                          "bg-primary text-primary-foreground shadow-sm",
                          "transition-colors hover:bg-primary/90",
                        )}
                        asChild
                      >
                        <a href={detail.reportUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="size-3" />
                          View Report
                        </a>
                      </Button>
                    ) : null}
                    {failures.length > 0 ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="h-7 shrink-0 gap-1 rounded-lg px-2.5 text-xs"
                        disabled={moveAllBusy || moveBusyIndex !== null}
                        onClick={() => void handleMoveToFeedback()}
                      >
                        {moveAllBusy ? (
                          <Loader2 className="size-3 animate-spin" aria-hidden />
                        ) : null}
                        Move to Feedback Fix
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
            {detailLoading ? (
              <div
                className="space-y-2"
                role="status"
                aria-busy="true"
                aria-label="Loading run details"
              >
                <Skeleton className="h-14 w-full rounded-lg" />
                <Skeleton className="h-20 w-full rounded-lg" />
                <Skeleton className="h-24 w-full rounded-lg" />
              </div>
            ) : detail ? (
              <div className="space-y-3">
                <ExpandableText label="User prompt" text={detail.context?.userPrompt} />
                {detail.context?.aiSummary ? (
                  <p className="rounded-lg border border-border/60 bg-muted/15 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                    <span className="font-medium text-foreground/80">Summary · </span>
                    {detail.context.aiSummary}
                  </p>
                ) : null}

                {contextItems.length > 0 ? (
                  <Collapsible open={contextOpen} onOpenChange={setContextOpen}>
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-full justify-between gap-2 px-2 text-xs text-muted-foreground"
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <Globe className="size-3.5" />
                          Run context
                        </span>
                        <ChevronDown
                          className={cn(
                            "size-3.5 transition-transform",
                            contextOpen && "rotate-180",
                          )}
                        />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="mt-1 space-y-1.5 rounded-lg border border-border/50 bg-muted/10 px-3 py-2">
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
                  {failures.length > 0 ? (
                    <div className="space-y-1.5">
                      {failures.map((failure, i) => (
                        <FailureRow
                          key={`${failure.title}-${i}`}
                          failure={failure}
                          index={i}
                          defaultOpen={failures.length === 1}
                          onMoveToFeedback={handleMoveToFeedback}
                          moveBusy={moveBusyIndex === i || moveAllBusy}
                          onPreview={setSelectedImage}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No failure details recorded.</p>
                  )}
                </div>

                {!failuresHaveMedia && testResultArtifacts.length > 0 ? (
                  <div>
                    <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Artifacts
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {testResultArtifacts.map((artifact) => (
                        <ArtifactStrip
                          key={artifact.relativePath}
                          artifact={artifact}
                          onPreview={setSelectedImage}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <ImagePreviewDialog
        open={Boolean(selectedImage)}
        onOpenChange={(open) => {
          if (!open) setSelectedImage(null);
        }}
        src={selectedImage?.url}
        fileName={selectedImage?.fileName}
        alt={selectedImage?.fileName || "Screenshot"}
      />
    </>
  );
}
