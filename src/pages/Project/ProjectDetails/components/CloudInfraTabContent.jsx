import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { updateProject } from "@/api";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Cloud, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { logger } from "@/utils/logger";
import { BackendCloudDeploySection } from "./BackendCloudDeploySection";
import { CicdDeliveryCard } from "./CicdDeliveryCard";
import { InfraAnalysisChatPanel } from "./infraAnalysis/InfraAnalysisChatPanel";
import { PROJECT_BUDGET_EXCEEDED_MESSAGE } from "@/constants/projectBudget";
import { useAuth } from "@/context/AuthContext";
import { usePlatformDeployMode } from "@/context/PlatformDeployModeProvider";
import { PLATFORM_PREPARE_PROMPT_BLOCKED_MESSAGE } from "@/constants/platformDeployMode";
import {
  PROJECT_SETTINGS_ACCESS_HINT,
  userCanAccessProjectSettings,
} from "@/lib/releasePresentation";
import {
  normalizeBackendDeployMode,
  normalizeBackendInfraStack,
} from "./ReleaseLockBackendAgentCard";
import { ServerlessCompatibilityAlert } from "./ServerlessCompatibilityAlert";
import { buildProjectBackendCodePath } from "@/lib/onboardPreviewUrl";
import {
  persistServerlessCompatibilityFixHandoff,
  readServerlessCompatibilityFailure,
} from "@/utils/serverlessCompatibilityFixHandoff.util";

const ID_PREFIX = "cloud-infra";

/**
 * Backend Platform → Cloud Infra tab: stack + hosting mode, Deploy to Cloud, and deploy config.
 */
