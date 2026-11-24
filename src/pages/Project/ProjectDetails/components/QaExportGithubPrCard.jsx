import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Github, Loader2 } from "lucide-react";
import {
  fetchDeveloperRepoBranches,
  fetchQaExportPrOptions,
  fetchQaExportPrState,
  fetchQaExportPrStatus,
  startQaExportPr,
} from "@/api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { RepositoryCombobox } from "@/components/RepositoryCombobox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  parseQaExportPrNumber,
  qaExportPrStatusLabel,
  pollQaExportPrUntilReady,
} from "@/lib/qaExportPrFlow";
import {
  DevelopmentRepoBranchCombobox,
  EMPTY_DEV_BRANCH_DATA,
} from "@/pages/Project/CreateProject/components/DevelopmentRepoBranchCombobox";
import { toast } from "sonner";

const QA_EXPORT_PR_LINK_CLASS =
  "mt-1 inline-flex items-center gap-1 font-medium text-[#004B91] hover:text-[#003d7a] hover:underline";

function formatError(err) {
  if (typeof err === "string" && err.trim()) return err.trim();
  if (err && typeof err === "object") {
    const row = /** @type {{ error?: unknown, message?: unknown }} */ (err);
    if (typeof row.error === "string" && row.error.trim()) return row.error.trim();
    if (typeof row.message === "string" && row.message.trim()) return row.message.trim();
  }
  return "Could not create pull request.";
}

