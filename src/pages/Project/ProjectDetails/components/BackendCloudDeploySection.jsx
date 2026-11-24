import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  consumeBackendCloudDeployStream,
  getBackendCloudDeployRun,
  getLatestBackendCloudDeployRun,
  getDeployMap,
  preflightBackendCloudDeploy,
  startBackendCloudDeploy,
  updateProject,
} from "@/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Cloud, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { logger } from "@/utils/logger";
import { useAuth } from "@/context/AuthContext";
import {
  PROJECT_SETTINGS_ACCESS_HINT,
  userCanAccessProjectSettings,
} from "@/lib/releasePresentation";
import { normalizeBackendInfraStack } from "./ReleaseLockBackendAgentCard";
import { CloudDeployLivePanel } from "./CloudDeployLivePanel";
import { EnvironmentDeploymentLinks } from "./EnvironmentDeploymentLinks";
import {
  applyDeployAgentStreamUpdate,
  emptyDeployAgentStreamState,
  legacyAgentSummaryToUpdate,
} from "./cloudDeployAgentStream.util";
import { buildUiPreferenceScope } from "@/lib/uiPreferences";
import { usePersistedUiState } from "@/hooks/usePersistedUiState";
import { formatDeployedAt } from "@/pages/Deployments/deploymentDisplay";

const TERMINAL_STATUSES = new Set(["SUCCEEDED", "FAILED"]);
const ACTIVE_STATUSES = new Set(["PENDING", "RUNNING"]);
const POLL_INTERVAL_ACTIVE_MS = 1000;

/** Slug segment for CloudFormation stack names (matches backend slugifyForEnvName). */
function slugifyStackSegment(value) {
  return (
    String(value ?? "project")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 32) || "project"
  );
}

/** Fixed CloudFormation stack name: `<project>-<environment>`. */
export function buildCloudFormationStackNamePreview(project, environmentName) {
  const base = slugifyStackSegment(project?.slug ?? project?.name ?? "app");
  const env = slugifyStackSegment(environmentName ?? "staging");
  let name = `${base}-${env}`;
  if (!/^[A-Za-z]/.test(name)) {
    name = `app-${name}`;
  }
  return name.slice(0, 128);
}

/** Parse cloud deploy config from project API shape. */
export function parseCloudDeployConfigFromProject(project) {
  const raw = project?.backendCloudDeployConfig;
  if (!Array.isArray(raw)) return [{ key: "", value: "" }];
  if (raw.length === 0) return [{ key: "", value: "" }];
  return raw.map((row) => ({
    key: String(row?.key ?? ""),
    value: String(row?.value ?? ""),
  }));
}

/** Rows ready to persist (non-empty keys only). */
function serializeCloudDeployConfig(rows) {
  return rows
    .map((row) => ({
      key: String(row.key ?? "").trim(),
      value: String(row.value ?? ""),
    }))
    .filter((row) => row.key);
}

/** Short readiness suffix for environment SelectItem labels. */
function deployEnvSelectLabel(env) {
  const name = env?.name || env?.id || "Environment";
  if (env?.readiness?.canDeploy === true) return `${name} (ready)`;
  if (env?.readiness?.status === "blocked") return `${name} (blocked)`;
  if (env?.readiness?.canDeploy === false) return `${name} (needs credentials)`;
  return name;
}

/**
 * Cloud deploy UI: Deploy to Cloud button, key/value config, stack name, preflight, progress dialog.
 */
