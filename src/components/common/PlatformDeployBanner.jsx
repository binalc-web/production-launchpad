import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { fetchProjectById, searchProjects } from "@/api";
import { useAuth } from "@/context/AuthContext";
import { usePlatformDeployMode } from "@/context/PlatformDeployModeProvider";
import { usePlatformDeployAdminDetails } from "@/hooks/usePlatformDeployAdminDetails";
import { cancelPlatformDeployMode, resumePlatformDeployMode } from "@/api";
import { resolveCurrentProjectId } from "@/lib/lastProject";
import { isLaunchpadAdmin } from "@/utils/launchpadRole";
import {
  PLATFORM_DEPLOY_MODE,
  PLATFORM_MAINTENANCE_TITLE,
  PLATFORM_MAINTENANCE_USER_MESSAGE,
} from "@/constants/platformDeployMode";
import {
  platformDeployReturnMessage,
  platformDeployReturnSpokenMessage,
} from "@/lib/platformDeployReturn";

/**
 * Global banner when platform is preparing for deploy.
 */
export function PlatformDeployBanner() {
  const { pathname } = useLocation();
  const params = useParams();
  const { user } = useAuth();
  const { deployMode, deployModeSince, loading, isBlocking, applyMode } = usePlatformDeployMode();
  const isAdmin = isLaunchpadAdmin(user?.role);
  const projectId = useMemo(() => resolveCurrentProjectId(pathname, params), [pathname, params]);
  const { details, loadError } = usePlatformDeployAdminDetails({
    enabled: isAdmin,
    deployMode,
  });
  const [actionBusy, setActionBusy] = useState(false);
  const [projectName, setProjectName] = useState("");

  useEffect(() => {
    let cancelled = false;
    if (!isAdmin || !isBlocking || !projectId) {
      setProjectName("");
      return undefined;
    }
    (async () => {
      try {
        const data = await fetchProjectById(projectId);
        const nextName = String(data?.name || "").trim();
        if (!cancelled) {
          setProjectName(nextName);
        }
        if (nextName) return;
      } catch {
        /* fall through */
      }
      try {
        const list = await searchProjects({ includeInactive: true });
        if (cancelled) return;
        const found = (Array.isArray(list) ? list : []).find(
          (project) => String(project.id) === String(projectId),
        );
        setProjectName(String(found?.name || "").trim());
      } catch {
        if (!cancelled) setProjectName("");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdmin, isBlocking, projectId]);

  if (loading || !isBlocking) {
    return null;
  }

  const isReady = deployMode === PLATFORM_DEPLOY_MODE.READY;
  const blockers = Array.isArray(details?.readinessBlockers) ? details.readinessBlockers : [];
  const blockersError = typeof details?.blockersError === "string" ? details.blockersError : null;
  const projectNameLabel = String(projectName || "").trim();

  const title = isAdmin
    ? isReady
      ? "Ready for manual deploy"
      : projectNameLabel
        ? `Prepare to deploy in progress for ${projectNameLabel}`
        : "Prepare to deploy in progress"
    : PLATFORM_MAINTENANCE_TITLE;

  const description = isAdmin
    ? isReady
      ? "AI work stays paused until you resume the platform after deploy."
      : "New prompts and manual automations are paused while the platform gets ready."
    : deployModeSince
      ? null
      : PLATFORM_MAINTENANCE_USER_MESSAGE;

  const runAdminAction = async (fn, successMessage) => {
    setActionBusy(true);
    try {
      const data = await fn();
      applyMode(data?.status);
      if (successMessage) toast.success(successMessage);
    } catch (e) {
      toast.error(typeof e?.error === "string" ? e.error : "Action failed");
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <Alert variant={isReady ? "default" : "destructive"} className="mb-4 border-border/80">
      {isReady ? (
        <AlertTriangle className="size-4" aria-hidden />
      ) : (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      )}
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="space-y-3 text-sm">
        {description ? <p>{description}</p> : null}
        <PlatformDeployReturnNotice sinceIso={deployModeSince} prominent={!isAdmin} />

        {isAdmin && loadError ? <p className="text-destructive">{loadError}</p> : null}

        {isAdmin && !isReady ? (
          blockers.length > 0 ? (
            <ul className="list-disc space-y-1 pl-5">
              {blockers.map((blocker, index) => (
                <PlatformDeployBlockerRow
                  key={`${blocker.kind}-${blocker.jobId ?? blocker.count ?? index}`}
                  blocker={blocker}
                />
              ))}
            </ul>
          ) : blockersError ? (
            <p className="text-muted-foreground">{blockersError}</p>
          ) : (
            <p className="text-muted-foreground">Checking what is still running…</p>
          )
        ) : null}

        {isAdmin ? (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {isReady ? (
              <Button
                type="button"
                size="sm"
                disabled={actionBusy}
                onClick={() =>
                  runAdminAction(
                    resumePlatformDeployMode,
                    "Platform resumed. Normal operation restored.",
                  )
                }
              >
                Resume platform
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={actionBusy}
              onClick={() => runAdminAction(cancelPlatformDeployMode, "Prepare mode canceled.")}
            >
              Cancel prepare
            </Button>
            <Link
              to="/deployments"
              className="text-sm text-foreground underline-offset-2 hover:underline"
            >
              Open deploy controls
            </Link>
          </div>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}

/**
 * Ten-minute return clock for the maintenance window. At zero, the platform is still unavailable.
 * @param {{ sinceIso: string|null, prominent?: boolean }} props
 */
export function PlatformDeployReturnNotice({ sinceIso, prominent = false }) {
  const now = useNow(1000);
  const message = platformDeployReturnMessage(sinceIso, now);
  const spoken = platformDeployReturnSpokenMessage(sinceIso, now);
  if (!message || !spoken) return null;
  return (
    <p
      className={
        prominent
          ? "m-0 text-base font-medium tabular-nums text-foreground"
          : "m-0 font-medium tabular-nums text-foreground"
      }
    >
      <span className="sr-only" aria-live="polite">
        {spoken}
      </span>
      <span aria-hidden="true">{message}</span>
    </p>
  );
}

/**
 * @param {string|null|undefined} iso
 * @param {number} now
 * @returns {string|null}
 */
function formatStartedAgo(iso, now) {
  const t = iso ? Date.parse(iso) : NaN;
  if (Number.isNaN(t)) return null;
  const min = Math.floor(Math.max(0, now - t) / 60_000);
  if (min < 1) return "started just now";
  if (min < 60) return `started ${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `started ${hr}h ${min % 60}m ago`;
  return `started ${Math.floor(hr / 24)}d ago`;
}

/** Re-renders every 30s so elapsed labels stay current between server updates. */
function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/**
 * @param {{ text: string|null }} props
 */
function StartedAgo({ text }) {
  if (!text) return null;
  return <span className="text-muted-foreground/80"> · {text}</span>;
}

/**
 * Single readiness blocker row for the admin deploy panel.
 * @param {{ blocker: object }} props
 */
export function PlatformDeployBlockerRow({ blocker }) {
  const now = useNow();
  if (!blocker || typeof blocker !== "object") return null;

  if (blocker.kind === "active_agents") {
    const runs = Array.isArray(blocker.activeRuns) ? blocker.activeRuns : [];
    if (runs.length === 1) {
      return (
        <li className="text-sm text-muted-foreground">
          {blocker.message}
          <StartedAgo text={formatStartedAgo(runs[0].startedAt, now)} />
        </li>
      );
    }
    return (
      <li className="text-sm text-muted-foreground">
        {blocker.message}
        {runs.length > 0 ? (
          <ul className="mt-1 list-[circle] space-y-0.5 pl-5">
            {runs.map((run) => (
              <li key={run.cursorAgentId}>
                {String(run.label || "Agent").trim() || "Agent"}
                {run.projectName ? ` for ${run.projectName}` : ""}
                <StartedAgo text={formatStartedAgo(run.startedAt, now)} />
              </li>
            ))}
          </ul>
        ) : null}
      </li>
    );
  }

  if (blocker.kind === "scheduled_job" && blocker.jobId) {
    return (
      <li className="text-sm text-muted-foreground">
        <Link
          to={`/jobs/${blocker.jobId}`}
          className="text-foreground underline-offset-2 hover:underline"
        >
          {blocker.message}
        </Link>
      </li>
    );
  }

  if (blocker.kind === "running_automation" && blocker.jobId) {
    return (
      <li className="text-sm text-muted-foreground">
        <Link
          to={`/jobs/${blocker.jobId}`}
          className="text-foreground underline-offset-2 hover:underline"
        >
          {blocker.message}
        </Link>
        <StartedAgo text={formatStartedAgo(blocker.startedAt, now)} />
      </li>
    );
  }

  return <li className="text-sm text-muted-foreground">{blocker.message}</li>;
}