/** @param {{ repos: Array<{ path: string, label?: string }> }} props */
function ConnectedDevelopmentRepos({ repos }) {
  if (!repos.length) return null;
  return (
    <div className="overflow-hidden rounded-lg border border-border/60 bg-muted/30">
      {repos.map((repo, index) => {
        const path = String(repo.path || "").trim();
        const label =
          String(repo.label || "").trim() ||
          (index === 0 ? "Development repo" : `Development repo ${index + 1}`);
        return (
          <div
            key={path || `repo-${index}`}
            className={
              index > 0
                ? "flex items-center gap-2.5 border-t border-border/70 px-3 py-2.5"
                : "flex items-center gap-2.5 px-3 py-2.5"
            }
          >
            <Github className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {label}
              </p>
              <p className="truncate text-sm font-medium text-foreground" title={path}>
                {path}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** @param {{ prUrl: string, prNumber?: number | null, baseBranch: string, updated?: boolean }} props */
function QaExportPrLink({ prUrl, prNumber = null, baseBranch, updated = false }) {
  const href = String(prUrl || "").trim();
  const branch = String(baseBranch || "").trim() || "main";
  const number = parseQaExportPrNumber(href, prNumber);
  if (!href) return null;

  return (
    <div className="text-sm text-muted-foreground">
      <p>
        {updated ? "PR updated for" : "PR created for"}{" "}
        <span className="font-semibold text-foreground">{branch}</span> branch:
      </p>
      <a href={href} target="_blank" rel="noopener noreferrer" className={QA_EXPORT_PR_LINK_CLASS}>
        <Github className="size-4 shrink-0" aria-hidden />
        {number ? `#${number}` : "View PR"}
      </a>
    </div>
  );
}

/**
 * @param {{ projectId?: number | string | null }} props
 */
export function QaExportGithubPrCard({ projectId }) {
  const [repos, setRepos] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [optionsError, setOptionsError] = useState("");
  const [repoPath, setRepoPath] = useState("");
  const [baseBranch, setBaseBranch] = useState("");
  const [branchData, setBranchData] = useState(EMPTY_DEV_BRANCH_DATA);
  const [branchLoadError, setBranchLoadError] = useState("");
  const [prLoading, setPrLoading] = useState(false);
  const [prProgressMessage, setPrProgressMessage] = useState("");
  const [prError, setPrError] = useState("");
  const [prStates, setPrStates] = useState([]);

  const multiRepo = repos.length > 1;
  const savedPr = useMemo(() => {
    const row =
      prStates.find((state) => state.repoPath === repoPath) ||
      (prStates.length === 1 ? prStates[0] : null);
    if (!row?.prUrl) return null;
    return {
      prUrl: String(row.prUrl),
      prNumber: parseQaExportPrNumber(row.prUrl, row.prNumber),
      baseBranch: row.baseBranch || baseBranch,
      updated: Boolean(row.updated),
    };
  }, [prStates, repoPath, baseBranch]);
  const selectedRepo = useMemo(
    () => repos.find((row) => row.repoPath === repoPath) || repos[0] || null,
    [repos, repoPath],
  );
  const connectedRepos = useMemo(() => {
    if (multiRepo) {
      return repos.map((row, index) => ({
        path: row.repoPath,
        label: index === 0 ? "Development repo" : `Development repo ${index + 1}`,
      }));
    }
    const path = repoPath || repos[0]?.repoPath || "";
    return path ? [{ path }] : [];
  }, [multiRepo, repos, repoPath]);

  useEffect(() => {
    const pid = Number(projectId);
    if (!Number.isInteger(pid) || pid < 1) return;

    let cancelled = false;
    setLoadingOptions(true);
    setOptionsError("");

    void (async () => {
      try {
        const [options, state] = await Promise.all([
          fetchQaExportPrOptions(pid),
          fetchQaExportPrState(pid).catch(() => ({ states: [] })),
        ]);
        if (cancelled) return;
        const list = Array.isArray(options?.repos) ? options.repos : [];
        setRepos(list);
        if (list.length > 0) {
          setRepoPath(list[0].repoPath);
          setBaseBranch(list[0].defaultBaseBranch || "main");
        }
        setPrStates(Array.isArray(state?.states) ? state.states : []);
      } catch (err) {
        if (!cancelled) setOptionsError(formatError(err));
      } finally {
        if (!cancelled) setLoadingOptions(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    const pid = Number(projectId);
    const path = String(repoPath || "").trim();
    if (!Number.isInteger(pid) || pid < 1 || path.length < 10) {
      setBranchData(EMPTY_DEV_BRANCH_DATA);
      return undefined;
    }

    let cancelled = false;
    setBranchData({ ...EMPTY_DEV_BRANCH_DATA, loading: true });
    setBranchLoadError("");

    void (async () => {
      try {
        const data = await fetchDeveloperRepoBranches(pid, path);
        if (cancelled) return;
        const branches = Array.isArray(data?.branches) ? data.branches : [];
        const defaultBranch = data?.defaultBranch || branches[0] || "main";
        setBranchData({
          loading: false,
          branches,
          defaultBranch,
          truncated: Boolean(data?.truncated),
        });
        setBaseBranch((current) =>
          current && (branches.length === 0 || branches.includes(current))
            ? current
            : selectedRepo?.defaultBaseBranch || defaultBranch,
        );
      } catch (err) {
        if (!cancelled) {
          setBranchData(EMPTY_DEV_BRANCH_DATA);
          setBranchLoadError(formatError(err));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [projectId, repoPath, selectedRepo?.defaultBaseBranch]);

  const searchRepoBranches = useCallback(
    async (query) => {
      const pid = Number(projectId);
      const path = String(repoPath || "").trim();
      if (!Number.isInteger(pid) || pid < 1 || !path) {
        return { branches: [], defaultBranch: "" };
      }
      return fetchDeveloperRepoBranches(pid, path, { q: query });
    },
    [projectId, repoPath],
  );

  const handleRepoChange = (value) => {
    setRepoPath(value);
    const row = repos.find((item) => item.repoPath === value);
    if (row?.defaultBaseBranch) setBaseBranch(row.defaultBaseBranch);
  };

  const handleCreatePr = async () => {
    const pid = Number(projectId);
    if (!Number.isInteger(pid) || pid < 1) return;
    if (!repoPath || !baseBranch.trim()) {
      setPrError("Choose a repository and base branch.");
      return;
    }

    setPrLoading(true);
    setPrProgressMessage("Preparing test cases folder…");
    setPrError("");

    try {
      const { jobId } = await startQaExportPr(pid, {
        repoPath,
        baseBranch: baseBranch.trim(),
      });
      const ready = await pollQaExportPrUntilReady({
        projectId: pid,
        jobId,
        fetchStatus: fetchQaExportPrStatus,
        onProgress: (status) => {
          setPrProgressMessage(qaExportPrStatusLabel(status));
        },
      });
      const prUrl = String(ready?.prUrl || "").trim();
      const prNumber = parseQaExportPrNumber(prUrl, ready?.prNumber);
      const branchUsed = String(ready?.baseBranch || baseBranch).trim();
      if (prUrl) {
        setPrStates((prev) => {
          const rest = prev.filter((row) => row.repoPath !== repoPath);
          return [
            {
              repoPath,
              baseBranch: branchUsed,
              prUrl,
              prNumber,
              updated: Boolean(ready?.updatedExistingPr),
            },
            ...rest,
          ];
        });
        window.open(prUrl, "_blank", "noopener,noreferrer");
      }
      toast.success(
        ready?.updatedExistingPr
          ? "Pull request updated with latest test cases"
          : "Pull request created",
      );
    } catch (err) {
      setPrError(formatError(err));
    } finally {
      setPrLoading(false);
      setPrProgressMessage("");
    }
  };

  return (
    <div className="min-w-0 rounded-xl border border-border/60 bg-card p-4 shadow-sm sm:p-6">
      <h2 className="text-lg font-semibold text-foreground">Create PR</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Push Playwright test cases to{" "}
        <span className="font-medium text-foreground">launchpad-qa/</span> in your GitHub App
        repository and open a pull request for review. LaunchPad will not merge automatically.
      </p>

      {loadingOptions ? (
        <div
          className="mt-4 space-y-3"
          role="status"
          aria-busy="true"
          aria-label="Loading connected GitHub repositories"
        >
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-32" />
        </div>
      ) : null}

      {!loadingOptions && repos.length > 0 ? (
        <div className="mt-4 space-y-3">
          <ConnectedDevelopmentRepos repos={connectedRepos} />

          {multiRepo ? (
            <div className="space-y-2">
              <Label className="text-xs font-normal text-muted-foreground">
                Repository for this PR
              </Label>
              <RepositoryCombobox
                value={repoPath}
                onValueChange={handleRepoChange}
                disabled={prLoading}
                placeholder="Select repository"
                triggerClassName="text-xs"
                optionClassName="text-xs"
                options={repos.map((row) => ({
                  value: row.repoPath,
                  label: row.repoPath,
                }))}
              />
            </div>
          ) : null}

          <DevelopmentRepoBranchCombobox
            repoPath={repoPath}
            value={baseBranch}
            onChange={setBaseBranch}
            branchData={branchData}
            branchError={branchLoadError}
            onSearchBranches={searchRepoBranches}
            idSuffix="qa-export-pr"
            label="Base branch"
            disabled={prLoading || !repoPath}
          />
        </div>
      ) : null}

      {optionsError ? (
        <Alert variant="destructive" className="mt-4 border-destructive/30 bg-destructive/5">
          <AlertCircle className="size-4" aria-hidden />
          <AlertTitle>GitHub export unavailable</AlertTitle>
          <AlertDescription>{optionsError}</AlertDescription>
        </Alert>
      ) : null}

      {prError ? (
        <Alert variant="destructive" className="mt-4 border-destructive/30 bg-destructive/5">
          <AlertCircle className="size-4" aria-hidden />
          <AlertTitle>Create PR failed</AlertTitle>
          <AlertDescription>{prError}</AlertDescription>
        </Alert>
      ) : null}

      {savedPr ? (
        <div className="mt-4">
          <QaExportPrLink {...savedPr} />
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {prLoading ? (
          <p
            className="min-w-48 flex-1 text-sm text-muted-foreground"
            aria-live="polite"
            title={prProgressMessage || "Creating PR…"}
          >
            <span className="inline-flex min-w-0 items-center gap-2">
              <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
              <span>{prProgressMessage || "Creating PR…"}</span>
            </span>
          </p>
        ) : null}
        <Button
          type="button"
          disabled={
            prLoading || loadingOptions || repos.length === 0 || !repoPath || !baseBranch.trim()
          }
          className="shrink-0"
          onClick={() => void handleCreatePr()}
        >
          <Github className="size-4" aria-hidden />
          Create PR
        </Button>
      </div>
    </div>
  );
}
