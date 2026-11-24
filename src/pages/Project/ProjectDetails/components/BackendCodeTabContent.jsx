import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowRight, Bot, Code2, GitBranch, Layers, Network, Settings2 } from "lucide-react";
import { BackendPlanAgentStatusBanner } from "@/components/release/BackendPlanAgentStatusBanner";
import { isReleaseBackendAgentFailed } from "@/lib/backendAgentStatus";
import { useReleasesSnapshot } from "@/pages/Project/ProductManagement/ReleasesSnapshotContext";
import { getActiveRelease } from "@/pages/Project/ProductManagement/utils/releaseWorkflowStatus";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useReleaseLockStreamContext } from "../context/ReleaseLockStreamContext";
import { normalizeBackendInfraStack } from "./ReleaseLockBackendAgentCard";
import { BackendCodeChatPanel } from "./BackendCodeChatPanel";
import { BackendCodeIdeWorkspace } from "./devIde/BackendCodeIdeWorkspace";
import { PROJECT_BUDGET_EXCEEDED_MESSAGE } from "@/constants/projectBudget";
import { useAuth } from "@/context/AuthContext";
import { usePlatformDeployMode } from "@/context/PlatformDeployModeProvider";
import { PLATFORM_PREPARE_PROMPT_BLOCKED_MESSAGE } from "@/constants/platformDeployMode";
import { fetchBackendCodeChatSessions } from "@/api";
import { formatReadableDate, userCanAccessProjectSettings } from "@/lib/releasePresentation";
import {
  formatBackendLockAgentModeShort,
  formatDevRepoRowCompact,
} from "@/lib/releaseLockPresentation";
import { navigateToApplicationImplement, navigateToBackendArea } from "@/lib/releaseNavigation";
import { cn, formatProjectVersionLabel } from "@/lib/utils";
import { devRowsFromStored } from "@/utils/projectMultiRepoForm";
import { buildProjectSettingsPath } from "@/pages/Project/ProjectSettings/constants";

function InfoRowsSkeleton({ label }) {
  return (
    <div role="status" aria-busy="true" aria-label={label}>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between gap-3 py-1.5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-24" />
        </div>
      ))}
    </div>
  );
}

function InfoRow({ label, value, valueClassName, mono = false }) {
  if (value == null || value === "") return null;
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 text-xs">
      <span className="shrink-0 whitespace-nowrap text-muted-foreground">{label}</span>
      <span
        className={cn(
          "min-w-0 truncate text-right font-medium text-foreground",
          mono && "font-mono text-[11px]",
          valueClassName,
        )}
        title={typeof value === "string" ? value : undefined}
      >
        {value}
      </span>
    </div>
  );
}

/**
 * @param {string | null | undefined} developmentRepoUrl
 * @returns {Array<{ path: string, ref: string }>}
 */
function connectedDevRepoRows(developmentRepoUrl) {
  const raw = String(developmentRepoUrl ?? "").trim();
  if (!raw) return [];
  const rows = devRowsFromStored(raw);
  if (rows?.length) {
    return rows
      .map((row) => ({
        path: String(row.path || "").trim(),
        ref: String(row.ref || "").trim() || "main",
      }))
      .filter((row) => row.path);
  }
  if (raw.startsWith("{")) {
    try {
      const parsed = JSON.parse(raw);
      const list = Array.isArray(parsed?.repos) ? parsed.repos : [];
      return list
        .map((repo) => ({
          path: String(repo?.path || "").trim(),
          ref: String(repo?.ref || "").trim() || "main",
        }))
        .filter((row) => row.path);
    } catch {
      return [];
    }
  }
  return [{ path: raw, ref: "main" }];
}

/**
 * App repositories → Chat: agent chat, IDE, and related workspace cards.
 */
