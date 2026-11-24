import { useCallback, useEffect, useState } from "react";
import { updateProject } from "@/api";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  selectTriggerWrap,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { logger } from "@/utils/logger";
import { useAuth } from "@/context/AuthContext";
import {
  PROJECT_SETTINGS_ACCESS_HINT,
  userCanAccessProjectSettings,
} from "@/lib/releasePresentation";
import { BackendCloudDeploySection } from "./BackendCloudDeploySection";

/** Normalizes backend lock agent mode from project/API. */
export function normalizeBackendLockAgentMode(value) {
  const normalized = String(value ?? "code_auto")
    .trim()
    .toLowerCase();
  if (normalized === "code" || normalized === "code_auto") return "code_auto";
  if (normalized === "code_pr") return "code_pr";
  return "plan";
}

/** True when mode uses the code implementation prompt and infra/env settings. */
export function isBackendLockCodeMode(value) {
  const mode = normalizeBackendLockAgentMode(value);
  return mode === "code_auto" || mode === "code_pr";
}

/** Normalizes infra stack from project/API to cloudformation, terraform, or none. */
export function normalizeBackendInfraStack(value) {
  const normalized = String(value ?? "cloudformation")
    .trim()
    .toLowerCase();
  if (normalized === "terraform") return "terraform";
  if (normalized === "none") return "none";
  return "cloudformation";
}

/** Normalizes deploy mode from project/API to server or serverless. */
export function normalizeBackendDeployMode(value) {
  const normalized = String(value ?? "server")
    .trim()
    .toLowerCase();
  if (normalized === "serverless") return "serverless";
  return "server";
}

/**
 * Release-lock backend agent settings — mode and infra stack.
 * Controlled mode: parent owns values/onChange (Edit Project form).
 * Standalone mode: mode/infra auto-save.
 */