export function CloudInfraTabContent({
  project,
  onProjectUpdated,
  hasDeveloperRepo = false,
  canManageReleases = false,
  addCursorRulesDisabledHint,
}) {
  const [infraStack, setInfraStack] = useState("cloudformation");
  const [deployMode, setDeployMode] = useState("server");
  const [savingInfra, setSavingInfra] = useState(false);
  const [savingDeployMode, setSavingDeployMode] = useState(false);
  const [serverlessCompatibilityError, setServerlessCompatibilityError] = useState(null);
  const [cicd, setCicd] = useState(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const canAccessProjectSettings = userCanAccessProjectSettings(user, project);

  useEffect(() => {
    if (!project) return;
    setInfraStack(normalizeBackendInfraStack(project.backendInfraStack));
    setDeployMode(normalizeBackendDeployMode(project.backendDeployMode));
  }, [project?.id, project?.backendInfraStack, project?.backendDeployMode]);

  const persistProjectField = useCallback(
    async (payload, fieldLabel, revert) => {
      if (!project?.id) return;
      if (!userCanAccessProjectSettings(user, project)) {
        toast.error(PROJECT_SETTINGS_ACCESS_HINT);
        revert?.();
        return;
      }
      const savingSetter = fieldLabel === "infra" ? setSavingInfra : setSavingDeployMode;
      savingSetter(true);
      try {
        await updateProject(project.id, payload);
        setServerlessCompatibilityError(null);
        toast.success("Infrastructure settings updated.");
        await onProjectUpdated?.();
      } catch (err) {
        revert?.();
        const compatibility = readServerlessCompatibilityFailure(err);
        if (compatibility) {
          setServerlessCompatibilityError(compatibility);
          toast.error("Hosting stayed With Server. Review the blockers below.");
        } else {
          const msg =
            (typeof err === "object" && err && err.error) ||
            err?.message ||
            "Could not save setting";
          toast.error(String(msg));
        }
        logger.error("CloudInfraTabContent save failed", err);
      } finally {
        savingSetter(false);
      }
    },
    [onProjectUpdated, project, user],
  );

  const persistInfraStack = useCallback(
    async (nextRaw) => {
      if (!project?.id) return;
      const nextStack = normalizeBackendInfraStack(nextRaw);
      const prevStack = normalizeBackendInfraStack(project?.backendInfraStack);
      if (nextStack === prevStack) return;

      const prevDeployMode = normalizeBackendDeployMode(project?.backendDeployMode);
      const nextDeployMode = nextStack === "none" ? "server" : deployMode;

      setInfraStack(nextStack);
      if (nextStack === "none") {
        setDeployMode("server");
      }

      const payload = { backendInfraStack: nextStack };
      if (nextStack === "none" && prevDeployMode !== "server") {
        payload.backendDeployMode = "server";
      }

      await persistProjectField(payload, "infra", () => {
        setInfraStack(prevStack);
        setDeployMode(prevDeployMode);
      });
    },
    [
      deployMode,
      persistProjectField,
      project?.backendDeployMode,
      project?.backendInfraStack,
      project?.id,
    ],
  );

  const persistDeployMode = useCallback(
    async (nextRaw) => {
      if (!project?.id) return;
      const displayStack = normalizeBackendInfraStack(infraStack);
      if (displayStack === "none") return;

      const nextMode = normalizeBackendDeployMode(nextRaw);
      const prevMode = normalizeBackendDeployMode(project?.backendDeployMode);
      if (nextMode === prevMode) return;

      setDeployMode(nextMode);
      await persistProjectField({ backendDeployMode: nextMode }, "deployMode", () =>
        setDeployMode(prevMode),
      );
    },
    [infraStack, persistProjectField, project?.backendDeployMode, project?.id],
  );

  const displayStack = normalizeBackendInfraStack(infraStack);
  const displayDeployMode = normalizeBackendDeployMode(deployMode);
  const showDeploySection = displayStack !== "none";
  const isSaving = savingInfra || savingDeployMode;
  const serverlessDisabled = displayStack === "none";
  const checkingServerlessCompatibility =
    savingDeployMode &&
    displayDeployMode === "serverless" &&
    normalizeBackendDeployMode(project?.backendDeployMode) === "server";
  const { isBlocking: platformDeployBlocking } = usePlatformDeployMode();
  const canSendChat = Boolean(
    canManageReleases && hasDeveloperRepo && !project?.isOverBudget && !platformDeployBlocking,
  );
  const fixServerlessCompatibility = useCallback(() => {
    if (!project?.id || !serverlessCompatibilityError) return;
    persistServerlessCompatibilityFixHandoff(project.id, serverlessCompatibilityError);
    const path = buildProjectBackendCodePath(project.id);
    if (path) navigate(path);
  }, [navigate, project?.id, serverlessCompatibilityError]);

  const chatDisabledHint = project?.isOverBudget
    ? PROJECT_BUDGET_EXCEEDED_MESSAGE
    : platformDeployBlocking
      ? PLATFORM_PREPARE_PROMPT_BLOCKED_MESSAGE
      : addCursorRulesDisabledHint;

  const remoteCicdActive = Boolean(
    cicd?.enabled && (cicd.provider === "github_actions" || cicd.provider === "aws_codepipeline"),
  );

  const infraSelect = (
    <Select
      value={displayStack}
      onValueChange={persistInfraStack}
      disabled={isSaving || !project?.id || !canAccessProjectSettings}
    >
      <SelectTrigger id={`${ID_PREFIX}-infra-stack`}>
        {savingInfra ? (
          <span className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Saving…
          </span>
        ) : (
          <SelectValue placeholder="Choose stack" />
        )}
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="cloudformation">AWS CloudFormation</SelectItem>
        <SelectItem value="terraform">Terraform</SelectItem>
        <SelectItem value="none">None</SelectItem>
      </SelectContent>
    </Select>
  );

  const deployModeSelect = (
    <Select
      value={displayDeployMode}
      onValueChange={persistDeployMode}
      disabled={isSaving || !project?.id || serverlessDisabled || !canAccessProjectSettings}
    >
      <SelectTrigger id={`${ID_PREFIX}-deploy-mode`}>
        {savingDeployMode ? (
          <span className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            {checkingServerlessCompatibility ? "Checking serverless compatibility…" : "Saving…"}
          </span>
        ) : (
          <SelectValue placeholder="Choose hosting" />
        )}
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="server">With Server</SelectItem>
        <SelectItem value="serverless">Serverless</SelectItem>
      </SelectContent>
    </Select>
  );

  const infraRow = (
    <div className="grid gap-2 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor={`${ID_PREFIX}-infra-stack`}>Infrastructure tool</Label>
        {infraSelect}
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${ID_PREFIX}-deploy-mode`}>Hosting</Label>
        {deployModeSelect}
        {serverlessDisabled ? (
          <p className="text-xs text-muted-foreground">None uses With Server only.</p>
        ) : null}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <Card className="border-border shadow-sm">
        <CardContent className="space-y-6 pt-6">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Cloud className="size-5" aria-hidden />
            </div>
            <div className="min-w-0 space-y-1">
              <h3 className="text-base font-semibold text-foreground">Cloud infrastructure</h3>
              <p className="text-sm text-muted-foreground">
                Choose how backend infrastructure is deployed and run deploys from your development
                repository.
              </p>
              {!canAccessProjectSettings ? (
                <p className="text-xs text-muted-foreground">{PROJECT_SETTINGS_ACCESS_HINT}</p>
              ) : null}
            </div>
          </div>

          {showDeploySection ? (
            <>
              <CicdDeliveryCard
                projectId={project?.id}
                canManage={canAccessProjectSettings}
                onStatus={setCicd}
              />
              <BackendCloudDeploySection
                mode="standalone"
                project={project}
                displayInfraStack={displayStack}
                onProjectUpdated={onProjectUpdated}
                idPrefix={`${ID_PREFIX}-cloud-deploy`}
                isParentSaving={isSaving}
                infraSelectSlot={infraSelect}
                deployModeSelectSlot={deployModeSelect}
                remoteCicdActive={remoteCicdActive}
              />
              <ServerlessCompatibilityAlert
                error={serverlessCompatibilityError}
                onFix={fixServerlessCompatibility}
                canFix={hasDeveloperRepo}
              />
            </>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Combined as {"{{infraStack}}"} in the release-lock backend prompt.
              </p>
              {infraRow}
            </div>
          )}
        </CardContent>
      </Card>

      <InfraAnalysisChatPanel
        projectId={project?.id}
        project={project}
        canSend={canSendChat}
        disabledHint={chatDisabledHint ?? addCursorRulesDisabledHint}
      />
    </div>
  );
}
