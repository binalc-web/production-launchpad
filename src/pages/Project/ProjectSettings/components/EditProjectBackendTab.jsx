import { Info } from "lucide-react";
import { ReleaseLockBackendAgentCard } from "@/pages/Project/ProjectDetails/components/ReleaseLockBackendAgentCard";
import { AWS_AUTH_MODES } from "../constants";

export function EditProjectBackendTab({
  project,
  backendLockAgentMode,
  onBackendLockAgentModeChange,
  backendInfraStack,
  onBackendInfraStackChange,
  backendDeployMode,
  onBackendDeployModeChange,
  backendCloudDeployConfig,
  onBackendCloudDeployConfigChange,
  awsAuthMode,
  onAwsAuthModeChange,
}) {
  return (
    <div className="space-y-6 max-w-3xl">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Backend setup</h2>
        <p className="text-sm text-muted-foreground">
          Release-lock agent behavior, infrastructure stack, and cloud deploy configuration.
        </p>
      </div>

      <div className="flex gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        <Info className="size-4 shrink-0 mt-0.5 text-primary" aria-hidden />
        <p>
          Release-lock agent mode is edited here. Infrastructure and cloud deploy settings also
          appear on <span className="font-medium text-foreground">Cloud Infra</span> (auto-save
          there). Changes on this page save when you click{" "}
          <span className="font-medium text-foreground">Save changes</span>.
        </p>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-foreground">
          AWS account for deploy and debugging
        </legend>
        <p className="text-sm text-muted-foreground">
          Internal apps in this server&apos;s AWS account can use its IAM role. Another account or
          another EC2 still needs access keys.
        </p>
        <div className="space-y-2">
          <label className="flex cursor-pointer gap-3 rounded-lg border border-border px-4 py-3">
            <input
              type="radio"
              name="aws-auth-mode"
              className="mt-1"
              value={AWS_AUTH_MODES.INSTANCE_ROLE}
              checked={awsAuthMode === AWS_AUTH_MODES.INSTANCE_ROLE}
              onChange={() => onAwsAuthModeChange(AWS_AUTH_MODES.INSTANCE_ROLE)}
            />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-foreground">
                LaunchPad server role
              </span>
              <span className="mt-0.5 block text-sm text-muted-foreground">
                Deploy and debugging use this machine&apos;s IAM role. Access key and secret are not
                asked.
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer gap-3 rounded-lg border border-border px-4 py-3">
            <input
              type="radio"
              name="aws-auth-mode"
              className="mt-1"
              value={AWS_AUTH_MODES.ACCESS_KEYS}
              checked={awsAuthMode !== AWS_AUTH_MODES.INSTANCE_ROLE}
              onChange={() => onAwsAuthModeChange(AWS_AUTH_MODES.ACCESS_KEYS)}
            />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-foreground">
                External AWS account
              </span>
              <span className="mt-0.5 block text-sm text-muted-foreground">
                Paste an access key and secret on the Environment tab for another account or another
                EC2.
              </span>
            </span>
          </label>
        </div>
      </fieldset>

      <ReleaseLockBackendAgentCard
        mode="controlled"
        project={project}
        value={backendLockAgentMode}
        onChange={onBackendLockAgentModeChange}
        infraStackValue={backendInfraStack}
        onInfraStackChange={onBackendInfraStackChange}
        deployModeValue={backendDeployMode}
        onDeployModeChange={onBackendDeployModeChange}
        cloudDeployConfigValue={backendCloudDeployConfig}
        onCloudDeployConfigChange={onBackendCloudDeployConfigChange}
        idPrefix="settings-backend-lock-agent-mode"
      />
    </div>
  );
}
