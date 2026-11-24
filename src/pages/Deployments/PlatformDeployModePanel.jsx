import React, { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  cancelPlatformDeployMode,
  consumePlatformDeployModeStream,
  preparePlatformDeployMode,
  resumePlatformDeployMode,
} from "@/api";
import { usePlatformDeployMode } from "@/context/PlatformDeployModeProvider";
import { usePlatformDeployAdminDetails } from "@/hooks/usePlatformDeployAdminDetails";
import { PLATFORM_DEPLOY_MODE, isPlatformDeployModeBlocking } from "@/constants/platformDeployMode";
import {
  PlatformDeployBlockerRow,
  PlatformDeployReturnNotice,
} from "@/components/common/PlatformDeployBanner";

/**
 * Merge admin API payload over public health deploy mode.
 * @param {object | null} modeState
 * @param {string} deployMode
 */
function resolveEffectiveStatus(modeState, deployMode) {
  const apiStatus = typeof modeState?.status === "string" ? modeState.status : null;
  if (apiStatus && apiStatus !== PLATFORM_DEPLOY_MODE.NORMAL) return apiStatus;
  if (isPlatformDeployModeBlocking(deployMode)) {
    return deployMode === PLATFORM_DEPLOY_MODE.READY
      ? PLATFORM_DEPLOY_MODE.READY
      : PLATFORM_DEPLOY_MODE.PREPARING;
  }
  return apiStatus || PLATFORM_DEPLOY_MODE.NORMAL;
}

/**
 * Admin control panel for prepare-to-deploy mode on the Deployments page.
 */
