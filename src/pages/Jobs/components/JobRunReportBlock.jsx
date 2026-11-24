import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FileDown, Loader2, Maximize2, Wand2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { buildProjectBackendCodePath } from "@/lib/onboardPreviewUrl";
import {
  buildSelectedFixesExcerpt,
  normalizeReportFixDecision,
  persistAutomationReportBackendFixHandoff,
  resolveAutomationReportProjectOptions,
} from "@/utils/automationReportBackendFixHandoff.util";
import { exportJobReportPdf, jobReportPdfFileName } from "../utils/jobReportExport";
import { MermaidDiagram } from "./MermaidDiagram";
import { splitJobReportMarkdown } from "../utils/mermaidChart.util";

const REPORT_MARKDOWN_MAX = 200_000;

function fixOptionsDescription(decision) {
  if (decision == null) return "Preparing fix options for this report.";
  if (decision.status === "none") return "This report does not include a code fix.";
  if (decision.status === "one") {
    return "This report includes one fix. Confirm to send it to Dev Repositories.";
  }
  if (decision.status === "many") return "Select the fixes to send to Dev Repositories.";
  return "Fix options were not prepared for this report.";
}

const REPORT_PRE_CLASS =
  "my-3 overflow-x-auto rounded-md border border-border bg-muted/30 p-3 text-xs leading-relaxed";

/** Safe fenced/inline code — no Mermaid handling (charts are split out upstream). */
function ReportMarkdownCode({ className, children, ...rest }) {
  const isBlock = typeof className === "string" && className.includes("language-");

  if (isBlock) {
    return (
      <code
        className={cn("block w-full font-mono text-[11px] text-foreground", className)}
        {...rest}
      >
        {children}
      </code>
    );
  }

  return (
    <code className="rounded bg-muted/60 px-1 py-0.5 font-mono text-[0.85em]" {...rest}>
      {children}
    </code>
  );
}

/** Shared markdown renderers for inline and fullscreen report views. */
const reportMarkdownComponents = {
  h1: ({ children }) => <h1 className="mb-2 text-base font-semibold">{children}</h1>,
  h2: ({ children }) => <h2 className="mb-2 mt-4 text-sm font-semibold">{children}</h2>,
  h3: ({ children }) => <h3 className="mb-2 mt-3 text-sm font-medium">{children}</h3>,
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-2 list-disc pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 list-decimal pl-5">{children}</ol>,
  li: ({ children }) => <li className="mb-1">{children}</li>,
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto">
      <table className="min-w-full border-collapse text-xs">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-muted/50">{children}</thead>,
  th: ({ children }) => (
    <th className="border border-border px-2 py-1 text-left font-medium">{children}</th>
  ),
  td: ({ children }) => <td className="border border-border px-2 py-1 align-top">{children}</td>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline underline-offset-2"
    >
      {children}
    </a>
  ),
  pre: ({ children }) => <pre className={REPORT_PRE_CLASS}>{children}</pre>,
  code: ReportMarkdownCode,
};

/**
 * @param {unknown} report
 * @returns {string}
 */
function normalizeReportText(report) {
  if (report === undefined || report === null) return "";
  if (typeof report === "string") return report;
  try {
    return JSON.stringify(report, null, 2);
  } catch {
    return String(report);
  }
}

/**
 * @param {string} markdown
 * @returns {string}
 */
function reportDialogTitle(markdown) {
  const firstLine = String(markdown ?? "")
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);
  const match = firstLine?.match(/^#\s+(.+)$/);
  return match?.[1]?.trim() || "Project report";
}

function JobReportMarkdownBody({ markdown, className, contentRef, onSelectionChange }) {
  const text = String(markdown ?? "").slice(0, REPORT_MARKDOWN_MAX);
  const truncated = String(markdown ?? "").length > REPORT_MARKDOWN_MAX;
  const segments = useMemo(() => splitJobReportMarkdown(text), [text]);

  const captureSelection = () => {
    const selected = typeof window !== "undefined" ? window.getSelection()?.toString().trim() : "";
    onSelectionChange?.(selected || "");
  };

  return (
    <div
      ref={contentRef}
      className={cn(
        "rounded-md border border-border bg-background/90 p-3 text-sm leading-relaxed text-foreground",
        className,
      )}
      onMouseUp={captureSelection}
      onContextMenu={captureSelection}
    >
      {segments.map((segment, index) => {
        if (segment.type === "mermaid") {
          return <MermaidDiagram key={`mermaid-${index}`} source={segment.content} />;
        }
        if (!segment.content) return null;
        return (
          <ReactMarkdown
            key={`md-${index}`}
            remarkPlugins={[remarkGfm]}
            components={reportMarkdownComponents}
          >
            {segment.content}
          </ReactMarkdown>
        );
      })}
      {truncated ? <p className="mt-2 text-xs text-muted-foreground">… (truncated)</p> : null}
    </div>
  );
}

