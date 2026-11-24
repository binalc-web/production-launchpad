import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, Loader2, MessageSquarePlus } from "lucide-react";
import { toast } from "sonner";
import { getDeployMap, setFeedbackSnippetEnabled } from "@/api";
import { logger } from "@/utils/logger";
import { cn } from "@/lib/utils";
import githubMarkSvg from "@/assets/apps/GitHub.svg";
import bitbucketMarkSvg from "@/assets/apps/BitBucket.svg";
import { tryParseStoredMultiRepo } from "@/utils/projectMultiRepoForm";
import ProjectFeedbackEmbedCard from "./ProjectFeedbackEmbedCard";

const SNIPPET_POLL_MS = 4000;

/**
 * Resolve a short host badge for the primary development repo (never show raw DB JSON/URL).
 * @param {unknown} developmentRepoUrl
 * @returns {{ label: string, href: string | null, provider: "github" | "bitbucket" | "other" } | null}
 */
export function resolveDevelopmentRepoBadge(developmentRepoUrl) {
  const raw = String(developmentRepoUrl ?? "").trim();
  if (!raw) return null;

  let path = raw;
  const multi = tryParseStoredMultiRepo(raw);
  if (multi?.repos?.length) {
    const pushDirs = new Set(
      (Array.isArray(multi.pushDirectories) ? multi.pushDirectories : [])
        .map((d) => String(d || "").trim())
        .filter(Boolean),
    );
    const primary =
      multi.repos.find((r) => pushDirs.has(String(r?.directory || "").trim())) || multi.repos[0];
    path = String(primary?.path || "").trim() || raw;
  }

  const normalized = path
    .replace(/^git\+/i, "")
    .replace(/^https?:\/\//i, "")
    .replace(/^git@/i, "")
    .replace(/:/, "/")
    .replace(/\.git$/i, "")
    .replace(/^\/+/, "")
    .trim();

  const gh = normalized.match(/^(?:www\.)?github\.com\/([^/]+)\/([^/]+)/i);
  if (gh) {
    const label = `${gh[1]}/${gh[2]}`;
    return { label, href: `https://github.com/${label}`, provider: "github" };
  }

  const bb = normalized.match(/^(?:www\.)?bitbucket\.org\/([^/]+)\/([^/]+)/i);
  if (bb) {
    const label = `${bb[1]}/${bb[2]}`;
    return { label, href: `https://bitbucket.org/${label}`, provider: "bitbucket" };
  }

  const bare = normalized.match(/^([^/]+)\/([^/]+)$/);
  if (bare) {
    const label = `${bare[1]}/${bare[2]}`;
    return { label, href: `https://github.com/${label}`, provider: "github" };
  }

  return { label: "Connected repository", href: null, provider: "other" };
}

/**
 * Code Snippet console page: domain rules, copyable embed, and install-into-dev-repo.
 */
export function CodeSnippetTabContent({ project, hasDeveloperRepo, onProjectUpdated }) {
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState(false);
  const [feedbackSnippet, setFeedbackSnippet] = useState(null);

  const developmentRepoUrl = useMemo(
    () => String(project?.developmentRepoUrl ?? "").trim(),
    [project?.developmentRepoUrl],
  );
  const repoConnected = Boolean(hasDeveloperRepo && developmentRepoUrl);
  const repoBadge = useMemo(
    () => (repoConnected ? resolveDevelopmentRepoBadge(developmentRepoUrl) : null),
    [developmentRepoUrl, repoConnected],
  );

  const isRunning = feedbackSnippet?.status === "running";
  const isFailed = feedbackSnippet?.status === "failed";
  const isInstalled = feedbackSnippet?.enabled === true;
  const showDeploySuggestion =
    feedbackSnippet?.status === "idle" && feedbackSnippet?.updatedAt && !isRunning;
  const showInstalledBadge = isInstalled && feedbackSnippet?.status === "idle" && !isFailed;

  const loadSnippetStatus = useCallback(async () => {
    if (!project?.id) return;
    try {
      const data = await getDeployMap(project.id);
      setFeedbackSnippet(data?.feedbackSnippet ?? null);
    } catch (err) {
      logger.error("Failed to load feedback snippet status", err);
    }
  }, [project?.id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        if (!project?.id) return;
        const data = await getDeployMap(project.id);
        if (!cancelled) setFeedbackSnippet(data?.feedbackSnippet ?? null);
      } catch (err) {
        if (!cancelled) {
          logger.error("Failed to load feedback snippet status", err);
          toast.error(
            (typeof err === "object" && err?.error) ||
              "Could not load code snippet install status.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [project?.id]);

  useEffect(() => {
    if (!isRunning || !project?.id) return undefined;
    let cancelled = false;
    const poll = async () => {
      try {
        const data = await getDeployMap(project.id, { force: true });
        if (!cancelled) setFeedbackSnippet(data?.feedbackSnippet ?? null);
      } catch (err) {
        if (!cancelled) logger.error("Failed to poll feedback snippet status", err);
      }
    };
    void poll();
    const id = setInterval(() => void poll(), SNIPPET_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [isRunning, project?.id]);

  const handleInstall = useCallback(async () => {
    if (!project?.id || installing || isRunning || !repoConnected) return;
    setInstalling(true);
    try {
      const data = await setFeedbackSnippetEnabled(project.id, true);
      setFeedbackSnippet(data?.feedbackSnippet ?? null);
      toast.success("Installing report issue snippet in your development repo.");
      await loadSnippetStatus();
    } catch (err) {
      const msg =
        (typeof err === "object" && err?.error) ||
        err?.message ||
        "Could not install the report issue snippet.";
      toast.error(String(msg));
    } finally {
      setInstalling(false);
    }
  }, [installing, isRunning, loadSnippetStatus, project?.id, repoConnected]);

  const installDisabled = loading || installing || isRunning || !repoConnected;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Code Snippet</h2>
        <p className="text-sm text-muted-foreground">
          Configure allowed domains, copy the embed script, or install it into your connected
          development repository. Reports are saved in Launchpad; enable automatic Jira creation on
          this page or approve reports manually to create tickets.
        </p>
      </div>

      <ProjectFeedbackEmbedCard project={project} onSaved={onProjectUpdated} inDialog />

      <Card className="border-border shadow-sm">
        <CardHeader className="space-y-1 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <MessageSquarePlus className="size-4 text-muted-foreground" aria-hidden />
            <CardTitle className="text-sm font-semibold">Install into development repo</CardTitle>
            {repoConnected && repoBadge ? (
              <Badge
                variant="outline"
                className="gap-1.5 border-border bg-background font-normal text-foreground"
              >
                <img
                  src={repoBadge.provider === "bitbucket" ? bitbucketMarkSvg : githubMarkSvg}
                  alt=""
                  aria-hidden
                  draggable={false}
                  className={cn(
                    "size-3.5 shrink-0 object-contain",
                    repoBadge.provider === "github" && "dark:invert dark:opacity-90",
                  )}
                />
                {repoBadge.href ? (
                  <a
                    href={repoBadge.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="max-w-[14rem] truncate hover:underline"
                  >
                    {repoBadge.label}
                  </a>
                ) : (
                  <span className="max-w-[14rem] truncate">{repoBadge.label}</span>
                )}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                Development repo not connected
              </Badge>
            )}
            {showInstalledBadge ? (
              <Badge
                variant="outline"
                className="gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
              >
                Installed in repo
              </Badge>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            This installs the Launchpad feedback widget into your development repository. Publish
            follows your Backend lock setting (Code + PR, Code + auto merge, or Plan). Deploy
            separately when you are ready.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {!repoConnected ? (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2.5 text-sm text-amber-950 dark:text-amber-100">
              Development repo is not connected. Add a development repository in Project settings →
              App repositories to enable install.
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              disabled={installDisabled}
              onClick={() => void handleInstall()}
              title={
                repoConnected
                  ? "Install this snippet into your development repository"
                  : "Development repo is not connected"
              }
            >
              {installing || isRunning ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Installing snippet…
                </>
              ) : (
                "Install Snippet"
              )}
            </Button>
            {isRunning && feedbackSnippet?.agentStatus ? (
              <p className="text-xs text-muted-foreground">
                {feedbackSnippet.agentStatus.replace(/_/g, " ").toLowerCase()}
              </p>
            ) : null}
          </div>

          {isFailed ? (
            <p className="text-xs text-destructive">
              {feedbackSnippet?.error || "Could not update the snippet. Try again."}
            </p>
          ) : null}

          {showDeploySuggestion ? (
            <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 px-3 py-2.5 text-sm text-foreground">
              Snippet updated in your development repo.{" "}
              <span className="font-medium">Deploy your frontend</span> from Cloud Infra to publish
              the change.
              {feedbackSnippet?.prUrl ? (
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="ml-1 h-auto p-0 text-sm"
                  asChild
                >
                  <a href={feedbackSnippet.prUrl} target="_blank" rel="noopener noreferrer">
                    View pull request
                    <ExternalLink className="ml-1 inline size-3.5" aria-hidden />
                  </a>
                </Button>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