export function ReleaseLockBackendAgentCard({
  mode = "controlled",
  project,
  value,
  onChange,
  infraStackValue,
  onInfraStackChange,
  deployModeValue,
  onDeployModeChange,
  cloudDeployConfigValue,
  onCloudDeployConfigChange,
  onProjectUpdated,
  idPrefix = "backend-lock-agent-mode",
  /** When true, hint says "in Project settings" instead of "above". */
  devRepoHintInEditProject = false,
  className,
}) {
  const [standaloneMode, setStandaloneMode] = useState("code_auto");
  const [savingField, setSavingField] = useState(null);
  const { user } = useAuth();
  const canAccessProjectSettings = userCanAccessProjectSettings(user, project);

  const hasDevelopmentRepo = Boolean(String(project?.developmentRepoUrl ?? "").trim());

  useEffect(() => {
    if (mode !== "standalone" || !project) return;
    setStandaloneMode(normalizeBackendLockAgentMode(project.backendLockAgentMode));
  }, [mode, project?.id, project?.backendLockAgentMode]);

  const displayMode = mode === "standalone" ? standaloneMode : value;
  const displayInfraStack =
    mode === "standalone"
      ? normalizeBackendInfraStack(project?.backendInfraStack)
      : infraStackValue;
  const displayDeployMode =
    mode === "standalone"
      ? normalizeBackendDeployMode(project?.backendDeployMode)
      : deployModeValue;

  const selectId = `${idPrefix}`;
  const infraSelectId = `${idPrefix}-infra-stack`;

  const devRepoHint = devRepoHintInEditProject
    ? "Add a development repository in Project settings for this to apply at release lock."
    : "Add a development repository above for this to apply at release lock.";

  const persistStandalone = useCallback(
    async (payload, fieldLabel, revert) => {
      if (!project?.id) return;
      if (!userCanAccessProjectSettings(user, project)) {
        toast.error(PROJECT_SETTINGS_ACCESS_HINT);
        revert?.();
        return;
      }
      setSavingField(fieldLabel);
      try {
        await updateProject(project.id, payload);
        toast.success("Release-lock backend agent updated.");
        await onProjectUpdated?.();
      } catch (err) {
        revert?.();
        const msg =
          (typeof err === "object" && err && err.error) || err?.message || "Could not save setting";
        toast.error(String(msg));
        logger.error("ReleaseLockBackendAgentCard save failed", err);
      } finally {
        setSavingField(null);
      }
    },
    [onProjectUpdated, project, user],
  );

  const handleModeChange = async (nextRaw) => {
    const nextMode = normalizeBackendLockAgentMode(nextRaw);

    if (mode === "controlled") {
      onChange?.(nextMode);
      return;
    }

    const prevMode = normalizeBackendLockAgentMode(project?.backendLockAgentMode);
    if (nextMode === prevMode) return;

    setStandaloneMode(nextMode);
    await persistStandalone({ backendLockAgentMode: nextMode }, "mode", () =>
      setStandaloneMode(prevMode),
    );
  };

  const handleInfraStackChange = (nextRaw) => {
    const nextStack = normalizeBackendInfraStack(nextRaw);
    if (mode === "controlled") {
      onInfraStackChange?.(nextStack);
      if (nextStack === "none") {
        onDeployModeChange?.("server");
      }
    }
  };

  const handleDeployModeChange = (nextRaw) => {
    const nextDeployMode = normalizeBackendDeployMode(nextRaw);
    if (mode === "controlled") {
      onDeployModeChange?.(nextDeployMode);
    }
  };

  const isStandaloneSaving = mode === "standalone" && savingField != null;

  return (
    <Card className={className ?? "border-border shadow-sm"}>
      <CardContent className="space-y-6 pt-6">
        <div className="space-y-2">
          <Label htmlFor={selectId}>Release-lock backend agent</Label>
          <p className="text-xs text-muted-foreground">
            After a release lock with a development repository, the agent writes a backend plan
            (Plan) or implements backend code (Code + auto merge or Code + PR). Infrastructure and
            hosting are set under Cloud Infra. Edit prompts under Prompt Management.
          </p>
          <Select
            value={displayMode}
            onValueChange={handleModeChange}
            disabled={
              isStandaloneSaving ||
              (mode === "standalone" && (!project?.id || !canAccessProjectSettings))
            }
          >
            <SelectTrigger id={selectId} className={selectTriggerWrap}>
              {savingField === "mode" ? (
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Saving…
                </span>
              ) : (
                <SelectValue placeholder="Choose mode" />
              )}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="plan">Plan — backend plan document</SelectItem>
              <SelectItem value="code_auto">
                Code + auto merge — implement and merge to base branch
              </SelectItem>
              <SelectItem value="code_pr">Code + PR — implement and open a pull request</SelectItem>
            </SelectContent>
          </Select>
          {!hasDevelopmentRepo ? (
            <p className="text-xs text-muted-foreground">{devRepoHint}</p>
          ) : null}
        </div>

        {mode === "controlled" ? (
          <BackendCloudDeploySection
            mode={mode}
            project={project}
            displayInfraStack={displayInfraStack}
            cloudDeployConfigValue={cloudDeployConfigValue}
            onCloudDeployConfigChange={onCloudDeployConfigChange}
            onProjectUpdated={onProjectUpdated}
            idPrefix={`${idPrefix}-cloud-deploy`}
            isParentSaving={isStandaloneSaving}
            infraSelectSlot={
              <Select
                value={displayInfraStack}
                onValueChange={handleInfraStackChange}
                disabled={isStandaloneSaving}
              >
                <SelectTrigger id={infraSelectId} className={selectTriggerWrap}>
                  <SelectValue placeholder="Choose stack" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cloudformation">AWS CloudFormation</SelectItem>
                  <SelectItem value="terraform">Terraform</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            }
            deployModeSelectSlot={
              <Select
                value={displayDeployMode}
                onValueChange={handleDeployModeChange}
                disabled={isStandaloneSaving || displayInfraStack === "none"}
              >
                <SelectTrigger id={`${idPrefix}-deploy-mode`} className={selectTriggerWrap}>
                  <SelectValue placeholder="Choose hosting" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="server">With Server</SelectItem>
                  <SelectItem value="serverless">Serverless</SelectItem>
                </SelectContent>
              </Select>
            }
          />
        ) : null}
      </CardContent>
    </Card>
  );
}
