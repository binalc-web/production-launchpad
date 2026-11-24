import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PageShell } from "@/components/common/PageShell";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ChevronDown, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AutomationDetailsPageActions } from "./components/AutomationDetailsPageActions";
import { deleteJob, deleteJobRun, fetchJobById, fetchJobRuns, runJobNow, updateJob } from "@/api";
import { getSkillLabel } from "@/api/hubAiSkillsLibrary";
import { useHubAiSkills } from "@/hooks/useHubAiSkills";
import { toast } from "sonner";
import { formatRepeatsLine, formatNextRunRelative, isNextRunApplicable } from "@/utils/jobSchedule";
import { JobRunOutputPanel, JobRunReportBlock } from "./components/JobRunOutputPanel";
import { JobRunDocumentUpdates } from "./components/JobRunDocumentUpdates";
import {
  formatRunWhen,
  runHasReport,
  statusBadgeClass,
  runStatusLabel,
  triggerLabel,
} from "./jobDetailsShared";
import {
  AUTOMATION_LABELS,
  formatLastRunDisplay,
  getAutomationTypeMeta,
  formatTargetSummary,
  isRunInProgress,
} from "./automationDisplay";
import { effectiveJobRunStatus } from "./utils/jobRunStatus.util";
import { useAutomationRunPolling } from "./hooks/useAutomationRunPolling";
import { AUTOMATION_TYPE_SCRIPT } from "./automationFormShared";
import { cn } from "@/lib/utils";
import { usePlatformDeployMode } from "@/context/PlatformDeployModeProvider";
import { PLATFORM_PREPARE_AUTOMATION_BLOCKED_MESSAGE } from "@/constants/platformDeployMode";

/** Inline metadata chip for the compact automation summary strip. */
function MetaItem({ label, children }) {
  return (
    <span className="inline-flex max-w-full flex-wrap items-baseline gap-1">
      <span className="shrink-0 font-medium text-foreground/75">{label}:</span>
      <span className="text-foreground/90">{children}</span>
    </span>
  );
}

function RunsListSkeleton() {
  return (
    <ul
      className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card"
      role="status"
      aria-busy="true"
      aria-label="Loading runs"
    >
      {Array.from({ length: 3 }).map((_, i) => (
        <li key={i} className="flex items-center gap-2 px-4 py-3">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-4 w-40 rounded-sm" />
          <Skeleton className="ml-auto h-8 w-24 rounded-md" />
        </li>
      ))}
    </ul>
  );
}

function JobDetailsSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-busy="true" aria-label="Loading automation">
      <div className="space-y-3">
        <Skeleton className="h-8 w-32 rounded-md" />
        <Skeleton className="h-7 w-72 max-w-full rounded-md" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </div>
      <Skeleton className="h-16 w-full rounded-lg" />
      <div className="space-y-3">
        <Skeleton className="h-4 w-24 rounded-sm" />
        <RunsListSkeleton />
      </div>
    </div>
  );
}

