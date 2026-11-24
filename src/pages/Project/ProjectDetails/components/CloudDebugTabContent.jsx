import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchCloudDebugChatReadiness } from "@/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  persistCloudDebugFixHandoff,
  cloudDebugFixActionLabel,
} from "@/utils/cloudDebugFixHandoff.util";
import { CloudDebugChatPanel } from "./CloudDebugChatPanel";
import { CloudDebugFixNowDialog } from "./CloudDebugFixNowDialog";
import { PROJECT_BUDGET_EXCEEDED_MESSAGE } from "@/constants/projectBudget";
import { usePlatformDeployMode } from "@/context/PlatformDeployModeProvider";
import { PLATFORM_PREPARE_PROMPT_BLOCKED_MESSAGE } from "@/constants/platformDeployMode";

/**
 * Cloud → Debugging tab: readiness gate, environment picker, and ask-only debug chat.
 */
export function CloudDebugTabContent({ project, hasDeveloperRepo, onNavigate }) {
  const [readiness, setReadiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [environmentId, setEnvironmentId] = useState("");
  const [fixNowDialogOpen, setFixNowDialogOpen] = useState(false);
  const [pendingFixPayload, setPendingFixPayload] = useState(null);

  const { isBlocking: platformDeployBlocking } = usePlatformDeployMode();
  const budgetBlocked = Boolean(project?.isOverBudget);
  const canSendChat = hasDeveloperRepo && !budgetBlocked && !platformDeployBlocking;
  const chatDisabledHint = budgetBlocked
    ? PROJECT_BUDGET_EXCEEDED_MESSAGE
    : platformDeployBlocking
      ? PLATFORM_PREPARE_PROMPT_BLOCKED_MESSAGE
      : "Connect a development repository to use debugging chat.";

  const loadReadiness = useCallback(async () => {
    if (!project?.id) return;
    setLoading(true);
    try {
      const data = await fetchCloudDebugChatReadiness(project.id, environmentId || undefined);
      setReadiness(data);
      if (!environmentId && data?.environmentId) {
        setEnvironmentId(data.environmentId);
      }
    } catch {
      setReadiness({ ready: false, blockers: [{ message: "Could not load debugging status." }] });
    } finally {
      setLoading(false);
    }
  }, [project?.id, environmentId]);

  useEffect(() => {
    void loadReadiness();
  }, [loadReadiness]);

  const environments = useMemo(
    () => (Array.isArray(readiness?.environments) ? readiness.environments : []),
    [readiness?.environments],
  );

  const handleEnvironmentChange = (value) => {
    setEnvironmentId(value);
  };

  const handleFixNow = useCallback(
    (payload) => {
      if (!project?.id) return;
      if (!canSendChat) {
        toast.error(chatDisabledHint);
        return;
      }
      setPendingFixPayload(payload);
      setFixNowDialogOpen(true);
    },
    [project?.id, canSendChat, chatDisabledHint],
  );

  const handleFixNowDialogOpenChange = useCallback((open) => {
    setFixNowDialogOpen(open);
    if (!open) {
      setPendingFixPayload(null);
    }
  }, []);

  const handleConfirmFixNow = useCallback(
    (confirmPayload) => {
      if (!project?.id || !pendingFixPayload) return;
      const additionalPrompt =
        typeof confirmPayload === "string"
          ? confirmPayload
          : typeof confirmPayload?.additionalPrompt === "string"
            ? confirmPayload.additionalPrompt
            : "";
      const baseBranch =
        typeof confirmPayload === "object" && typeof confirmPayload?.baseBranch === "string"
          ? confirmPayload.baseBranch.trim()
          : "";
      persistCloudDebugFixHandoff(project.id, {
        ...pendingFixPayload,
        additionalPrompt,
        ...(baseBranch ? { baseBranch } : {}),
      });
      const actionLabel = cloudDebugFixActionLabel(pendingFixPayload.fixAction);
      setFixNowDialogOpen(false);
      setPendingFixPayload(null);
      onNavigate?.("backend", { area: "backend-code" });
      toast.message(`Opening Backend Code (${actionLabel})…`);
    },
    [project?.id, pendingFixPayload, onNavigate],
  );

  const goToBlocker = (href) => {
    if (href === "environment") {
      onNavigate?.("cloud", { area: "environment" });
      return;
    }
    if (href === "deploy") {
      onNavigate?.("cloud", { area: "deploy" });
    }
  };

  if (loading && !readiness) {
    return (
      <div
        className="flex min-h-0 flex-1 flex-col gap-4"
        role="status"
        aria-busy="true"
        aria-label="Loading debugging"
      >
        <div className="max-w-xs space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-9 w-full" />
        </div>
        <Skeleton className="min-h-[240px] w-full flex-1 rounded-xl" />
      </div>
    );
  }

  if (!readiness?.ready) {
    const blockers = Array.isArray(readiness?.blockers) ? readiness.blockers : [];
    return (
      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle>Debugging</CardTitle>
          <CardDescription>
            Describe production issues and get guidance from an AI agent that reads your code and
            checks AWS logs — credentials stay on the server.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {environments.length > 0 ? (
            <div className="max-w-xs space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="debug-env-select">
                Environment
              </label>
              <Select
                value={environmentId || readiness?.environmentId || ""}
                onValueChange={handleEnvironmentChange}
              >
                <SelectTrigger id="debug-env-select">
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
          <ul className="space-y-3">
            {blockers.map((blocker) => (
              <li
                key={blocker.code || blocker.message}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/80 bg-muted/30 px-4 py-3 text-sm"
              >
                <span className="text-muted-foreground">{blocker.message}</span>
                {blocker.href ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => goToBlocker(blocker.href)}
                  >
                    Go to {blocker.href === "environment" ? "Environment" : "Deploy"}
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="max-w-xs space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="debug-env-active">
            Environment
          </label>
          <Select
            value={environmentId || readiness?.environmentId || ""}
            onValueChange={handleEnvironmentChange}
          >
            <SelectTrigger id="debug-env-active">
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
      </div>
      <CloudDebugChatPanel
        projectId={project.id}
        environmentId={environmentId || readiness?.environmentId || ""}
        canSend={canSendChat}
        disabledHint={chatDisabledHint}
        onFixNow={handleFixNow}
      />
      <CloudDebugFixNowDialog
        open={fixNowDialogOpen}
        onOpenChange={handleFixNowDialogOpenChange}
        fixActionLabel={cloudDebugFixActionLabel(pendingFixPayload?.fixAction)}
        onConfirm={handleConfirmFixNow}
      />
    </div>
  );
}
