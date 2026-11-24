import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { deleteJob, fetchJobRuns, fetchProjectJobs, runJobNow, updateJob } from "@/api";
import { toast } from "sonner";
import {
  AUTOMATION_LABELS,
  automationMatchesSearch,
  isRunInProgress,
} from "@/pages/Jobs/automationDisplay";
import { AutomationsToolbar } from "@/pages/Jobs/components/AutomationsToolbar";
import { AutomationCard } from "@/pages/Jobs/components/AutomationCard";
import { useAutomationRunPolling } from "@/pages/Jobs/hooks/useAutomationRunPolling";
import { usePlatformDeployMode } from "@/context/PlatformDeployModeProvider";
import { PLATFORM_PREPARE_AUTOMATION_BLOCKED_MESSAGE } from "@/constants/platformDeployMode";
import { usePageUiPreferences } from "@/hooks/usePageUiPreferences";
import { buildUiPreferenceScope } from "@/lib/uiPreferences";
import { LIST_GRID_CLASS } from "@/constants/responsiveLayout";

const PROJECT_AUTOMATIONS_UI_SCHEMA = {
  search: { defaultValue: "", type: "string" },
  showInactive: { defaultValue: false, type: "boolean" },
};

function mergeLatestRun(jobs, jobId, latestRun) {
  return jobs.map((j) => (j.id === jobId ? { ...j, latestRun } : j));
}

/**
 * Project-scoped automations list for the Project reports console service.
 */
export function ProjectAutomationsPanel({ projectId, onAutomationsCountChange }) {
  const navigate = useNavigate();
  const resolvedProjectId = projectId ? String(projectId) : "";
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [togglingJobId, setTogglingJobId] = useState(null);
  const [runningJobId, setRunningJobId] = useState(null);
  const [deletingJobId, setDeletingJobId] = useState(null);
  const { isBlocking: manualRunBlocked } = usePlatformDeployMode();

  const uiScope = useMemo(
    () => buildUiPreferenceScope({ projectId: resolvedProjectId }),
    [resolvedProjectId],
  );
  const [prefs, setPref] = usePageUiPreferences(uiScope, PROJECT_AUTOMATIONS_UI_SCHEMA, {
    debouncedKeys: ["search"],
  });
  const search = prefs.search;
  const showInactive = prefs.showInactive;
  const setSearch = useCallback((value) => setPref("search", value), [setPref]);
  const setShowInactive = useCallback((value) => setPref("showInactive", value), [setPref]);

  const loadJobs = useCallback(
    async (opts = {}) => {
      const silent = Boolean(opts.silent);
      if (!resolvedProjectId) {
        setJobs([]);
        setLoading(false);
        return;
      }
      if (!silent) {
        setError(null);
        setLoading(true);
      }
      try {
        const list = await fetchProjectJobs(resolvedProjectId);
        const nextJobs = Array.isArray(list) ? list : [];
        setJobs(nextJobs);
        onAutomationsCountChange?.(nextJobs.length);
      } catch (e) {
        if (!silent) {
          setJobs([]);
          onAutomationsCountChange?.(0);
          setError(typeof e?.error === "string" ? e.error : AUTOMATION_LABELS.loadError);
        }
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [resolvedProjectId, onAutomationsCountChange],
  );

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
      setJobs((prev) => {
        const next = prev.filter((j) => j.id !== job.id);
        onAutomationsCountChange?.(next.length);
        return next;
      });
      toast.success(AUTOMATION_LABELS.deletedToast);
    } catch (e) {
      toast.error(typeof e?.error === "string" ? e.error : AUTOMATION_LABELS.deleteError);
      throw e;
    } finally {
      setDeletingJobId(null);
    }
  };

  const openCreateAutomation = () => {
    navigate(`/jobs/new?projectId=${encodeURIComponent(resolvedProjectId)}`);
  };

  const numericProjectId = Number(resolvedProjectId);

  if (loading) {
    return (
      <div className="space-y-4">
        <PanelHeader onCreate={openCreateAutomation} />
        <div
          className={LIST_GRID_CLASS}
          role="status"
          aria-busy="true"
          aria-label="Loading automations"
        >
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <PanelHeader onCreate={openCreateAutomation} />
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-6 py-4 text-destructive">
          <p className="font-semibold">{AUTOMATION_LABELS.loadError}</p>
          <p className="mt-1 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const hasAny = jobs.length > 0;
  const hasInactiveOnly = hasAny && activeCount === 0 && inactiveCount > 0 && !showInactive;

  return (
    <div className="space-y-4">
      <PanelHeader onCreate={openCreateAutomation} />

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

      {!hasAny ? (
        <div
          className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center"
          aria-live="polite"
        >
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Zap className="h-6 w-6" aria-hidden />
          </div>
          <p className="text-base font-medium text-foreground">{AUTOMATION_LABELS.noAutomations}</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {AUTOMATION_LABELS.noAutomationsHint}
          </p>
          <Button type="button" className="mt-4 text-white" onClick={openCreateAutomation}>
            {AUTOMATION_LABELS.newAutomation}
          </Button>
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
                projectId={Number.isInteger(numericProjectId) ? numericProjectId : undefined}
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
  );
}

function PanelHeader({ onCreate }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          {AUTOMATION_LABELS.pageTitle}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{AUTOMATION_LABELS.pageDescription}</p>
      </div>
      <Button type="button" className="shrink-0 text-white" onClick={onCreate}>
        {AUTOMATION_LABELS.newAutomation}
      </Button>
    </div>
  );
}