/**
 * On-demand AI report with fullscreen view, PDF export, mermaid, and Dev Repositories fix handoff.
 * @param {{
 *   report: unknown,
 *   reportFixDecision?: unknown,
 *   exportFileName?: string,
 *   jobName?: string,
 *   projectId?: number,
 *   repoPath?: string,
 *   branch?: string,
 *   job?: object,
 * }} props
 */
export function JobRunReportBlock({
  report,
  reportFixDecision,
  exportFileName,
  jobName,
  projectId,
  repoPath,
  branch,
  job,
}) {
  const navigate = useNavigate();
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [selectionText, setSelectionText] = useState("");
  const [projectPickerOpen, setProjectPickerOpen] = useState(false);
  const [pendingFixExcerpt, setPendingFixExcerpt] = useState("");
  const [pendingSelectedFixes, setPendingSelectedFixes] = useState(false);
  const [pickedProjectId, setPickedProjectId] = useState("");
  const [fixOptionsOpen, setFixOptionsOpen] = useState(false);
  const [selectedFixIds, setSelectedFixIds] = useState([]);
  const [confirmingFix, setConfirmingFix] = useState(false);
  const inlineContentRef = useRef(null);
  const fullscreenContentRef = useRef(null);

  const display = useMemo(() => normalizeReportText(report), [report]);
  const fixDecision = useMemo(
    () => normalizeReportFixDecision(reportFixDecision),
    [reportFixDecision],
  );
  const projectOptions = useMemo(
    () => resolveAutomationReportProjectOptions(job, projectId),
    [job, projectId],
  );
  const manyFixOptions = fixDecision?.status === "many" ? fixDecision.options : [];
  const selectedManyCount = manyFixOptions.filter((opt) => selectedFixIds.includes(opt.id)).length;
  const allManyFixesSelected =
    manyFixOptions.length > 0 && selectedManyCount === manyFixOptions.length;
  const canFixOnDevRepositories = projectOptions.length > 0;
  const hasSelection = Boolean(selectionText.trim());
  const hasReportContent = Boolean(display.trim());

  const dialogTitle = reportDialogTitle(display);
  const pdfBaseName = jobReportPdfFileName(display, exportFileName);

  useEffect(() => {
    if (!fullscreenOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [fullscreenOpen]);

  const navigateToDevRepositories = useCallback(
    (targetProjectId, excerpt, { selectedFixes = false } = {}) => {
      const path = buildProjectBackendCodePath(targetProjectId);
      if (!path) {
        toast.error("Could not open Dev Repositories for this project.");
        return;
      }
      persistAutomationReportBackendFixHandoff(targetProjectId, {
        excerpt,
        jobName,
        repoPath,
        branch,
        selectedFixes,
      });
      toast.message("Opening Dev Repositories…");
      navigate(path);
    },
    [branch, jobName, navigate, repoPath],
  );

  const startFixHandoff = useCallback(
    (excerpt, { selectedFixes = false } = {}) => {
      const trimmedExcerpt = String(excerpt ?? "").trim() || display.trim();
      if (!trimmedExcerpt) {
        toast.error("Nothing to send to Dev Repositories.");
        return;
      }
      if (projectOptions.length === 0) {
        toast.error("Link a repo target to fix on Dev Repositories.");
        return;
      }
      if (projectOptions.length === 1) {
        navigateToDevRepositories(projectOptions[0].projectId, trimmedExcerpt, { selectedFixes });
        return;
      }
      setPendingFixExcerpt(trimmedExcerpt);
      setPendingSelectedFixes(selectedFixes);
      setPickedProjectId(String(projectOptions[0].projectId));
      setProjectPickerOpen(true);
    },
    [display, navigateToDevRepositories, projectOptions],
  );

  const openFixOptions = useCallback(() => {
    if (fixDecision?.status === "many") {
      setSelectedFixIds(fixDecision.options.map((opt) => opt.id));
    } else {
      setSelectedFixIds([]);
    }
    setConfirmingFix(false);
    setFixOptionsOpen(true);
  }, [fixDecision]);

  const beginConfirmedHandoff = useCallback(
    (excerpt, options) => {
      setConfirmingFix(true);
      try {
        setFixOptionsOpen(false);
        startFixHandoff(excerpt, options);
      } finally {
        setConfirmingFix(false);
      }
    },
    [startFixHandoff],
  );

  const confirmProjectPicker = useCallback(() => {
    const pid = Number(pickedProjectId);
    if (!Number.isInteger(pid) || pid < 1) {
      toast.error("Choose a project.");
      return;
    }
    setProjectPickerOpen(false);
    navigateToDevRepositories(pid, pendingFixExcerpt, { selectedFixes: pendingSelectedFixes });
    setPendingFixExcerpt("");
    setPendingSelectedFixes(false);
  }, [navigateToDevRepositories, pendingFixExcerpt, pendingSelectedFixes, pickedProjectId]);

  const handleExportPdf = useCallback(async () => {
    const source =
      fullscreenOpen && fullscreenContentRef.current
        ? fullscreenContentRef.current
        : inlineContentRef.current;
    if (!source) {
      toast.error("Could not export this report.");
      return;
    }
    setExportingPdf(true);
    try {
      await exportJobReportPdf(source, pdfBaseName);
      toast.success("Report downloaded as PDF");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not export PDF");
    } finally {
      setExportingPdf(false);
    }
  }, [fullscreenOpen, pdfBaseName]);

  const reportBody = (markdown, contentRef, className) => (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div>
          <JobReportMarkdownBody
            markdown={markdown}
            className={className}
            contentRef={contentRef}
            onSelectionChange={setSelectionText}
          />
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-64">
        <ContextMenuItem
          disabled={!canFixOnDevRepositories || !hasSelection}
          onSelect={() => startFixHandoff(selectionText)}
        >
          <Wand2 className="size-4" />
          Fix on Dev Repositories (selection)
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem disabled={!canFixOnDevRepositories} onSelect={() => openFixOptions()}>
          <Wand2 className="size-4" />
          Fix on Dev Repositories (full report)
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );

  if (!hasReportContent) return null;

  return (
    <>
      <div className="rounded-md border border-emerald-200/70 bg-emerald-50/40 px-3 py-3 dark:border-emerald-900/50 dark:bg-emerald-950/25">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-foreground">Report</p>
          <div className="flex flex-wrap items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 px-2 text-muted-foreground hover:text-foreground"
              disabled={!canFixOnDevRepositories}
              title={
                canFixOnDevRepositories
                  ? undefined
                  : "Link a repo target to fix on Dev Repositories"
              }
              onClick={() => openFixOptions()}
            >
              <Wand2 className="h-4 w-4" aria-hidden />
              Fix on Dev Repositories
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 px-2 text-muted-foreground hover:text-foreground"
              disabled={exportingPdf}
              onClick={() => void handleExportPdf()}
            >
              {exportingPdf ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <FileDown className="h-4 w-4" aria-hidden />
              )}
              Export PDF
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 px-2 text-muted-foreground hover:text-foreground"
              onClick={() => setFullscreenOpen(true)}
            >
              <Maximize2 className="h-4 w-4" aria-hidden />
              Full screen
            </Button>
          </div>
        </div>
        <div className="mt-2 max-h-[30rem] overflow-auto">
          {reportBody(display, inlineContentRef)}
        </div>
      </div>

      <Dialog open={fullscreenOpen} onOpenChange={setFullscreenOpen}>
        <DialogContent
          showCloseButton={false}
          className="flex h-[100dvh] max-h-[100dvh] w-[100vw] max-w-none flex-col gap-0 overflow-hidden rounded-none border-0 p-0 sm:max-w-none"
        >
          <DialogHeader className="flex shrink-0 flex-row items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
            <DialogTitle className="truncate text-base font-semibold">{dialogTitle}</DialogTitle>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5"
                disabled={!canFixOnDevRepositories}
                onClick={() => openFixOptions()}
              >
                <Wand2 className="h-4 w-4" aria-hidden />
                Fix on Dev Repositories
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5"
                disabled={exportingPdf}
                onClick={() => void handleExportPdf()}
              >
                {exportingPdf ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <FileDown className="h-4 w-4" aria-hidden />
                )}
                Export PDF
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="Close full screen"
                onClick={() => setFullscreenOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-8 sm:py-6">
            <div className="mx-auto max-w-4xl">
              {reportBody(display, fullscreenContentRef, "border-0 bg-transparent p-0 text-base")}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={fixOptionsOpen}
        onOpenChange={(open) => {
          if (confirmingFix) return;
          setFixOptionsOpen(open);
        }}
      >
        <DialogContent className="flex max-h-[90vh] min-h-[min(42rem,90vh)] w-full flex-col sm:max-w-4xl">
          <DialogHeader className="shrink-0">
            <DialogTitle>Fix on Dev Repositories</DialogTitle>
            <DialogDescription>{fixOptionsDescription(fixDecision)}</DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            {fixDecision == null ? (
              <div
                className="space-y-2"
                role="status"
                aria-busy="true"
                aria-label="Preparing fix options"
              >
                <Skeleton className="h-16 w-full rounded-md" />
                <Skeleton className="h-16 w-full rounded-md" />
                <Skeleton className="h-16 w-full rounded-md" />
              </div>
            ) : fixDecision.status === "one" ? (
              <div className="rounded-md border border-border bg-muted/30 px-3 py-3">
                <p className="text-sm font-medium text-foreground">{fixDecision.single.title}</p>
                {fixDecision.single.summary ? (
                  <p className="mt-1 text-sm text-muted-foreground">{fixDecision.single.summary}</p>
                ) : null}
              </div>
            ) : fixDecision.status === "many" ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/40 px-3 py-2.5">
                  <label
                    htmlFor="report-fix-select-all"
                    className="flex cursor-pointer items-center gap-3 text-sm font-medium text-foreground"
                  >
                    <Checkbox
                      id="report-fix-select-all"
                      checked={
                        allManyFixesSelected
                          ? true
                          : selectedManyCount > 0
                            ? "indeterminate"
                            : false
                      }
                      onCheckedChange={(checked) => {
                        setSelectedFixIds(
                          checked === true ? manyFixOptions.map((opt) => opt.id) : [],
                        );
                      }}
                      aria-label="Select all fixes"
                    />
                    Select all
                  </label>
                  <span className="text-sm text-muted-foreground">
                    {selectedManyCount} of {manyFixOptions.length} selected
                  </span>
                </div>
                {fixDecision.options.map((opt) => {
                  const inputId = `report-fix-${opt.id}`;
                  return (
                    <div
                      key={opt.id}
                      className="flex items-start gap-3 rounded-md border border-border px-3 py-3"
                    >
                      <Checkbox
                        id={inputId}
                        className="mt-0.5"
                        checked={selectedFixIds.includes(opt.id)}
                        onCheckedChange={(checked) => {
                          setSelectedFixIds((prev) => {
                            if (checked === true) {
                              return prev.includes(opt.id) ? prev : [...prev, opt.id];
                            }
                            return prev.filter((id) => id !== opt.id);
                          });
                        }}
                      />
                      <label htmlFor={inputId} className="cursor-pointer space-y-1">
                        <span className="block text-sm font-medium text-foreground">
                          {opt.title}
                        </span>
                        <span className="block text-sm text-muted-foreground">{opt.summary}</span>
                      </label>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
          <DialogFooter className="shrink-0">
            <Button type="button" variant="outline" onClick={() => setFixOptionsOpen(false)}>
              {fixDecision?.status === "none" ? "Close" : "Cancel"}
            </Button>
            {fixDecision?.status === "one" ? (
              <Button
                type="button"
                className="gap-1.5"
                disabled={confirmingFix}
                onClick={() => beginConfirmedHandoff(display)}
              >
                {confirmingFix ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                Fix this
              </Button>
            ) : null}
            {fixDecision?.status === "many" ? (
              <Button
                type="button"
                className="gap-1.5"
                disabled={confirmingFix || selectedFixIds.length === 0}
                onClick={() => {
                  const excerpt = buildSelectedFixesExcerpt(fixDecision.options, selectedFixIds);
                  if (!excerpt.trim()) {
                    toast.error("Choose at least one fix.");
                    return;
                  }
                  beginConfirmedHandoff(excerpt, { selectedFixes: true });
                }}
              >
                {confirmingFix ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                {allManyFixesSelected ? "Fix all" : "Fix selected"}
              </Button>
            ) : null}
            {fixDecision?.status === "unavailable" ? (
              <Button
                type="button"
                className="gap-1.5"
                disabled={confirmingFix}
                onClick={() => beginConfirmedHandoff(display)}
              >
                {confirmingFix ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                Fix full report
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={projectPickerOpen} onOpenChange={setProjectPickerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Choose project</DialogTitle>
            <DialogDescription>
              This project report targets multiple projects. Pick where Dev Repositories should
              apply fixes.
            </DialogDescription>
          </DialogHeader>
          <Select value={pickedProjectId} onValueChange={setPickedProjectId}>
            <SelectTrigger>
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              {projectOptions.map((opt) => (
                <SelectItem key={opt.projectId} value={String(opt.projectId)}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setProjectPickerOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={confirmProjectPicker}>
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
