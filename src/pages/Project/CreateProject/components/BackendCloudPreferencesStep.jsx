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
import {
  normalizeBackendDeployMode,
  normalizeBackendInfraStack,
  normalizeBackendLockAgentMode,
} from "@/pages/Project/ProjectDetails/components/ReleaseLockBackendAgentCard";

export function BackendCloudPreferencesStep({
  backendLockAgentMode,
  onBackendLockAgentModeChange,
  backendInfraStack,
  onBackendInfraStackChange,
  backendDeployMode,
  onBackendDeployModeChange,
  idPrefix = "onboarding-backend-cloud",
  disabled = false,
}) {
  const displayMode = normalizeBackendLockAgentMode(backendLockAgentMode);
  const displayInfraStack = normalizeBackendInfraStack(backendInfraStack);
  const displayDeployMode = normalizeBackendDeployMode(backendDeployMode);
  const infraIsNone = displayInfraStack === "none";

  const handleInfraChange = (nextRaw) => {
    const nextStack = normalizeBackendInfraStack(nextRaw);
    onBackendInfraStackChange?.(nextStack);
    if (nextStack === "none") {
      onBackendDeployModeChange?.("server");
    }
  };

  return (
    <Card className="border-border shadow-sm">
      <CardContent className="space-y-6 pt-6">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-agent-mode`}>Release-lock backend agent</Label>
          <p className="text-xs text-muted-foreground">
            After a release lock with a development repository, the agent writes a backend plan or
            implements backend code. You can change this later in Project Details.
          </p>
          <Select
            value={displayMode}
            onValueChange={(next) =>
              onBackendLockAgentModeChange?.(normalizeBackendLockAgentMode(next))
            }
            disabled={disabled}
          >
            <SelectTrigger id={`${idPrefix}-agent-mode`} className={selectTriggerWrap}>
              <SelectValue placeholder="Choose mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="plan">Plan — backend plan document</SelectItem>
              <SelectItem value="code_auto">
                Code + auto merge — implement and merge to base branch
              </SelectItem>
              <SelectItem value="code_pr">Code + PR — implement and open a pull request</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-infra-stack`}>Infrastructure and hosting</Label>
          <p className="text-xs text-muted-foreground">
            Sets how backend infrastructure is generated at release lock (e.g. AWS CloudFormation
            with Server).
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Select value={displayInfraStack} onValueChange={handleInfraChange} disabled={disabled}>
              <SelectTrigger id={`${idPrefix}-infra-stack`}>
                <SelectValue placeholder="Choose stack" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cloudformation">AWS CloudFormation</SelectItem>
                <SelectItem value="terraform">Terraform</SelectItem>
                <SelectItem value="none">None</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={displayDeployMode}
              onValueChange={(next) =>
                onBackendDeployModeChange?.(normalizeBackendDeployMode(next))
              }
              disabled={disabled || infraIsNone}
            >
              <SelectTrigger id={`${idPrefix}-deploy-mode`}>
                <SelectValue placeholder="Choose hosting" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="server">With Server</SelectItem>
                <SelectItem value="serverless">Serverless</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {infraIsNone ? (
            <p className="text-xs text-muted-foreground">
              Hosting is not applicable when infrastructure is None.
            </p>
          ) : displayDeployMode === "serverless" ? (
            <p className="text-xs text-muted-foreground">
              Connect a development repository in the next step (Migrate) or later in Project
              Details. Codebase compatibility is checked when you switch to Serverless after a dev
              repo is linked.
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
