import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Zap } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { PageShell } from "@/components/common/PageShell";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateJobButton } from "./CreateJob";
import { deleteJob, fetchJobRuns, fetchJobs, runJobNow, updateJob } from "@/api";
import { toast } from "sonner";
import { AUTOMATION_LABELS, automationMatchesSearch, isRunInProgress } from "./automationDisplay";
import { AutomationsToolbar } from "./components/AutomationsToolbar";
import { AutomationCard } from "./components/AutomationCard";
import { useAutomationRunPolling } from "./hooks/useAutomationRunPolling";
import { usePlatformDeployMode } from "@/context/PlatformDeployModeProvider";
import { PLATFORM_PREPARE_AUTOMATION_BLOCKED_MESSAGE } from "@/constants/platformDeployMode";
import { usePageUiPreferences } from "@/hooks/usePageUiPreferences";
import { LIST_GRID_CLASS } from "@/constants/responsiveLayout";

const JOBS_UI_SCHEMA = {
  search: { defaultValue: "", type: "string" },
  showInactive: { defaultValue: false, type: "boolean" },
};

function mergeLatestRun(jobs, jobId, latestRun) {
  return jobs.map((j) => (j.id === jobId ? { ...j, latestRun } : j));
}

function JobsListSkeleton({ embedded }) {
  return (
    <div
      className={embedded ? "space-y-4" : "mt-4 space-y-4"}
      role="status"
      aria-busy="true"
      aria-label="Loading automations"
    >
      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-9 w-full max-w-sm rounded-md" />
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>
      <ul className={LIST_GRID_CLASS}>
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className="min-w-0">
            <Skeleton className="h-40 w-full rounded-xl" />
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function JobsPage({ embedded = false }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [prefs, setPref] = usePageUiPreferences("global", JOBS_UI_SCHEMA, {
    debouncedKeys: ["search"],
  });
  const search = prefs.search;
  const showInactive = prefs.showInactive;
  const setSearch = useCallback((value) => setPref("search", value), [setPref]);
  const setShowInactive = useCallback((value) => setPref("showInactive", value), [setPref]);
  const [togglingJobId, setTogglingJobId] = useState(null);
  const [runningJobId, setRunningJobId] = useState(null);
  const [deletingJobId, setDeletingJobId] = useState(null);
  const { isBlocking: manualRunBlocked } = usePlatformDeployMode();

  const loadJobs = useCallback(async (opts = {}) => {
    const silent = Boolean(opts.silent);
    if (!silent) {
      setError(null);
      setLoading(true);
    }
    try {
      const list = await fetchJobs();
      setJobs(Array.isArray(list) ? list : []);
    } catch (e) {
      if (!silent) {
        setJobs([]);
        setError(typeof e?.error === "string" ? e.error : AUTOMATION_LABELS.loadError);
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadJobs();
  }, [loadJobs]);

  const hasRunningJobs = useMemo(() => jobs.some((j) => isRunInProgress(j.latestRun)), [jobs]);

  const pollJobsSilently = useCallback(() => loadJobs({ silent: true }), [loadJobs]);

  useAutomationRunPolling(hasRunningJobs || runningJobId != null, pollJobsSilently);

  const activeCount = useMemo(() => jobs.filter((j) => j.enabled !== false).length, [jobs]);
  const inactiveCount = useMemo(() => jobs.filter((j) => j.enabled === false).length, [jobs]);

  const filteredJobs = useMemo(() => {
    const q = search.trim();
    return jobs
      .filter((j) => {
        if (showInactive) return true;
        return j.enabled !== false;
      })
      .filter((j) => automationMatchesSearch(j, q))
      .sort((a, b) => {
        const aActive = a.enabled !== false ? 0 : 1;
        const bActive = b.enabled !== false ? 0 : 1;
        if (aActive !== bActive) return aActive - bActive;
        return String(a.name ?? "").localeCompare(String(b.name ?? ""));
      });
  }, [jobs, search, showInactive]);

  const handleToggleEnabled = async (job, checked) => {
    setTogglingJobId(job.id);
    try {
      await updateJob(job.id, { enabled: checked === true });
      setJobs((prev) =>
        prev.map((j) => (j.id === job.id ? { ...j, enabled: checked === true } : j)),
      );
      toast.success(checked ? AUTOMATION_LABELS.resumedToast : AUTOMATION_LABELS.pausedToast);
    } catch (e) {
      toast.error(typeof e?.error === "string" ? e.error : AUTOMATION_LABELS.updateError);
    } finally {
      setTogglingJobId(null);
    }
  };

  const refreshLatestRun = async (jobId) => {
    try {
      const runs = await fetchJobRuns(jobId);
      const latest = Array.isArray(runs) && runs.length > 0 ? runs[0] : null;
      setJobs((prev) => mergeLatestRun(prev, jobId, latest));
    } catch {
      /* keep existing latestRun */
    }
  };

  const handleRunNow = async (job) => {
    if (manualRunBlocked) {
      toast.error(PLATFORM_PREPARE_AUTOMATION_BLOCKED_MESSAGE);
      return;
    }
    if (job?.hubSkillId && job.hubSkillCacheReady === false) {
      toast.error(AUTOMATION_LABELS.skillCacheHint);
      return;
    }
    setRunningJobId(job.id);
    try {
      const res = await runJobNow(job.id);
      const st = res?.data?.status;
      if (st === "FAILED") {
        toast.warning(res?.data?.error || AUTOMATION_LABELS.runFailed);
      } else {
        toast.success(AUTOMATION_LABELS.runCompleted);
      }
      await refreshLatestRun(job.id);
    } catch (e) {
      toast.error(e?.error || AUTOMATION_LABELS.runError);
    } finally {
      setRunningJobId(null);
    }
  };

  const handleDelete = async (job) => {
    setDeletingJobId(job.id);
    try {
      await deleteJob(job.id);
      setJobs((prev) => prev.filter((j) => j.id !== job.id));
      toast.success(AUTOMATION_LABELS.deletedToast);
    } catch (e) {
      toast.error(typeof e?.error === "string" ? e.error : AUTOMATION_LABELS.deleteError);
      throw e;
    } finally {
      setDeletingJobId(null);
    }
  };

  const pageShell = (content) =>
    embedded ? (
      <div className="space-y-4">{content}</div>
    ) : (
      <PageShell width="full" className="space-y-0 pb-8">
        {content}
      </PageShell>
    );

  const header = (
    <div
      className={
        embedded ? "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" : undefined
      }
    >
      {embedded ? (
        <>
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              {AUTOMATION_LABELS.allReports}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {AUTOMATION_LABELS.pageDescription}
            </p>
          </div>
          <CreateJobButton />
        </>
      ) : (
        <PageHeader
          compact
          title={AUTOMATION_LABELS.pageTitle}
          description={AUTOMATION_LABELS.pageDescription}
        >
          <CreateJobButton />
        </PageHeader>
      )}
    </div>
  );

  if (loading) {
    return pageShell(
      <>
        {header}
        <JobsListSkeleton embedded={embedded} />
      </>,
    );
  }

  if (error) {
    return pageShell(
      <>
        {header}
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-6 py-4 text-destructive">
          <p className="font-semibold">{AUTOMATION_LABELS.loadError}</p>
          <p className="mt-1 text-sm">{error}</p>
        </div>
      </>,
    );
  }

  const hasAny = jobs.length > 0;
  const hasInactiveOnly = hasAny && activeCount === 0 && inactiveCount > 0 && !showInactive;

  return pageShell(
    <>
      {header}

      {hasAny ? (
        <AutomationsToolbar
          search={search}
          onSearchChange={setSearch}
          showInactive={showInactive}
          onShowInactiveChange={setShowInactive}
          activeCount={activeCount}
          inactiveCount={inactiveCount}
        />
      ) : null}

      <div className={hasAny && !embedded ? "mt-4" : undefined}>
        {!hasAny ? (
          <div
            className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center transition-colors"
            aria-live="polite"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Zap className="h-6 w-6" aria-hidden />
            </div>
            <p className="text-base font-medium text-foreground">
              {AUTOMATION_LABELS.noAutomations}
            </p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {AUTOMATION_LABELS.noAutomationsHint}
            </p>
          </div>
        ) : hasInactiveOnly ? (
          <div
            className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center"
            aria-live="polite"
          >
            <p className="text-base font-medium text-foreground">
              {AUTOMATION_LABELS.noActiveAutomations}
            </p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {AUTOMATION_LABELS.noActiveHint}
            </p>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="rounded-xl border border-border bg-muted/20 px-6 py-12 text-center">
            <p className="text-sm text-muted-foreground">{AUTOMATION_LABELS.noSearchMatches}</p>
          </div>
        ) : (
          <ul className={LIST_GRID_CLASS}>
            {filteredJobs.map((job) => (
              <li key={job.id} className="min-w-0">
                <AutomationCard
                  job={job}
                  toggling={togglingJobId === job.id}
                  running={runningJobId === job.id}
                  deleting={deletingJobId === job.id}
                  manualRunBlocked={manualRunBlocked}
                  onToggleEnabled={handleToggleEnabled}
                  onRunNow={handleRunNow}
                  onDelete={handleDelete}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>,
  );
}