export function BackendCodeTabContent({
  project,
  onProjectUpdated: _onProjectUpdated,
  canManageReleases,
  hasDeveloperRepo,
  addCursorRulesDisabledHint,
}) {
  const [, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const projectId = project?.id;
  const canAccessProjectSettings = userCanAccessProjectSettings(user, project);
  const canAddCursorPacks = canManageReleases && hasDeveloperRepo;
  const { isBlocking: platformDeployBlocking } = usePlatformDeployMode();
  const budgetBlocked = Boolean(project?.isOverBudget);
  const canSendChat = canAddCursorPacks && !budgetBlocked && !platformDeployBlocking;
  const chatDisabledHint = budgetBlocked
    ? PROJECT_BUDGET_EXCEEDED_MESSAGE
    : platformDeployBlocking
      ? PLATFORM_PREPARE_PROMPT_BLOCKED_MESSAGE
      : addCursorRulesDisabledHint;
  const hasInfraStack = normalizeBackendInfraStack(project?.backendInfraStack) !== "none";
  const [ideOpen, setIdeOpen] = useState(false);
  const [ideWorkspaceKey, setIdeWorkspaceKey] = useState(0);
  const [newChatConfirmOpen, setNewChatConfirmOpen] = useState(false);
  const [chatSessionsLoading, setChatSessionsLoading] = useState(false);
  const [chatSessionCount, setChatSessionCount] = useState(0);
  const [activeChatSessions, setActiveChatSessions] = useState(0);

  const { releases, loading: releasesLoading } = useReleasesSnapshot();
  const activeRelease = useMemo(() => getActiveRelease(releases), [releases]);
  const releaseVersions = Array.isArray(activeRelease?.versions) ? activeRelease.versions : [];
  const latestVersion = releaseVersions[0] ?? null;
  const latestVersionLabel = latestVersion?.version
    ? formatProjectVersionLabel(latestVersion.version)
    : null;

  const { retryBackendPlanAgentLock, backendPlanRetryReleaseId, lockRetryDisabled } =
    useReleaseLockStreamContext();

  const failedLockReleases = releases.filter((release) => isReleaseBackendAgentFailed(release));
  const devRepoRows = useMemo(
    () => connectedDevRepoRows(project?.developmentRepoUrl),
    [project?.developmentRepoUrl],
  );
  const lockModeLabel = formatBackendLockAgentModeShort(project?.backendLockAgentMode);

  const reloadChatSessions = useCallback(async () => {
    if (!projectId) {
      setChatSessionCount(0);
      setActiveChatSessions(0);
      return;
    }
    setChatSessionsLoading(true);
    try {
      const data = await fetchBackendCodeChatSessions(projectId);
      const rows = Array.isArray(data?.sessions) ? data.sessions : [];
      const active = rows.filter((row) => {
        const status = String(row?.status || "").toLowerCase();
        return status === "running" || status === "pending" || status === "generating";
      }).length;
      setChatSessionCount(rows.length);
      setActiveChatSessions(active);
    } catch {
      setChatSessionCount(0);
      setActiveChatSessions(0);
    } finally {
      setChatSessionsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void reloadChatSessions();
  }, [reloadChatSessions]);

  const settingsReposPath =
    projectId && canAccessProjectSettings
      ? buildProjectSettingsPath(projectId, "repositories")
      : null;

  return (
    <>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(280px,22rem)_minmax(0,1fr)] lg:h-[calc(100dvh-8rem)] lg:max-h-[calc(100dvh-8rem)] lg:min-h-0 lg:items-stretch">
        <div className="order-2 min-h-0 min-w-0 space-y-4 overflow-y-auto overscroll-y-contain pr-0.5 lg:order-1">
          {failedLockReleases.length > 0 ? (
            <div className="space-y-2" role="region" aria-label="Backend plan agent status">
              {failedLockReleases.map((release) => (
                <BackendPlanAgentStatusBanner
                  key={release.id}
                  release={release}
                  onRetry={
                    canManageReleases && retryBackendPlanAgentLock
                      ? () => void retryBackendPlanAgentLock(release)
                      : undefined
                  }
                  retryLoading={backendPlanRetryReleaseId === release.id}
                  retryDisabled={lockRetryDisabled}
                />
              ))}
            </div>
          ) : null}

          <Card className="gap-0 border-border py-0 shadow-sm">
            <CardContent className="space-y-3 p-3 sm:p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">Workspace</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5"
                  onClick={() => setIdeOpen(true)}
                  disabled={!hasDeveloperRepo}
                  title={
                    hasDeveloperRepo
                      ? "Open a fullscreen IDE with file tree, editor, and chat"
                      : "Connect a development repository to open the IDE"
                  }
                >
                  <Code2 className="size-3.5" aria-hidden />
                  Open IDE
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5"
                  disabled={!hasDeveloperRepo}
                  onClick={() => navigateToApplicationImplement(setSearchParams)}
                >
                  <GitBranch className="size-3.5" aria-hidden />
                  Implement
                </Button>
              </div>
              <p className="border-t border-border pt-3 text-xs text-muted-foreground">
                Chat in Agent, Plan, or Ask mode to work in development repos. Release-lock behavior
                is configured in{" "}
                <span className="font-medium text-foreground">Project Settings → Backend</span>.
              </p>
            </CardContent>
          </Card>

          <Card className="gap-0 border-border py-0 shadow-sm">
            <CardHeader className="px-3 py-2.5 sm:px-4">
              <CardTitle className="text-sm font-medium">Connected repositories</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 px-3 pb-3 pt-0 sm:px-4 sm:pb-4">
              {!hasDeveloperRepo ? (
                <div className="space-y-2 py-1">
                  <p className="text-xs text-muted-foreground">
                    No development repository linked yet.
                  </p>
                  {settingsReposPath ? (
                    <Button type="button" variant="secondary" size="sm" className="h-8" asChild>
                      <a href={settingsReposPath}>Add in project settings</a>
                    </Button>
                  ) : null}
                </div>
              ) : (
                <>
                  <InfoRow
                    label="Repositories"
                    value={devRepoRows.length > 1 ? `${devRepoRows.length} linked` : "1 linked"}
                  />
                  <ul className="m-0 list-none space-y-1 p-0 pt-1">
                    {devRepoRows.map((row) => (
                      <li
                        key={`${row.path}:${row.ref}`}
                        className="rounded-md border border-border/60 px-2.5 py-1.5 font-mono text-[11px] text-foreground"
                      >
                        {formatDevRepoRowCompact(row)}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="gap-0 border-border py-0 shadow-sm">
            <CardHeader className="px-3 py-2.5 sm:px-4">
              <CardTitle className="text-sm font-medium">Active release</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 px-3 pb-3 pt-0 sm:px-4 sm:pb-4">
              {releasesLoading ? (
                <InfoRowsSkeleton label="Loading active release" />
              ) : !activeRelease ? (
                <p className="py-2 text-xs text-muted-foreground">No active release.</p>
              ) : (
                <>
                  <InfoRow label="Release" value={activeRelease.name} />
                  <InfoRow
                    label="Revisions"
                    value={
                      releaseVersions.length > 0
                        ? `${releaseVersions.length}${
                            latestVersionLabel ? ` · latest ${latestVersionLabel}` : ""
                          }`
                        : "None yet"
                    }
                  />
                  {activeRelease.scopeItemCount != null ? (
                    <InfoRow label="Scope stories" value={String(activeRelease.scopeItemCount)} />
                  ) : null}
                  {activeRelease.releaseDate ? (
                    <InfoRow
                      label="Target date"
                      value={formatReadableDate(activeRelease.releaseDate)}
                    />
                  ) : null}
                </>
              )}
            </CardContent>
          </Card>

          <Card className="gap-0 border-border py-0 shadow-sm">
            <CardHeader className="px-3 py-2.5 sm:px-4">
              <CardTitle className="text-sm font-medium">Release lock</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 px-3 pb-3 pt-0 sm:px-4 sm:pb-4">
              <InfoRow label="Lock agent mode" value={lockModeLabel} />
              {failedLockReleases.length > 0 ? (
                <InfoRow
                  label="Failed lock runs"
                  value={String(failedLockReleases.length)}
                  valueClassName="text-destructive"
                />
              ) : null}
            </CardContent>
          </Card>

          <Card className="gap-0 border-border py-0 shadow-sm">
            <CardHeader className="px-3 py-2.5 sm:px-4">
              <CardTitle className="text-sm font-medium">Agent activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 px-3 pb-3 pt-0 sm:px-4 sm:pb-4">
              {chatSessionsLoading ? (
                <InfoRowsSkeleton label="Loading agent activity" />
              ) : (
                <>
                  <InfoRow label="Chat sessions" value={String(chatSessionCount)} />
                  {activeChatSessions > 0 ? (
                    <InfoRow
                      label="Active agents"
                      value={String(activeChatSessions)}
                      valueClassName="text-emerald-600 dark:text-emerald-400"
                    />
                  ) : null}
                </>
              )}
            </CardContent>
          </Card>

          <Card className="gap-0 border-border py-0 shadow-sm">
            <CardHeader className="px-3 py-2.5 sm:px-4">
              <CardTitle className="text-sm font-medium">Related</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 px-3 pb-3 pt-0 sm:px-4 sm:pb-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 w-full justify-between gap-2"
                onClick={() => navigateToBackendArea(setSearchParams, "architecture")}
              >
                <span className="inline-flex items-center gap-1.5">
                  <Network className="size-3.5" aria-hidden />
                  Architecture
                </span>
                <ArrowRight className="size-3.5 text-muted-foreground" aria-hidden />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 w-full justify-between gap-2"
                onClick={() => navigateToBackendArea(setSearchParams, "agent-config")}
              >
                <span className="inline-flex items-center gap-1.5">
                  <Bot className="size-3.5" aria-hidden />
                  Agent config
                </span>
                <ArrowRight className="size-3.5 text-muted-foreground" aria-hidden />
              </Button>
              {hasInfraStack ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 w-full justify-between gap-2"
                  onClick={() => {
                    setSearchParams(
                      (prev) => {
                        const next = new URLSearchParams(prev);
                        next.set("section", "cloud-infra");
                        next.set("area", "deploy");
                        return next;
                      },
                      { replace: true },
                    );
                  }}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Layers className="size-3.5" aria-hidden />
                    Infrastructure → Deploy
                  </span>
                  <ArrowRight className="size-3.5 text-muted-foreground" aria-hidden />
                </Button>
              ) : null}
              {settingsReposPath ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 w-full justify-between gap-2"
                  asChild
                >
                  <a href={settingsReposPath}>
                    <span className="inline-flex items-center gap-1.5">
                      <Settings2 className="size-3.5" aria-hidden />
                      Project settings → Repositories
                    </span>
                    <ArrowRight className="size-3.5 text-muted-foreground" aria-hidden />
                  </a>
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <div className="relative z-10 order-1 flex min-h-[min(68dvh,28rem)] min-w-0 flex-col sm:min-h-[min(72dvh,32rem)] lg:order-2 lg:min-h-0 lg:sticky lg:top-4 lg:self-start lg:h-[calc(100dvh-8rem)] lg:max-h-[calc(100dvh-8rem)]">
          {ideOpen ? (
            <div className="flex min-h-[min(28rem,70vh)] items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-6 text-center text-sm text-muted-foreground">
              Chat is open in the IDE. Exit the IDE to use the panel here.
            </div>
          ) : (
            <BackendCodeChatPanel
              projectId={projectId}
              canSend={canSendChat}
              disabledHint={chatDisabledHint}
              newChatConfirmOpen={newChatConfirmOpen}
              onNewChatConfirmOpenChange={setNewChatConfirmOpen}
              onNewChatStarted={() => {
                setIdeWorkspaceKey((k) => k + 1);
                void reloadChatSessions();
              }}
            />
          )}
        </div>
      </div>

      <BackendCodeIdeWorkspace
        key={ideWorkspaceKey}
        open={ideOpen}
        onClose={() => setIdeOpen(false)}
        projectId={projectId}
        canSend={canSendChat}
        disabledHint={chatDisabledHint}
        onNewChatStarted={() => {
          setIdeWorkspaceKey((k) => k + 1);
          void reloadChatSessions();
        }}
      />
    </>
  );
}
