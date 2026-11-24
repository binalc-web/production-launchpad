import { useEffect, useMemo, useState } from "react";
import { fetchPublicClientLinkDeployEnvironments } from "@/api";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { isYorkInternalClientLinkEmail } from "@/lib/clientLinkVerifiedEmail";
import { logger } from "@/utils/logger";

/**
 * York internal only: optional deploy-to-environment when locking from client-link preview.
 */
export function ClientLinkLockDeployOptions({
  projectSlug,
  lockEmail,
  disabled,
  deployAfterLock,
  onDeployAfterLockChange,
  deployEnvironmentId,
  onDeployEnvironmentIdChange,
}) {
  const yorkInternal = useMemo(() => isYorkInternalClientLinkEmail(lockEmail), [lockEmail]);
  const [loading, setLoading] = useState(false);
  const [available, setAvailable] = useState(false);
  const [environments, setEnvironments] = useState([]);

  useEffect(() => {
    if (!yorkInternal || !projectSlug?.trim() || !lockEmail.trim()) {
      setAvailable(false);
      setEnvironments([]);
      onDeployAfterLockChange?.(false);
      onDeployEnvironmentIdChange?.("");
      return;
    }

    let cancelled = false;
    setLoading(true);
    void fetchPublicClientLinkDeployEnvironments(projectSlug, lockEmail)
      .then((data) => {
        if (cancelled) return;
        const envs = Array.isArray(data?.environments) ? data.environments : [];
        setAvailable(Boolean(data?.available) && envs.length > 0);
        setEnvironments(envs);
        if (!data?.available || !envs.length) {
          onDeployAfterLockChange?.(false);
          onDeployEnvironmentIdChange?.("");
          return;
        }
        const firstId = envs[0]?.id ?? "";
        if (!deployEnvironmentId || !envs.some((row) => row.id === deployEnvironmentId)) {
          onDeployEnvironmentIdChange?.(firstId);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        logger.error("client_link_lock_deploy_environments", err);
        setAvailable(false);
        setEnvironments([]);
        onDeployAfterLockChange?.(false);
        onDeployEnvironmentIdChange?.("");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    yorkInternal,
    projectSlug,
    lockEmail,
    deployEnvironmentId,
    onDeployAfterLockChange,
    onDeployEnvironmentIdChange,
  ]);

  if (!yorkInternal) return null;

  return (
    <div className="mt-3 space-y-3 border-t border-slate-200 pt-3">
      {loading ? (
        <div
          className="flex items-start gap-2"
          role="status"
          aria-busy="true"
          aria-label="Loading deploy environments"
        >
          <Skeleton className="size-4 rounded-sm" />
          <div className="grid flex-1 gap-1.5">
            <Skeleton className="h-4 w-[70%] rounded-sm" />
            <Skeleton className="h-3 w-[55%] rounded-sm" />
          </div>
        </div>
      ) : available ? (
        <>
          <div className="flex items-start gap-2">
            <Checkbox
              id="client-link-lock-deploy-after"
              checked={deployAfterLock}
              onCheckedChange={(checked) => onDeployAfterLockChange?.(checked === true)}
              disabled={disabled}
            />
            <div className="grid gap-1 leading-none">
              <Label
                htmlFor="client-link-lock-deploy-after"
                className="cursor-pointer text-sm font-medium text-slate-800"
              >
                Deploy to environment after backend is ready
              </Label>
              <p className="text-xs text-slate-600">
                Starts a cloud deploy when the backend lock agent finishes.
              </p>
            </div>
          </div>
          {deployAfterLock ? (
            <div className="space-y-2 pl-6">
              <Label htmlFor="client-link-lock-deploy-env" className="text-slate-700">
                Environment
              </Label>
              <Select
                value={deployEnvironmentId || undefined}
                onValueChange={(value) => onDeployEnvironmentIdChange?.(value)}
                disabled={disabled}
              >
                <SelectTrigger
                  id="client-link-lock-deploy-env"
                  className="rounded-lg border-slate-200"
                >
                  <SelectValue placeholder="Select environment" />
                </SelectTrigger>
                <SelectContent>
                  {environments.map((env) => (
                    <SelectItem key={env.id} value={env.id}>
                      {env.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </>
      ) : (
        <p className="text-xs text-slate-500">
          Cloud deploy at lock needs a development repo, cloud infrastructure, and at least one
          deploy environment.
        </p>
      )}
    </div>
  );
}