export default function JobDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [runsLoading, setRunsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [menuBusy, setMenuBusy] = useState(false);
  const [expandedRunId, setExpandedRunId] = useState(null);
  const [pendingDeleteRunId, setPendingDeleteRunId] = useState(null);
  const [deletingRunId, setDeletingRunId] = useState(null);
  const [deleteAutomationOpen, setDeleteAutomationOpen] = useState(false);
  const [deletingAutomation, setDeletingAutomation] = useState(false);

  const showReportForSkills =
    job != null && String(job.automationType ?? "").toUpperCase() !== AUTOMATION_TYPE_SCRIPT;
  const { skills } = useHubAiSkills({ enabled: showReportForSkills });
  const { isBlocking: manualRunBlocked } = usePlatformDeployMode();

  const loadJob = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      const j = await fetchJobById(id);
      setJob(j);
    } catch (e) {
      setError(typeof e?.error === "string" ? e.error : AUTOMATION_LABELS.loadOneError);
      setJob(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadRuns = useCallback(
    async (opts = {}) => {
      if (!id) return [];
      const silent = Boolean(opts.silent);
      if (!silent) {
        setRunsLoading(true);
      }
      try {
        const list = await fetchJobRuns(id);
        const rows = Array.isArray(list) ? list : [];
        setRuns(rows);
        return rows;
      } catch {
        if (!silent) {
          setRuns([]);
        }
        return [];
      } finally {
        if (!silent) {
          setRunsLoading(false);
        }
      }
    },
    [id],
  );

  const prevRunsRef = useRef([]);

  useEffect(() => {
    setLoading(true);
    loadJob();
  }, [loadJob]);

  useEffect(() => {
    void loadRuns();
  }, [loadRuns]);

  const hasRunningRuns = useMemo(() => runs.some((r) => isRunInProgress(r)), [runs]);

  const pollRunsSilently = useCallback(async () => {
    const prevRuns = prevRunsRef.current;
    const nextRuns = await loadRuns({ silent: true });
    if (!Array.isArray(nextRuns) || nextRuns.length === 0) return;

    for (const next of nextRuns) {
      const prev = prevRuns.find((r) => r.id === next.id);
      if (!prev || !isRunInProgress(prev)) continue;
      const nextEffective = effectiveJobRunStatus(next);
      if (nextEffective === "COMPLETED") {
        toast.success(AUTOMATION_LABELS.runCompleted);
      } else if (nextEffective === "FAILED") {
        toast.warning(AUTOMATION_LABELS.runFailed);
      }
    }
    prevRunsRef.current = nextRuns;
  }, [loadRuns]);

  useEffect(() => {
    prevRunsRef.current = runs;
  }, [runs]);

  useAutomationRunPolling(hasRunningRuns || menuBusy, pollRunsSilently);

  useEffect(() => {
    if (runsLoading || window.location.hash !== "#runs") return;
    document.getElementById("runs")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [runsLoading]);

  const handleToggleEnabled = async () => {
    if (!id || !job) return;
    const next = job.enabled === false;
    setMenuBusy(true);
    try {
      await updateJob(id, { enabled: next });
      setJob((prev) => (prev ? { ...prev, enabled: next } : prev));
      toast.success(next ? AUTOMATION_LABELS.resumedToast : AUTOMATION_LABELS.pausedToast);
    } catch (e) {
      toast.error(typeof e?.error === "string" ? e.error : AUTOMATION_LABELS.updateError);
    } finally {
      setMenuBusy(false);
    }
  };

  const handleRunNow = async () => {
    if (!id) return;
    if (manualRunBlocked) {
      toast.error(PLATFORM_PREPARE_AUTOMATION_BLOCKED_MESSAGE);
      return;
    }
    if (job?.hubSkillId && job.hubSkillCacheReady === false) {
      toast.error(AUTOMATION_LABELS.skillCacheHint);
      return;
    }
    setMenuBusy(true);
    try {
      const res = await runJobNow(id);
      const st = res?.data?.status;
      if (st === "FAILED") {
        toast.warning(res?.data?.error || AUTOMATION_LABELS.runFailed);
      } else {
        toast.success(AUTOMATION_LABELS.runCompleted);
      }
      await loadRuns();
    } catch (e) {
      toast.error(e?.error || AUTOMATION_LABELS.runError);
    } finally {
      setMenuBusy(false);
    }
  };

  const handleRefresh = async () => {
    if (!id || menuBusy) return;
    setMenuBusy(true);
    try {
      const [j, list] = await Promise.all([fetchJobById(id), fetchJobRuns(id)]);
      setJob(j);
      setRuns(Array.isArray(list) ? list : []);
      toast.success("Details updated");
    } catch (e) {
      toast.error(typeof e?.error === "string" ? e.error : AUTOMATION_LABELS.refreshError);
    } finally {
      setMenuBusy(false);
    }
  };

  const scrollToRuns = () => {
    document.getElementById("runs")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const handleDeleteRunConfirm = async () => {
    if (!id || pendingDeleteRunId == null) return;
    const runId = pendingDeleteRunId;
    setDeletingRunId(runId);
    try {
      await deleteJobRun(id, runId);
      setRuns((prev) => prev.filter((run) => run.id !== runId));
      if (expandedRunId === runId) {
        setExpandedRunId(null);
      }
      setPendingDeleteRunId(null);
      toast.success("Run log deleted");
    } catch (e) {
      toast.error(typeof e?.error === "string" ? e.error : "Could not delete run log");
    } finally {
      setDeletingRunId(null);
    }
  };

  const handleDeleteAutomationConfirm = async () => {
    if (!id || deletingAutomation) return;
    setDeletingAutomation(true);
    try {
      await deleteJob(id);
      toast.success(AUTOMATION_LABELS.deletedToast);
      setDeleteAutomationOpen(false);
      navigate("/jobs");
    } catch (e) {
      toast.error(typeof e?.error === "string" ? e.error : AUTOMATION_LABELS.deleteError);
    } finally {
      setDeletingAutomation(false);
    }
  };

  const pageShell = (content) => <PageShell width="full">{content}</PageShell>;

  if (loading) {
    return pageShell(<JobDetailsSkeleton />);
  }

  if (error || !job) {
    return pageShell(
      <>
        <Button variant="ghost" size="sm" className="gap-1 -ml-2 px-2" asChild>
          <Link to="/jobs">
            <ArrowLeft className="h-4 w-4" />
            {AUTOMATION_LABELS.allReports}
          </Link>
        </Button>
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-destructive">
          {error || AUTOMATION_LABELS.notFound}
        </div>
      </>,
    );
  }

  const isActive = job.enabled !== false;
  const { pill } = getAutomationTypeMeta(job);
  const repeats = formatRepeatsLine(
    job.scheduleType,
    job.scheduleTime,
    job.scheduleDay,
    job.timezone,
    job.scheduleDate ?? null,
    job.scheduleCron ?? null,
  );
  const nextRun = isNextRunApplicable(job) ? formatNextRunRelative(job) : null;
  const latestRun = runs.length > 0 ? runs[0] : null;
  const lastRun = formatLastRunDisplay(latestRun);

  const { label: jobTypeLabel } = getAutomationTypeMeta(job);
  const targets = Array.isArray(job.targets) ? job.targets : [];
  const documentTargets = Array.isArray(job.documentTargets) ? job.documentTargets : [];
  const showReport = String(job.automationType ?? "").toUpperCase() !== AUTOMATION_TYPE_SCRIPT;

  return pageShell(
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-3">
          <Button variant="ghost" size="sm" className="gap-1 -ml-2 px-2" asChild>
            <Link to="/jobs">
              <ArrowLeft className="h-4 w-4" />
              {AUTOMATION_LABELS.allReports}
            </Link>
          </Button>
          <div className="space-y-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
              {job.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="font-normal">
                {pill}
              </Badge>
              <Badge
                variant="outline"
                className={
                  isActive
                    ? "border-primary/30 bg-primary/5 text-primary"
                    : "border-amber-200/80 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200"
                }
              >
                {isActive ? "Active" : AUTOMATION_LABELS.pausedBadge}
              </Badge>
            </div>
          </div>
        </div>

        <AutomationDetailsPageActions
          isActive={isActive}
          busy={menuBusy || deletingAutomation}
          manualRunBlocked={manualRunBlocked}
          onEdit={() => navigate(`/jobs/${id}/edit`)}
          onRunNow={handleRunNow}
          onViewLogs={scrollToRuns}
          onToggleEnabled={handleToggleEnabled}
          onRefresh={handleRefresh}
          onDelete={() => setDeleteAutomationOpen(true)}
        />
      </div>

      {job.hubSkillId && job.hubSkillCacheReady === false ? (
        <div className="rounded-lg border border-amber-200/80 bg-amber-50/60 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
          <p className="font-medium">Skill not ready for scheduled runs</p>
          <p className="mt-1 text-amber-900/90 dark:text-amber-100/90">
            The {getSkillLabel(skills, job.hubSkillId) || "selected"} skill is attached but was not
            cached. Open Edit, confirm the skill, and save while signed in.
          </p>
        </div>
      ) : null}

      <section
        aria-label={AUTOMATION_LABELS.detailsAria}
        className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground sm:px-4"
      >
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          <MetaItem label="Schedule">{repeats}</MetaItem>
          <MetaItem label="Type">{jobTypeLabel}</MetaItem>
          <MetaItem label="Targets">{formatTargetSummary(job)}</MetaItem>
          <MetaItem label="Last run">
            <span className="font-medium text-foreground">{lastRun.status}</span>
            {lastRun.ago ? <span> · {lastRun.ago}</span> : null}
          </MetaItem>
          {nextRun ? (
            <MetaItem label={AUTOMATION_LABELS.nextRunLabel}>
              <span className="font-medium text-foreground">{nextRun}</span>
            </MetaItem>
          ) : null}
          {showReport && job.hubSkillId ? (
            <MetaItem label="Skill">
              {getSkillLabel(skills, job.hubSkillId) || job.hubSkillId}
            </MetaItem>
          ) : null}
        </div>

        {targets.length > 0 ? (
          <ul className="mt-2 space-y-1 border-t border-border/40 pt-2">
            {targets.map((t) => (
              <li key={`${t.projectId}-${t.repoPath}`} className="break-all">
                <span className="font-medium text-foreground/80">
                  {t.project?.name ?? `Project ${t.projectId}`}
                </span>
                <span className="text-muted-foreground">
                  {" "}
                  · {t.repoPath} · branch {t.branch || "main"}
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        {documentTargets.length > 0 ? (
          <ul className="mt-2 space-y-1 border-t border-border/40 pt-2">
            {documentTargets.map((t) => (
              <li key={`${t.projectId}-${t.documentId}`} className="break-all">
                <span className="font-medium text-foreground/80">Document</span>
                <span className="text-muted-foreground">
                  {" "}
                  · {t.project?.name ?? `Project ${t.projectId}`} · {t.documentId}
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        {showReport && job.hubSkillFolderName ? (
          <p className="mt-2 border-t border-border/40 pt-2 font-mono text-[11px] text-muted-foreground">
            Agent folder: .cursor/skills/{job.hubSkillFolderName}/
          </p>
        ) : null}

        {showReport && String(job.reportPrompt ?? "").trim() ? (
          <details className="mt-2 border-t border-border/40 pt-2">
            <summary className="cursor-pointer font-medium text-foreground/75">
              Additional AI instructions
            </summary>
            <p className="mt-1.5 whitespace-pre-wrap break-words text-muted-foreground">
              {job.reportPrompt}
            </p>
          </details>
        ) : null}
      </section>

      <section id="runs" className="scroll-mt-6 w-full space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Run logs</h2>
        {runsLoading ? (
          <RunsListSkeleton />
        ) : runs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center text-sm text-muted-foreground">
            No runs yet.
          </div>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {runs.map((run) => {
              const expanded = expandedRunId === run.id;
              const runTrigger = triggerLabel(run.trigger);
              return (
                <li key={run.id} className="px-4 py-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${statusBadgeClass(run.status, run)}`}
                      >
                        {runStatusLabel(run)}
                      </span>
                      <span className="text-sm text-foreground">
                        {formatRunWhen(run.startedAt || run.finishedAt)}
                      </span>
                      {run.repoPath ? (
                        <span className="text-xs text-muted-foreground break-all">
                          {run.repoPath}
                          {run.branch ? ` @ ${run.branch}` : ""}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      {runHasReport(run) ? (
                        <Badge
                          variant="outline"
                          className="border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"
                        >
                          Has report
                        </Badge>
                      ) : null}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1 px-2 text-muted-foreground hover:text-foreground"
                        aria-expanded={expanded}
                        onClick={() => setExpandedRunId(expanded ? null : run.id)}
                      >
                        View output
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 shrink-0 transition-transform duration-200",
                            expanded && "rotate-180",
                          )}
                        />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1 px-2 text-muted-foreground hover:text-destructive"
                        disabled={isRunInProgress(run) || deletingRunId === run.id}
                        aria-label="Delete run log"
                        onClick={() => setPendingDeleteRunId(run.id)}
                      >
                        {deletingRunId === run.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        ) : (
                          <Trash2 className="h-4 w-4" aria-hidden />
                        )}
                        Delete
                      </Button>
                      <Badge variant="secondary" className="w-fit uppercase">
                        {runTrigger}
                      </Badge>
                    </div>
                  </div>
                  {expanded ? (
                    <div className="mt-3 space-y-3">
                      {runHasReport(run) ? (
                        <JobRunReportBlock
                          report={run.report}
                          reportFixDecision={run.reportFixDecision}
                          exportFileName={job?.name}
                          jobName={job?.name}
                          projectId={run.projectId}
                          repoPath={run.repoPath}
                          branch={run.branch}
                          job={job}
                        />
                      ) : null}
                      <JobRunDocumentUpdates updates={run.documentUpdates} />
                      <div className="rounded-lg border border-border bg-muted/20 p-4">
                        <JobRunOutputPanel
                          output={run.output}
                          outputJson={run.outputJson}
                          rawOutput={run.rawOutput}
                          error={run.error}
                          status={run.status}
                          report={run.report}
                        />
                      </div>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Dialog
        open={pendingDeleteRunId != null}
        onOpenChange={(open) => {
          if (!open && deletingRunId == null) {
            setPendingDeleteRunId(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete run log?</DialogTitle>
            <DialogDescription>
              The report and output for this run will be removed permanently.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={deletingRunId != null}
              onClick={() => setPendingDeleteRunId(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deletingRunId != null}
              onClick={() => void handleDeleteRunConfirm()}
            >
              {deletingRunId != null ? (
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
              ) : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteAutomationOpen}
        onOpenChange={(open) => {
          if (!open && deletingAutomation) return;
          setDeleteAutomationOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton={!deletingAutomation}>
          <DialogHeader>
            <DialogTitle>{AUTOMATION_LABELS.deleteConfirmTitle}</DialogTitle>
            <DialogDescription>
              {AUTOMATION_LABELS.deleteConfirmDescription}
              {job.name ? (
                <span className="mt-2 block font-medium text-foreground">{job.name}</span>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={deletingAutomation}
              onClick={() => setDeleteAutomationOpen(false)}
            >
              {AUTOMATION_LABELS.cancel}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deletingAutomation}
              onClick={() => void handleDeleteAutomationConfirm()}
            >
              {deletingAutomation ? (
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
              ) : null}
              {AUTOMATION_LABELS.deleteAutomation}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>,
  );
}
