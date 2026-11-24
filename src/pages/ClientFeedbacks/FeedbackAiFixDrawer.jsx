import React, { useCallback, useEffect, useMemo, useState } from "react";
import { fetchDeveloperRepoBranches, fetchProjectById, getDeployMap } from "@/api";
import { ElementContextChip } from "@/components/ElementContextChip";
import {
  assembleFeedbackDescriptionWithElementContext,
  resolveFeedbackDescriptionDisplay,
} from "@/lib/feedbackElementContextDisplay.util";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RepositoryCombobox } from "@/components/RepositoryCombobox";
import { devRowsFromStored } from "@/utils/projectMultiRepoForm";
import {
  DevelopmentRepoBranchCombobox,
  EMPTY_DEV_BRANCH_DATA,
} from "@/pages/Project/CreateProject/components/DevelopmentRepoBranchCombobox";
import {
  getAiFixPhaseOrder,
  getAiFixPhaseLabel,
  formatAiFixBranchBrowseUrl,
  formatAiFixCommitBrowseUrl,
  formatAiFixCompletedAt,
  isAiFixCompleted,
  isAiFixFailed,
  isAiFixRunning,
  isDevRepoFeedbackSource,
  formatFeedbackAiFixFailureMessage,
  resolveTimelinePhaseIndex,
} from "@/lib/feedbackAiFixLabels";
import { LaunchpadQuestionsCard } from "@/components/LaunchpadQuestionsCard";
import { cn } from "@/lib/utils";
import { logger } from "@/utils/logger";
import { toast } from "sonner";
import {
  Check,
  Circle,
  ExternalLink,
  GitBranch,
  GitMerge,
  HelpCircle,
  Loader2,
  Sparkles,
  X,
  XCircle,
} from "lucide-react";

const MERGE_ACTION_OPTIONS = [
  { value: "fix_only", label: "Fix only", hint: "Opens a pull request — no merge." },
  {
    value: "fix_and_merge",
    label: "Fix and merge",
    hint: "Merge into the target branch (bulk fix opens one pull request).",
  },
  {
    value: "fix_merge_deploy",
    label: "Fix, merge, and deploy",
    hint: "Merge then start cloud deploy to the selected environment.",
  },
];

function withMergeConfirmBody(body, mergeAction, deployEnvironmentId) {
  return {
    ...body,
    mergeAction,
    ...(mergeAction === "fix_merge_deploy" && deployEnvironmentId ? { deployEnvironmentId } : {}),
  };
}

