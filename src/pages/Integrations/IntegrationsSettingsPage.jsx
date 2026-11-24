import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { PageShell } from "@/components/common/PageShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  disconnectBitbucketIntegration,
  disconnectFigmaIntegration,
  disconnectGithubIntegration,
  disconnectJiraIntegration,
  fetchCursorIntegrationStatus,
  fetchIntegrationsStatus,
  getBitbucketOAuthAuthorizeUrl,
  getFigmaOAuthAuthorizeUrl,
  getGithubOAuthAuthorizeUrl,
  getJiraOAuthAuthorizeUrl,
  saveFigmaIntegrationPat,
  saveGranolaApiKey,
  disconnectGranolaIntegration,
  syncCursorBitbucketTokenFromOAuth,
  syncCursorGithubPatFromOAuth,
} from "@/api";
import { toast } from "sonner";
import { logger } from "@/utils/logger";
import { Loader2, Unplug, Plus, RefreshCw, Cloud, AlertTriangle } from "lucide-react";
import { integrationToastFromAxios } from "@/utils/integrationErrors";
import githubMarkSvg from "@/assets/apps/GitHub.svg";
import bitbucketMarkSvg from "@/assets/apps/BitBucket.svg";
import jiraMarkSvg from "@/assets/apps/Jira.svg";
import figmaMarkSvg from "@/assets/apps/Figma.svg";
import { cn } from "@/lib/utils";
import { FigmaPatSetupGuide } from "@/components/integrations/FigmaPatSetupGuide";
import { GithubAccessLevelPicker } from "@/components/integrations/GithubAccessLevelPicker";
import { BitbucketAccessLevelPicker } from "@/components/integrations/BitbucketAccessLevelPicker";
import { McpApiKeysCard } from "@/components/integrations/McpApiKeysCard";
import { QaAutomationAppCard } from "@/components/integrations/QaAutomationAppCard";
import { GITHUB_ACCESS_LEVEL, normalizeGithubAccessLevel } from "@/constants/githubOAuthAccess";
import {
  BITBUCKET_ACCESS_LEVEL,
  normalizeBitbucketAccessLevel,
} from "@/constants/bitbucketOAuthAccess";

function IntegrationsSettingsSkeleton() {
  return (
    <div
      className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2 lg:gap-5"
      role="status"
      aria-busy="true"
      aria-label="Loading connected accounts"
    >
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-4 rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Skeleton className="size-6 rounded-md" />
            <Skeleton className="h-5 w-40 rounded-md" />
            <Skeleton className="ml-auto h-8 w-28 rounded-md" />
          </div>
          <Skeleton className="h-4 w-full rounded-md" />
          <Skeleton className="h-4 w-[80%] rounded-md" />
          <Skeleton className="h-9 w-32 rounded-md" />
        </div>
      ))}
    </div>
  );
}

/** Brand mark for integration cards (matches ProjectGitJiraOAuthCard). */
function IntegrationBrandMark({ src, className, invertOnDark }) {
  return (
    <img
      src={src}
      alt=""
      aria-hidden
      draggable={false}
      className={cn(
        "pointer-events-none shrink-0 object-contain",
        invertOnDark && "dark:invert dark:opacity-90",
        className,
      )}
    />
  );
}

const HEALTH_POLL_MS = 2 * 60 * 1000;

