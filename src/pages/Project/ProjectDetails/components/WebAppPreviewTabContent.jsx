import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ArrowUpDown,
  Copy,
  Download,
  ExternalLink,
  GitBranch,
  Loader2,
  Maximize2,
  MessageSquareText,
  Play,
  RefreshCw,
  Send,
  Square,
} from "lucide-react";
import { PROJECT_CLIENT_LINKS_DISABLED_HINT } from "@/lib/projectClientLinkUrls";
import { navigateToReleases } from "@/lib/releaseNavigation";
import {
  createProjectPreviewDirectLink,
  fetchProjectPreviewStatus,
  shareProjectPreviewWithClient,
  startProjectPreview,
  stopProjectPreview,
} from "@/api";
import { cn, formatProjectVersionLabel } from "@/lib/utils";
import { useReleasesSnapshot } from "@/pages/Project/ProductManagement/ReleasesSnapshotContext";
import { getActiveRelease } from "@/pages/Project/ProductManagement/utils/releaseWorkflowStatus";
import { useClientLinkPromptHistory } from "./useClientLinkPromptHistory";
import { PreviewEnvVariablesPanel } from "./PreviewEnvVariablesPanel";
import { toast } from "sonner";

function previewLooksRunning(status) {
  const s = String(status?.status || "").toLowerCase();
  if (status?.listening === true) return true;
  return s === "running" || s === "starting" || s === "restarting" || s === "installing";
}

/** "23h 10m" / "27m" / "<1m" until an ISO instant, or null when past/missing. */
function formatTimeLeft(iso, now) {
  const t = iso ? new Date(iso).getTime() : NaN;
  if (!Number.isFinite(t) || t <= now) return null;
  const mins = Math.floor((t - now) / 60000);
  if (mins < 1) return "<1m";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatIdleWindow(ms) {
  const mins = Math.round(Number(ms) / 60000);
  if (!Number.isFinite(mins) || mins <= 0) return "30 minutes";
  if (mins >= 60 && mins % 60 === 0) {
    const hours = mins / 60;
    return hours === 1 ? "1 hour" : `${hours} hours`;
  }
  return mins === 1 ? "1 minute" : `${mins} minutes`;
}

function formatPromptDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function truncatePromptText(text, max = 160) {
  const t = typeof text === "string" ? text.trim() : "";
  if (!t) return "(empty prompt)";
  const first = t.split("\n")[0].trim() || t;
  if (first.length <= max) return first;
  return `${first.slice(0, max - 1)}…`;
}

function InfoRow({ label, value, valueClassName, mono = false, valueNode = null }) {
  if (valueNode == null && (value == null || value === "")) return null;
  return (
    <div className="flex items-start justify-between gap-3 py-1 text-xs">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      {valueNode ?? (
        <span
          className={cn(
            "min-w-0 text-right font-medium text-foreground",
            mono && "font-mono text-[11px]",
            valueClassName,
          )}
        >
          {value}
        </span>
      )}
    </div>
  );
}

function InfoRowsSkeleton({ rows = 3, label }) {
  return (
    <div className="space-y-2 py-1" role="status" aria-busy="true" aria-label={label}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between gap-3">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-24" />
        </div>
      ))}
    </div>
  );
}

function PromptHistorySkeleton() {
  return (
    <div
      className="space-y-1 px-2 py-1.5"
      role="status"
      aria-busy="true"
      aria-label="Loading prompt history"
    >
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-1.5 py-1.5">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
          <Skeleton className="h-2.5 w-16" />
        </div>
      ))}
    </div>
  );
}