export function BackendCloudDeploySection({
  mode = "standalone",
  project,
  displayInfraStack,
  infraSelectSlot,
  deployModeSelectSlot,
  cloudDeployConfigValue,
  onCloudDeployConfigChange,
  onProjectUpdated,
  idPrefix = "backend-cloud-deploy",
  isParentSaving = false,
  remoteCicdActive = false,
}) {
  const { user } = useAuth();
  const canAccessProjectSettings = userCanAccessProjectSettings(user, project);
  const deployScope = buildUiPreferenceScope({ projectId: project?.id });
  const [standaloneRows, setStandaloneRows] = useState([{ key: "", value: "" }]);
  const [savingConfig, setSavingConfig] = useState(false);
  const [preflight, setPreflight] = useState(null);
  const [preflightLoading, setPreflightLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deployUserPrompt, setDeployUserPrompt] = useState("");
  const [forceFreshAgent, setForceFreshAgent] = useState(false);
  const [activeRunId, setActiveRunId] = useState(null);
  const [runStatus, setRunStatus] = useState(null);
  const [runLog, setRunLog] = useState("");
  const [runPhase, setRunPhase] = useState(null);
  const [deployTimeline, setDeployTimeline] = useState([]);
  const [validationChecks, setValidationChecks] = useState([]);
  const [commandPreview, setCommandPreview] = useState("");
  const [agentStream, setAgentStream] = useState(emptyDeployAgentStreamState);
  const [deployStartedAtMs, setDeployStartedAtMs] = useState(null);
  const [livePanelVisible, setLivePanelVisible] = useState(false);
  const [deployEnvironments, setDeployEnvironments] = useState([]);
  const [selectedDeployEnvironmentId, setSelectedDeployEnvironmentId] = usePersistedUiState({
    scope: deployScope,
    key: "cloudDeploy.selectedEnvironmentId",
    defaultValue: "",
    type: "string",
  });
  const [deployMapLoading, setDeployMapLoading] = useState(false);
  const [deployMapLoaded, setDeployMapLoaded] = useState(false);
  const [startingDeploy, setStartingDeploy] = useState(false);
  const pollRef = useRef(null);
  const streamAbortRef = useRef(null);
  const timelineSeqRef = useRef(0);

  const infraStack = normalizeBackendInfraStack(displayInfraStack);
  const showSection = infraStack !== "none";

  const displayRows =
    mode === "standalone"
      ? standaloneRows
      : Array.isArray(cloudDeployConfigValue) && cloudDeployConfigValue.length
        ? cloudDeployConfigValue
        : [{ key: "", value: "" }];

  const setDisplayRows = (next) => {
    if (mode === "standalone") setStandaloneRows(next);
    else onCloudDeployConfigChange?.(next);
  };

  useEffect(() => {
    if (mode !== "standalone" || !project) return;
    setStandaloneRows(parseCloudDeployConfigFromProject(project));
  }, [mode, project?.id, project?.backendCloudDeployConfig]);

  const loadPreflight = useCallback(async () => {
    if (!project?.id || infraStack === "none") {
      setPreflight(null);
      return;
    }
    setPreflightLoading(true);
    try {
      const data = await preflightBackendCloudDeploy(project.id);
      setPreflight(data);
    } catch (err) {
      logger.error("Backend cloud deploy preflight failed", err);
      setPreflight(null);
    } finally {
      setPreflightLoading(false);
    }
  }, [infraStack, project?.id]);

  useEffect(() => {
    loadPreflight();
  }, [loadPreflight, infraStack]);

  const loadDeployMap = useCallback(async () => {
    if (!project?.id) {
      setDeployEnvironments([]);
      return;
    }
    setDeployMapLoading(true);
    try {
      const data = await getDeployMap(project.id);
      const envs = Array.isArray(data?.environments) ? data.environments : [];
      setDeployEnvironments(envs);
      setSelectedDeployEnvironmentId((prev) => {
        const persisted = String(prev ?? "").trim();
        if (persisted && envs.some((e) => e.id === persisted)) return persisted;
        return envs[0]?.id ?? "";
      });
    } catch (err) {
      logger.error("Failed to load deploy-map for cloud deploy", err);
      setDeployEnvironments([]);
    } finally {
      setDeployMapLoading(false);
      setDeployMapLoaded(true);
    }
  }, [project?.id, setSelectedDeployEnvironmentId]);

  useEffect(() => {
    loadDeployMap();
  }, [loadDeployMap]);

  const savedRows = useMemo(
    () => serializeCloudDeployConfig(parseCloudDeployConfigFromProject(project)),
    [project?.backendCloudDeployConfig],
  );
  const draftRows = useMemo(() => serializeCloudDeployConfig(displayRows), [displayRows]);
  const configDirty =
    mode === "standalone" && JSON.stringify(savedRows) !== JSON.stringify(draftRows);

  const saveProjectFields = async (payload, successMessage) => {
    if (!project?.id) return;
    if (!userCanAccessProjectSettings(user, project)) {
      toast.error(PROJECT_SETTINGS_ACCESS_HINT);
      return;
    }
    setSavingConfig(true);
    try {
      await updateProject(project.id, payload);
      toast.success(successMessage);
      await onProjectUpdated?.();
    } catch (err) {
      const msg =
        (typeof err === "object" && err && err.error) || err?.message || "Could not save settings";
      toast.error(String(msg));
      logger.error("BackendCloudDeploySection save failed", err);
    } finally {
      setSavingConfig(false);
    }
  };

  const persistConfigStandalone = async () => {
    await saveProjectFields(
      {
        backendCloudDeployConfig: draftRows,
      },
      "Cloud deploy settings saved.",
    );
  };

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const stopStream = () => {
    if (streamAbortRef.current) {
      streamAbortRef.current.abort();
      streamAbortRef.current = null;
    }
  };

  useEffect(
    () => () => {
      stopPolling();
      stopStream();
    },
    [],
  );

  const pushTimelineEvent = useCallback((evt) => {
    timelineSeqRef.current += 1;
    setDeployTimeline((prev) => [
      ...prev.slice(-80),
      { ...evt, id: `${evt.type}-${timelineSeqRef.current}` },
    ]);
  }, []);

  const applyRunState = useCallback((run) => {
    if (!run) return;
    setRunStatus(run.status);
    setRunLog(String(run.log ?? ""));
    setRunPhase(run.phase ?? null);
    setCommandPreview(String(run.commandPreview ?? ""));
  }, []);

  const applyAgentStreamEvent = useCallback((evt) => {
    const normalized = evt?.type === "agent_summary" ? legacyAgentSummaryToUpdate(evt) : evt;
    if (!normalized || normalized.type !== "agent_update") return;
    setAgentStream((prev) => applyDeployAgentStreamUpdate(prev, normalized));
  }, []);

  const handleDeployStreamEvent = useCallback(
    (evt) => {
      if (!evt || typeof evt !== "object") return;
      if (evt.type === "connected") {
        if (evt.phase) setRunPhase(evt.phase);
        if (evt.runStatus) setRunStatus(evt.runStatus);
      }
      if (evt.type === "log" && evt.text) {
        setRunLog((prev) => prev + String(evt.text));
      }
      if (evt.type === "phase" && evt.phase) {
        setRunPhase(evt.phase);
        pushTimelineEvent({ type: "phase", phase: evt.phase });
      }
      if (evt.type === "agent_update" || evt.type === "agent_summary") {
        applyAgentStreamEvent(evt);
      }
      if (evt.type === "validation") {
        setValidationChecks(Array.isArray(evt.checks) ? evt.checks : []);
        pushTimelineEvent({
          type: "validation",
          ok: evt.ok,
          checks: evt.checks ?? [],
        });
      }
      if (evt.type === "terminal") {
        setRunStatus(evt.status ?? null);
        setRunPhase(null);
        setDeployStartedAtMs(null);
        if (evt.status === "SUCCEEDED") {
          toast.success("Cloud deploy finished.");
          void loadDeployMap();
        } else if (evt.status === "FAILED") {
          toast.error(evt.error || "Cloud deploy failed.");
        }
      }
    },
    [applyAgentStreamEvent, loadDeployMap, pushTimelineEvent],
  );

  const pollRun = useCallback(
    (projectId, runId) => {
      stopPolling();

      const tick = async () => {
        try {
          const run = await getBackendCloudDeployRun(projectId, runId);
          applyRunState(run);
          if (TERMINAL_STATUSES.has(run.status)) {
            stopPolling();
            if (run.status === "SUCCEEDED") {
              toast.success("Cloud deploy finished.");
              void loadDeployMap();
            } else {
              toast.error(run.error || "Cloud deploy failed.");
            }
          }
        } catch (err) {
          stopPolling();
          logger.error("Deploy run poll failed", err);
        }
      };

      tick();
      pollRef.current = setInterval(tick, POLL_INTERVAL_ACTIVE_MS);
    },
    [applyRunState, loadDeployMap],
  );

  const streamRun = useCallback(
    (projectId, runId) => {
      stopStream();
      stopPolling();
      const controller = new AbortController();
      streamAbortRef.current = controller;

      void (async () => {
        try {
          await consumeBackendCloudDeployStream(projectId, runId, {
            signal: controller.signal,
            onEvent: handleDeployStreamEvent,
          });
          const run = await getBackendCloudDeployRun(projectId, runId);
          applyRunState(run);
          if (!TERMINAL_STATUSES.has(run?.status)) {
            pollRun(projectId, runId);
          }
        } catch (err) {
          if (err?.name === "AbortError") return;
          logger.error("Deploy stream failed; falling back to poll", err);
          pollRun(projectId, runId);
        }
      })();
    },
    [applyRunState, handleDeployStreamEvent, pollRun],
  );

  /** Attach the live panel to the project's in-flight run; resolves true when one was found. */
  const attachActiveRun = useCallback(
    async (projectId, isCancelled = () => false) => {
      try {
        const data = await getLatestBackendCloudDeployRun(projectId);
        if (isCancelled()) return false;
        const run = data?.run;
        if (!run?.id || !ACTIVE_STATUSES.has(run.status)) return false;

        setActiveRunId(run.id);
        applyRunState(run);
        setLivePanelVisible(true);
        setDeployStartedAtMs(Date.now());
        streamRun(projectId, run.id);
        return true;
      } catch (err) {
        logger.error("Failed to resume latest cloud deploy run", err);
        return false;
      }
    },
    [applyRunState, streamRun],
  );

  useEffect(() => {
    if (!project?.id || !showSection) return;

    let cancelled = false;
    void attachActiveRun(project.id, () => cancelled);

    return () => {
      cancelled = true;
    };
  }, [attachActiveRun, project?.id, showSection]);

  const handleDeployClick = () => {
    setConfirmOpen(true);
  };

  const handleConfirmDeploy = async () => {
    if (!project?.id) return;
    const trimmedUserPrompt = deployUserPrompt.trim();
    const useFreshAgent = forceFreshAgent === true;
    setConfirmOpen(false);
    setDeployUserPrompt("");
    setForceFreshAgent(false);
    setStartingDeploy(true);
    setLivePanelVisible(true);
    setRunStatus("PENDING");
    setRunLog("");
    setRunPhase(null);
    setDeployTimeline([]);
    setValidationChecks([]);
    setCommandPreview("");
    setAgentStream(emptyDeployAgentStreamState());
    setDeployStartedAtMs(Date.now());
    try {
      const { runId } = await startBackendCloudDeploy(project.id, {
        environmentId: selectedDeployEnvironmentId,
        userPrompt: trimmedUserPrompt || undefined,
        forceFreshAgent: useFreshAgent || undefined,
      });
      setActiveRunId(runId);
      toast.info("Cloud deploy started.");
      streamRun(project.id, runId);
    } catch (err) {
      if (await attachActiveRun(project.id)) {
        toast.info("A cloud deploy is already running. Showing its progress.");
        return;
      }
      const msg =
        (typeof err === "object" && err && err.error) || err?.message || "Could not start deploy";
      toast.error(String(msg));
      setLivePanelVisible(false);
      setRunStatus(null);
      setActiveRunId(null);
      setRunPhase(null);
      setDeployStartedAtMs(null);
      setAgentStream(emptyDeployAgentStreamState());
      logger.error("Start backend cloud deploy failed", err);
    } finally {
      setStartingDeploy(false);
    }
  };

  const hasDevelopmentRepo = Boolean(String(project?.developmentRepoUrl ?? "").trim());

  const toolsReady =
    infraStack === "terraform"
      ? preflight?.toolsReady?.terraform !== false
      : infraStack === "cloudformation"
        ? preflight?.toolsReady?.aws !== false
        : true;

  const deployScriptOk = preflight?.deployScriptFound !== false;

  // Frontend hosting IaC is optional (RN / API-only); only backend template/TF is required.
  const templateOk =
    infraStack === "terraform"
      ? preflight?.backendTerraformFound !== false
      : infraStack !== "cloudformation" || preflight?.backendTemplateFound !== false;

  const initialDeployMapLoading = !deployMapLoaded;
  const usesDeployMapEnvironments = deployEnvironments.length > 0;
  const selectedDeployEnv = deployEnvironments.find((e) => e.id === selectedDeployEnvironmentId);
  const cloudFormationStackName =
    infraStack === "cloudformation" && selectedDeployEnv
      ? buildCloudFormationStackNamePreview(project, selectedDeployEnv.name)
      : "";
  const deployEnvironmentOk =
    usesDeployMapEnvironments && String(selectedDeployEnvironmentId ?? "").trim().length > 0;
  const deployReadinessOk =
    !usesDeployMapEnvironments || selectedDeployEnv?.readiness?.canDeploy === true;
  const lastDeployedAtLabel = formatDeployedAt(selectedDeployEnv?.deployment?.deployedAt);
  const showLastDeployedAt = lastDeployedAtLabel && lastDeployedAtLabel !== "—";

  const deployInFlight = startingDeploy || (Boolean(activeRunId) && ACTIVE_STATUSES.has(runStatus));

  const deployDisableReason = (() => {
    if (deployInFlight) return "A cloud deploy is already in progress.";
    if (preflightLoading || deployMapLoading) return "Checking deploy readiness…";
    if (isParentSaving || savingConfig) return "Saving settings…";
    if (!hasDevelopmentRepo) return "Add a development repository in Project settings to deploy.";
    if (mode === "standalone" && !usesDeployMapEnvironments && deployMapLoaded) {
      return "Create a deploy environment on the Environment tab before deploying.";
    }
    if (usesDeployMapEnvironments && !deployEnvironmentOk) {
      return "Select a deploy environment.";
    }
    if (usesDeployMapEnvironments && !deployReadinessOk) {
      if (selectedDeployEnv?.readiness?.status === "blocked") {
        return (
          selectedDeployEnv.readiness.message ||
          "Choose an option on the Environment tab to continue."
        );
      }
      return (
        selectedDeployEnv?.readiness?.message ||
        "Add required credentials on the Environment tab for this environment."
      );
    }
    if (remoteCicdActive) return null;
    if (!toolsReady) {
      return (
        preflight?.toolsError ||
        (infraStack === "terraform"
          ? "Terraform is not available on the server."
          : "AWS CLI is not available on the server.")
      );
    }
    if (!deployScriptOk) {
      return "Add deploy.sh to your development repository root (generated at release lock).";
    }
    if (!templateOk) {
      if (infraStack === "terraform") {
        if (preflight?.backendTerraformFound === false) {
          return "No backend Terraform files found in the development repository.";
        }
        return "Terraform layout is incomplete in the development repository.";
      }
      if (preflight?.backendTemplateFound === false) {
        return "No backend CloudFormation template — add backend/cloudformation-template.yaml.";
      }
      return "CloudFormation templates are incomplete in the development repository.";
    }
    if (preflight?.toolsError) return preflight.toolsError;
    return null;
  })();

  const deployDisabled =
    !hasDevelopmentRepo ||
    !showSection ||
    isParentSaving ||
    savingConfig ||
    preflightLoading ||
    deployMapLoading ||
    (!remoteCicdActive && !toolsReady) ||
    (!remoteCicdActive && !deployScriptOk) ||
    (!remoteCicdActive && !templateOk) ||
    !deployEnvironmentOk ||
    !deployReadinessOk ||
    (mode === "standalone" && !usesDeployMapEnvironments) ||
    deployInFlight;

  if (!showSection) return null;

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-infra-row`}>Infrastructure and hosting</Label>
        <p className="text-xs text-muted-foreground">
          Combined as {"{{infraStack}}"} in the release-lock backend prompt (e.g. AWS CloudFormation
          (With Server)).
        </p>
        <div className="flex flex-col gap-3">
          <div className="grid min-w-0 gap-2 sm:grid-cols-2">
            <div className="min-w-0">{infraSelectSlot}</div>
            {deployModeSelectSlot ? <div className="min-w-0">{deployModeSelectSlot}</div> : null}
          </div>
          <Button
            type="button"
            className="w-full shrink-0 gap-2 sm:w-auto sm:self-start"
            onClick={handleDeployClick}
            disabled={deployDisabled}
          >
            <Cloud className="size-4" aria-hidden />
            {remoteCicdActive ? "Deploy via CI/CD" : "Deploy to Cloud"}
          </Button>
          {deployDisabled && deployDisableReason ? (
            <p className="text-xs text-amber-700 dark:text-amber-300">{deployDisableReason}</p>
          ) : null}
          {showLastDeployedAt ? (
            <p className="text-xs text-muted-foreground">Last deployed {lastDeployedAtLabel}</p>
          ) : null}
        </div>
      </div>

      {initialDeployMapLoading ? (
        <div
          className="space-y-3 rounded-lg border border-border bg-muted/20 p-4"
          role="status"
          aria-busy="true"
          aria-label="Loading deploy environments"
        >
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-9 w-full" />
        </div>
      ) : usesDeployMapEnvironments ? (
        <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-4">
          <Label htmlFor={`${idPrefix}-deploy-env`}>Deploy environment</Label>
          <p className="text-xs text-muted-foreground">
            Deploy needs required credentials saved on the Environment tab. The Environment badge
            can still show Setting up… while optional values are filled in automatically. Launchpad
            materializes env files, then runs{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-[11px]">deploy.sh</code> at your
            development repository root (backend stack, then frontend).
          </p>
          <Select
            value={selectedDeployEnvironmentId}
            onValueChange={setSelectedDeployEnvironmentId}
            disabled={deployMapLoading || isParentSaving || savingConfig}
          >
            <SelectTrigger id={`${idPrefix}-deploy-env`}>
              <SelectValue placeholder="Select environment" />
            </SelectTrigger>
            <SelectContent>
              {deployEnvironments.map((env) => (
                <SelectItem key={env.id} value={env.id}>
                  {deployEnvSelectLabel(env)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedDeployEnv?.readiness?.canDeploy === false ? (
            <p className="text-xs text-amber-700 dark:text-amber-300">
              {selectedDeployEnv.readiness.status === "blocked"
                ? selectedDeployEnv.readiness.message ||
                  "Choose an option on the Environment tab to continue."
                : "Add required credentials on the Environment tab."}
            </p>
          ) : null}
          {infraStack === "cloudformation" && selectedDeployEnv ? (
            <div className="space-y-1 border-t border-border pt-3">
              <Label>Stack name</Label>
              <p className="text-xs text-muted-foreground">
                Required for CloudFormation deploys. Automatically set from your project and
                environment names.
              </p>
              <p
                className="rounded-md border border-border bg-background px-3 py-2 font-mono text-sm text-foreground"
                aria-live="polite"
              >
                {cloudFormationStackName}
              </p>
            </div>
          ) : null}
          {selectedDeployEnv ? (
            <EnvironmentDeploymentLinks
              deployment={selectedDeployEnv.deployment}
              environmentName={selectedDeployEnv.name}
            />
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Create a deploy environment on the Environment tab before deploying.
        </p>
      )}

      {!initialDeployMapLoading && !usesDeployMapEnvironments ? (
        <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
          <div>
            <h4 className="text-sm font-medium text-foreground">
              {usesDeployMapEnvironments
                ? "Legacy cloud deploy settings"
                : "Cloud Deploy Configurations"}
            </h4>
            <p className="mt-1 text-xs text-muted-foreground">
              {usesDeployMapEnvironments
                ? "Optional when deploy-map environments exist. Configure environments on the Environment tab instead."
                : "Prepended before each CloudFormation or Terraform command (e.g. "}
              {!usesDeployMapEnvironments ? (
                <>
                  <code className="rounded bg-muted px-1 py-0.5 text-[11px]">
                    AWS_ACCESS_KEY_ID=… aws cloudformation …
                  </code>
                  ).
                </>
              ) : null}
            </p>
          </div>

          <div className="space-y-2">
            {displayRows.map((row, index) => (
              <div key={`${idPrefix}-row-${index}`} className="flex gap-2">
                <Input
                  aria-label={`Config key ${index + 1}`}
                  value={row.key}
                  onChange={(e) => {
                    const next = [...displayRows];
                    next[index] = { ...next[index], key: e.target.value };
                    setDisplayRows(next);
                  }}
                  placeholder="KEY"
                  className="font-mono text-xs"
                  disabled={isParentSaving || savingConfig}
                />
                <Input
                  aria-label={`Config value ${index + 1}`}
                  value={row.value}
                  onChange={(e) => {
                    const next = [...displayRows];
                    next[index] = { ...next[index], value: e.target.value };
                    setDisplayRows(next);
                  }}
                  placeholder="value"
                  className="font-mono text-xs"
                  disabled={isParentSaving || savingConfig}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={() => {
                    const next = displayRows.filter((_, i) => i !== index);
                    setDisplayRows(next.length ? next : [{ key: "", value: "" }]);
                  }}
                  disabled={displayRows.length <= 1 || isParentSaving || savingConfig}
                  aria-label="Remove row"
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setDisplayRows([...displayRows, { key: "", value: "" }])}
              disabled={isParentSaving || savingConfig}
            >
              <Plus className="size-3.5" aria-hidden />
              Add row
            </Button>
          </div>

          {mode === "standalone" ? (
            <Button
              type="button"
              onClick={persistConfigStandalone}
              disabled={!configDirty || savingConfig || !canAccessProjectSettings}
              className="gap-2"
            >
              {savingConfig ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Saving…
                </>
              ) : (
                "Save configurations"
              )}
            </Button>
          ) : null}

          {preflightLoading ? (
            <p className="text-xs text-muted-foreground">Checking repository…</p>
          ) : null}
          {preflight?.deployScriptFound === false ? (
            <p className="text-xs text-amber-600 dark:text-amber-500">
              Add <code className="rounded bg-muted px-1 py-0.5 text-[11px]">deploy.sh</code> to
              your development repository root (generated at release lock).
            </p>
          ) : null}
          {infraStack === "cloudformation" && preflight?.backendTemplateFound === false ? (
            <p className="text-xs text-amber-600 dark:text-amber-500">
              No backend CloudFormation template — add{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-[11px]">
                backend/cloudformation-template.yaml
              </code>
              .
            </p>
          ) : null}
          {infraStack === "cloudformation" &&
          preflight?.backendTemplateFound !== false &&
          preflight?.frontendTemplateFound === false ? (
            <p className="text-xs text-muted-foreground">
              Backend-only deploy — frontend hosting skipped (no{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-[11px]">
                frontend/cloudformation-template.yaml
              </code>
              ).
            </p>
          ) : null}
          {infraStack === "terraform" &&
          preflight?.backendTerraformFound !== false &&
          preflight?.frontendTerraformFound === false ? (
            <p className="text-xs text-muted-foreground">
              Backend-only deploy — frontend Terraform hosting skipped.
            </p>
          ) : null}
          {preflight?.toolsError ? (
            <p className="text-xs text-amber-600 dark:text-amber-500">{preflight.toolsError}</p>
          ) : null}
          {Array.isArray(preflight?.runtimeWarnings) && preflight.runtimeWarnings.length > 0
            ? preflight.runtimeWarnings.map((warning) => (
                <p key={warning} className="text-xs text-amber-600 dark:text-amber-500">
                  {warning}
                </p>
              ))
            : null}
          {!hasDevelopmentRepo ? (
            <p className="text-xs text-muted-foreground">
              Add a development repository in Project settings to deploy.
            </p>
          ) : null}
        </div>
      ) : null}

      <CloudDeployLivePanel
        visible={livePanelVisible}
        runStatus={runStatus}
        runPhase={runPhase}
        runLog={runLog}
        timeline={deployTimeline}
        validationChecks={validationChecks}
        commandPreview={commandPreview}
        agentStream={agentStream}
        deployStartedAtMs={deployStartedAtMs}
        onDismiss={() => setLivePanelVisible(false)}
      />

      <Dialog
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open);
          if (!open) {
            setDeployUserPrompt("");
            setForceFreshAgent(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deploy to cloud?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Launchpad materializes env files, then starts an agent to run{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-[11px]">deploy.sh</code>. The agent
            may edit your development repo and retry up to 5 times on failure. Fixes are
            checkpointed between attempts and published to your dev branch after URLs pass checks
            (merge or pull request per backend settings). This may take several minutes.
          </p>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-user-prompt`}>Additional instructions (optional)</Label>
            <Textarea
              id={`${idPrefix}-user-prompt`}
              rows={3}
              value={deployUserPrompt}
              onChange={(e) => setDeployUserPrompt(e.target.value)}
              placeholder="e.g. Focus on staging only, or skip frontend stack changes"
            />
          </div>
          <div className="flex items-start gap-2">
            <Checkbox
              id={`${idPrefix}-fresh-agent`}
              checked={forceFreshAgent}
              onCheckedChange={(checked) => setForceFreshAgent(checked === true)}
            />
            <div className="space-y-1">
              <Label htmlFor={`${idPrefix}-fresh-agent`} className="font-normal leading-snug">
                Deploy with a fresh agent
              </Label>
              <p className="text-xs text-muted-foreground">
                On each retry, start a new agent with a clean GitHub clone instead of continuing the
                same workspace.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleConfirmDeploy}>
              Deploy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