const IntegrationsSettingsPage = () => {
  const [status, setStatus] = useState(null);
  const [cursorStatus, setCursorStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [cursorBusy, setCursorBusy] = useState(null);
  const [figmaPatInput, setFigmaPatInput] = useState("");
  const [granolaKeyInput, setGranolaKeyInput] = useState("");
  const [githubAccessLevel, setGithubAccessLevel] = useState(GITHUB_ACCESS_LEVEL.WRITE);
  const [bitbucketAccessLevel, setBitbucketAccessLevel] = useState(BITBUCKET_ACCESS_LEVEL.WRITE);

  const load = useCallback(async ({ silent = false, checkHealth = true } = {}) => {
    if (!silent) setLoading(true);
    try {
      const [data, cursor] = await Promise.all([
        fetchIntegrationsStatus({ checkHealth }),
        fetchCursorIntegrationStatus().catch(() => null),
      ]);
      setStatus(data);
      setCursorStatus(cursor);
    } catch (e) {
      logger.error("integrations_status_load", e);
      if (!silent) toast.error("Could not load integration status");
      if (!silent) setStatus(null);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const refreshCursorOnly = useCallback(async () => {
    setCursorBusy("refresh");
    try {
      const c = await fetchCursorIntegrationStatus();
      setCursorStatus(c);
      toast.success("Cursor connection status updated");
    } catch (e) {
      toast.error(integrationToastFromAxios(e, "Could not load Cursor status"));
      setCursorStatus(null);
    } finally {
      setCursorBusy(null);
    }
  }, []);

  const syncPatFromGithub = async () => {
    setCursorBusy("sync-oauth");
    try {
      await syncCursorGithubPatFromOAuth();
      toast.success("GitHub token registered for Cursor cloud agent");
      const c = await fetchCursorIntegrationStatus();
      setCursorStatus(c);
    } catch (e) {
      toast.error(integrationToastFromAxios(e, "Could not sync token"));
    } finally {
      setCursorBusy(null);
    }
  };

  const syncTokenFromBitbucket = async () => {
    setCursorBusy("sync-bitbucket");
    try {
      await syncCursorBitbucketTokenFromOAuth();
      toast.success("Bitbucket token registered for Cursor cloud agent");
      const c = await fetchCursorIntegrationStatus();
      setCursorStatus(c);
    } catch (e) {
      toast.error(integrationToastFromAxios(e, "Could not sync Bitbucket token"));
    } finally {
      setCursorBusy(null);
    }
  };

  useEffect(() => {
    load({ checkHealth: true });
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(() => {
      load({ silent: true, checkHealth: true });
    }, HEALTH_POLL_MS);
    return () => window.clearInterval(id);
  }, [load]);

  const ghList = status?.github?.connections ?? [];
  const bbList = status?.bitbucket?.connections ?? [];
  const jiList = status?.jira?.connections ?? [];
  const fgList = status?.figma?.connections ?? [];
  const granolaConnected = Boolean(status?.granola?.connected);
  const expiredConnections = [...ghList, ...bbList, ...jiList, ...fgList].filter(
    (c) => c?.health?.status === "expired",
  );

  const connectGithubNew = async () => {
    setBusy("gh-new");
    try {
      window.location.href = await getGithubOAuthAuthorizeUrl(undefined, {
        accessLevel: githubAccessLevel,
      });
    } catch (e) {
      toast.error(e.message || "Could not start GitHub OAuth");
      setBusy(null);
    }
  };

  const reconnectGithub = async (connectionId, accessLevel) => {
    const conn = ghList.find((c) => Number(c.id) === Number(connectionId));
    const level =
      accessLevel != null && String(accessLevel).trim() !== ""
        ? normalizeGithubAccessLevel(accessLevel)
        : normalizeGithubAccessLevel(conn?.accessLevel ?? githubAccessLevel);
    setGithubAccessLevel(level);
    setBusy(`gh-${connectionId}`);
    try {
      window.location.href = await getGithubOAuthAuthorizeUrl(connectionId, {
        accessLevel: level,
      });
    } catch (e) {
      toast.error(e.message || "Could not start GitHub OAuth");
      setBusy(null);
    }
  };

  const connectJiraNew = async () => {
    setBusy("ji-new");
    try {
      window.location.href = await getJiraOAuthAuthorizeUrl();
    } catch (e) {
      toast.error(e.message || "Could not start Jira OAuth");
      setBusy(null);
    }
  };

  const reconnectJira = async (connectionId) => {
    setBusy(`ji-${connectionId}`);
    try {
      window.location.href = await getJiraOAuthAuthorizeUrl(connectionId);
    } catch (e) {
      toast.error(e.message || "Could not start Jira OAuth");
      setBusy(null);
    }
  };

  const connectBitbucketNew = async () => {
    setBusy("bb-new");
    try {
      window.location.href = await getBitbucketOAuthAuthorizeUrl(undefined, {
        accessLevel: bitbucketAccessLevel,
      });
    } catch (e) {
      toast.error(e.message || "Could not start Bitbucket OAuth");
      setBusy(null);
    }
  };

  const reconnectBitbucket = async (connectionId, accessLevel) => {
    const conn = bbList.find((c) => Number(c.id) === Number(connectionId));
    const level =
      accessLevel != null && String(accessLevel).trim() !== ""
        ? normalizeBitbucketAccessLevel(accessLevel)
        : normalizeBitbucketAccessLevel(conn?.accessLevel ?? bitbucketAccessLevel);
    setBitbucketAccessLevel(level);
    setBusy(`bb-${connectionId}`);
    try {
      window.location.href = await getBitbucketOAuthAuthorizeUrl(connectionId, {
        accessLevel: level,
      });
    } catch (e) {
      toast.error(e.message || "Could not start Bitbucket OAuth");
      setBusy(null);
    }
  };

  const disconnectBb = async (connectionId) => {
    setBusy(`disc-bb-${connectionId}`);
    try {
      await disconnectBitbucketIntegration(connectionId);
      toast.success("Bitbucket connection removed");
      await load();
    } catch {
      toast.error("Failed to disconnect Bitbucket");
    } finally {
      setBusy(null);
    }
  };

  const disconnectGh = async (connectionId) => {
    setBusy(`disc-gh-${connectionId}`);
    try {
      await disconnectGithubIntegration(connectionId);
      toast.success("GitHub connection removed");
      await load();
    } catch {
      toast.error("Failed to disconnect GitHub");
    } finally {
      setBusy(null);
    }
  };

  const disconnectJi = async (connectionId) => {
    setBusy(`disc-ji-${connectionId}`);
    try {
      await disconnectJiraIntegration(connectionId);
      toast.success("Jira connection removed");
      await load();
    } catch {
      toast.error("Failed to disconnect Jira");
    } finally {
      setBusy(null);
    }
  };

  const connectFigmaNew = async () => {
    setBusy("fg-new");
    try {
      window.location.href = await getFigmaOAuthAuthorizeUrl();
    } catch (e) {
      toast.error(e.message || "Could not start Figma OAuth");
      setBusy(null);
    }
  };

  const disconnectFg = async (connectionId) => {
    setBusy(`disc-fg-${connectionId}`);
    try {
      await disconnectFigmaIntegration(connectionId);
      toast.success("Figma connection removed");
      await load();
    } catch {
      toast.error("Failed to disconnect Figma");
    } finally {
      setBusy(null);
    }
  };

  /**
   * Save a manually entered Figma PAT through the same integrations backend used by OAuth.
   * Keeps UX simple: validate input, persist, then refresh connection status.
   */
  const saveGranolaKey = async () => {
    const trimmed = granolaKeyInput.trim();
    if (!trimmed) {
      toast.error("Enter your API key first");
      return;
    }
    setBusy("granola-save");
    try {
      await saveGranolaApiKey(trimmed);
      setGranolaKeyInput("");
      toast.success("Granola connected");
      await load();
    } catch (e) {
      integrationToastFromAxios(e, "Could not save Granola API key");
    } finally {
      setBusy(null);
    }
  };

  const disconnectGranola = async () => {
    setBusy("granola-disc");
    try {
      await disconnectGranolaIntegration();
      toast.success("Granola disconnected");
      await load();
    } catch {
      toast.error("Failed to disconnect Granola");
    } finally {
      setBusy(null);
    }
  };

  const saveFigmaPat = async () => {
    const trimmed = figmaPatInput.trim();
    if (!trimmed) {
      toast.error("Enter your Figma token first");
      return;
    }
    setBusy("fg-pat");
    try {
      await saveFigmaIntegrationPat(trimmed);
      setFigmaPatInput("");
      toast.success("Figma token saved");
      await load();
    } catch (e) {
      toast.error(integrationToastFromAxios(e, "Could not save token"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <PageShell width="full" className="space-y-0 pb-8">
      <PageHeader
        compact
        title="Connected accounts"
        description="Connect your GitHub, Bitbucket, Jira, and Figma accounts here. Each project then picks a code host and Jira site under Project settings → Integrations. Download the QA Automation App and manage LaunchPad MCP keys for ChatGPT and other clients. Signing in again with an account you already linked refreshes that connection instead of adding a duplicate."
      />
      <div className="mt-4">
        {loading ? (
          <IntegrationsSettingsSkeleton />
        ) : (
          <div className="space-y-4">
            {expiredConnections.length > 0 ? (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-medium">Connection expired — Reconnect</p>
                    <p className="text-destructive/90">
                      {expiredConnections.length} integration
                      {expiredConnections.length > 1 ? "s are" : " is"} no longer refreshable.
                      Reconnect the affected account{expiredConnections.length > 1 ? "s" : ""}.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2 lg:gap-5">
              <div className="flex min-w-0 flex-col gap-4 lg:gap-5">
                <Card>
                  <CardHeader className="flex flex-col gap-2 space-y-0 pb-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <Cloud className="size-6 shrink-0 text-muted-foreground" aria-hidden />
                      <CardTitle className="truncate text-lg">Cursor cloud agent</CardTitle>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                      disabled={Boolean(cursorBusy)}
                      onClick={refreshCursorOnly}
                    >
                      {cursorBusy === "refresh" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <RefreshCw className="mr-1 h-4 w-4" />
                          Check connection
                        </>
                      )}
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    <p className="text-muted-foreground">
                      Registers your GitHub and Bitbucket tokens with the Cursor cloud agent service
                      so agents can clone and push using your account. Connect an account below,
                      then use the matching sync button.
                    </p>
                    {cursorStatus?.lastError && !cursorStatus?.reachable ? (
                      <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-destructive">
                        {cursorStatus.lastError}
                      </p>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={Boolean(cursorBusy) || !cursorStatus?.hasGithubOAuth}
                        onClick={syncPatFromGithub}
                        title={
                          cursorStatus?.hasGithubOAuth
                            ? undefined
                            : "Add a GitHub account in the section below first"
                        }
                      >
                        {cursorBusy === "sync-oauth" ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Sync from GitHub"
                        )}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={Boolean(cursorBusy) || !cursorStatus?.hasBitbucketOAuth}
                        onClick={syncTokenFromBitbucket}
                        title={
                          cursorStatus?.hasBitbucketOAuth
                            ? undefined
                            : "Add a Bitbucket account in the section below first"
                        }
                      >
                        {cursorBusy === "sync-bitbucket" ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Sync from Bitbucket"
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-col gap-2 space-y-0 pb-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <IntegrationBrandMark src={bitbucketMarkSvg} className="size-6" />
                      <CardTitle className="truncate text-lg">Bitbucket</CardTitle>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                      disabled={Boolean(busy)}
                      onClick={connectBitbucketNew}
                    >
                      {busy === "bb-new" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Plus className="mr-1 h-4 w-4" />
                          Add account
                        </>
                      )}
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <BitbucketAccessLevelPicker
                      idPrefix="integrations-bb-access"
                      legend="Access for next connection"
                      value={bitbucketAccessLevel}
                      onChange={setBitbucketAccessLevel}
                      disabled={Boolean(busy)}
                    />
                    {bbList.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No Bitbucket accounts connected.
                      </p>
                    ) : (
                      <ul className="space-y-3">
                        {bbList.map((c) => (
                          <li
                            key={c.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3"
                          >
                            <div className="min-w-0 flex-1 text-sm space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-medium text-foreground">
                                  {c.label || c.login || `Connection #${c.id}`}
                                </span>
                                <Badge variant="secondary" className="h-5 capitalize">
                                  {normalizeBitbucketAccessLevel(c.accessLevel)}
                                </Badge>
                                {c.health?.status === "expired" ? (
                                  <Badge variant="destructive" className="h-5">
                                    Connection expired
                                  </Badge>
                                ) : null}
                              </div>
                              {c.login ? (
                                <span className="text-muted-foreground">{c.login}</span>
                              ) : null}
                              {c.health?.status === "expired" ? (
                                <p className="text-xs text-destructive">
                                  {c.health?.message || "Reconnect this account to continue."}
                                </p>
                              ) : null}
                              {normalizeBitbucketAccessLevel(c.accessLevel) ===
                              BITBUCKET_ACCESS_LEVEL.READ ? (
                                <p className="text-xs text-muted-foreground">
                                  Read access only. Reconnect with Write for agents, push, and
                                  webhooks.
                                </p>
                              ) : null}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {normalizeBitbucketAccessLevel(c.accessLevel) ===
                              BITBUCKET_ACCESS_LEVEL.READ ? (
                                <Button
                                  type="button"
                                  variant="default"
                                  size="sm"
                                  disabled={Boolean(busy)}
                                  onClick={() =>
                                    reconnectBitbucket(c.id, BITBUCKET_ACCESS_LEVEL.WRITE)
                                  }
                                >
                                  {busy === `bb-${c.id}` ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    "Reconnect with Write"
                                  )}
                                </Button>
                              ) : (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  disabled={Boolean(busy)}
                                  onClick={() => reconnectBitbucket(c.id)}
                                >
                                  {busy === `bb-${c.id}` ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    "Reconnect"
                                  )}
                                </Button>
                              )}
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-destructive"
                                disabled={Boolean(busy)}
                                onClick={() => disconnectBb(c.id)}
                              >
                                {busy === `disc-bb-${c.id}` ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <Unplug className="mr-1 h-4 w-4" />
                                    Remove
                                  </>
                                )}
                              </Button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-col gap-2 space-y-0 pb-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <IntegrationBrandMark src={jiraMarkSvg} className="size-6" />
                      <CardTitle className="truncate text-lg">Jira (Atlassian)</CardTitle>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                      disabled={Boolean(busy)}
                      onClick={connectJiraNew}
                    >
                      {busy === "ji-new" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Plus className="mr-1 h-4 w-4" />
                          Add site
                        </>
                      )}
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {jiList.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No Jira sites connected.</p>
                    ) : (
                      <ul className="space-y-3">
                        {jiList.map((c) => (
                          <li
                            key={c.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3"
                          >
                            <div className="text-sm break-all space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-medium text-foreground">
                                  {c.label || c.baseUrl || `Connection #${c.id}`}
                                </span>
                                {c.health?.status === "expired" ? (
                                  <Badge variant="destructive" className="h-5">
                                    Connection expired
                                  </Badge>
                                ) : null}
                              </div>
                              {c.accountEmail ? (
                                <span className="text-muted-foreground">{c.accountEmail}</span>
                              ) : null}
                              {c.health?.status === "expired" ? (
                                <p className="text-xs text-destructive">
                                  {c.health?.message || "Reconnect this site to continue."}
                                </p>
                              ) : null}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={Boolean(busy)}
                                onClick={() => reconnectJira(c.id)}
                              >
                                {busy === `ji-${c.id}` ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  "Reconnect"
                                )}
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-destructive"
                                disabled={Boolean(busy)}
                                onClick={() => disconnectJi(c.id)}
                              >
                                {busy === `disc-ji-${c.id}` ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <Unplug className="mr-1 h-4 w-4" />
                                    Remove
                                  </>
                                )}
                              </Button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-col gap-2 space-y-0 pb-2 sm:flex-row sm:items-center sm:justify-between">
                    <CardTitle className="min-w-0 flex-1 truncate text-lg">Granola</CardTitle>
                    {granolaConnected ? (
                      <Badge variant="secondary" className="shrink-0">
                        Connected
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="shrink-0">
                        Not connected
                      </Badge>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Connect Granola to import meeting notes, transcripts, and summaries into
                      project Notes.
                    </p>
                    <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
                      <Label htmlFor="granola-key-input" className="text-sm font-medium">
                        API key
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Create a key in{" "}
                        <a
                          href="https://docs.granola.ai/introduction"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-primary underline-offset-4 hover:underline"
                        >
                          Granola API docs
                        </a>
                        .
                      </p>
                      <Input
                        id="granola-key-input"
                        type="password"
                        autoComplete="off"
                        placeholder="grn_…"
                        value={granolaKeyInput}
                        onChange={(e) => setGranolaKeyInput(e.target.value)}
                        disabled={Boolean(busy)}
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          disabled={Boolean(busy)}
                          onClick={saveGranolaKey}
                        >
                          {busy === "granola-save" ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Connect Granola"
                          )}
                        </Button>
                        {granolaConnected ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            disabled={Boolean(busy)}
                            onClick={disconnectGranola}
                          >
                            {busy === "granola-disc" ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Disconnect"
                            )}
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              <div className="flex min-w-0 flex-col gap-4 lg:gap-5">
                <Card>
                  <CardHeader className="flex flex-col gap-2 space-y-0 pb-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <IntegrationBrandMark src={githubMarkSvg} invertOnDark className="size-6" />
                      <CardTitle className="truncate text-lg">GitHub</CardTitle>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                      disabled={Boolean(busy)}
                      onClick={connectGithubNew}
                    >
                      {busy === "gh-new" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Plus className="mr-1 h-4 w-4" />
                          Add account
                        </>
                      )}
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <GithubAccessLevelPicker
                      idPrefix="integrations-gh-access"
                      legend="Access for next connection"
                      value={githubAccessLevel}
                      onChange={setGithubAccessLevel}
                      disabled={Boolean(busy)}
                    />
                    {ghList.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No GitHub accounts connected.</p>
                    ) : (
                      <ul className="space-y-3">
                        {ghList.map((c) => (
                          <li
                            key={c.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3"
                          >
                            <div className="min-w-0 flex-1 text-sm space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-medium text-foreground">
                                  {c.label || c.login || `Connection #${c.id}`}
                                </span>
                                <Badge variant="secondary" className="h-5 capitalize">
                                  {normalizeGithubAccessLevel(c.accessLevel)}
                                </Badge>
                                {c.health?.status === "expired" ? (
                                  <Badge variant="destructive" className="h-5">
                                    Connection expired
                                  </Badge>
                                ) : null}
                              </div>
                              {c.login ? (
                                <span className="text-muted-foreground"> @{c.login}</span>
                              ) : null}
                              {c.health?.status === "expired" ? (
                                <p className="text-xs text-destructive">
                                  {c.health?.message || "Reconnect this account to continue."}
                                </p>
                              ) : null}
                              {normalizeGithubAccessLevel(c.accessLevel) ===
                              GITHUB_ACCESS_LEVEL.READ ? (
                                <p className="text-xs text-muted-foreground">
                                  Read access only. Reconnect with Write for agents, push, and repo
                                  setup.
                                </p>
                              ) : null}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {normalizeGithubAccessLevel(c.accessLevel) ===
                              GITHUB_ACCESS_LEVEL.READ ? (
                                <Button
                                  type="button"
                                  variant="default"
                                  size="sm"
                                  disabled={Boolean(busy)}
                                  onClick={() => reconnectGithub(c.id, GITHUB_ACCESS_LEVEL.WRITE)}
                                >
                                  {busy === `gh-${c.id}` ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    "Upgrade to Write"
                                  )}
                                </Button>
                              ) : null}
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={Boolean(busy)}
                                onClick={() => reconnectGithub(c.id)}
                              >
                                {busy === `gh-${c.id}` ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  "Reconnect"
                                )}
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-destructive"
                                disabled={Boolean(busy)}
                                onClick={() => disconnectGh(c.id)}
                              >
                                {busy === `disc-gh-${c.id}` ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <Unplug className="mr-1 h-4 w-4" />
                                    Remove
                                  </>
                                )}
                              </Button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
                <QaAutomationAppCard />
                <Card>
                  <CardHeader className="flex flex-col gap-2 space-y-0 pb-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <IntegrationBrandMark src={figmaMarkSvg} className="size-6" />
                      <CardTitle className="truncate text-lg">Figma</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Links your Figma account for REST API access (separate from the Figma plugin
                      login flow).
                    </p>
                    <FigmaPatSetupGuide
                      inputId="figma-pat-input"
                      patValue={figmaPatInput}
                      onPatChange={(e) => setFigmaPatInput(e.target.value)}
                      onSavePat={saveFigmaPat}
                      saveBusy={busy === "fg-pat"}
                      saveDisabled={Boolean(busy)}
                      showPluginDownload
                      scopesDefaultOpen={false}
                    />
                    {fgList.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No Figma accounts connected.</p>
                    ) : (
                      <ul className="space-y-3">
                        {fgList.map((c) => (
                          <li
                            key={c.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3"
                          >
                            <div className="min-w-0 text-sm space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-medium text-foreground">
                                  {c.label || c.handle || `Connection #${c.id}`}
                                </span>
                                {c.health?.status === "expired" ? (
                                  <Badge variant="destructive" className="h-5">
                                    Connection expired
                                  </Badge>
                                ) : null}
                              </div>
                              {c.email ? (
                                <span className="block break-all text-muted-foreground">
                                  {c.email}
                                </span>
                              ) : null}
                              {c.figmaUserId ? (
                                <span className="block break-all text-muted-foreground">
                                  ID {c.figmaUserId}
                                </span>
                              ) : null}
                              {c.needsReconnect ? (
                                <Badge variant="destructive" className="text-xs font-normal">
                                  Reconnect required — session expired
                                </Badge>
                              ) : null}
                              {c.health?.status === "expired" ? (
                                <p className="text-xs text-destructive">
                                  {c.health?.message || "Reconnect this account to continue."}
                                </p>
                              ) : null}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-destructive"
                                disabled={Boolean(busy)}
                                onClick={() => disconnectFg(c.id)}
                              >
                                {busy === `disc-fg-${c.id}` ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <Unplug className="mr-1 h-4 w-4" />
                                    Remove
                                  </>
                                )}
                              </Button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
                <McpApiKeysCard />
              </div>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
};

export default IntegrationsSettingsPage;