function PhaseTimeline({
  status,
  mergeAction = "fix_and_merge",
  feedbackSource = "",
  isBulkBatch = false,
}) {
  const visiblePhases = useMemo(
    () => getAiFixPhaseOrder({ mergeAction, feedbackSource, isBulkBatch }),
    [mergeAction, feedbackSource, isBulkBatch],
  );
  const currentIdx = useMemo(() => {
    if (!status) return -1;
    if (String(status) === "COMPLETED") return visiblePhases.length;
    return resolveTimelinePhaseIndex(status, visiblePhases);
  }, [status, visiblePhases]);

  return (
    <ol className="relative space-y-0">
      <div
        className="pointer-events-none absolute top-[21px] bottom-[21px] left-[11px] w-px -translate-x-1/2 bg-border/80"
        aria-hidden
      />
      {visiblePhases.map((phase, idx) => {
        const done = currentIdx > idx;
        const active = currentIdx === idx;
        const pending = !done && !active;

        return (
          <li
            key={phase}
            className={cn(
              "relative flex items-center gap-3 py-2.5 transition-all duration-300",
              active && "animate-in fade-in slide-in-from-right-2",
            )}
            style={active ? { animationDelay: `${idx * 30}ms` } : undefined}
          >
            <div className="relative z-10 flex size-[22px] shrink-0 items-center justify-center">
              {done ? (
                <span className="flex size-[22px] items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm ring-2 ring-background">
                  <Check className="size-3" strokeWidth={3} aria-hidden />
                </span>
              ) : active ? (
                <span className="relative flex size-[22px] items-center justify-center">
                  <span
                    className="absolute inset-0 animate-ping rounded-full bg-primary/30"
                    aria-hidden
                  />
                  <span className="relative flex size-[22px] items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md ring-2 ring-primary/25">
                    <Loader2 className="size-3 animate-spin" aria-hidden />
                  </span>
                </span>
              ) : (
                <span className="flex size-[22px] items-center justify-center rounded-full border border-border/80 bg-muted/40 text-muted-foreground/50">
                  <Circle className="size-2 fill-current" aria-hidden />
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "text-sm leading-tight transition-colors duration-200",
                  done && "text-muted-foreground",
                  active && "font-semibold text-foreground",
                  pending && "text-muted-foreground/60",
                )}
              >
                {getAiFixPhaseLabel(phase)}
              </p>
              {active && status ? (
                <p className="mt-1 animate-pulse text-xs text-primary/80">In progress…</p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function MergeActionButtons({
  mergeAction,
  onChange,
  busy,
  deployEnvsLoading,
  deployEnvironments,
}) {
  const deployMergeAvailable = deployEnvironments.length > 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {MERGE_ACTION_OPTIONS.map((opt) => {
          const isDeployOption = opt.value === "fix_merge_deploy";
          const disabled = busy || (isDeployOption && !deployEnvsLoading && !deployMergeAvailable);
          const selected = mergeAction === opt.value;

          return (
            <Button
              key={opt.value}
              type="button"
              variant={selected ? "default" : "outline"}
              size="sm"
              disabled={disabled}
              className={cn(
                "h-auto min-h-9 flex-1 whitespace-normal px-3 py-2 text-left text-xs leading-snug",
                selected && "ring-2 ring-primary/25",
              )}
              onClick={() => onChange(opt.value)}
            >
              {opt.label}
            </Button>
          );
        })}
      </div>
      {MERGE_ACTION_OPTIONS.find((o) => o.value === mergeAction)?.hint ? (
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {MERGE_ACTION_OPTIONS.find((o) => o.value === mergeAction)?.hint}
        </p>
      ) : null}
      {mergeAction === "fix_merge_deploy" && !deployEnvsLoading && !deployMergeAvailable ? (
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Add environments on the Environment tab to use fix, merge, and deploy.
        </p>
      ) : null}
    </div>
  );
}

function ResultSummary({ result, status }) {
  if (!result || !isAiFixCompleted(status)) return null;
  if (result.mergeMode === "pull_request" && !result.prUrl) return null;
  if (result.mergeMode === "merged_to_target" && !result.commitHash) return null;

  const completedAt = formatAiFixCompletedAt(result.completedAt);
  const shortSha =
    typeof result.commitHash === "string" && result.commitHash
      ? result.commitHash.slice(0, 8)
      : null;
  const agentBranch =
    (typeof result.branchName === "string" && result.branchName.trim()) ||
    (typeof result.sourceBranch === "string" && result.sourceBranch.trim()) ||
    null;
  const agentBranchUrl = formatAiFixBranchBrowseUrl(result);
  const mergedCommitUrl = formatAiFixCommitBrowseUrl(result);
  const branchLine =
    agentBranch && result.targetBranch
      ? `${agentBranch} → ${result.targetBranch}`
      : result.targetBranch || agentBranch || null;
  const resultTitle =
    result.mergeMode === "pull_request"
      ? "Pull request created"
      : result.mergeMode === "merged_to_target"
        ? "Merged to target branch"
        : result.mergeMode === "fix_only"
          ? "Fix on agent branch"
          : "Fix applied";

  return (
    <div className="animate-in fade-in slide-in-from-bottom-3 space-y-3 duration-500">
      <div className="rounded-xl border border-primary/20 bg-linear-to-br from-primary/10 via-primary/5 to-transparent p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/20">
            <Check className="size-4" strokeWidth={2.5} aria-hidden />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-sm font-semibold text-foreground">{resultTitle}</p>
            {completedAt ? (
              <p className="text-xs tabular-nums text-muted-foreground">{completedAt}</p>
            ) : null}
          </div>
        </div>

        <div className="mt-4 space-y-2.5">
          {result.mergeMode === "fix_only" && agentBranch ? (
            <div className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-background/70 px-3 py-2.5">
              <GitBranch className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <div className="min-w-0 text-xs">
                <p className="font-medium text-foreground">Agent branch</p>
                <p className="mt-0.5 font-mono break-all">{agentBranch}</p>
                {shortSha ? (
                  <p className="mt-1 font-mono text-muted-foreground">{shortSha}</p>
                ) : null}
              </div>
            </div>
          ) : null}

          {result.mergeMode === "pull_request" && branchLine ? (
            <div className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-background/70 px-3 py-2.5">
              <GitBranch className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <div className="min-w-0 text-xs">
                <p className="mt-0.5 font-mono">{branchLine}</p>
              </div>
            </div>
          ) : null}

          {result.mergeMode === "merged_to_target" && branchLine ? (
            <div className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-background/70 px-3 py-2.5">
              <GitMerge className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <div className="min-w-0 text-xs">
                <p className="font-medium text-foreground">Target branch</p>
                <p className="mt-0.5 font-mono">{branchLine}</p>
              </div>
            </div>
          ) : null}

          {result.mergeMode === "launchpad_main" && shortSha ? (
            <div className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-background/70 px-3 py-2.5">
              <GitMerge className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground">Merged to launchpad main</p>
                <p className="mt-0.5 font-mono text-xs text-muted-foreground">{shortSha}</p>
              </div>
            </div>
          ) : null}

          {(result.mergeMode === "pull_request" || result.mergeMode === "merged_to_target") &&
          shortSha ? (
            <div className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-background/70 px-3 py-2.5">
              <GitMerge className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <div className="min-w-0 flex gap-2 items-center">
                <p className="text-xs font-medium text-foreground">Commit</p>
                {result.mergeMode === "merged_to_target" && mergedCommitUrl ? (
                  <a
                    href={mergedCommitUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-0.5 font-mono text-xs text-primary underline-offset-2 hover:underline"
                  >
                    {shortSha}
                  </a>
                ) : (
                  <p className="mt-0.5 font-mono text-xs text-muted-foreground">{shortSha}</p>
                )}
              </div>
            </div>
          ) : null}

          {result.versionLabel || result.gitTag ? (
            <div className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-background/70 px-3 py-2.5">
              <GitBranch className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
              <div className="min-w-0 text-xs">
                {result.versionLabel ? (
                  <p className="font-medium text-foreground">Revision {result.versionLabel}</p>
                ) : null}
                {result.gitTag ? (
                  <p className="mt-0.5 font-mono text-muted-foreground">{result.gitTag}</p>
                ) : null}
              </div>
            </div>
          ) : null}

          {result.mergeMode === "launchpad_main" ? (
            <p className="px-1 text-[11px] leading-relaxed text-muted-foreground">
              LaunchPad repo ·{" "}
              {result.repositoryUrl ? (
                <a
                  href={result.repositoryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-primary underline-offset-2 hover:underline"
                >
                  {result.repositoryName || result.repositoryUrl}
                </a>
              ) : (
                <span className="font-mono">{result.repositoryName}</span>
              )}
              {" · "}
              check <span className="font-mono">main</span>
              {result.gitTag ? (
                <>
                  {" "}
                  and tag <span className="font-mono">{result.gitTag}</span>
                </>
              ) : null}
              . This is not the development repo.
            </p>
          ) : result.repositoryName || result.repoPath ? (
            <p className="px-1 text-[11px] leading-relaxed text-muted-foreground">
              {result.mergeMode === "pull_request" ? (
                <>
                  Commits are authored by Launchpad; the PR is opened with your project&apos;s
                  GitHub connection.
                  <br />
                </>
              ) : null}
              Repository ·{" "}
              {result.repositoryUrl ? (
                <a
                  href={result.repositoryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-primary underline-offset-2 hover:underline"
                >
                  {result.repositoryName || result.repoPath}
                </a>
              ) : (
                <span className="font-mono">{result.repositoryName || result.repoPath}</span>
              )}
            </p>
          ) : null}
        </div>
      </div>

      {result.prUrl ? (
        <Button variant="default" size="sm" className="w-full gap-2" asChild>
          <a href={result.prUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="size-3.5" aria-hidden />
            Open pull request
            {result.prNumber ? ` #${result.prNumber}` : ""}
          </a>
        </Button>
      ) : null}

      {!result.prUrl && result.mergeMode === "fix_only" && agentBranchUrl ? (
        <Button variant="default" size="sm" className="w-full gap-2" asChild>
          <a href={agentBranchUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="size-3.5" aria-hidden />
            View agent branch
          </a>
        </Button>
      ) : null}

      {!result.prUrl && result.mergeMode === "merged_to_target" && mergedCommitUrl ? (
        <Button variant="default" size="sm" className="w-full gap-2" asChild>
          <a href={mergedCommitUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="size-3.5" aria-hidden />
            View merged changes
          </a>
        </Button>
      ) : null}

      {result.mergeAction === "fix_merge_deploy" ? (
        <div className="space-y-2">
          {result.deployRunId ? (
            <div className="rounded-lg border border-border/60 bg-background/70 px-3 py-2.5 text-xs">
              <p className="font-medium text-foreground">
                {result.deployError ? "Cloud deploy started" : "Cloud deploy finished"}
              </p>
              {result.deployEnvironmentId ? (
                <p className="mt-0.5 text-muted-foreground">
                  Environment · <span className="font-mono">{result.deployEnvironmentId}</span>
                </p>
              ) : null}
            </div>
          ) : null}
          {typeof result.deployError === "string" && result.deployError.trim() ? (
            <p className="rounded-lg border border-amber-200/80 bg-amber-50 px-3 py-2.5 text-xs text-amber-950">
              Fix completed, but deploy did not finish: {result.deployError.trim()}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function resolveDevRepoRowsForAiFix(developmentRepoUrl) {
  const multi = devRowsFromStored(developmentRepoUrl);
  if (multi?.length) return multi.filter((r) => r.path);
  const plain = String(developmentRepoUrl || "").trim();
  if (plain && !plain.startsWith("{")) {
    return [{ path: plain, ref: "main", directory: "development" }];
  }
  return [];
}

function repoSelectLabel(row) {
  if (row.directory) return `${row.directory} · ${row.path}`;
  return row.path;
}

function DeployEnvSelectSkeleton() {
  return (
    <Skeleton
      className="h-9 w-full rounded-md"
      role="status"
      aria-busy="true"
      aria-label="Loading environments"
    />
  );
}

function RepoBranchesLoadingPanel({ showRepoPicker }) {
  return (
    <div
      className="space-y-4 rounded-xl border border-border/60 bg-muted/10 p-4"
      role="status"
      aria-busy="true"
      aria-label="Loading GitHub repositories and branches"
    >
      {showRepoPicker ? <Skeleton className="h-10 w-full rounded-md" /> : null}
      <div className="space-y-2">
        <Skeleton className="h-3 w-28 rounded" />
        <Skeleton className="h-10 w-full rounded-md" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-32 rounded" />
        <Skeleton className="h-10 w-full rounded-md" />
      </div>
    </div>
  );
}

function ConfirmStep({
  feedbackDescription,
  pickedElementContext = null,
  feedbackSource,
  projectId,
  qaSourceBranch,
  bulkItems = [],
  busy,
  defaultMergeAction = "fix_and_merge",
  defaultDeployEnvironmentId = "",
  onCancel,
  onConfirm,
}) {
  const isQa = feedbackSource === "QA_REPORT";
  const isVisual = feedbackSource === "VISUAL_TEST";
  const isSnippet = feedbackSource === "CODE_SNIPPET";
  // Sentry fixes pick a branch to read like snippet fixes (no QA environment branch).
  const picksSourceBranch = isSnippet || feedbackSource === "SENTRY" || isVisual;
  const isBulkSnippet = isSnippet && bulkItems.length >= 2;
  const needsBranches = isDevRepoFeedbackSource(feedbackSource);

  const [devRepos, setDevRepos] = useState([]);
  const [reposLoading, setReposLoading] = useState(() => needsBranches);
  const [selectedRepoPath, setSelectedRepoPath] = useState("");
  const [branchData, setBranchData] = useState(EMPTY_DEV_BRANCH_DATA);
  const [branchLoadError, setBranchLoadError] = useState("");
  const [defaultBranch, setDefaultBranch] = useState("main");
  const [sourceBranch, setSourceBranch] = useState("");
  const [targetBranch, setTargetBranch] = useState("main");
  const [issueDescription, setIssueDescription] = useState("");
  const [mergeAction, setMergeAction] = useState(() => defaultMergeAction);
  const [deployEnvironments, setDeployEnvironments] = useState([]);
  const [deployEnvironmentId, setDeployEnvironmentId] = useState(() => defaultDeployEnvironmentId);
  const [deployEnvsLoading, setDeployEnvsLoading] = useState(false);

  const isClientLink = feedbackSource === "CLIENT_LINK";

  useEffect(() => {
    const display = resolveFeedbackDescriptionDisplay(
      String(feedbackDescription || ""),
      pickedElementContext,
    );
    setIssueDescription(display.userText);
  }, [feedbackDescription, pickedElementContext]);

  useEffect(() => {
    if (!projectId) return undefined;
    let cancelled = false;
    setDeployEnvsLoading(true);
    void getDeployMap(projectId)
      .then((data) => {
        if (cancelled) return;
        const envs = Array.isArray(data?.environments) ? data.environments : [];
        setDeployEnvironments(envs);
        setDeployEnvironmentId((prev) => {
          if (prev && envs.some((e) => e.id === prev)) return prev;
          return envs[0]?.id ?? "";
        });
      })
      .catch((err) => {
        if (!cancelled) {
          logger.error("ai_fix_deploy_environments", err);
          setDeployEnvironments([]);
        }
      })
      .finally(() => {
        if (!cancelled) setDeployEnvsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const loadBranchesForRepo = useCallback(
    async (repoPath, { isSnippetSource = false, qaBranch = "", preferredRef = "" } = {}) => {
      if (!projectId || !repoPath) {
        setBranchData(EMPTY_DEV_BRANCH_DATA);
        return;
      }
      setBranchData({ ...EMPTY_DEV_BRANCH_DATA, loading: true });
      setBranchLoadError("");
      try {
        const data = await fetchDeveloperRepoBranches(projectId, repoPath);
        const list = Array.isArray(data?.branches) ? data.branches : [];
        const scmDefault = data?.defaultBranch || list[0] || "main";
        const configured = String(preferredRef || "").trim();
        const preferred =
          configured && (list.length === 0 || list.includes(configured)) ? configured : scmDefault;
        setBranchData({ loading: false, branches: list, defaultBranch: preferred });
        setDefaultBranch(preferred);
        if (isSnippetSource) setSourceBranch(preferred);
        setTargetBranch(preferred);
        if (isQa && qaBranch) setSourceBranch(qaBranch);
      } catch (err) {
        setBranchLoadError(err?.error || err?.message || "Failed to load repository branches.");
        setBranchData(EMPTY_DEV_BRANCH_DATA);
      }
    },
    [projectId, isQa],
  );

  useEffect(() => {
    if (!projectId || !needsBranches) return undefined;
    let cancelled = false;
    setReposLoading(true);
    setBranchLoadError("");

    void (async () => {
      try {
        const project = await fetchProjectById(projectId);
        const repoUrl = String(project?.developmentRepoUrl || "").trim();
        if (cancelled) return;
        const rows = resolveDevRepoRowsForAiFix(repoUrl);
        setDevRepos(rows);
        if (!rows.length) {
          setBranchLoadError("Project has no development repository configured.");
          setSelectedRepoPath("");
          return;
        }
        const initial = rows[0];
        setSelectedRepoPath(initial.path);
        await loadBranchesForRepo(initial.path, {
          isSnippetSource: picksSourceBranch,
          qaBranch: qaSourceBranch,
          preferredRef: initial.ref,
        });
      } catch (err) {
        if (!cancelled) {
          setBranchLoadError(err?.error || err?.message || "Failed to load project repositories.");
        }
      } finally {
        if (!cancelled) setReposLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [projectId, needsBranches, picksSourceBranch, qaSourceBranch, loadBranchesForRepo]);

  useEffect(() => {
    if (isQa && qaSourceBranch) setSourceBranch(qaSourceBranch);
  }, [isQa, qaSourceBranch]);

  const handleRepoChange = useCallback(
    (nextPath) => {
      const path = String(nextPath || "").trim();
      if (!path || path === selectedRepoPath) return;
      setSelectedRepoPath(path);
      const row = devRepos.find((r) => r.path === path);
      void loadBranchesForRepo(path, {
        isSnippetSource: picksSourceBranch,
        qaBranch: isQa ? qaSourceBranch || row?.ref || "" : "",
        preferredRef: row?.ref || "",
      });
    },
    [selectedRepoPath, devRepos, loadBranchesForRepo, picksSourceBranch, isQa, qaSourceBranch],
  );

  const searchRepoBranches = useCallback(
    async (query) => {
      const q = String(query || "").trim();
      if (!selectedRepoPath || q.length < 2) {
        return { branches: [], defaultBranch: branchData.defaultBranch || defaultBranch || "" };
      }
      const data = await fetchDeveloperRepoBranches(projectId, selectedRepoPath, { q });
      return {
        branches: Array.isArray(data?.branches) ? data.branches : [],
        defaultBranch: data?.defaultBranch || branchData.defaultBranch || defaultBranch || "",
      };
    },
    [projectId, selectedRepoPath, branchData.defaultBranch, defaultBranch],
  );

  const branchFieldLabelClass =
    "text-xs font-semibold uppercase tracking-wider text-muted-foreground";

  const isGitHubLoading = reposLoading || branchData.loading;
  const showRepoPickerResolved = devRepos.length > 1;

  // Bulk fix always opens one PR, so "fix only" falls back to fix and merge.
  const previewMergeAction =
    isBulkSnippet && mergeAction === "fix_only" ? "fix_and_merge" : mergeAction;
  /** Fix only keeps Read code from; PR/merge target is unused. */
  const isFixOnly = previewMergeAction === "fix_only";

  const branchSummary = useMemo(() => {
    const src = picksSourceBranch
      ? sourceBranch || defaultBranch
      : qaSourceBranch || sourceBranch || defaultBranch;
    const tgt = targetBranch || defaultBranch;
    const repo = selectedRepoPath || devRepos[0]?.path || "";
    if (!repo || !src) return null;
    if (!isFixOnly && !tgt) return null;
    return { src, tgt, repo };
  }, [
    picksSourceBranch,
    sourceBranch,
    defaultBranch,
    qaSourceBranch,
    targetBranch,
    selectedRepoPath,
    devRepos,
    isFixOnly,
  ]);

  const handleConfirm = () => {
    const resolvedMergeAction = previewMergeAction;
    const fixOnly = resolvedMergeAction === "fix_only";

    if (
      resolvedMergeAction === "fix_merge_deploy" &&
      !deployEnvsLoading &&
      deployEnvironments.length === 0
    ) {
      toast.error("Add an environment on the Environment tab first.");
      return;
    }

    if (
      resolvedMergeAction === "fix_merge_deploy" &&
      deployEnvironments.length > 0 &&
      !String(deployEnvironmentId || "").trim()
    ) {
      toast.error("Choose a deploy environment first.");
      return;
    }

    if (isBulkSnippet) {
      if (needsBranches) {
        const trimmedSource = String(sourceBranch || "").trim();
        const trimmedTarget = String(targetBranch || "").trim();
        const src = trimmedSource || defaultBranch;
        onConfirm(
          withMergeConfirmBody(
            {
              repoPath: selectedRepoPath || devRepos[0]?.path || "",
              sourceBranch: src,
              ...(fixOnly ? {} : { targetBranch: trimmedTarget || defaultBranch }),
            },
            resolvedMergeAction,
            deployEnvironmentId,
          ),
        );
        return;
      }
      onConfirm(withMergeConfirmBody({}, resolvedMergeAction, deployEnvironmentId));
      return;
    }

    const trimmedIssue = assembleFeedbackDescriptionWithElementContext(
      issueDescription,
      pickedElementContext,
      feedbackDescription,
    );
    if (!trimmedIssue) return;
    if (needsBranches) {
      const trimmedSource = String(sourceBranch || "").trim();
      const trimmedTarget = String(targetBranch || "").trim();
      const src = picksSourceBranch
        ? trimmedSource || defaultBranch
        : qaSourceBranch || trimmedSource || defaultBranch;
      onConfirm(
        withMergeConfirmBody(
          {
            repoPath: selectedRepoPath || devRepos[0]?.path || "",
            sourceBranch: src,
            ...(fixOnly ? {} : { targetBranch: trimmedTarget || defaultBranch }),
            issueDescription: trimmedIssue,
          },
          resolvedMergeAction,
          deployEnvironmentId,
        ),
      );
      return;
    }
    onConfirm(
      withMergeConfirmBody(
        { issueDescription: trimmedIssue },
        resolvedMergeAction,
        deployEnvironmentId,
      ),
    );
  };

  const deployMergeStartBlocked =
    previewMergeAction === "fix_merge_deploy" &&
    !deployEnvsLoading &&
    (deployEnvironments.length === 0 ||
      (deployEnvironments.length > 0 && !String(deployEnvironmentId || "").trim()));

  const startButtonLabel = isBulkSnippet
    ? previewMergeAction === "fix_merge_deploy"
      ? `Start ${bulkItems.length} fixes & deploy`
      : `Start ${bulkItems.length} fixes (1 PR)`
    : mergeAction === "fix_only"
      ? "Start fix only"
      : mergeAction === "fix_merge_deploy"
        ? "Start fix, merge & deploy"
        : "Start fix and merge";

  return (
    <>
      <div className="animate-in fade-in slide-in-from-right-3 min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4 duration-300">
        <div className="rounded-xl border border-primary/15 bg-linear-to-br from-primary/10 via-transparent to-transparent p-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {isBulkSnippet
              ? "Cursor will fix each selected issue in order and combine all changes into one pull request."
              : "Cursor will analyze this feedback, generate a fix, and apply it to your repository. You can follow live progress here."}
          </p>
        </div>

        {isBulkSnippet ? (
          <div className="space-y-2">
            <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Selected issues ({bulkItems.length})
            </Label>
            <ul className="max-h-48 space-y-2 overflow-y-auto rounded-xl border border-border/60 bg-muted/10 p-3">
              {bulkItems.map((item, index) => {
                const display = resolveFeedbackDescriptionDisplay(
                  String(item.description || "").trim(),
                  item.pickedElementContext,
                );
                const text = display.userText;
                const preview =
                  text.length > 140 ? `${text.slice(0, 140)}…` : text || "No description";
                return (
                  <li
                    key={item.id}
                    className="space-y-1.5 rounded-lg border border-border/50 bg-background/80 px-3 py-2 text-sm leading-relaxed text-muted-foreground"
                  >
                    <div>
                      <span className="mr-2 font-medium text-foreground">{index + 1}.</span>
                      {preview}
                    </div>
                    {display.hasElementContext ? (
                      <ElementContextChip
                        tag={display.tag}
                        inspectorCtx={display.inspectorCtx}
                        contextBlock={display.contextBlock}
                      />
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        {isBulkSnippet && previewMergeAction === "fix_merge_deploy" ? (
          <div className="space-y-2 rounded-xl border border-border/60 bg-muted/10 p-4">
            <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Deploy environment
            </Label>
            {deployEnvsLoading ? (
              <DeployEnvSelectSkeleton />
            ) : deployEnvironments.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Add environments on the Environment tab to deploy after the fixes.
              </p>
            ) : (
              <Select
                value={deployEnvironmentId}
                onValueChange={setDeployEnvironmentId}
                disabled={busy}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select environment" />
                </SelectTrigger>
                <SelectContent>
                  {deployEnvironments.map((env) => (
                    <SelectItem key={env.id} value={env.id}>
                      {env.name || env.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Cloud deploy of the shared fix branch starts once every fix in this batch finishes.
            </p>
          </div>
        ) : null}

        {!isBulkSnippet && feedbackDescription ? (
          <div className="space-y-2">
            <Label
              htmlFor="ai-fix-issue-description"
              className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
            >
              Issue description
            </Label>
            {(() => {
              const display = resolveFeedbackDescriptionDisplay(
                String(feedbackDescription || ""),
                pickedElementContext,
              );
              if (!display.hasElementContext) return null;
              return (
                <ElementContextChip
                  tag={display.tag}
                  inspectorCtx={display.inspectorCtx}
                  contextBlock={display.contextBlock}
                />
              );
            })()}
            <Textarea
              id="ai-fix-issue-description"
              value={issueDescription}
              onChange={(e) => setIssueDescription(e.target.value)}
              disabled={busy}
              rows={5}
              placeholder="Describe the issue and expected fix for the Cursor agent…"
              className="min-h-[120px] resize-y text-sm leading-relaxed"
            />
            <p className="text-[11px] text-muted-foreground">
              Edit before starting — updates the feedback description and is sent to Cursor.
            </p>
          </div>
        ) : null}

        {!isBulkSnippet ? (
          <div className="space-y-3 rounded-xl border border-border/60 bg-muted/10 p-4">
            <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              After the fix
            </Label>
            <MergeActionButtons
              mergeAction={mergeAction}
              onChange={setMergeAction}
              busy={busy}
              deployEnvsLoading={deployEnvsLoading}
              deployEnvironments={deployEnvironments}
            />
            {mergeAction === "fix_merge_deploy" ? (
              <div className="space-y-2 pt-1">
                <Label className="text-xs font-medium text-foreground">Deploy environment</Label>
                {deployEnvsLoading ? (
                  <DeployEnvSelectSkeleton />
                ) : deployEnvironments.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Add environments on the Environment tab to deploy after merge.
                  </p>
                ) : (
                  <Select
                    value={deployEnvironmentId}
                    onValueChange={setDeployEnvironmentId}
                    disabled={busy}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select environment" />
                    </SelectTrigger>
                    <SelectContent>
                      {deployEnvironments.map((env) => (
                        <SelectItem key={env.id} value={env.id}>
                          {env.name || env.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            ) : null}
            {isClientLink && mergeAction === "fix_only" ? (
              <p className="text-[11px] text-muted-foreground">
                Changes stay on the agent branch until you merge manually.
              </p>
            ) : null}
            <div className="border-t border-border/50 pt-4">
              <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                What happens next
              </h3>
              <PhaseTimeline
                status={null}
                mergeAction={previewMergeAction}
                feedbackSource={feedbackSource}
                isBulkBatch={isBulkSnippet}
              />
            </div>
          </div>
        ) : null}

        {needsBranches ? (
          isGitHubLoading ? (
            <RepoBranchesLoadingPanel showRepoPicker={showRepoPickerResolved} />
          ) : (
            <div className="space-y-4 rounded-xl border border-border/60 bg-muted/10 p-4">
              {branchLoadError ? (
                <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                  {branchLoadError}
                </p>
              ) : null}

              {showRepoPickerResolved ? (
                <div className="space-y-2">
                  <Label className={branchFieldLabelClass}>Development repository</Label>
                  <RepositoryCombobox
                    value={selectedRepoPath}
                    onValueChange={handleRepoChange}
                    disabled={busy || branchData.loading}
                    placeholder="Select repository"
                    triggerClassName="font-mono text-xs"
                    optionClassName="font-mono text-xs"
                    options={devRepos.map((row) => ({
                      value: row.path,
                      label: repoSelectLabel(row),
                    }))}
                  />
                </div>
              ) : null}

              {picksSourceBranch ? (
                <DevelopmentRepoBranchCombobox
                  repoPath={selectedRepoPath}
                  value={sourceBranch}
                  onChange={setSourceBranch}
                  branchData={branchData}
                  branchError={branchLoadError}
                  onSearchBranches={searchRepoBranches}
                  idSuffix="ai-fix-source"
                  label="Read code from"
                  labelClassName={branchFieldLabelClass}
                  disabled={busy || !selectedRepoPath}
                />
              ) : null}

              {isQa ? (
                <div className="space-y-2">
                  <Label className={branchFieldLabelClass}>Read code from (QA environment)</Label>
                  <p className="rounded-lg border border-border/60 bg-background px-3 py-2 font-mono text-sm">
                    {qaSourceBranch || sourceBranch || defaultBranch}
                  </p>
                </div>
              ) : null}

              {!isFixOnly ? (
                <DevelopmentRepoBranchCombobox
                  repoPath={selectedRepoPath}
                  value={targetBranch}
                  onChange={setTargetBranch}
                  branchData={branchData}
                  branchError={picksSourceBranch ? "" : branchLoadError}
                  onSearchBranches={searchRepoBranches}
                  idSuffix="ai-fix-target"
                  label={
                    previewMergeAction === "fix_and_merge" ||
                    previewMergeAction === "fix_merge_deploy"
                      ? "Merge into"
                      : "Create PR against"
                  }
                  labelClassName={branchFieldLabelClass}
                  disabled={busy || !selectedRepoPath}
                />
              ) : null}

              {branchSummary ? (
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  {isFixOnly ? (
                    <>
                      Agent checks out{" "}
                      <span className="font-mono text-foreground">{branchSummary.src}</span> and
                      pushes changes to a new agent branch on{" "}
                      <span className="font-mono text-foreground">{branchSummary.repo}</span>.
                    </>
                  ) : (
                    <>
                      Agent checks out{" "}
                      <span className="font-mono text-foreground">{branchSummary.src}</span> and
                      merges into{" "}
                      <span className="font-mono text-foreground">{branchSummary.tgt}</span> on{" "}
                      <span className="font-mono text-foreground">{branchSummary.repo}</span>.
                    </>
                  )}
                </p>
              ) : null}
            </div>
          )
        ) : null}
      </div>

      <DrawerFooter className="shrink-0 border-t border-border/60 bg-muted/10 px-5 py-4">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onCancel}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="flex-1 gap-2"
            onClick={handleConfirm}
            disabled={
              busy ||
              isGitHubLoading ||
              deployMergeStartBlocked ||
              (needsBranches && !selectedRepoPath) ||
              (picksSourceBranch && !String(sourceBranch || "").trim()) ||
              (!isFixOnly && !String(targetBranch || "").trim()) ||
              (!isBulkSnippet && !String(issueDescription || "").trim())
            }
          >
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            {startButtonLabel}
          </Button>
        </div>
      </DrawerFooter>
    </>
  );
}

export function FeedbackAiFixDrawer({
  open,
  onOpenChange,
  mode = "view",
  projectId,
  feedbackSource,
  mergeAction: mergeActionProp = "fix_and_merge",
  defaultMergeAction = "fix_and_merge",
  defaultDeployEnvironmentId = "",
  qaSourceBranch,
  feedbackDescription,
  pickedElementContext = null,
  feedbackTitle,
  bulkItems = [],
  status,
  result,
  error,
  streamLog,
  isRunning,
  busy,
  clarifying = false,
  onConfirmStart,
  onCancel,
  onClarify,
}) {
  const isBulkConfirm = bulkItems.length >= 2;
  const showConfirm =
    mode === "confirm" &&
    !busy &&
    !isRunning &&
    !isBulkConfirm &&
    !isAiFixCompleted(status) &&
    !isAiFixRunning(status);
  const showBulkConfirm = mode === "confirm" && isBulkConfirm && !busy;

  const timelineStatus = status || (busy || isRunning ? "QUEUED" : null);
  const showProgress = Boolean(timelineStatus) || busy || isRunning;
  const isAwaitingQuestions = String(status || "") === "AWAITING_QUESTIONS";
  const clarifyQuestions = Array.isArray(result?.questions) ? result.questions : [];
  const failureMessage = formatFeedbackAiFixFailureMessage(error, status);

  const headline = useMemo(() => {
    if (showBulkConfirm) return `Fix ${bulkItems.length} snippet issues with AI?`;
    if (showConfirm) return "Fix with AI?";
    if (busy && !status) return "Starting fix…";
    if (isAiFixCompleted(status)) return "Fix complete";
    if (isAiFixFailed(status)) return "Fix stopped";
    if (isAwaitingQuestions) return "Awaiting Clarifying Answers";
    if (isAiFixRunning(status) || timelineStatus)
      return getAiFixPhaseLabel(timelineStatus || status);
    return "AI fix";
  }, [
    showBulkConfirm,
    showConfirm,
    bulkItems.length,
    busy,
    status,
    timelineStatus,
    isAwaitingQuestions,
  ]);

  const confirmVisible = showConfirm || showBulkConfirm;

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="h-full max-h-none w-full border-l border-border/70 data-[vaul-drawer-direction=right]:w-full data-[vaul-drawer-direction=right]:sm:max-w-md">
        <div className="relative flex h-full min-h-0 flex-col">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-linear-to-b from-primary/10 via-primary/5 to-transparent"
            aria-hidden
          />
          <DrawerHeader className="relative shrink-0 border-b border-border/60 px-5 pt-5 pb-4 text-left">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <div
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-xl ring-1",
                    showConfirm || showBulkConfirm
                      ? "bg-primary/15 text-primary ring-primary/20"
                      : isAiFixCompleted(status)
                        ? "bg-primary/15 text-primary ring-primary/20"
                        : isAiFixFailed(status)
                          ? "bg-destructive/10 text-destructive ring-destructive/20"
                          : isAwaitingQuestions
                            ? "bg-amber-50 text-amber-800 ring-amber-200"
                            : "bg-primary/10 text-primary ring-primary/15",
                  )}
                >
                  {showConfirm || showBulkConfirm ? (
                    <Sparkles className="size-5" aria-hidden />
                  ) : isAwaitingQuestions ? (
                    <HelpCircle className="size-5" aria-hidden />
                  ) : isAiFixRunning(status) ||
                    (busy && !isAiFixCompleted(status) && !isAiFixFailed(status)) ? (
                    <Loader2 className="size-5 animate-spin" aria-hidden />
                  ) : isAiFixCompleted(status) ? (
                    <Check className="size-5" aria-hidden />
                  ) : isAiFixFailed(status) ? (
                    <XCircle className="size-5" aria-hidden />
                  ) : (
                    <Sparkles className="size-5" aria-hidden />
                  )}
                </div>
                <div className="min-w-0">
                  <DrawerTitle className="text-base font-semibold tracking-tight">
                    {headline}
                  </DrawerTitle>
                  {!confirmVisible ? (
                    <DrawerDescription className="mt-1 line-clamp-2 text-xs leading-relaxed">
                      {feedbackTitle || "Feedback issue"}
                    </DrawerDescription>
                  ) : null}
                </div>
              </div>
              <DrawerClose
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Close"
              >
                <X className="size-4" />
              </DrawerClose>
            </div>
          </DrawerHeader>

          {confirmVisible ? (
            <ConfirmStep
              feedbackDescription={feedbackDescription}
              pickedElementContext={pickedElementContext}
              feedbackSource={feedbackSource}
              projectId={projectId}
              qaSourceBranch={qaSourceBranch}
              bulkItems={bulkItems}
              busy={busy}
              defaultMergeAction={defaultMergeAction}
              defaultDeployEnvironmentId={defaultDeployEnvironmentId}
              onCancel={() => onOpenChange(false)}
              onConfirm={onConfirmStart}
            />
          ) : (
            <>
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                <div className="space-y-6">
                  {showProgress && !isAwaitingQuestions ? (
                    <section>
                      <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        Live progress
                      </h3>
                      <PhaseTimeline
                        status={timelineStatus || "QUEUED"}
                        mergeAction={mergeActionProp}
                        feedbackSource={feedbackSource}
                        isBulkBatch={isBulkConfirm}
                      />
                    </section>
                  ) : null}

                  {isAwaitingQuestions && clarifyQuestions.length > 0 ? (
                    <section className="space-y-2">
                      <h3 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        Clarifying questions
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Answer these before the fix continues — no pull request will be opened yet.
                      </p>
                      <LaunchpadQuestionsCard
                        questions={clarifyQuestions}
                        sending={clarifying}
                        continueMode="implement"
                        onSubmit={(prompt) => void onClarify?.(prompt)}
                      />
                    </section>
                  ) : null}

                  {failureMessage && isAiFixFailed(status) ? (
                    <div className="animate-in fade-in rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                      <p className="font-medium">Fix could not be completed</p>
                      <p className="mt-1.5 text-xs leading-relaxed opacity-90">{failureMessage}</p>
                      {result?.sourceBranch || result?.targetBranch || result?.branchName ? (
                        <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                          {[result.branchName || result.sourceBranch, result.targetBranch]
                            .filter(Boolean)
                            .join(" → ")}
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  <ResultSummary result={result} status={status} />
                </div>
              </div>

              {isRunning && onCancel ? (
                <DrawerFooter className="shrink-0 border-t border-border/60 bg-muted/10 px-5 py-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={onCancel}
                  >
                    <XCircle className="size-3.5" aria-hidden />
                    Cancel fix
                  </Button>
                </DrawerFooter>
              ) : null}
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