function ClientActivityPanel({ loading, error, prompts, releaseName, releasesLoading, onRefresh }) {
  const showNoActiveRelease =
    !releasesLoading && !releaseName && !loading && prompts.length === 0 && !error;

  return (
    <Card className="flex min-h-[min(28rem,70vh)] flex-col gap-0 overflow-hidden border-border py-0 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 px-3 py-3 sm:px-4">
        <div className="min-w-0 space-y-0.5">
          <CardTitle className="text-sm font-medium">Client activity</CardTitle>
          <p className="text-xs text-muted-foreground">
            Everything your client does from the client link, in one place.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-8 shrink-0 text-muted-foreground"
          disabled={loading}
          onClick={() => void onRefresh()}
          aria-label="Refresh client activity"
          title="Refresh"
        >
          {loading ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <RefreshCw className="size-3.5" aria-hidden />
          )}
        </Button>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col px-0 pb-0 pt-0">
        <Tabs defaultValue="prompts" className="flex min-h-0 flex-1 flex-col gap-0">
          <TabsList
            variant="underline"
            className="h-auto w-full shrink-0 justify-start px-3 sm:px-4"
          >
            <TabsTrigger value="prompts">AI edit prompts · {prompts.length}</TabsTrigger>
            <TabsTrigger value="link">Link activity</TabsTrigger>
          </TabsList>
          <TabsContent
            value="prompts"
            className="mt-0 min-h-0 flex-1 overflow-auto p-1.5 data-[state=inactive]:hidden sm:p-2"
          >
            {releasesLoading || (loading && prompts.length === 0) ? (
              <PromptHistorySkeleton />
            ) : error ? (
              <p className="px-2 py-6 text-xs text-destructive">{error}</p>
            ) : showNoActiveRelease ? (
              <div className="flex flex-col items-center gap-1.5 px-4 py-10 text-center">
                <MessageSquareText className="size-6 text-muted-foreground/60" aria-hidden />
                <p className="text-sm font-medium text-foreground">No active release</p>
                <p className="max-w-xs text-xs text-muted-foreground">
                  Activate a release to see Client Link AI edit prompts.
                </p>
              </div>
            ) : prompts.length === 0 ? (
              <div className="flex flex-col items-center gap-1.5 px-4 py-10 text-center">
                <MessageSquareText className="size-6 text-muted-foreground/60" aria-hidden />
                <p className="text-sm font-medium text-foreground">No prompts yet</p>
                <p className="max-w-xs text-xs text-muted-foreground">
                  Edit prompts your client sends from the client link appear here, newest first.
                </p>
              </div>
            ) : (
              <ul className="m-0 list-none space-y-0.5 p-0">
                {prompts.map((prompt) => {
                  const dateLabel = formatPromptDate(prompt.createdAt);
                  return (
                    <li
                      key={prompt.id}
                      className="rounded-md px-2 py-1.5 hover:bg-muted/40"
                      title={typeof prompt.text === "string" ? prompt.text : undefined}
                    >
                      <p className="text-xs leading-relaxed text-foreground">
                        {truncatePromptText(prompt.text)}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        {dateLabel ? (
                          <time
                            className="text-[10px] text-muted-foreground"
                            dateTime={prompt.createdAt}
                          >
                            {dateLabel}
                          </time>
                        ) : null}
                        {prompt.isScratchPrompt ? (
                          <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                            Original
                          </Badge>
                        ) : null}
                        {prompt.isMerged ? (
                          <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                            Merged
                          </Badge>
                        ) : null}
                        {prompt.isReverted ? (
                          <Badge variant="outline" className="h-4 px-1 text-[10px]">
                            Reverted
                          </Badge>
                        ) : null}
                        {prompt.hasAttachments ? (
                          <Badge variant="outline" className="h-4 px-1 text-[10px]">
                            Image
                          </Badge>
                        ) : null}
                        {prompt.isArchivedThread ? (
                          <Badge variant="outline" className="h-4 px-1 text-[10px]">
                            Older chat
                          </Badge>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </TabsContent>
          <TabsContent
            value="link"
            className="mt-0 min-h-0 flex-1 overflow-auto p-1.5 data-[state=inactive]:hidden sm:p-2"
          >
            <div className="flex flex-col items-center gap-1.5 px-4 py-10 text-center">
              <p className="text-sm font-medium text-foreground">No link activity yet</p>
              <p className="max-w-xs text-xs text-muted-foreground">
                Opens and visits from the client link will appear here.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export function WebAppPreviewTabContent({
  projectId,
  clientUrl,
  previewOnlyUrl,
  canMigrateFrontend = false,
  onMigrateFrontend,
  migrateFrontendDisabledHint = "",
  hasLaunchpadRepo = false,
  onExportLaunchpadZip,
  exportLaunchpadZipDisabledHint = "",
  exportLaunchpadZipLoading = false,
}) {
  const linksDisabled = !clientUrl;
  const [, setSearchParams] = useSearchParams();
  const { releases, loading: releasesLoading } = useReleasesSnapshot();
  const activeRelease = useMemo(() => getActiveRelease(releases), [releases]);

  const {
    loading: promptsLoading,
    error: promptsError,
    prompts,
    releaseName: promptReleaseName,
    reload: reloadPrompts,
  } = useClientLinkPromptHistory(projectId, {
    releaseId: activeRelease?.id,
    enabled: Boolean(projectId),
    limit: 30,
  });

  const displayReleaseName = promptReleaseName || activeRelease?.name || null;

  const releaseVersions = Array.isArray(activeRelease?.versions) ? activeRelease.versions : [];
  const latestVersion = releaseVersions[0] ?? null;
  const latestVersionLabel = latestVersion?.version
    ? formatProjectVersionLabel(latestVersion.version)
    : null;
  const latestGitTag = String(latestVersion?.gitTag || "").trim() || null;

  const [previewStatus, setPreviewStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(Boolean(projectId));
  const [actionBusy, setActionBusy] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [directLinkBusy, setDirectLinkBusy] = useState(false);
  /** Comma-separated client emails added to the stakeholder allowlist on share. */
  const [shareEmails, setShareEmails] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const autoWakeAttemptedRef = useRef(false);

  const parseShareEmails = useCallback(() => {
    const raw = String(shareEmails || "").trim();
    if (!raw) return undefined;
    return raw
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }, [shareEmails]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const refreshStatus = useCallback(async () => {
    if (!projectId) return;
    try {
      const st = await fetchProjectPreviewStatus(projectId);
      setPreviewStatus(st);
    } catch {
      setPreviewStatus({ status: "stopped" });
    } finally {
      setStatusLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (!projectId) {
      setStatusLoading(false);
      return undefined;
    }
    setStatusLoading(true);
    autoWakeAttemptedRef.current = false;
    void refreshStatus();
    const id = window.setInterval(() => {
      void refreshStatus();
    }, 8000);
    return () => window.clearInterval(id);
  }, [projectId, refreshStatus]);

  const running = previewLooksRunning(previewStatus);
  const idleWake =
    String(previewStatus?.wakeReason || "").trim() === "inactivity" ||
    String(previewStatus?.status || "").toLowerCase() === "stopped";
  const statusLabel = statusLoading
    ? "Checking…"
    : running
      ? previewStatus?.installRunning || previewStatus?.status === "installing"
        ? "Installing…"
        : previewStatus?.status === "starting" || previewStatus?.status === "restarting"
          ? previewStatus?.wakeReason === "inactivity"
            ? "Starting again…"
            : "Starting…"
          : "Running"
      : String(previewStatus?.status || "").toLowerCase() === "failed"
        ? "Failed"
        : idleWake
          ? "Stopped"
          : "Stopped";

  // Per-project preview tasks cost money while running: in the ECS runtime start is explicit.
  const explicitStart = previewStatus?.runtimeKind === "ecs";
  const sharedTimeLeft = formatTimeLeft(previewStatus?.keepAliveUntil, now);
  const expiresTimeLeft = running ? formatTimeLeft(previewStatus?.expiresAt, now) : null;
  const idleWindowLabel = formatIdleWindow(previewStatus?.idleWindowMs);
  const lifecycleHint = sharedTimeLeft
    ? `Shared with client · stays on ${sharedTimeLeft}`
    : expiresTimeLeft
      ? `Auto-stops in ${expiresTimeLeft} without activity`
      : `Starts on demand and stops automatically after ${idleWindowLabel} idle.`;

  useEffect(() => {
    if (!projectId || statusLoading || actionBusy || autoWakeAttemptedRef.current) return;
    if (running || explicitStart) return;
    if (previewStatus == null) return;
    autoWakeAttemptedRef.current = true;
    setActionBusy(true);
    void (async () => {
      try {
        await startProjectPreview(projectId);
        await refreshStatus();
      } catch {
        /* manual Start still available */
      } finally {
        setActionBusy(false);
      }
    })();
  }, [projectId, statusLoading, actionBusy, running, explicitStart, previewStatus, refreshStatus]);

  const handleStart = async () => {
    if (!projectId || actionBusy) return;
    setActionBusy(true);
    try {
      await startProjectPreview(projectId);
      toast.success(
        explicitStart
          ? "Preview starting — this can take 1–3 minutes on a cold start."
          : "Preview starting — Client Link will load faster once ready.",
      );
      await refreshStatus();
    } catch (err) {
      toast.error(err?.error || err?.message || "Could not start preview");
    } finally {
      setActionBusy(false);
    }
  };

  const handleShareWithClient = async () => {
    if (!projectId || shareBusy || !clientUrl) return;
    setShareBusy(true);
    try {
      const emails = parseShareEmails();
      const res = await shareProjectPreviewWithClient(projectId, { emails });
      try {
        await navigator.clipboard.writeText(clientUrl);
      } catch {
        /* clipboard blocked — link is still shown on the Client link button */
      }
      const left = formatTimeLeft(res?.keepAliveUntil, Date.now()) || "24h";
      const added = Array.isArray(res?.stakeholdersAdded) ? res.stakeholdersAdded : [];
      toast.success(
        added.length > 0
          ? `Client link copied. Preview stays on for ${left}. Added ${added.length} stakeholder${added.length === 1 ? "" : "s"}.`
          : `Client link copied. Preview stays on for ${left}.`,
      );
      await refreshStatus();
    } catch (err) {
      toast.error(err?.error || err?.message || "Could not share preview with client");
    } finally {
      setShareBusy(false);
    }
  };

  const handleCopyDirectLink = async () => {
    if (!projectId || shareBusy) return;
    setShareBusy(true);
    setDirectLinkBusy(true);
    try {
      const emails = parseShareEmails();
      const res = await createProjectPreviewDirectLink(projectId, { emails });
      let copied = true;
      try {
        await navigator.clipboard.writeText(res.url);
      } catch {
        copied = false;
      }
      const left = formatTimeLeft(res?.keepAliveUntil, Date.now()) || "24h";
      const added = Array.isArray(res?.stakeholdersAdded) ? res.stakeholdersAdded : [];
      const allowlistNote =
        added.length > 0
          ? ` Added ${added.length} stakeholder${added.length === 1 ? "" : "s"}.`
          : "";
      if (copied) {
        toast.success(`App URL copied. Preview stays on for ${left}.${allowlistNote}`);
      } else {
        toast.message("App URL", { description: res.url, duration: 20000 });
      }
      await refreshStatus();
    } catch (err) {
      toast.error(err?.error || err?.message || "Could not create app URL");
    } finally {
      setShareBusy(false);
      setDirectLinkBusy(false);
    }
  };

  const handleStop = async () => {
    if (!projectId || actionBusy) return;
    setActionBusy(true);
    try {
      await stopProjectPreview(projectId);
      toast.success("Preview stopped");
      setPreviewStatus({ status: "stopped", listening: false });
      await refreshStatus();
    } catch (err) {
      toast.error(err?.error || err?.message || "Could not stop preview");
    } finally {
      setActionBusy(false);
    }
  };

  const showFrontendActions = Boolean(onMigrateFrontend || onExportLaunchpadZip);
  const ongoingMigrate = activeRelease?.ongoingMigrateFrontend ?? null;
  const statusDotClass = running
    ? "bg-emerald-500"
    : String(previewStatus?.status || "").toLowerCase() === "failed"
      ? "bg-destructive"
      : "bg-muted-foreground/50";

  const migrateButton = canMigrateFrontend ? (
    <Button type="button" size="sm" className="h-8 gap-1.5" onClick={onMigrateFrontend}>
      <GitBranch className="size-3.5" aria-hidden />
      Import frontend
    </Button>
  ) : (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <span>
          <Button type="button" size="sm" className="h-8 gap-1.5" disabled>
            <GitBranch className="size-3.5" aria-hidden />
            Import frontend
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs text-xs">
        {migrateFrontendDisabledHint || "Set development and launchpad repos in Project settings."}
      </TooltipContent>
    </Tooltip>
  );

  const exportButton = hasLaunchpadRepo ? (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-8 gap-1.5"
      disabled={exportLaunchpadZipLoading}
      onClick={onExportLaunchpadZip}
    >
      {exportLaunchpadZipLoading ? (
        <Loader2 className="size-3.5 animate-spin" aria-hidden />
      ) : (
        <Download className="size-3.5" aria-hidden />
      )}
      Export ZIP
    </Button>
  ) : (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <span>
          <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5" disabled>
            <Download className="size-3.5" aria-hidden />
            Export ZIP
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs text-xs">
        {exportLaunchpadZipDisabledHint ||
          "Set the launchpad repository path in Project settings to export."}
      </TooltipContent>
    </Tooltip>
  );

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-start">
      <div className="min-w-0 space-y-4">
        <Card className="gap-0 border-border py-0 shadow-sm">
          <CardHeader className="px-3 py-3 sm:px-4">
            <CardTitle className="text-sm font-medium">Open &amp; share</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-3 pb-3 pt-0 sm:px-4 sm:pb-4">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Open
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Tooltip delayDuration={200}>
                  <TooltipTrigger asChild>
                    <span>
                      <Button
                        type="button"
                        size="sm"
                        className="h-8 gap-1.5"
                        disabled={linksDisabled}
                        title={linksDisabled ? PROJECT_CLIENT_LINKS_DISABLED_HINT : undefined}
                        onClick={() =>
                          clientUrl && window.open(clientUrl, "_blank", "noopener,noreferrer")
                        }
                      >
                        <ExternalLink className="size-3.5" aria-hidden />
                        Open client view
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs text-xs">
                    Client-facing portal with chat and controls
                  </TooltipContent>
                </Tooltip>
                <Tooltip delayDuration={200}>
                  <TooltipTrigger asChild>
                    <span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5"
                        disabled={!previewOnlyUrl}
                        title={!previewOnlyUrl ? PROJECT_CLIENT_LINKS_DISABLED_HINT : undefined}
                        onClick={() =>
                          previewOnlyUrl &&
                          window.open(previewOnlyUrl, "_blank", "noopener,noreferrer")
                        }
                      >
                        <Maximize2 className="size-3.5" aria-hidden />
                        Open app only
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs text-xs">
                    App without Client Link chrome — for design review
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Share
              </p>
              {projectId ? (
                <div className="space-y-1.5">
                  <Label
                    htmlFor="preview-share-emails"
                    className="text-[11px] font-medium text-muted-foreground"
                  >
                    Client emails (optional — added to stakeholder allowlist)
                  </Label>
                  <Input
                    id="preview-share-emails"
                    type="text"
                    inputMode="email"
                    autoComplete="off"
                    placeholder="client@company.com, other@company.com"
                    value={shareEmails}
                    onChange={(e) => setShareEmails(e.target.value)}
                    disabled={linksDisabled || shareBusy}
                    className="h-8 text-xs"
                  />
                </div>
              ) : null}
              <div className="flex flex-wrap items-center gap-2">
                {projectId ? (
                  <Tooltip delayDuration={200}>
                    <TooltipTrigger asChild>
                      <span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1.5"
                          disabled={linksDisabled || shareBusy}
                          onClick={() => void handleShareWithClient()}
                        >
                          {shareBusy && !directLinkBusy ? (
                            <Loader2 className="size-3.5 animate-spin" aria-hidden />
                          ) : (
                            <Send className="size-3.5" aria-hidden />
                          )}
                          {sharedTimeLeft
                            ? `Shared · ${sharedTimeLeft} left`
                            : "Send link to client"}
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs text-xs">
                      {linksDisabled
                        ? PROJECT_CLIENT_LINKS_DISABLED_HINT
                        : "Copies the client link and keeps the preview running for 24 hours (instead of stopping after idle). Click again to restart the window."}
                    </TooltipContent>
                  </Tooltip>
                ) : null}
                {projectId && previewStatus?.directLinkAvailable ? (
                  <Tooltip delayDuration={200}>
                    <TooltipTrigger asChild>
                      <span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1.5"
                          disabled={linksDisabled || shareBusy}
                          aria-busy={directLinkBusy}
                          onClick={() => void handleCopyDirectLink()}
                        >
                          {directLinkBusy ? (
                            <Loader2 className="size-3.5 animate-spin" aria-hidden />
                          ) : (
                            <Copy className="size-3.5" aria-hidden />
                          )}
                          {directLinkBusy ? "Copying…" : "Copy app URL"}
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs text-xs">
                      {linksDisabled
                        ? PROJECT_CLIENT_LINKS_DISABLED_HINT
                        : "Copies a private link that opens the app on its own preview domain (no LaunchPad frame) with the feedback widget. Valid for 30 days; also keeps the preview on for 24 hours."}
                    </TooltipContent>
                  </Tooltip>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>

        {projectId ? (
          <Card className="gap-0 border-border py-0 shadow-sm">
            <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 px-3 py-3 sm:px-4">
              <div className="min-w-0 space-y-1">
                <CardTitle className="text-sm font-medium">Live preview server</CardTitle>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                    <span className={cn("size-1.5 rounded-full", statusDotClass)} aria-hidden />
                    {statusLabel}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{lifecycleHint}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                {!running ? (
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 gap-1.5"
                    disabled={actionBusy}
                    onClick={() => void handleStart()}
                  >
                    {actionBusy ? (
                      <Loader2 className="size-3.5 animate-spin" aria-hidden />
                    ) : (
                      <Play className="size-3.5" aria-hidden />
                    )}
                    Start preview
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5"
                    disabled={actionBusy}
                    onClick={() => void handleStop()}
                  >
                    {actionBusy ? (
                      <Loader2 className="size-3.5 animate-spin" aria-hidden />
                    ) : (
                      <Square className="size-3.5" aria-hidden />
                    )}
                    Stop
                  </Button>
                )}
              </div>
            </CardHeader>
          </Card>
        ) : null}

        {showFrontendActions ? (
          <Card className="gap-0 border-border py-0 shadow-sm">
            <CardHeader className="px-3 py-3 sm:px-4">
              <CardTitle className="text-sm font-medium">Frontend</CardTitle>
              <p className="text-xs text-muted-foreground">
                Pulls frontend code from your existing repo into the Launchpad repo and generates a
                preview with static data. Replaces existing frontend code in this project.
              </p>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-2 px-3 pb-3 pt-0 sm:px-4 sm:pb-4">
              {onMigrateFrontend ? migrateButton : null}
              {onExportLaunchpadZip ? exportButton : null}
              {ongoingMigrate ? (
                <Badge variant="secondary" className="text-[10px]">
                  Import running
                </Badge>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {projectId ? <PreviewEnvVariablesPanel projectId={projectId} /> : null}
      </div>

      <div className="min-w-0 space-y-4 lg:sticky lg:top-4">
        <Card className="gap-0 border-border py-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 px-3 py-3 sm:px-4">
            <CardTitle className="text-sm font-medium">Active release</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => navigateToReleases(setSearchParams, "overview")}
            >
              <ArrowUpDown className="size-3.5" aria-hidden />
              Switch release
            </Button>
          </CardHeader>
          <CardContent className="space-y-0 px-3 pb-3 pt-0 sm:px-4 sm:pb-4">
            {releasesLoading ? (
              <InfoRowsSkeleton rows={3} label="Loading release" />
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
                {latestGitTag ? (
                  <InfoRow
                    label="Latest tag"
                    valueNode={
                      <Badge
                        variant="secondary"
                        className="h-5 max-w-[min(100%,14rem)] truncate px-1.5 font-mono text-[10px] font-normal"
                        title={latestGitTag}
                      >
                        {latestGitTag}
                      </Badge>
                    }
                  />
                ) : null}
              </>
            )}
          </CardContent>
        </Card>

        <ClientActivityPanel
          loading={promptsLoading}
          error={promptsError}
          prompts={prompts}
          releaseName={displayReleaseName}
          releasesLoading={releasesLoading}
          onRefresh={reloadPrompts}
        />
      </div>
    </div>
  );
}