export function PlatformDeployModePanel() {
  const {
    deployMode,
    deployModeSince,
    isBlocking,
    refresh: refreshPublicMode,
    applyMode,
  } = usePlatformDeployMode();
  const [modeState, setModeState] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [prepareDialogOpen, setPrepareDialogOpen] = useState(false);
  const abortRef = useRef(null);

  const status = resolveEffectiveStatus(modeState, deployMode);
  const isActive = status !== PLATFORM_DEPLOY_MODE.NORMAL;

  const {
    details,
    loadError,
    refresh: refreshAdminDetails,
  } = usePlatformDeployAdminDetails({
    enabled: true,
    deployMode,
    isLocallyActive: isActive,
  });

  const applySnapshot = useCallback((snapshot) => {
    if (!snapshot || typeof snapshot !== "object") return;
    setModeState((prev) => ({
      ...prev,
      ...snapshot,
      status: snapshot.status ?? prev?.status,
      readinessBlockers: Array.isArray(snapshot.readinessBlockers)
        ? snapshot.readinessBlockers
        : (prev?.readinessBlockers ?? []),
      blockersError:
        snapshot.blockersError !== undefined
          ? snapshot.blockersError
          : (prev?.blockersError ?? null),
    }));
  }, []);

  useEffect(() => {
    if (details) applySnapshot(details);
  }, [details, applySnapshot]);

  useEffect(() => {
    if (!isActive && !isBlocking) return undefined;
    const controller = new AbortController();
    abortRef.current = controller;

    consumePlatformDeployModeStream({
      onEvent: (evt) => {
        if (evt?.type === "heartbeat") return;
        applySnapshot(evt);
        if (evt?.type === "ready") {
          toast.success("Platform is ready for manual deploy.");
          refreshPublicMode();
        }
        if (evt?.type === "resumed" || evt?.type === "canceled") {
          refreshPublicMode();
        }
      },
      signal: controller.signal,
    }).catch(() => {});

    return () => controller.abort();
  }, [applySnapshot, isActive, isBlocking, refreshPublicMode]);

  const runAction = async (fn, successMessage) => {
    setActionBusy(true);
    try {
      const data = await fn();
      applySnapshot(data);
      applyMode(data?.status);
      if (successMessage) toast.success(successMessage);
      void refreshAdminDetails();
    } catch (e) {
      toast.error(typeof e?.error === "string" ? e.error : "Action failed");
    } finally {
      setActionBusy(false);
    }
  };

  const blockers = Array.isArray(modeState?.readinessBlockers) ? modeState.readinessBlockers : [];
  const blockersError =
    typeof modeState?.blockersError === "string" ? modeState.blockersError : null;
  const canResume = Boolean(modeState?.canResume) || status === PLATFORM_DEPLOY_MODE.READY;

  return (
    <Card className="mb-6 border-border/60 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Prepare to deploy</CardTitle>
        <CardDescription>
          Normal deploys run alongside running cloud agents: they finish on their current tasks and
          new agents start on the new tasks. Use Prepare for a breaking API or schema change: pause
          new AI work, wait for agents and nearby scheduled jobs to clear, deploy manually on the
          server, then resume the platform.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loadError && isActive ? <p className="text-sm text-destructive">{loadError}</p> : null}

        {!isActive ? (
          <>
            <Button type="button" disabled={actionBusy} onClick={() => setPrepareDialogOpen(true)}>
              Prepare to deploy
            </Button>
            <Dialog open={prepareDialogOpen} onOpenChange={setPrepareDialogOpen}>
              <DialogContent showCloseButton={!actionBusy}>
                <DialogHeader>
                  <DialogTitle>Prepare platform for deploy?</DialogTitle>
                  <DialogDescription>
                    Use this hard drain for a breaking API or schema change. New prompts and manual
                    automations will be blocked until you resume. Scheduled jobs keep running;
                    deploy readiness waits until running automations finish, no agents are active,
                    and no job is due in the next 15 minutes.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={actionBusy}
                    onClick={() => setPrepareDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    disabled={actionBusy}
                    onClick={async () => {
                      await runAction(preparePlatformDeployMode, "Prepare mode started.");
                      setPrepareDialogOpen(false);
                    }}
                  >
                    {actionBusy ? (
                      <>
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                        Preparing…
                      </>
                    ) : (
                      "Prepare"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        ) : null}

        {status === PLATFORM_DEPLOY_MODE.PREPARING ? (
          <div className="space-y-3 rounded-lg border border-border/60 bg-muted/30 p-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-medium text-foreground">
              <span className="inline-flex items-center gap-2">
                <Loader2 className="size-4 animate-spin shrink-0" aria-hidden />
                Preparing platform for deploy…
              </span>
              <PlatformDeployReturnNotice sinceIso={deployModeSince} />
            </div>
            {blockers.length ? (
              <ul className="list-disc space-y-1 pl-5">
                {blockers.map((blocker, index) => (
                  <PlatformDeployBlockerRow
                    key={`${blocker.kind}-${blocker.jobId ?? blocker.count ?? index}`}
                    blocker={blocker}
                  />
                ))}
              </ul>
            ) : blockersError ? (
              <p className="text-sm text-muted-foreground">{blockersError}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Checking what is still running…</p>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={actionBusy}
                onClick={() => runAction(cancelPlatformDeployMode, "Prepare mode canceled.")}
              >
                Cancel prepare
              </Button>
            </div>
          </div>
        ) : null}

        {status === PLATFORM_DEPLOY_MODE.READY ? (
          <div className="space-y-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
            <p className="text-sm font-medium text-foreground">
              Safe to deploy manually. Run your deploy on the server, then resume the platform.
            </p>
            <PlatformDeployReturnNotice sinceIso={deployModeSince} />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={actionBusy || !canResume}
                onClick={() =>
                  runAction(
                    resumePlatformDeployMode,
                    "Platform resumed. Normal operation restored.",
                  )
                }
              >
                Resume platform
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={actionBusy}
                onClick={() => runAction(cancelPlatformDeployMode, "Prepare mode canceled.")}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : null}

        {isActive && blockers.some((b) => b.kind === "active_agents") ? (
          <p className="text-xs text-muted-foreground">
            Active agents are listed above. Open a project&apos;s agent analytics for details.
          </p>
        ) : null}

        {isActive ? (
          <p className="text-xs text-muted-foreground">
            Deploy history is below. Manual deploy uses{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">scripts/deploy-manual.sh</code>{" "}
            on the server.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
