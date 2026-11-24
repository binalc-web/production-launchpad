import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { GitBranch } from "lucide-react";
import { toast } from "sonner";
import {
  attachProjectCicd,
  createProjectCicd,
  disableProjectCicd,
  enableProjectCicd,
  getDeployMap,
  getProjectCicd,
  startBackendCloudDeploy,
  syncProjectCicd,
} from "@/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { logger } from "@/utils/logger";

const POLL_MS = 3000;

/**
 * Optional CI/CD on Cloud Infra. Off until the user turns it on.
 */
export function CicdDeliveryCard({ projectId, canManage = false, onStatus }) {
  const [cicd, setCicd] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [environments, setEnvironments] = useState([]);
  const [environmentId, setEnvironmentId] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [choiceOpen, setChoiceOpen] = useState(false);
  const [deployOpen, setDeployOpen] = useState(false);

  const apply = useCallback(
    (next) => {
      setCicd(next);
      onStatus?.(next);
      if (next?.needsCreate) setCreateOpen(true);
      if (next?.needsChoice) setChoiceOpen(true);
      if (next?.needsDeploy) setDeployOpen(true);
    },
    [onStatus],
  );

  const refresh = useCallback(async () => {
    if (!projectId) return null;
    const data = await getProjectCicd(projectId);
    apply(data);
    return data;
  }, [apply, projectId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getProjectCicd(projectId)
      .then((data) => {
        if (!cancelled) apply(data);
      })
      .catch((err) => {
        logger.error("CI/CD status failed", err);
        if (!cancelled) {
          setCicd(null);
          onStatus?.(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apply, onStatus, projectId]);

  useEffect(() => {
    const waiting = cicd?.status === "pending_setup" || cicd?.status === "pending_connection";
    if (!waiting) return undefined;
    const timer = setInterval(() => {
      refresh().catch(() => {});
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [cicd?.status, refresh]);

  useEffect(() => {
    if (!deployOpen || !projectId) return undefined;
    let cancelled = false;
    getDeployMap(projectId)
      .then((data) => {
        if (cancelled) return;
        const envs = Array.isArray(data?.environments) ? data.environments : [];
        setEnvironments(envs);
        setEnvironmentId((prev) => prev || envs[0]?.id || "");
      })
      .catch((err) => logger.error("Deploy map for CI/CD failed", err));
    return () => {
      cancelled = true;
    };
  }, [deployOpen, projectId]);

  const checked = Boolean(cicd && cicd.status && cicd.status !== "disabled");

  const onToggle = async (next) => {
    if (!canManage || busy) return;
    setBusy(true);
    try {
      if (!next) {
        setCreateOpen(false);
        setChoiceOpen(false);
        setDeployOpen(false);
        const data = await disableProjectCicd(projectId);
        apply({ ...data, needsCreate: false, needsChoice: false, needsDeploy: false });
        toast.success("CI/CD is off. Deploy runs on LaunchPad again.");
        return;
      }
      const data = await enableProjectCicd(projectId);
      apply(data);
      if (data.status === "active") toast.success("CI/CD is on.");
    } catch (err) {
      toast.error(err?.message || err?.error || "Could not update CI/CD");
    } finally {
      setBusy(false);
    }
  };

  const create = async (provider) => {
    setBusy(true);
    try {
      const data = await createProjectCicd(projectId, { provider, branch: "main" });
      setCreateOpen(false);
      apply(data);
      toast.success("Creating CI/CD. This can take a minute.");
    } catch (err) {
      toast.error(err?.message || err?.error || "Could not create CI/CD");
    } finally {
      setBusy(false);
    }
  };

  const attach = async (provider) => {
    setBusy(true);
    try {
      const data = await attachProjectCicd(projectId, provider);
      setChoiceOpen(false);
      apply(data);
      toast.success("CI/CD is on.");
    } catch (err) {
      toast.error(err?.message || err?.error || "Could not attach CI/CD");
    } finally {
      setBusy(false);
    }
  };

  const deployNow = async () => {
    if (!environmentId) {
      toast.error("Select an environment.");
      return;
    }
    setBusy(true);
    try {
      await startBackendCloudDeploy(projectId, { environmentId });
      setDeployOpen(false);
      toast.success("Deploy started with this environment's variables.");
      await refresh();
    } catch (err) {
      toast.error(err?.message || err?.error || "Could not start the deploy");
    } finally {
      setBusy(false);
    }
  };

  const sync = async () => {
    setBusy(true);
    try {
      await syncProjectCicd(projectId, cicd?.deployEnvironmentId || environmentId);
      toast.success("Environment variables synced.");
      await refresh();
    } catch (err) {
      toast.error(err?.message || err?.error || "Could not sync variables");
    } finally {
      setBusy(false);
    }
  };

  const providerLabel =
    cicd?.provider === "github_actions"
      ? "GitHub Actions"
      : cicd?.provider === "aws_codepipeline"
        ? "AWS CodePipeline"
        : null;

  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <GitBranch className="size-4 text-primary" aria-hidden />
            <h4 className="text-sm font-semibold text-foreground">CI/CD</h4>
          </div>
          <p className="text-sm text-muted-foreground">
            Off by default. When it is on, a merge to main deploys, and Deploy triggers that
            pipeline instead of running it on LaunchPad.
          </p>
        </div>
        {loading ? (
          <Skeleton
            className="h-5 w-9 shrink-0 rounded-full"
            role="status"
            aria-busy="true"
            aria-label="Loading CI/CD delivery setting"
          />
        ) : (
          <Switch
            checked={checked}
            onCheckedChange={onToggle}
            disabled={!canManage || busy}
            aria-label="CI/CD"
          />
        )}
      </div>

      {cicd?.status === "pending_setup" ? (
        <p className="text-xs text-muted-foreground">Creating the pipeline…</p>
      ) : null}
      {cicd?.status === "pending_connection" ? (
        <p className="text-xs text-muted-foreground">
          Approve the GitHub connection in AWS
          {cicd.connectionUrl ? (
            <>
              {" "}
              (
              <a className="underline" href={cicd.connectionUrl} target="_blank" rel="noreferrer">
                open connections
              </a>
              )
            </>
          ) : null}
          . This page checks again automatically.
        </p>
      ) : null}
      {cicd?.status === "active" && providerLabel ? (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>
            {providerLabel} on <span className="text-foreground">{cicd.branch || "main"}</span>
            {cicd.origin === "adopted" ? " (existing pipeline)" : ""}
          </span>
          {cicd.lastRunUrl ? (
            <a className="underline" href={cicd.lastRunUrl} target="_blank" rel="noreferrer">
              Last run
            </a>
          ) : null}
          {cicd.origin === "created" ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={sync}
              disabled={busy || !canManage}
            >
              Sync secrets
            </Button>
          ) : null}
        </div>
      ) : null}
      {cicd?.errorCode === "GITHUB_WORKFLOW_SCOPE_REQUIRED" ? (
        <p className="text-xs text-amber-700 dark:text-amber-300">
          {cicd.lastError}{" "}
          <Link className="underline" to="/settings/integrations">
            Connected accounts
          </Link>
        </p>
      ) : cicd?.status === "error" && cicd.lastError ? (
        <p className="text-xs text-amber-700 dark:text-amber-300">{cicd.lastError}</p>
      ) : null}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create CI/CD infrastructure?</DialogTitle>
            <DialogDescription>
              No pipeline was found. Choose where new deploys should run. Cancel leaves CI/CD off.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setCreateOpen(false);
                onToggle(false);
              }}
            >
              Cancel
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => create("github_actions")}
              >
                GitHub
              </Button>
              <Button type="button" disabled={busy} onClick={() => create("aws_codepipeline")}>
                AWS
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={choiceOpen} onOpenChange={setChoiceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Which pipeline should LaunchPad use?</DialogTitle>
            <DialogDescription>
              Both a GitHub workflow and an AWS pipeline are already in this project.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => attach("github_actions")}
            >
              GitHub
            </Button>
            <Button type="button" disabled={busy} onClick={() => attach("aws_codepipeline")}>
              AWS
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deployOpen} onOpenChange={setDeployOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deploy this infrastructure?</DialogTitle>
            <DialogDescription>
              Environment variables come from the deploy environment you pick. Confirm to run the
              first pipeline deploy.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="cicd-deploy-environment">Environment</Label>
            <Select value={environmentId} onValueChange={setEnvironmentId}>
              <SelectTrigger id="cicd-deploy-environment">
                <SelectValue placeholder="Choose an environment" />
              </SelectTrigger>
              <SelectContent>
                {environments.map((env) => (
                  <SelectItem key={env.id} value={env.id}>
                    {env.name || env.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setDeployOpen(false)}>
              Not now
            </Button>
            <Button type="button" disabled={busy || !environmentId} onClick={deployNow}>
              Deploy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
