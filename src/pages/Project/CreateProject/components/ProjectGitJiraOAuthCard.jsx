import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  forwardRef,
} from "react";
import { Link } from "react-router-dom";
import {
  ACCOUNT_CONNECTIONS_LABEL,
  ACCOUNT_CONNECTIONS_PATH,
  PROJECT_GIT_JIRA_LABEL,
} from "@/constants/integrationProviders";
import { RepositorySettingsSection } from "@/pages/Project/ProjectSettings/components/RepositorySettingsSection";
import {
  fetchBitbucketReposPage,
  fetchDeveloperRepoBranches,
  fetchGithubReposPage,
  fetchIntegrationRepoBranches,
  validateDeveloperRepoBranch,
  validateIntegrationRepoBranch,
  fetchJiraProjectsForConnection,
  getBitbucketOAuthAuthorizeUrl,
  getGithubOAuthAuthorizeUrl,
  getJiraOAuthAuthorizeUrl,
} from "@/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import githubMarkSvg from "@/assets/apps/GitHub.svg";
import bitbucketMarkSvg from "@/assets/apps/BitBucket.svg";
import jiraMarkSvg from "@/assets/apps/Jira.svg";
import { cn } from "@/lib/utils";
import { AlertTriangle, ChevronDown, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { integrationToastFromAxios } from "@/utils/integrationErrors";
import { jiraBaseUrlHostname } from "@/components/integrations/JiraConnectionStatusControl";
import { GithubAccessLevelPicker } from "@/components/integrations/GithubAccessLevelPicker";
import { BitbucketAccessLevelPicker } from "@/components/integrations/BitbucketAccessLevelPicker";
import { GITHUB_ACCESS_LEVEL, normalizeGithubAccessLevel } from "@/constants/githubOAuthAccess";
import {
  BITBUCKET_ACCESS_LEVEL,
  normalizeBitbucketAccessLevel,
} from "@/constants/bitbucketOAuthAccess";
import { RepositoryCombobox } from "@/components/RepositoryCombobox";
import {
  DevelopmentRepoBranchCombobox,
  EMPTY_DEV_BRANCH_DATA,
} from "./DevelopmentRepoBranchCombobox";
import {
  defaultDevMultiRow,
  defaultLaunchpadMultiRow,
  devMultiRowsNeedProvision,
  devRowsFromStored,
  isDevBranchListedLocally,
  hasAppRepositories,
  isDevRowAutoProvision,
  launchpadRowsFromStored,
  scmHostFromRepoPath,
  serializeDevMulti,
  serializeDevMultiForSave,
  serializeLaunchpadMulti,
  tryParseStoredMultiRepo,
  validateDevMultiRows,
  validateLaunchpadMultiRows,
} from "@/utils/projectMultiRepoForm";

/** Renders brand SVGs from `src/assets` (Vite resolves imports to URLs). */
function IntegrationBrandImg({ src, className, invertOnDark }) {
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

const GH_REPO_PATH_RE = /^(https?:\/\/)?github\.com\/[^/\s]+\/[^/\s]+(?:\.git)?$/i;

const BB_REPO_PATH_RE = /^(https?:\/\/)?bitbucket\.org\/[^/\s]+\/[^/\s]+(?:\.git)?$/i;

function normalizeRepoPathForCompare(p) {
  return String(p || "")
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\.git$/i, "")
    .toLowerCase();
}

/** @returns {string|null} https URL for a github.com / bitbucket.org repo path */
function repoPathToWebUrl(raw) {
  const s = String(raw || "").trim();
  if (!s) return null;
  if (!GH_REPO_PATH_RE.test(s) && !BB_REPO_PATH_RE.test(s)) return null;
  const withoutGit = s.replace(/\.git$/i, "");
  if (/^https?:\/\//i.test(withoutGit)) return withoutGit;
  return `https://${withoutGit}`;
}

function CurrentRepoPathDisplay({ path }) {
  if (tryParseStoredMultiRepo(path)) {
    return "Multiple launchpad repositories (saved)";
  }
  const href = repoPathToWebUrl(path);
  if (!href) return path;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="underline underline-offset-2 hover:text-foreground"
    >
      {path}
    </a>
  );
}

/**
 * Edit dialog: skip OAuth/Jira connection checks when the user is not changing
 * code-host or Jira bindings (e.g. updating stakeholders only).
 */
function shouldValidateEditOAuthConnections(
  project,
  {
    selectedGithubConnectionId,
    selectedBitbucketConnectionId,
    selectedJiraConnectionId,
    jiraProjectKey,
    repoMode,
  },
) {
  if (repoMode !== "keep") return true;
  const prevGh = project?.githubConnectionId != null ? String(project.githubConnectionId) : "";
  const prevBb =
    project?.bitbucketConnectionId != null ? String(project.bitbucketConnectionId) : "";
  if (String(selectedGithubConnectionId || "") !== prevGh) return true;
  if (String(selectedBitbucketConnectionId || "") !== prevBb) return true;
  const prevJi = project?.jiraConnectionId != null ? String(project.jiraConnectionId) : "";
  if (String(selectedJiraConnectionId || "") !== prevJi) return true;
  const prevJiraKey = String(project?.jiraConnection?.jiraProjectKey ?? "").trim();
  if (jiraProjectKey.trim() !== prevJiraKey) return true;
  return false;
}

/** Whether the project row already has a saved SCM OAuth link for the active host. */
function projectHasSavedScmConnection(project, scmHost) {
  if (!project) return false;
  if (scmHost === "github") return project.githubConnectionId != null;
  return project.bitbucketConnectionId != null;
}

/** @returns {'github'|'bitbucket'|null} */
function repositoryPlatformFromUrl(raw) {
  const s = String(raw || "")
    .trim()
    .toLowerCase();
  if (!s) return null;
  const hasGh = s.includes("github.com");
  const hasBb = s.includes("bitbucket.org");
  if (hasGh && hasBb) return null;
  if (hasBb) return "bitbucket";
  if (hasGh) return "github";
  return null;
}

const REPO_PLATFORM_PAIR_MISMATCH_MSG =
  "Source repository and development repository must be on the same platform (GitHub or Bitbucket).";

function noteEditRepositoryWarning(warnings, message) {
  const text = String(message || "").trim();
  if (!text || warnings.includes(text)) return;
  warnings.push(text);
}

/** Compact GitHub / Bitbucket host control for Launchpad card and app repo rows. */
function ScmHostPicker({ value, onChange, id, disabled }) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger id={id} className="w-full sm:w-[11rem]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="github">
          <IntegrationBrandImg src={githubMarkSvg} invertOnDark className="size-4" />
          GitHub
        </SelectItem>
        <SelectItem value="bitbucket">
          <IntegrationBrandImg src={bitbucketMarkSvg} className="size-4" />
          Bitbucket
        </SelectItem>
      </SelectContent>
    </Select>
  );
}

function ScmRepositoryCombobox({
  host,
  repos,
  value,
  onValueChange,
  disabled,
  loading,
  hasMore,
  onLoadMore,
}) {
  const options = (Array.isArray(repos) ? repos : []).map((repo) => ({
    value: repo.gitRepoPath,
    label: `${repo.fullName}${repo.private ? " (private)" : ""}`,
    icon:
      host === "bitbucket" ? (
        <IntegrationBrandImg src={bitbucketMarkSvg} className="size-3.5" />
      ) : (
        <IntegrationBrandImg src={githubMarkSvg} invertOnDark className="size-3.5" />
      ),
  }));
  return (
    <RepositoryCombobox
      value={value}
      onValueChange={onValueChange}
      options={options}
      disabled={disabled}
      loading={loading}
      hasMore={hasMore}
      onLoadMore={onLoadMore}
      placeholder="Choose repository"
    />
  );
}

const PM_CREATE_GITJIRA_OAUTH_DRAFT = "pm_create_gitjira_oauth_draft";
const OAUTH_DRAFT_MAX_AGE_MS = 15 * 60 * 1000;

/**
 * Link an existing repository vs enter path manually — reused by create flow and edit dev rows.
 */
function DevelopmentRepoPathFields({
  mode,
  pathValue,
  onPathChangeString,
  pickSelectKey,
  scmHost,
  activeRepos,
  reposLoading,
  reposHasMore,
  onLoadMoreRepos,
  selectedGithubConnectionId,
  selectedBitbucketConnectionId,
  showPathError,
  idSuffix,
}) {
  const connOk =
    scmHost === "github"
      ? Boolean(selectedGithubConnectionId)
      : Boolean(selectedBitbucketConnectionId);

  if (mode === "auto") {
    return (
      <p className="text-xs text-muted-foreground pt-1">
        A new private repository will be created under your selected{" "}
        {scmHost === "github" ? "GitHub" : "Bitbucket"} account when you submit. It must differ from
        the Launchpad repository.
      </p>
    );
  }

  if (mode === "pick") {
    return (
      <div className="pt-1">
        <ScmRepositoryCombobox
          key={pickSelectKey}
          host={scmHost}
          repos={activeRepos}
          value={pathValue}
          onValueChange={onPathChangeString}
          disabled={!connOk}
          loading={reposLoading}
          hasMore={Boolean(reposHasMore)}
          onLoadMore={connOk && reposHasMore ? () => onLoadMoreRepos?.(scmHost) : undefined}
        />
      </div>
    );
  }

  return (
    <div className="space-y-1 pt-1">
      <Input
        id={`developmentRepoUrl-manual-${idSuffix}`}
        placeholder={
          scmHost === "github"
            ? "github.com/org/customer-repo"
            : "bitbucket.org/workspace/customer-repo"
        }
        value={pathValue}
        onChange={(e) => onPathChangeString(e.target.value)}
        className={showPathError ? "border-destructive" : ""}
      />
      <p className="text-xs text-muted-foreground">
        Must be a repo the selected {scmHost === "github" ? "GitHub" : "Bitbucket"} account can
        access, and different from the Launchpad repository.
      </p>
    </div>
  );
}

function DevelopmentRepositoriesAddCard({ onAdd }) {
  return (
    <RepositorySettingsSection
      variant="card"
      title="Add another repository"
      description="Add as many repositories as you need—backend services, shared libraries, infra, and more. There is no limit; richer context helps agents plan and generate better code."
    >
      <Button type="button" variant="default" size="sm" className="gap-2" onClick={onAdd}>
        <Plus className="h-4 w-4" />
        Add repository
      </Button>
    </RepositorySettingsSection>
  );
}

/**
 * Shared GitHub or Bitbucket + Jira OAuth UI for create project and edit project (creator/admin).
 * @typedef {{
 *   github?: { connections?: Array<{id:number, login?:string|null, health?: {status?: string, message?: string}} > },
 *   bitbucket?: { connections?: Array<{id:number, login?:string|null, health?: {status?: string, message?: string}} > },
 *   jira?: { connections?: Array<{id:number, baseUrl?:string|null, health?: {status?: string, message?: string}} > },
 * }} IntegrationsPayload
 */
function MigrateLaunchpadRepoNotice() {
  return (
    <p className="rounded-md border border-border bg-muted/15 px-3 py-2.5 text-sm text-muted-foreground">
      Launchpad creates a private repo in the Launchpad organization. Accept the GitHub invitation.
    </p>
  );
}

const ProjectGitJiraOAuthCard = forwardRef(function ProjectGitJiraOAuthCard(
  {
    variant,
    projectId,
    integrationsPayload,
    integrationsLoading,
    validationErrors,
    validationWarnings = [],
    syncKey,
    editProject,
    oauthReturnTo,
    onBeforeOAuthRedirect,
    /** Create flow: one-time restore from localStorage draft */
    initialCreateDraft = null,
    /** Create flow: called when persisted fields change (for localStorage) */
    onCreateFieldsChange,
    /** Onboarding can opt out of Jira wiring/UI entirely. */
    enableJira = true,
    /** Feedback onboarding: show only the Jira card (no code host). */
    jiraOnly = false,
    /** When "edit", show Edit Project-style development repositories (multi-row, Add repository). */
    devRepositoriesLayout = "create",
    /** Migrate create: hide Launchpad repo picker; org repo is provisioned on submit. */
    launchpadRepoAutoProvision = false,
    /** Project settings: "integrations" | "repositories" — splits OAuth vs repo fields. */
    editSettingsSection,
  },
  ref,
) {
  const isEdit = variant === "edit";
  const useEditDevRepositoriesUi = !jiraOnly && (isEdit || devRepositoriesLayout === "edit");
  const hideLaunchpadRepositoryPicker =
    launchpadRepoAutoProvision && useEditDevRepositoriesUi && !isEdit;
  const useEditCodeHostCopy = isEdit || devRepositoriesLayout === "edit";
  const isRepositoriesSettingsTab = editSettingsSection === "repositories";
  const showOAuthIntegrations =
    !jiraOnly && (!editSettingsSection || editSettingsSection === "integrations");
  const showRepositoriesConfig =
    !jiraOnly && (!editSettingsSection || editSettingsSection === "repositories");
  const showJiraIntegration =
    enableJira && (!editSettingsSection || editSettingsSection === "integrations");
  const oauthDraftRestoredRef = useRef(false);
  const createDraftHydratedRef = useRef(false);
  /** Edit save: repository access problems that should not block the write. */
  const editSaveWarningsRef = useRef([]);

  const [scmHost, setScmHost] = useState("github");
  /** Launchpad repository host (edit/settings); create still uses scmHost. */
  const [launchpadScmHost, setLaunchpadScmHost] = useState("github");
  const [selectedGithubConnectionId, setSelectedGithubConnectionId] = useState("");
  const [selectedBitbucketConnectionId, setSelectedBitbucketConnectionId] = useState("");
  const [selectedJiraConnectionId, setSelectedJiraConnectionId] = useState("");
  const [repoMode, setRepoMode] = useState(isEdit ? "keep" : "auto");
  const [pickedRepoPath, setPickedRepoPath] = useState("");
  const [gitRepoPathManual, setGitRepoPathManual] = useState("");
  const [jiraProjectKey, setJiraProjectKey] = useState("");
  const [oauthBusy, setOauthBusy] = useState(null);
  const [githubAccessLevel, setGithubAccessLevel] = useState(GITHUB_ACCESS_LEVEL.WRITE);
  const [bitbucketAccessLevel, setBitbucketAccessLevel] = useState(BITBUCKET_ACCESS_LEVEL.WRITE);
  const [githubRepos, setGithubRepos] = useState([]);
  const [bitbucketRepos, setBitbucketRepos] = useState([]);
  const [githubReposLoading, setGithubReposLoading] = useState(false);
  const [bitbucketReposLoading, setBitbucketReposLoading] = useState(false);
  const [githubReposPage, setGithubReposPage] = useState(1);
  const [bitbucketReposPage, setBitbucketReposPage] = useState(1);
  const [githubReposHasMore, setGithubReposHasMore] = useState(false);
  const [bitbucketReposHasMore, setBitbucketReposHasMore] = useState(false);
  const [reposLoading, setReposLoading] = useState(false);
  const [reposPage, setReposPage] = useState(1);
  const [reposHasMore, setReposHasMore] = useState(false);
  const [developmentRepoUrlInput, setDevelopmentRepoUrlInput] = useState("");
  const [devRepoMode, setDevRepoMode] = useState("pick");
  const [devRepoPickNonce, setDevRepoPickNonce] = useState(0);
  const [jiraProjects, setJiraProjects] = useState([]);
  const [jiraProjectsLoading, setJiraProjectsLoading] = useState(false);
  const [jiraBaseUrlResolved, setJiraBaseUrlResolved] = useState("");
  const [advancedMultiRepoOpen, setAdvancedMultiRepoOpen] = useState(false);
  const [launchpadMultiRows, setLaunchpadMultiRows] = useState(() => [defaultLaunchpadMultiRow()]);
  const [devMultiRows, setDevMultiRows] = useState(() => [defaultDevMultiRow()]);
  const appendDevMultiRow = useCallback(() => {
    setDevMultiRows((prev) => {
      const preferredHost =
        selectedBitbucketConnectionId && launchpadScmHost === "github"
          ? "bitbucket"
          : selectedGithubConnectionId && launchpadScmHost === "bitbucket"
            ? "github"
            : launchpadScmHost === "bitbucket" || scmHost === "bitbucket"
              ? "bitbucket"
              : "github";
      return [
        ...prev,
        {
          ...defaultDevMultiRow(preferredHost),
          directory: `development-${prev.length + 1}`,
          ref: "main",
          inputMode: "pick",
        },
      ];
    });
  }, [launchpadScmHost, scmHost, selectedBitbucketConnectionId, selectedGithubConnectionId]);
  /** Branch lists keyed by normalized repo path (edit-mode development rows). */
  const [devBranchDataByPath, setDevBranchDataByPath] = useState({});
  /** Per-repo remote branch validation errors (keyed by normalized repo path). */
  const [devBranchRemoteErrors, setDevBranchRemoteErrors] = useState({});

  const githubConnections = integrationsPayload?.github?.connections ?? [];
  const bitbucketConnections = integrationsPayload?.bitbucket?.connections ?? [];
  const jiraConnections = integrationsPayload?.jira?.connections ?? [];
  const selectedGithubConnection = githubConnections.find(
    (c) => String(c.id) === String(selectedGithubConnectionId),
  );
  const selectedBitbucketConnection = bitbucketConnections.find(
    (c) => String(c.id) === String(selectedBitbucketConnectionId),
  );
  const selectedJiraConnection = jiraConnections.find(
    (c) => String(c.id) === String(selectedJiraConnectionId),
  );

  useEffect(() => {
    if (!selectedGithubConnection) return;
    setGithubAccessLevel(normalizeGithubAccessLevel(selectedGithubConnection.accessLevel));
  }, [selectedGithubConnectionId, selectedGithubConnection?.accessLevel]);
  useEffect(() => {
    if (!selectedBitbucketConnection) return;
    setBitbucketAccessLevel(normalizeBitbucketAccessLevel(selectedBitbucketConnection.accessLevel));
  }, [selectedBitbucketConnectionId, selectedBitbucketConnection?.accessLevel]);
  const selectedScmConnection =
    scmHost === "github" ? selectedGithubConnection : selectedBitbucketConnection;
  const selectedScmExpired = selectedScmConnection?.health?.status === "expired";
  const selectedGithubExpired = selectedGithubConnection?.health?.status === "expired";
  const selectedBitbucketExpired = selectedBitbucketConnection?.health?.status === "expired";
  const selectedJiraExpired = enableJira && selectedJiraConnection?.health?.status === "expired";
  const jiraSettingsConnected =
    enableJira && Boolean(selectedJiraConnectionId) && !selectedJiraExpired;
  const jiraLinkedSiteDisplay =
    selectedJiraConnection?.baseUrl ||
    jiraBaseUrlResolved ||
    editProject?.jiraConnection?.jiraBaseUrl ||
    "";
  const jiraLinkedSiteHost = jiraBaseUrlHostname(jiraLinkedSiteDisplay);
  const jiraOAuthIsReconnect = Boolean(selectedJiraConnectionId) && jiraConnections.length > 0;
  const jiraOAuthButtonLabel = jiraOAuthIsReconnect ? "Reconnect selected site" : "Connect Jira";
  const hasExpiredConnections = [
    ...githubConnections,
    ...bitbucketConnections,
    ...(enableJira ? jiraConnections : []),
  ].some((c) => c?.health?.status === "expired");

  /** Effective host for Launchpad pickers (edit uses launchpadScmHost). */
  const launchpadHost = isEdit ? launchpadScmHost : scmHost;
  const activeRepos = launchpadHost === "github" ? githubRepos : bitbucketRepos;
  const launchpadReposLoading =
    launchpadHost === "github"
      ? githubReposLoading || reposLoading
      : bitbucketReposLoading || reposLoading;
  const launchpadReposHasMore =
    launchpadHost === "github"
      ? githubReposHasMore || reposHasMore
      : bitbucketReposHasMore || reposHasMore;

  const gitRepoPath =
    repoMode === "manual" ? gitRepoPathManual : repoMode === "pick" ? pickedRepoPath : "";

  const useProjectEndpointForDevBranches = Boolean(isEdit && projectId);

  /** Tracks development repo paths in edit mode for debounced branch loading. */
  const editDevPathsKey = useMemo(
    () =>
      devMultiRows
        .map((r) => `${r.inputMode ?? "pick"}:${normalizeRepoPathForCompare(r.path)}`)
        .join("|"),
    [devMultiRows],
  );

  useEffect(() => {
    const canLoadViaProject = isEdit && projectId && useProjectEndpointForDevBranches;
    const canLoadOnCreate = useEditDevRepositoriesUi && !isEdit;
    if (!canLoadOnCreate && !canLoadViaProject && !(useEditDevRepositoriesUi && isEdit)) {
      return undefined;
    }

    const timers = [];
    for (const row of devMultiRows) {
      if (isDevRowAutoProvision(row)) continue;
      const path = String(row.path || "").trim();
      const cacheKey = normalizeRepoPathForCompare(path);
      if (path.length < 10 || !cacheKey) continue;
      const rowHost =
        row.scmHost === "bitbucket" || row.scmHost === "github"
          ? row.scmHost
          : scmHostFromRepoPath(path) || scmHost;
      const connectionId =
        rowHost === "github" ? selectedGithubConnectionId : selectedBitbucketConnectionId;
      const canLoadViaConnection =
        useEditDevRepositoriesUi && Boolean(connectionId) && (isEdit ? Boolean(projectId) : true);
      if (!canLoadViaProject && !canLoadViaConnection && !(canLoadOnCreate && connectionId)) {
        continue;
      }
      const timer = window.setTimeout(async () => {
        setDevBranchDataByPath((prev) => ({
          ...prev,
          [cacheKey]: { loading: true, branches: [], defaultBranch: "" },
        }));
        try {
          const integrationOpts = isEdit && projectId ? { projectId } : {};
          const data = canLoadViaProject
            ? await fetchDeveloperRepoBranches(projectId, path)
            : await fetchIntegrationRepoBranches(rowHost, connectionId, path, integrationOpts);
          const branches = Array.isArray(data?.branches) ? data.branches : [];
          const defaultBranch = data?.defaultBranch || "";
          setDevBranchDataByPath((prev) => ({
            ...prev,
            [cacheKey]: {
              loading: false,
              branches,
              defaultBranch,
              truncated: Boolean(data?.truncated),
            },
          }));
        } catch (err) {
          setDevBranchDataByPath((prev) => ({
            ...prev,
            [cacheKey]: EMPTY_DEV_BRANCH_DATA,
          }));
          toast.error(err?.error || "Failed to load branches");
        }
      }, 450);
      timers.push(timer);
    }
    return () => {
      for (const timer of timers) window.clearTimeout(timer);
    };
  }, [
    isEdit,
    projectId,
    useEditDevRepositoriesUi,
    scmHost,
    selectedGithubConnectionId,
    selectedBitbucketConnectionId,
    editDevPathsKey,
    useProjectEndpointForDevBranches,
    editProject,
    devMultiRows,
  ]);

  /** Server-side branch search across full repo when user types 2+ characters. */
  const searchDevelopmentRepoBranches = useCallback(
    async (repoPath, query, rowScmHost) => {
      const path = String(repoPath || "").trim();
      const q = String(query || "").trim();
      if (path.length < 10 || q.length < 2) {
        return { branches: [], defaultBranch: "" };
      }

      const rowHost =
        rowScmHost === "bitbucket" || rowScmHost === "github"
          ? rowScmHost
          : scmHostFromRepoPath(path) || scmHost;
      const connectionId =
        rowHost === "github" ? selectedGithubConnectionId : selectedBitbucketConnectionId;
      const canLoadOnCreate = useEditDevRepositoriesUi && !isEdit && Boolean(connectionId);
      const canLoadViaConnection =
        useEditDevRepositoriesUi && Boolean(connectionId) && (isEdit ? Boolean(projectId) : true);
      const canLoadViaProject = isEdit && projectId && useProjectEndpointForDevBranches;
      if (!canLoadOnCreate && !canLoadViaConnection && !canLoadViaProject) {
        return { branches: [], defaultBranch: "" };
      }

      const cacheKey = normalizeRepoPathForCompare(path);
      const integrationOpts = { q, ...(isEdit && projectId ? { projectId } : {}) };
      const data = canLoadViaProject
        ? await fetchDeveloperRepoBranches(projectId, path, { q })
        : await fetchIntegrationRepoBranches(rowHost, connectionId, path, integrationOpts);
      const branches = Array.isArray(data?.branches) ? data.branches : [];
      const defaultBranch =
        data?.defaultBranch || devBranchDataByPath[cacheKey]?.defaultBranch || "";
      return { branches, defaultBranch };
    },
    [
      devBranchDataByPath,
      isEdit,
      projectId,
      scmHost,
      selectedBitbucketConnectionId,
      selectedGithubConnectionId,
      useEditDevRepositoriesUi,
      useProjectEndpointForDevBranches,
    ],
  );

  /** Whether branch listing / validation API calls are allowed for the current mode. */
  const canLoadDevelopmentRepoBranches = useCallback(() => {
    const canLoadOnCreate =
      useEditDevRepositoriesUi &&
      !isEdit &&
      (Boolean(selectedGithubConnectionId) || Boolean(selectedBitbucketConnectionId));
    const canLoadOnEdit = isEdit && projectId;
    return Boolean(canLoadOnCreate || canLoadOnEdit);
  }, [
    isEdit,
    projectId,
    selectedBitbucketConnectionId,
    selectedGithubConnectionId,
    useEditDevRepositoriesUi,
  ]);

  /** Verify typed branches against the remote when they are not in the cached dropdown list. */
  const verifyDevelopmentRepoBranchRemote = useCallback(
    async (repoPath, branch, rowScmHost) => {
      const path = String(repoPath || "").trim();
      const branchName = String(branch || "").trim();
      if (path.length < 10 || !branchName || !canLoadDevelopmentRepoBranches()) {
        return { valid: true, branch: branchName };
      }

      const rowHost =
        rowScmHost === "bitbucket" || rowScmHost === "github"
          ? rowScmHost
          : scmHostFromRepoPath(path) || scmHost;
      const connectionId =
        rowHost === "github" ? selectedGithubConnectionId : selectedBitbucketConnectionId;
      const canLoadViaConnection =
        useEditDevRepositoriesUi && Boolean(connectionId) && (isEdit ? Boolean(projectId) : true);
      const canLoadViaProject = isEdit && projectId && useProjectEndpointForDevBranches;

      if (canLoadViaProject) {
        return validateDeveloperRepoBranch(projectId, path, branchName);
      }
      if (canLoadViaConnection) {
        const integrationOpts = isEdit && projectId ? { projectId } : {};
        return validateIntegrationRepoBranch(
          rowHost,
          connectionId,
          path,
          branchName,
          integrationOpts,
        );
      }
      return { valid: true, branch: branchName };
    },
    [
      canLoadDevelopmentRepoBranches,
      isEdit,
      projectId,
      scmHost,
      selectedBitbucketConnectionId,
      selectedGithubConnectionId,
      useEditDevRepositoriesUi,
      useProjectEndpointForDevBranches,
    ],
  );

  /** Remote-check all development rows; used on submit when sync validation passed. */
  const validateDevBranchesRemote = useCallback(async () => {
    const errors = {};
    for (const row of devMultiRows) {
      if (isDevRowAutoProvision(row)) continue;
      const repoPath = String(row.path || "").trim();
      const branchRef = String(row.ref || "").trim();
      if (!repoPath || !branchRef) continue;

      const cacheKey = normalizeRepoPathForCompare(repoPath);
      const branchData = devBranchDataByPath[cacheKey];
      if (isDevBranchListedLocally(branchRef, branchData?.branches)) continue;

      try {
        const res = await verifyDevelopmentRepoBranchRemote(repoPath, branchRef, row.scmHost);
        if (!res?.valid) {
          errors.developmentRepoUrl =
            res?.error || `Branch "${branchRef}" was not found in this repository.`;
          break;
        }
      } catch (e) {
        errors.developmentRepoUrl =
          typeof e?.error === "string" ? e.error : "Could not verify branch.";
        break;
      }
    }
    return errors;
  }, [devBranchDataByPath, devMultiRows, verifyDevelopmentRepoBranchRemote]);

  useEffect(() => {
    if (!canLoadDevelopmentRepoBranches()) return undefined;

    const timers = [];
    for (const row of devMultiRows) {
      if (isDevRowAutoProvision(row)) continue;
      const repoPath = String(row.path || "").trim();
      const branchRef = String(row.ref || "").trim();
      if (repoPath.length < 10 || !branchRef) continue;

      const cacheKey = normalizeRepoPathForCompare(repoPath);
      const branchData = devBranchDataByPath[cacheKey];
      if (isDevBranchListedLocally(branchRef, branchData?.branches)) {
        setDevBranchRemoteErrors((prev) => {
          if (!prev[cacheKey]) return prev;
          const next = { ...prev };
          delete next[cacheKey];
          return next;
        });
        continue;
      }

      const timer = window.setTimeout(async () => {
        try {
          const res = await verifyDevelopmentRepoBranchRemote(repoPath, branchRef, row.scmHost);
          setDevBranchRemoteErrors((prev) => {
            const next = { ...prev };
            if (res?.valid) delete next[cacheKey];
            else {
              next[cacheKey] =
                res?.error || `Branch "${branchRef}" was not found in this repository.`;
            }
            return next;
          });
        } catch (e) {
          setDevBranchRemoteErrors((prev) => ({
            ...prev,
            [cacheKey]: typeof e?.error === "string" ? e.error : "Could not verify branch.",
          }));
        }
      }, 400);
      timers.push(timer);
    }

    return () => {
      for (const timer of timers) window.clearTimeout(timer);
    };
  }, [
    canLoadDevelopmentRepoBranches,
    devBranchDataByPath,
    devMultiRows,
    verifyDevelopmentRepoBranchRemote,
  ]);

  useEffect(() => {
    if (syncKey === "__closed__" || !syncKey) return;
    if (isEdit && editProject) {
      const g = String(editProject.gitRepoPath ?? "").trim();
      const d = String(editProject.developmentRepoUrl ?? "").trim();
      const lpHostFromPath =
        scmHostFromRepoPath(g) ||
        (editProject.bitbucketConnectionId != null ? "bitbucket" : "github");
      setLaunchpadScmHost(lpHostFromPath);
      setScmHost(lpHostFromPath);
      setSelectedGithubConnectionId(
        editProject.githubConnectionId != null ? String(editProject.githubConnectionId) : "",
      );
      setSelectedBitbucketConnectionId(
        editProject.bitbucketConnectionId != null ? String(editProject.bitbucketConnectionId) : "",
      );
      setSelectedJiraConnectionId(
        editProject.jiraConnectionId != null ? String(editProject.jiraConnectionId) : "",
      );
      setRepoMode("keep");
      setPickedRepoPath("");
      setGitRepoPathManual("");
      setJiraProjectKey(editProject.jiraConnection?.jiraProjectKey ?? "");
      {
        setDevelopmentRepoUrlInput("");
        setDevRepoMode("pick");
      }
      {
        const lpR = launchpadRowsFromStored(g);
        const devR = devRowsFromStored(d);
        let lpRows = [defaultLaunchpadMultiRow()];
        const defaultAppHost =
          editProject.bitbucketConnectionId != null && lpHostFromPath === "github"
            ? "bitbucket"
            : lpHostFromPath;
        let dRows = [{ ...defaultDevMultiRow(defaultAppHost), inputMode: "pick" }];
        if (lpR) {
          lpRows = lpR;
        } else if (g) {
          lpRows = [{ path: g, ref: "main", directory: "launchpad-1", push: true }];
        }
        if (devR) {
          dRows = devR.map((r) => ({
            ...r,
            inputMode: r.path ? "manual" : "pick",
            scmHost: r.scmHost || scmHostFromRepoPath(r.path) || defaultAppHost,
          }));
        } else if (d) {
          dRows = [
            {
              path: d,
              ref: "main",
              directory: "development-1",
              inputMode: "manual",
              scmHost: scmHostFromRepoPath(d) || defaultAppHost,
            },
          ];
        }
        setAdvancedMultiRepoOpen(false);
        setLaunchpadMultiRows(lpRows);
        setDevMultiRows(dRows);
        setDevBranchDataByPath({});
      }
      setDevRepoPickNonce(0);
      setGithubRepos([]);
      setBitbucketRepos([]);
      setReposHasMore(false);
      setReposPage(1);
      setGithubReposHasMore(false);
      setBitbucketReposHasMore(false);
      setJiraProjects([]);
      setJiraBaseUrlResolved("");
      return;
    }
    if (!isEdit) {
      if (
        initialCreateDraft &&
        typeof initialCreateDraft === "object" &&
        Object.keys(initialCreateDraft).length > 0
      ) {
        return;
      }
      createDraftHydratedRef.current = false;
      setScmHost("github");
      setLaunchpadScmHost("github");
      setRepoMode("auto");
      setPickedRepoPath("");
      setGitRepoPathManual("");
      setDevelopmentRepoUrlInput("");
      setDevRepoMode("pick");
      setDevRepoPickNonce(0);
      setJiraProjectKey("");
      setAdvancedMultiRepoOpen(false);
      setLaunchpadMultiRows([defaultLaunchpadMultiRow()]);
      setDevMultiRows([defaultDevMultiRow()]);
    }
  }, [syncKey, isEdit, editProject, initialCreateDraft]);

  useEffect(() => {
    if (isEdit || !integrationsPayload) return;
    const gh = integrationsPayload.github?.connections ?? [];
    const bb = integrationsPayload.bitbucket?.connections ?? [];
    if (!createDraftHydratedRef.current && !gh.length && bb.length) setScmHost("bitbucket");
  }, [integrationsPayload, isEdit]);

  useEffect(() => {
    if (!integrationsPayload) return;
    const gh = integrationsPayload.github?.connections ?? [];
    const bb = integrationsPayload.bitbucket?.connections ?? [];
    const ji = integrationsPayload.jira?.connections ?? [];

    const draftHasKeys =
      initialCreateDraft &&
      typeof initialCreateDraft === "object" &&
      Object.keys(initialCreateDraft).length > 0;
    if (!isEdit && draftHasKeys && !createDraftHydratedRef.current) {
      createDraftHydratedRef.current = true;
      const d = initialCreateDraft;
      if (d.scmHost === "github" || d.scmHost === "bitbucket") setScmHost(d.scmHost);
      if (d.repoMode === "auto" || d.repoMode === "pick" || d.repoMode === "manual")
        setRepoMode(d.repoMode);
      if (typeof d.pickedRepoPath === "string") setPickedRepoPath(d.pickedRepoPath);
      if (typeof d.gitRepoPathManual === "string") setGitRepoPathManual(d.gitRepoPathManual);
      if (typeof d.developmentRepoUrlInput === "string")
        setDevelopmentRepoUrlInput(d.developmentRepoUrlInput);
      if (d.devRepoMode === "pick" || d.devRepoMode === "manual" || d.devRepoMode === "auto") {
        setDevRepoMode(d.devRepoMode);
      } else if (
        typeof d.developmentRepoUrlInput === "string" &&
        d.developmentRepoUrlInput.trim()
      ) {
        setDevRepoMode("manual");
      }
      if (typeof d.jiraProjectKey === "string") setJiraProjectKey(d.jiraProjectKey);
      if (typeof d.jiraBaseUrlResolved === "string") setJiraBaseUrlResolved(d.jiraBaseUrlResolved);
      if (Array.isArray(d.devMultiRows) && d.devMultiRows.length > 0) {
        setDevMultiRows(
          d.devMultiRows.map((row) => ({
            ...defaultDevMultiRow(),
            ...row,
          })),
        );
      }

      const wantGh =
        d.selectedGithubConnectionId != null ? String(d.selectedGithubConnectionId) : "";
      const wantBb =
        d.selectedBitbucketConnectionId != null ? String(d.selectedBitbucketConnectionId) : "";
      const wantJi = d.selectedJiraConnectionId != null ? String(d.selectedJiraConnectionId) : "";
      setSelectedGithubConnectionId(
        wantGh && gh.some((c) => String(c.id) === wantGh) ? wantGh : gh[0] ? String(gh[0].id) : "",
      );
      setSelectedBitbucketConnectionId(
        wantBb && bb.some((c) => String(c.id) === wantBb) ? wantBb : bb[0] ? String(bb[0].id) : "",
      );
      setSelectedJiraConnectionId(
        wantJi && ji.some((c) => String(c.id) === wantJi) ? wantJi : ji[0] ? String(ji[0].id) : "",
      );
      return;
    }

    if (!isEdit && createDraftHydratedRef.current) {
      return;
    }

    setSelectedGithubConnectionId((prev) => {
      if (isEdit && editProject?.githubConnectionId != null) {
        const want = String(editProject.githubConnectionId);
        if (gh.some((c) => String(c.id) === want)) return want;
      }
      if (prev && gh.some((c) => String(c.id) === prev)) return prev;
      return gh[0] ? String(gh[0].id) : "";
    });
    setSelectedBitbucketConnectionId((prev) => {
      if (isEdit && editProject?.bitbucketConnectionId != null) {
        const want = String(editProject.bitbucketConnectionId);
        if (bb.some((c) => String(c.id) === want)) return want;
      }
      if (prev && bb.some((c) => String(c.id) === prev)) return prev;
      return bb[0] ? String(bb[0].id) : "";
    });
    setSelectedJiraConnectionId((prev) => {
      if (isEdit && editProject?.jiraConnectionId != null) {
        const want = String(editProject.jiraConnectionId);
        if (ji.some((c) => String(c.id) === want)) return want;
        return "";
      }
      if (isEdit) {
        if (prev && ji.some((c) => String(c.id) === prev)) return prev;
        return "";
      }
      if (prev && ji.some((c) => String(c.id) === prev)) return prev;
      return ji[0] ? String(ji[0].id) : "";
    });
  }, [integrationsPayload, isEdit, editProject, initialCreateDraft]);

  useEffect(() => {
    if ((isEdit && !jiraOnly) || oauthDraftRestoredRef.current || !integrationsPayload) {
      return;
    }
    try {
      const raw = sessionStorage.getItem(PM_CREATE_GITJIRA_OAUTH_DRAFT);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (typeof d?.savedAt !== "number" || Date.now() - d.savedAt > OAUTH_DRAFT_MAX_AGE_MS) {
        sessionStorage.removeItem(PM_CREATE_GITJIRA_OAUTH_DRAFT);
        return;
      }
      oauthDraftRestoredRef.current = true;
      sessionStorage.removeItem(PM_CREATE_GITJIRA_OAUTH_DRAFT);
      const gh = integrationsPayload.github?.connections ?? [];
      const bb = integrationsPayload.bitbucket?.connections ?? [];
      const ji = integrationsPayload.jira?.connections ?? [];
      if (d.scmHost === "github" || d.scmHost === "bitbucket") setScmHost(d.scmHost);
      if (d.repoMode === "auto" || d.repoMode === "pick" || d.repoMode === "manual") {
        setRepoMode(d.repoMode);
      }
      if (typeof d.pickedRepoPath === "string") setPickedRepoPath(d.pickedRepoPath);
      if (typeof d.gitRepoPathManual === "string") setGitRepoPathManual(d.gitRepoPathManual);
      if (typeof d.jiraProjectKey === "string") setJiraProjectKey(d.jiraProjectKey);
      if (typeof d.developmentRepoUrlInput === "string") {
        setDevelopmentRepoUrlInput(d.developmentRepoUrlInput);
      }
      if (d.devRepoMode === "pick" || d.devRepoMode === "manual" || d.devRepoMode === "auto") {
        setDevRepoMode(d.devRepoMode);
      } else if (
        typeof d.developmentRepoUrlInput === "string" &&
        d.developmentRepoUrlInput.trim()
      ) {
        setDevRepoMode("manual");
      }
      if (typeof d.jiraBaseUrlResolved === "string") setJiraBaseUrlResolved(d.jiraBaseUrlResolved);
      if (Array.isArray(d.devMultiRows) && d.devMultiRows.length > 0) {
        setDevMultiRows(
          d.devMultiRows.map((row) => ({
            ...defaultDevMultiRow(),
            ...row,
          })),
        );
      }
      if (typeof d.selectedGithubConnectionId === "string" && d.selectedGithubConnectionId) {
        if (gh.some((c) => String(c.id) === d.selectedGithubConnectionId)) {
          setSelectedGithubConnectionId(d.selectedGithubConnectionId);
        }
      }
      if (typeof d.selectedBitbucketConnectionId === "string" && d.selectedBitbucketConnectionId) {
        if (bb.some((c) => String(c.id) === d.selectedBitbucketConnectionId)) {
          setSelectedBitbucketConnectionId(d.selectedBitbucketConnectionId);
        }
      }
      if (typeof d.selectedJiraConnectionId === "string" && d.selectedJiraConnectionId) {
        if (ji.some((c) => String(c.id) === d.selectedJiraConnectionId)) {
          setSelectedJiraConnectionId(d.selectedJiraConnectionId);
        }
      }
    } catch {
      try {
        sessionStorage.removeItem(PM_CREATE_GITJIRA_OAUTH_DRAFT);
      } catch {
        /* ignore */
      }
    }
  }, [integrationsPayload, isEdit, jiraOnly]);

  const persistCreateGitJiraDraftForOAuth = useCallback(() => {
    if (isEdit && !jiraOnly) return;
    try {
      sessionStorage.setItem(
        PM_CREATE_GITJIRA_OAUTH_DRAFT,
        JSON.stringify({
          savedAt: Date.now(),
          scmHost,
          selectedGithubConnectionId,
          selectedBitbucketConnectionId,
          selectedJiraConnectionId,
          repoMode,
          pickedRepoPath,
          gitRepoPathManual,
          jiraProjectKey,
          developmentRepoUrlInput,
          devRepoMode,
          jiraBaseUrlResolved,
          devMultiRows: useEditDevRepositoriesUi ? devMultiRows : undefined,
        }),
      );
    } catch {
      /* ignore */
    }
  }, [
    isEdit,
    jiraOnly,
    scmHost,
    selectedGithubConnectionId,
    selectedBitbucketConnectionId,
    selectedJiraConnectionId,
    repoMode,
    pickedRepoPath,
    gitRepoPathManual,
    jiraProjectKey,
    developmentRepoUrlInput,
    devRepoMode,
    jiraBaseUrlResolved,
    useEditDevRepositoriesUi,
    devMultiRows,
  ]);

  const repoListOpts = useMemo(() => {
    const o = {};
    if (isEdit && projectId) o.projectId = projectId;
    return o;
  }, [isEdit, projectId]);

  useEffect(() => {
    if (!selectedGithubConnectionId) {
      setGithubRepos([]);
      setGithubReposHasMore(false);
      setGithubReposPage(1);
      if (!isEdit) {
        setReposHasMore(false);
        setReposPage(1);
      }
      return;
    }
    let cancelled = false;
    (async () => {
      setGithubReposLoading(true);
      if (!isEdit && scmHost === "github") setReposLoading(true);
      setGithubRepos([]);
      setGithubReposPage(1);
      try {
        const data = await fetchGithubReposPage(selectedGithubConnectionId, {
          page: 1,
          ...repoListOpts,
        });
        if (!cancelled) {
          setGithubRepos(data.repos || []);
          setGithubReposHasMore(Boolean(data.hasMore));
          if (!isEdit && scmHost === "github") {
            setReposHasMore(Boolean(data.hasMore));
            setReposPage(1);
          }
        }
      } catch (e) {
        if (!cancelled) {
          toast.error(integrationToastFromAxios(e, "Could not load GitHub repositories"));
          setGithubRepos([]);
          setGithubReposHasMore(false);
        }
      } finally {
        if (!cancelled) {
          setGithubReposLoading(false);
          if (!isEdit && scmHost === "github") setReposLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedGithubConnectionId, repoListOpts, isEdit, scmHost]);

  useEffect(() => {
    if (!selectedBitbucketConnectionId) {
      setBitbucketRepos([]);
      setBitbucketReposHasMore(false);
      setBitbucketReposPage(1);
      return;
    }
    let cancelled = false;
    (async () => {
      setBitbucketReposLoading(true);
      if (!isEdit && scmHost === "bitbucket") setReposLoading(true);
      setBitbucketRepos([]);
      setBitbucketReposPage(1);
      try {
        const data = await fetchBitbucketReposPage(selectedBitbucketConnectionId, {
          page: 1,
          ...repoListOpts,
        });
        if (!cancelled) {
          setBitbucketRepos(data.repos || []);
          setBitbucketReposHasMore(Boolean(data.hasMore));
          if (!isEdit && scmHost === "bitbucket") {
            setReposHasMore(Boolean(data.hasMore));
            setReposPage(1);
          }
        }
      } catch (e) {
        if (!cancelled) {
          toast.error(integrationToastFromAxios(e, "Could not load Bitbucket repositories"));
          setBitbucketRepos([]);
          setBitbucketReposHasMore(false);
        }
      } finally {
        if (!cancelled) {
          setBitbucketReposLoading(false);
          if (!isEdit && scmHost === "bitbucket") setReposLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedBitbucketConnectionId, repoListOpts, isEdit, scmHost]);

  useEffect(() => {
    if (!enableJira) {
      setSelectedJiraConnectionId("");
      setJiraProjectKey("");
      setJiraProjects([]);
      setJiraBaseUrlResolved("");
      return;
    }
    if (!selectedJiraConnectionId) {
      setJiraProjects([]);
      setJiraBaseUrlResolved("");
      return;
    }
    let cancelled = false;
    (async () => {
      setJiraProjectsLoading(true);
      try {
        const data = await fetchJiraProjectsForConnection(selectedJiraConnectionId, repoListOpts);
        if (!cancelled) {
          setJiraProjects(Array.isArray(data.projects) ? data.projects : []);
          setJiraBaseUrlResolved(data.jiraBaseUrl || "");
        }
      } catch (e) {
        const msg = integrationToastFromAxios(e, "Could not load Jira projects");
        if (!cancelled) {
          toast.error(msg);
          setJiraProjects([]);
          setJiraBaseUrlResolved("");
        }
      } finally {
        if (!cancelled) setJiraProjectsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enableJira, selectedJiraConnectionId, repoListOpts]);

  const loadMoreRepos = useCallback(
    async (hostArg) => {
      const host = hostArg === "github" || hostArg === "bitbucket" ? hostArg : scmHost;
      const connId = host === "github" ? selectedGithubConnectionId : selectedBitbucketConnectionId;
      const hasMore = host === "github" ? githubReposHasMore : bitbucketReposHasMore;
      const loading = host === "github" ? githubReposLoading : bitbucketReposLoading;
      const page = host === "github" ? githubReposPage : bitbucketReposPage;
      if (!connId || !hasMore || loading) return;
      if (host === "github") setGithubReposLoading(true);
      else setBitbucketReposLoading(true);
      if (!isEdit) setReposLoading(true);
      const nextPage = page + 1;
      try {
        const fetchPage = host === "github" ? fetchGithubReposPage : fetchBitbucketReposPage;
        const data = await fetchPage(connId, {
          page: nextPage,
          ...repoListOpts,
        });
        const batch = data.repos || [];
        if (host === "github") {
          setGithubRepos((prev) => [...prev, ...batch]);
          setGithubReposHasMore(Boolean(data.hasMore));
          setGithubReposPage(nextPage);
          if (!isEdit && scmHost === "github") {
            setReposHasMore(Boolean(data.hasMore));
            setReposPage(nextPage);
          }
        } else {
          setBitbucketRepos((prev) => [...prev, ...batch]);
          setBitbucketReposHasMore(Boolean(data.hasMore));
          setBitbucketReposPage(nextPage);
          if (!isEdit && scmHost === "bitbucket") {
            setReposHasMore(Boolean(data.hasMore));
            setReposPage(nextPage);
          }
        }
      } catch (e) {
        toast.error(integrationToastFromAxios(e, "Could not load more repositories"));
      } finally {
        if (host === "github") setGithubReposLoading(false);
        else setBitbucketReposLoading(false);
        if (!isEdit) setReposLoading(false);
      }
    },
    [
      scmHost,
      selectedGithubConnectionId,
      selectedBitbucketConnectionId,
      githubReposHasMore,
      bitbucketReposHasMore,
      githubReposLoading,
      bitbucketReposLoading,
      githubReposPage,
      bitbucketReposPage,
      repoListOpts,
      isEdit,
    ],
  );

  const validateCreate = useCallback(
    (integrationsLoadingFlag) => {
      const errors = {};
      const jiConns = integrationsPayload?.jira?.connections ?? [];
      if (jiraOnly) {
        if (integrationsLoadingFlag) {
          errors.integrations = "Checking integrations…";
        } else if (jiConns.length === 0) {
          errors.integrations = `Add at least one Jira site (${ACCOUNT_CONNECTIONS_LABEL}) before continuing`;
        } else if (!selectedJiraConnectionId) {
          errors.integrations = "Select a Jira site for this project";
        } else {
          const sel = jiConns.find((c) => String(c.id) === String(selectedJiraConnectionId));
          if (sel?.health?.status === "expired") {
            errors.integrations = "Connection expired — reconnect selected Jira site";
          }
        }
        if (!jiraProjectKey.trim()) {
          errors.jiraProjectKey = "Select a Jira project from the list";
        }
        return errors;
      }
      const ghConns = integrationsPayload?.github?.connections ?? [];
      const bbConns = integrationsPayload?.bitbucket?.connections ?? [];
      if (integrationsLoadingFlag) {
        errors.integrations = "Checking integrations…";
      } else if (scmHost === "github") {
        if (ghConns.length === 0) {
          errors.integrations = `Add at least one GitHub account (${ACCOUNT_CONNECTIONS_LABEL}) or switch code host to Bitbucket`;
        } else if (!selectedGithubConnectionId) {
          errors.integrations = "Select a GitHub account for this project";
        } else {
          const sel = ghConns.find((c) => String(c.id) === String(selectedGithubConnectionId));
          if (sel?.health?.status === "expired") {
            errors.integrations = "Connection expired — reconnect selected GitHub account";
          }
        }
      } else if (bbConns.length === 0) {
        errors.integrations = `Add at least one Bitbucket account (${ACCOUNT_CONNECTIONS_LABEL}) or switch code host to GitHub`;
      } else if (!selectedBitbucketConnectionId) {
        errors.integrations = "Select a Bitbucket account for this project";
      } else {
        const sel = bbConns.find((c) => String(c.id) === String(selectedBitbucketConnectionId));
        if (sel?.health?.status === "expired") {
          errors.integrations = "Connection expired — reconnect selected Bitbucket account";
        }
      }
      if (enableJira && !errors.integrations) {
        if (jiConns.length === 0) {
          errors.integrations = `Add at least one Jira site (${ACCOUNT_CONNECTIONS_LABEL}) before continuing`;
        } else if (!selectedJiraConnectionId) {
          errors.integrations = "Select a Jira site for this project";
        } else {
          const sel = jiConns.find((c) => String(c.id) === String(selectedJiraConnectionId));
          if (sel?.health?.status === "expired") {
            errors.integrations = "Connection expired — reconnect selected Jira site";
          }
        }
      }
      const pathReHost = scmHost === "github" ? GH_REPO_PATH_RE : BB_REPO_PATH_RE;
      if (advancedMultiRepoOpen) {
        const lpErr = validateLaunchpadMultiRows(launchpadMultiRows, scmHost, pathReHost);
        if (lpErr) errors.gitRepoPath = lpErr;
        const dErr = validateDevMultiRows(devMultiRows, scmHost, pathReHost);
        if (dErr) errors.developmentRepoUrl = dErr;
        if (!errors.gitRepoPath && !errors.developmentRepoUrl) {
          const lpPrimary =
            launchpadMultiRows.find((r) => r.push)?.path || launchpadMultiRows[0]?.path || "";
          const devPrimary = devMultiRows[0]?.path || "";
          if (
            lpPrimary &&
            devPrimary &&
            normalizeRepoPathForCompare(lpPrimary) === normalizeRepoPathForCompare(devPrimary)
          ) {
            errors.developmentRepoUrl =
              "Must be a different repository than the platform repository";
          }
          if (!errors.developmentRepoUrl && lpPrimary && devPrimary) {
            const mp = repositoryPlatformFromUrl(lpPrimary);
            const dp = repositoryPlatformFromUrl(devPrimary);
            if (mp && dp && mp !== dp) {
              errors.developmentRepoUrl = REPO_PLATFORM_PAIR_MISMATCH_MSG;
            }
          }
        }
      } else if (useEditDevRepositoriesUi && !isEdit) {
        if (!hideLaunchpadRepositoryPicker) {
          if (repoMode === "manual") {
            if (!gitRepoPathManual.trim()) {
              errors.gitRepoPath =
                scmHost === "github"
                  ? "Enter a repository path (e.g. github.com/org/repo)"
                  : "Enter a repository path (e.g. bitbucket.org/workspace/repo-slug)";
            }
          } else if (repoMode === "pick") {
            if (!pickedRepoPath.trim()) {
              errors.gitRepoPath = "Choose a repository from the list";
            }
          }
        }
        const dErr = validateDevMultiRows(devMultiRows, scmHost, pathReHost);
        if (dErr) errors.developmentRepoUrl = dErr;
        if (!hideLaunchpadRepositoryPicker && !errors.gitRepoPath && !errors.developmentRepoUrl) {
          const lpPrimary =
            repoMode === "manual"
              ? gitRepoPathManual.trim()
              : repoMode === "pick"
                ? pickedRepoPath.trim()
                : "";
          const devPrimary = devMultiRows[0]?.path || "";
          if (
            lpPrimary &&
            devPrimary &&
            !isDevRowAutoProvision(devMultiRows[0]) &&
            normalizeRepoPathForCompare(lpPrimary) === normalizeRepoPathForCompare(devPrimary)
          ) {
            errors.developmentRepoUrl =
              "Must be a different repository than the platform repository";
          }
          if (!errors.developmentRepoUrl && lpPrimary && devPrimary) {
            const mp = repositoryPlatformFromUrl(lpPrimary);
            const dp = repositoryPlatformFromUrl(devPrimary);
            if (mp && dp && mp !== dp) {
              errors.developmentRepoUrl = REPO_PLATFORM_PAIR_MISMATCH_MSG;
            }
          }
        }
      } else {
        if (repoMode === "manual") {
          if (!gitRepoPathManual.trim()) {
            errors.gitRepoPath =
              scmHost === "github"
                ? "Enter a repository path (e.g. github.com/org/repo)"
                : "Enter a repository path (e.g. bitbucket.org/workspace/repo-slug)";
          }
        } else if (repoMode === "pick") {
          if (!pickedRepoPath.trim()) {
            errors.gitRepoPath = "Choose a repository from the list";
          }
        }
        const dev = developmentRepoUrlInput.trim();
        const devPathRe = scmHost === "github" ? GH_REPO_PATH_RE : BB_REPO_PATH_RE;
        const devExample =
          scmHost === "github" ? "github.com/org/other-repo" : "bitbucket.org/workspace/other-repo";
        if (devRepoMode === "auto") {
          if (
            !(scmHost === "github" ? selectedGithubConnectionId : selectedBitbucketConnectionId)
          ) {
            errors.developmentRepoUrl =
              "Select a code host account to create a development repository";
          }
        } else if (!dev) {
          errors.developmentRepoUrl = "Developer repository path is required";
        } else if (!devPathRe.test(dev)) {
          errors.developmentRepoUrl = `Enter a valid path (e.g. ${devExample})`;
        }
        if (
          !errors.developmentRepoUrl &&
          (repoMode === "manual" || repoMode === "pick") &&
          (devRepoMode === "manual" || devRepoMode === "pick")
        ) {
          const mainRaw = repoMode === "manual" ? gitRepoPathManual.trim() : pickedRepoPath.trim();
          if (
            mainRaw &&
            normalizeRepoPathForCompare(mainRaw) === normalizeRepoPathForCompare(dev)
          ) {
            errors.developmentRepoUrl =
              "Must be a different repository than the platform repository";
          }
          if (!errors.developmentRepoUrl && mainRaw && dev) {
            const mp = repositoryPlatformFromUrl(mainRaw);
            const dp = repositoryPlatformFromUrl(dev);
            if (mp && dp && mp !== dp) {
              errors.developmentRepoUrl = REPO_PLATFORM_PAIR_MISMATCH_MSG;
            }
          }
        }
      }
      return errors;
    },
    [
      integrationsPayload,
      enableJira,
      scmHost,
      selectedGithubConnectionId,
      selectedBitbucketConnectionId,
      selectedJiraConnectionId,
      jiraProjectKey,
      repoMode,
      gitRepoPathManual,
      pickedRepoPath,
      developmentRepoUrlInput,
      devRepoMode,
      advancedMultiRepoOpen,
      launchpadMultiRows,
      devMultiRows,
      jiraOnly,
      useEditDevRepositoriesUi,
      isEdit,
      hideLaunchpadRepositoryPicker,
    ],
  );

  const validateEdit = useCallback(
    (project, integrationsLoadingFlag) => {
      const errors = {};
      const warnings = [];
      const ghConns = integrationsPayload?.github?.connections ?? [];
      const bbConns = integrationsPayload?.bitbucket?.connections ?? [];
      const jiConns = integrationsPayload?.jira?.connections ?? [];
      const originalGitStored = String(project?.gitRepoPath || "").trim();
      const lockedLpPathFromStored = (stored) => {
        const s = String(stored || "").trim();
        const rows = launchpadRowsFromStored(s);
        if (rows?.length) {
          return rows.find((r) => r.push)?.path || rows[0]?.path || "";
        }
        return s;
      };
      const lockedLpPath = lockedLpPathFromStored(originalGitStored);
      const mainNext =
        repoMode === "keep"
          ? lockedLpPath
          : repoMode === "pick"
            ? pickedRepoPath.trim()
            : gitRepoPathManual.trim();
      const lpHostEffective =
        launchpadScmHost === "bitbucket" || launchpadScmHost === "github"
          ? launchpadScmHost
          : scmHostFromRepoPath(mainNext) || scmHost;
      const pathReLaunchpad = lpHostEffective === "github" ? GH_REPO_PATH_RE : BB_REPO_PATH_RE;
      const dualPathRes = { githubPathRe: GH_REPO_PATH_RE, bitbucketPathRe: BB_REPO_PATH_RE };

      // No App repositories means nothing needs a GitHub/Bitbucket connection from the project
      // owner, so editing e.g. stakeholders must not be blocked by a missing connection.
      const appReposPresent = hasAppRepositories(devMultiRows);
      const needsGithub =
        appReposPresent &&
        (lpHostEffective === "github" ||
          (repoMode === "keep" && scmHostFromRepoPath(lockedLpPath) === "github") ||
          devMultiRows.some((r) => {
            if (r.scmHost === "github") return true;
            if (isDevRowAutoProvision(r)) return r.scmHost !== "bitbucket";
            return scmHostFromRepoPath(r.path) === "github";
          }));
      const needsBitbucket =
        appReposPresent &&
        (lpHostEffective === "bitbucket" ||
          (repoMode === "keep" && scmHostFromRepoPath(lockedLpPath) === "bitbucket") ||
          devMultiRows.some((r) => {
            if (r.scmHost === "bitbucket") return true;
            if (isDevRowAutoProvision(r)) return r.scmHost === "bitbucket";
            return scmHostFromRepoPath(r.path) === "bitbucket";
          }));

      const validateOAuth = shouldValidateEditOAuthConnections(project, {
        selectedGithubConnectionId,
        selectedBitbucketConnectionId,
        selectedJiraConnectionId,
        jiraProjectKey,
        repoMode,
      });
      if (validateOAuth || needsGithub || needsBitbucket) {
        if (integrationsLoadingFlag) {
          errors.integrations = "Loading integration connections…";
        } else {
          if (needsGithub) {
            if (ghConns.length === 0) {
              errors.integrations = `No GitHub OAuth connections for the project owner — the project creator must connect GitHub under ${ACCOUNT_CONNECTIONS_LABEL}`;
            } else if (!selectedGithubConnectionId) {
              errors.integrations = "Select a GitHub account for GitHub repositories";
            } else {
              const sel = ghConns.find((c) => String(c.id) === String(selectedGithubConnectionId));
              if (sel?.health?.status === "expired") {
                errors.integrations = "Connection expired — reconnect selected GitHub account";
              }
            }
          }
          if (!errors.integrations && needsBitbucket) {
            if (bbConns.length === 0) {
              errors.integrations = `No Bitbucket OAuth connections for the project owner — the project creator must connect Bitbucket under ${ACCOUNT_CONNECTIONS_LABEL}`;
            } else if (!selectedBitbucketConnectionId) {
              errors.integrations = "Select a Bitbucket account for Bitbucket repositories";
            } else {
              const sel = bbConns.find(
                (c) => String(c.id) === String(selectedBitbucketConnectionId),
              );
              if (sel?.health?.status === "expired") {
                errors.integrations = "Connection expired — reconnect selected Bitbucket account";
              }
            }
          }
          if (!errors.integrations && selectedJiraConnectionId) {
            const sel = jiConns.find((c) => String(c.id) === String(selectedJiraConnectionId));
            if (!sel) {
              errors.integrations = "Selected Jira site is no longer available";
            } else if (sel?.health?.status === "expired") {
              errors.integrations = "Connection expired — reconnect selected Jira site";
            }
          }
        }
      }

      if (advancedMultiRepoOpen) {
        if (repoMode === "keep" && !originalGitStored) {
          errors.gitRepoPath = "Git repository path is missing; pick or enter a path";
        }
        const lpErr = validateLaunchpadMultiRows(
          launchpadMultiRows,
          lpHostEffective,
          pathReLaunchpad,
        );
        if (lpErr) errors.gitRepoPath = lpErr;
        const dErr = validateDevMultiRows(
          devMultiRows,
          lpHostEffective,
          pathReLaunchpad,
          dualPathRes,
        );
        if (dErr) errors.developmentRepoUrl = dErr;
        for (const row of devMultiRows) {
          if (isDevRowAutoProvision(row)) continue;
          const devPath = String(row.path || "").trim();
          const branchRef = String(row.ref || "").trim();
          if (!devPath || !branchRef) continue;
          const remoteErr = devBranchRemoteErrors[normalizeRepoPathForCompare(devPath)];
          if (remoteErr) {
            noteEditRepositoryWarning(warnings, remoteErr);
            break;
          }
        }
      } else {
        if (repoMode === "keep") {
          if (!originalGitStored) {
            errors.gitRepoPath = "Git repository path is missing; pick or enter a path";
          }
        } else if (repoMode === "manual") {
          if (!gitRepoPathManual.trim()) {
            errors.gitRepoPath = "Enter a repository path";
          } else if (!pathReLaunchpad.test(gitRepoPathManual.trim())) {
            errors.gitRepoPath =
              lpHostEffective === "github"
                ? "Use a path like github.com/org/repo"
                : "Use a path like bitbucket.org/workspace/repo";
          }
        } else if (repoMode === "pick") {
          if (!pickedRepoPath.trim()) {
            errors.gitRepoPath = "Choose a repository from the list";
          }
        }

        const hasAnyDevConfig = devMultiRows.some(
          (r) => String(r.path || "").trim() || isDevRowAutoProvision(r),
        );
        if (hasAnyDevConfig) {
          const dErr = validateDevMultiRows(
            devMultiRows,
            lpHostEffective,
            pathReLaunchpad,
            dualPathRes,
          );
          if (dErr) errors.developmentRepoUrl = dErr;
          for (let i = 0; i < devMultiRows.length; i += 1) {
            const row = devMultiRows[i];
            if (isDevRowAutoProvision(row)) continue;
            const devP = String(row.path || "").trim();
            const remoteErr = devBranchRemoteErrors[normalizeRepoPathForCompare(devP)];
            if (remoteErr) {
              noteEditRepositoryWarning(warnings, remoteErr);
            }
            if (!devP || !mainNext) continue;
            if (normalizeRepoPathForCompare(mainNext) === normalizeRepoPathForCompare(devP)) {
              errors.developmentRepoUrl =
                "Must be a different repository than the Launchpad repository";
              break;
            }
          }
        }
      }
      editSaveWarningsRef.current = warnings;
      return errors;
    },
    [
      integrationsPayload,
      scmHost,
      launchpadScmHost,
      selectedGithubConnectionId,
      selectedBitbucketConnectionId,
      selectedJiraConnectionId,
      jiraProjectKey,
      repoMode,
      gitRepoPathManual,
      pickedRepoPath,
      advancedMultiRepoOpen,
      launchpadMultiRows,
      devMultiRows,
      devBranchRemoteErrors,
    ],
  );

  const validateEditAsync = useCallback(
    async (project, integrationsLoadingFlag) => {
      const syncErrors = validateEdit(project, integrationsLoadingFlag);
      if (Object.keys(syncErrors).length > 0) return syncErrors;
      const remoteErrors = await validateDevBranchesRemote();
      if (remoteErrors.developmentRepoUrl) {
        const warnings = editSaveWarningsRef.current.slice();
        noteEditRepositoryWarning(warnings, remoteErrors.developmentRepoUrl);
        editSaveWarningsRef.current = warnings;
      }
      return syncErrors;
    },
    [validateDevBranchesRemote, validateEdit],
  );

  const getCreatePayload = useCallback(() => {
    /**
     * Convert select values to nullable numeric IDs.
     * Keeps payload explicit (null) when nothing is selected.
     */
    const toIdOrNull = (value) => {
      const n = Number(value);
      return Number.isInteger(n) && n > 0 ? n : null;
    };
    if (jiraOnly) {
      return {
        jiraConnectionId: toIdOrNull(selectedJiraConnectionId),
        jiraProjectKey: jiraProjectKey.trim(),
      };
    }
    let gitRepoPathOut;
    let developmentRepoUrlOut;
    if (advancedMultiRepoOpen) {
      gitRepoPathOut = serializeLaunchpadMulti(launchpadMultiRows);
      developmentRepoUrlOut = devMultiRowsNeedProvision(devMultiRows)
        ? serializeDevMultiForSave(devMultiRows)
        : serializeDevMulti(devMultiRows);
    } else if (useEditDevRepositoriesUi && !isEdit) {
      gitRepoPathOut = hideLaunchpadRepositoryPicker
        ? undefined
        : repoMode === "manual"
          ? gitRepoPathManual.trim() || undefined
          : repoMode === "pick"
            ? pickedRepoPath.trim() || undefined
            : undefined;
      developmentRepoUrlOut = devMultiRowsNeedProvision(devMultiRows)
        ? serializeDevMultiForSave(devMultiRows)
        : serializeDevMulti(devMultiRows);
    } else if (repoMode === "manual") {
      gitRepoPathOut = gitRepoPathManual.trim() || undefined;
      developmentRepoUrlOut =
        devRepoMode === "auto"
          ? serializeDevMultiForSave([
              {
                path: "",
                ref: "main",
                directory: "development-1",
                inputMode: "auto",
              },
            ])
          : developmentRepoUrlInput.trim();
    } else if (repoMode === "pick") {
      gitRepoPathOut = pickedRepoPath.trim() || undefined;
      developmentRepoUrlOut =
        devRepoMode === "auto"
          ? serializeDevMultiForSave([
              {
                path: "",
                ref: "main",
                directory: "development-1",
                inputMode: "auto",
              },
            ])
          : developmentRepoUrlInput.trim();
    } else {
      gitRepoPathOut = undefined;
      developmentRepoUrlOut =
        devRepoMode === "auto"
          ? serializeDevMultiForSave([
              {
                path: "",
                ref: "main",
                directory: "development-1",
                inputMode: "auto",
              },
            ])
          : developmentRepoUrlInput.trim();
    }
    const base = {
      jiraConnectionId: enableJira ? toIdOrNull(selectedJiraConnectionId) : null,
      gitRepoPath: gitRepoPathOut,
      developmentRepoUrl: developmentRepoUrlOut,
      jiraProjectKey: enableJira ? jiraProjectKey.trim() : "",
    };
    if (scmHost === "github") {
      return {
        ...base,
        githubConnectionId: toIdOrNull(selectedGithubConnectionId),
        bitbucketConnectionId: null,
      };
    }
    return {
      ...base,
      bitbucketConnectionId: toIdOrNull(selectedBitbucketConnectionId),
      githubConnectionId: null,
    };
  }, [
    enableJira,
    scmHost,
    selectedGithubConnectionId,
    selectedBitbucketConnectionId,
    selectedJiraConnectionId,
    repoMode,
    gitRepoPathManual,
    pickedRepoPath,
    developmentRepoUrlInput,
    jiraProjectKey,
    advancedMultiRepoOpen,
    launchpadMultiRows,
    devMultiRows,
    jiraOnly,
    useEditDevRepositoriesUi,
    isEdit,
    devRepoMode,
    hideLaunchpadRepositoryPicker,
  ]);

  const getEditResolvedGitRepoPath = useCallback(
    (project) => {
      if (advancedMultiRepoOpen) {
        return serializeLaunchpadMulti(launchpadMultiRows);
      }
      if (repoMode === "keep") return String(project?.gitRepoPath || "").trim();
      if (repoMode === "pick") return pickedRepoPath.trim();
      return gitRepoPathManual.trim();
    },
    [advancedMultiRepoOpen, launchpadMultiRows, repoMode, pickedRepoPath, gitRepoPathManual],
  );

  const editNextRepoPath = useMemo(() => {
    if (!isEdit || !editProject) return "";
    if (advancedMultiRepoOpen) return serializeLaunchpadMulti(launchpadMultiRows);
    if (repoMode === "keep") return String(editProject.gitRepoPath || "").trim();
    if (repoMode === "pick") return pickedRepoPath.trim();
    return gitRepoPathManual.trim();
  }, [
    isEdit,
    editProject,
    advancedMultiRepoOpen,
    launchpadMultiRows,
    repoMode,
    pickedRepoPath,
    gitRepoPathManual,
  ]);

  const showRepoMigrationHint =
    isEdit &&
    editProject &&
    !advancedMultiRepoOpen &&
    repoMode !== "keep" &&
    editNextRepoPath &&
    editNextRepoPath !== String(editProject.gitRepoPath || "").trim();

  const createDraftSnapshotForParent = useMemo(
    () => ({
      scmHost,
      selectedGithubConnectionId,
      selectedBitbucketConnectionId,
      selectedJiraConnectionId,
      repoMode,
      pickedRepoPath,
      gitRepoPathManual,
      developmentRepoUrlInput,
      devRepoMode,
      jiraProjectKey,
      jiraBaseUrlResolved,
      ...(useEditDevRepositoriesUi ? { devMultiRows } : {}),
    }),
    [
      scmHost,
      selectedGithubConnectionId,
      selectedBitbucketConnectionId,
      selectedJiraConnectionId,
      repoMode,
      pickedRepoPath,
      gitRepoPathManual,
      developmentRepoUrlInput,
      devRepoMode,
      jiraProjectKey,
      jiraBaseUrlResolved,
      useEditDevRepositoriesUi,
      devMultiRows,
    ],
  );

  useEffect(() => {
    if (typeof onCreateFieldsChange !== "function") return;
    if (isEdit && !jiraOnly) return;
    onCreateFieldsChange(createDraftSnapshotForParent);
  }, [isEdit, jiraOnly, onCreateFieldsChange, createDraftSnapshotForParent]);

  useImperativeHandle(
    ref,
    () => ({
      validateCreate,
      validateEdit,
      validateEditAsync,
      validateDevBranchesRemote,
      getEditRepositoryWarnings: () => editSaveWarningsRef.current.slice(),
      getCreatePayload,
      getEditResolvedGitRepoPath,
      getScmHost: () => scmHost,
      getSelectedGithubConnectionId: () => selectedGithubConnectionId,
      getSelectedBitbucketConnectionId: () => selectedBitbucketConnectionId,
      getSelectedJiraConnectionId: () => selectedJiraConnectionId,
      getJiraProjectKey: () => jiraProjectKey.trim(),
      getJiraBaseUrl: () => {
        const jiConns = integrationsPayload?.jira?.connections ?? [];
        const jiConn = jiConns.find((c) => String(c.id) === selectedJiraConnectionId);
        return jiraBaseUrlResolved || jiConn?.baseUrl || "";
      },
      getDevelopmentRepoUrl: () => {
        if (advancedMultiRepoOpen || isEdit || useEditDevRepositoriesUi) {
          const hasAnyConfig = devMultiRows.some(
            (r) => String(r.path || "").trim() || isDevRowAutoProvision(r),
          );
          if (!hasAnyConfig) return "";
          return devMultiRowsNeedProvision(devMultiRows)
            ? serializeDevMultiForSave(devMultiRows)
            : serializeDevMulti(devMultiRows);
        }
        if (devRepoMode === "auto") {
          return serializeDevMultiForSave([
            {
              path: "",
              ref: "main",
              directory: "development-1",
              inputMode: "auto",
            },
          ]);
        }
        return developmentRepoUrlInput.trim();
      },
      /** Primary branch ref for migrate onboarding (first development row). */
      getPrimaryDevBranchRef: () => {
        if (useEditDevRepositoriesUi || advancedMultiRepoOpen || isEdit) {
          return String(devMultiRows[0]?.ref || "").trim();
        }
        return "";
      },
    }),
    [
      validateCreate,
      validateEdit,
      validateEditAsync,
      validateDevBranchesRemote,
      getCreatePayload,
      getEditResolvedGitRepoPath,
      scmHost,
      selectedGithubConnectionId,
      selectedBitbucketConnectionId,
      selectedJiraConnectionId,
      jiraProjectKey,
      jiraBaseUrlResolved,
      integrationsPayload,
      developmentRepoUrlInput,
      advancedMultiRepoOpen,
      devMultiRows,
      isEdit,
      useEditDevRepositoriesUi,
      devRepoMode,
    ],
  );

  return (
    <div className="space-y-6">
      {showOAuthIntegrations && validationErrors.integrations ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {validationErrors.integrations}
        </div>
      ) : null}

      {showRepositoriesConfig &&
      (validationErrors.gitRepoPath || validationErrors.developmentRepoUrl) ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive space-y-1"
        >
          {validationErrors.gitRepoPath ? <p>{validationErrors.gitRepoPath}</p> : null}
          {validationErrors.developmentRepoUrl ? (
            <p>{validationErrors.developmentRepoUrl}</p>
          ) : null}
        </div>
      ) : null}

      {showRepositoriesConfig && validationWarnings.length > 0 ? (
        <div
          role="status"
          className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 space-y-1 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-50"
        >
          {validationWarnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      ) : null}

      {!jiraOnly && showRepositoriesConfig && isRepositoriesSettingsTab ? (
        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5 text-sm text-muted-foreground space-y-1">
            <p>
              <span className="font-medium text-foreground">Accounts</span>
              {" — configure on the "}
              {PROJECT_GIT_JIRA_LABEL}
              {" tab"}
            </p>
            <p className="font-mono text-foreground">
              GitHub:{" "}
              {selectedGithubConnection?.login
                ? `@${selectedGithubConnection.login}`
                : selectedGithubConnectionId
                  ? `#${selectedGithubConnectionId}`
                  : "none"}
              {" · Bitbucket: "}
              {selectedBitbucketConnection?.login ||
                (selectedBitbucketConnectionId ? `#${selectedBitbucketConnectionId}` : "none")}
            </p>
          </div>
          {hideLaunchpadRepositoryPicker ? (
            <MigrateLaunchpadRepoNotice />
          ) : (
            <RepositorySettingsSection
              variant={isRepositoriesSettingsTab ? "card" : "inline"}
              title={isRepositoriesSettingsTab ? "Launchpad repository" : "Launchpad Repository"}
              description={
                isRepositoriesSettingsTab
                  ? "Hosts the client preview build and where release tags are pushed from this workspace."
                  : undefined
              }
            >
              <div className="space-y-2">
                <Label className="text-xs font-normal text-muted-foreground">Code host</Label>
                <ScmHostPicker
                  id="launchpad-scm-host"
                  value={launchpadHost}
                  onChange={(v) => {
                    setLaunchpadScmHost(v);
                    setScmHost(v);
                    setPickedRepoPath("");
                    setGitRepoPathManual("");
                    if (repoMode === "keep") setRepoMode("pick");
                  }}
                />
              </div>
              <Select
                value={repoMode}
                onValueChange={(v) => {
                  setRepoMode(v);
                  if (v !== "pick") setPickedRepoPath("");
                  if (v !== "manual") setGitRepoPathManual("");
                }}
              >
                <SelectTrigger className="w-full">
                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    {launchpadHost === "github" ? (
                      <IntegrationBrandImg src={githubMarkSvg} invertOnDark className="size-4" />
                    ) : (
                      <IntegrationBrandImg src={bitbucketMarkSvg} className="size-4" />
                    )}
                    <SelectValue />
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {isEdit ? (
                    <SelectItem value="keep">Keep current repository path</SelectItem>
                  ) : (
                    <SelectItem value="auto">Create new repository (default)</SelectItem>
                  )}
                  <SelectItem value="pick">Link an existing repository</SelectItem>
                  <SelectItem value="manual">Enter repository path manually</SelectItem>
                </SelectContent>
              </Select>
              {repoMode === "pick" && (
                <div className="pt-1">
                  <ScmRepositoryCombobox
                    host={launchpadHost}
                    repos={activeRepos}
                    value={pickedRepoPath}
                    onValueChange={setPickedRepoPath}
                    disabled={
                      !(launchpadHost === "github"
                        ? selectedGithubConnectionId
                        : selectedBitbucketConnectionId)
                    }
                    loading={launchpadReposLoading}
                    hasMore={Boolean(launchpadReposHasMore)}
                    onLoadMore={
                      launchpadReposHasMore ? () => loadMoreRepos(launchpadHost) : undefined
                    }
                  />
                </div>
              )}
              {repoMode === "manual" && (
                <div className="space-y-1 pt-1">
                  <Input
                    id="gitRepoPathManual-shared"
                    placeholder={
                      launchpadHost === "github"
                        ? "github.com/org/repository"
                        : "bitbucket.org/workspace/repository"
                    }
                    value={gitRepoPath}
                    onChange={(e) => setGitRepoPathManual(e.target.value)}
                    className={validationErrors.gitRepoPath ? "border-destructive" : ""}
                  />
                  <p className="text-xs text-muted-foreground">
                    Must be a repo the selected{" "}
                    {launchpadHost === "github" ? "GitHub" : "Bitbucket"} account can access.
                  </p>
                </div>
              )}
              {repoMode === "auto" && (
                <p className="text-xs text-muted-foreground">
                  {useEditDevRepositoriesUi && !isEdit
                    ? "A new private Launchpad repository will be created in the Launchpad organization when you submit."
                    : `A new private repository will be created under your selected ${launchpadHost === "github" ? "GitHub" : "Bitbucket"} account when you submit.`}
                </p>
              )}
              {repoMode === "keep" && isEdit && editProject?.gitRepoPath && (
                <p className="text-xs text-muted-foreground font-mono break-all">
                  Current: <CurrentRepoPathDisplay path={editProject.gitRepoPath} />
                </p>
              )}
              {showRepoMigrationHint && (
                <p className="text-xs text-muted-foreground rounded-md border border-border bg-muted/20 p-2">
                  Saving a <strong>new</strong> path runs a one-time migration (branches and tags
                  pushed to the new remote; release tags must exist there afterward).
                </p>
              )}
              {validationErrors.gitRepoPath && (
                <p className="text-sm text-destructive">{validationErrors.gitRepoPath}</p>
              )}
            </RepositorySettingsSection>
          )}

          <RepositorySettingsSection
            variant={isRepositoriesSettingsTab ? "card" : "inline"}
            title={useEditDevRepositoriesUi ? "App repositories" : "App repository"}
            description={
              isRepositoriesSettingsTab
                ? "Backend agents, migrate tooling, and release-lock code changes use these repository clones."
                : undefined
            }
          >
            {useEditDevRepositoriesUi ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Each row can use GitHub or Bitbucket. A branch is required for each linked
                  repository.
                </p>
                <div className="space-y-4 rounded-md border border-border bg-muted/15 p-3">
                  {devMultiRows.map((row, idx) => {
                    const rowHost =
                      row.scmHost === "bitbucket" || row.scmHost === "github"
                        ? row.scmHost
                        : scmHostFromRepoPath(row.path) || launchpadHost;
                    const rowRepos = rowHost === "github" ? githubRepos : bitbucketRepos;
                    const rowReposLoading =
                      rowHost === "github" ? githubReposLoading : bitbucketReposLoading;
                    const rowReposHasMore =
                      rowHost === "github" ? githubReposHasMore : bitbucketReposHasMore;
                    return (
                      <div
                        key={`edit-dev-${idx}`}
                        className="flex flex-col gap-2 border-b border-border pb-4 last:border-b-0 last:pb-0 sm:flex-row sm:items-end sm:gap-2"
                      >
                        <div className="min-w-0 flex-1 space-y-2">
                          <span className="text-xs text-muted-foreground">
                            Repository {idx + 1}
                          </span>
                          <div className="space-y-2">
                            <Label className="text-xs font-normal text-muted-foreground">
                              Code host
                            </Label>
                            <ScmHostPicker
                              id={`app-scm-host-${idx}`}
                              value={rowHost}
                              onChange={(v) => {
                                setDevMultiRows((prev) => {
                                  const next = [...prev];
                                  next[idx] = {
                                    ...next[idx],
                                    scmHost: v,
                                    path: "",
                                    ref: "",
                                  };
                                  return next;
                                });
                                setDevRepoPickNonce((n) => n + 1);
                              }}
                            />
                          </div>
                          <Select
                            value={row.inputMode ?? "pick"}
                            onValueChange={(v) => {
                              setDevMultiRows((prev) => {
                                const next = [...prev];
                                next[idx] = {
                                  ...next[idx],
                                  inputMode: v,
                                  path: "",
                                  ref: "",
                                };
                                return next;
                              });
                              setDevRepoPickNonce((n) => n + 1);
                            }}
                          >
                            <SelectTrigger className="w-full">
                              <span className="flex min-w-0 flex-1 items-center gap-2">
                                {rowHost === "github" ? (
                                  <IntegrationBrandImg
                                    src={githubMarkSvg}
                                    invertOnDark
                                    className="size-4"
                                  />
                                ) : (
                                  <IntegrationBrandImg src={bitbucketMarkSvg} className="size-4" />
                                )}
                                <SelectValue />
                              </span>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pick">Link an existing repository</SelectItem>
                              <SelectItem value="manual">Enter repository path manually</SelectItem>
                              <SelectItem value="auto">Create new repository</SelectItem>
                            </SelectContent>
                          </Select>
                          <DevelopmentRepoPathFields
                            mode={row.inputMode ?? "pick"}
                            pathValue={row.path}
                            onPathChangeString={(v) => {
                              const mode = row.inputMode ?? "pick";
                              setDevMultiRows((prev) => {
                                const next = [...prev];
                                next[idx] = { ...next[idx], path: v, ref: "" };
                                return next;
                              });
                              if (mode === "pick") {
                                setDevRepoPickNonce((n) => n + 1);
                              }
                            }}
                            pickSelectKey={`edit-dev-${idx}-${devRepoPickNonce}`}
                            scmHost={rowHost}
                            activeRepos={rowRepos}
                            reposLoading={rowReposLoading}
                            reposHasMore={rowReposHasMore}
                            onLoadMoreRepos={loadMoreRepos}
                            selectedGithubConnectionId={selectedGithubConnectionId}
                            selectedBitbucketConnectionId={selectedBitbucketConnectionId}
                            showPathError={Boolean(validationErrors.developmentRepoUrl)}
                            idSuffix={`edit-${idx}`}
                          />
                          <DevelopmentRepoBranchCombobox
                            repoPath={row.path ?? ""}
                            value={row.ref ?? ""}
                            onChange={(v) => {
                              setDevMultiRows((prev) => {
                                const next = [...prev];
                                next[idx] = { ...next[idx], ref: v };
                                return next;
                              });
                            }}
                            branchData={
                              devBranchDataByPath[normalizeRepoPathForCompare(row.path)] ??
                              EMPTY_DEV_BRANCH_DATA
                            }
                            branchError={
                              devBranchRemoteErrors[normalizeRepoPathForCompare(row.path)] || ""
                            }
                            onSearchBranches={(query) =>
                              searchDevelopmentRepoBranches(row.path ?? "", query, rowHost)
                            }
                            idSuffix={`edit-${idx}`}
                          />
                          <div className="space-y-1">
                            <Label className="text-xs font-normal text-muted-foreground">
                              Repo details (optional)
                            </Label>
                            <Textarea
                              value={row.details || ""}
                              onChange={(e) => {
                                setDevMultiRows((prev) => {
                                  const next = [...prev];
                                  next[idx] = {
                                    ...next[idx],
                                    details: e.target.value,
                                  };
                                  return next;
                                });
                              }}
                              placeholder="Layout, stack, folders, APIs…"
                              rows={2}
                              className="min-h-[56px] resize-y text-xs"
                            />
                            <p className="text-xs text-muted-foreground">
                              Optional notes for AI agents.
                            </p>
                          </div>
                        </div>
                        {devMultiRows.length > 1 ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="shrink-0 text-muted-foreground"
                            onClick={() =>
                              setDevMultiRows((prev) => {
                                const next = prev.filter((_, i) => i !== idx);
                                return next.length
                                  ? next
                                  : [
                                      {
                                        ...defaultDevMultiRow(),
                                        inputMode: "pick",
                                      },
                                    ];
                              })
                            }
                          >
                            Remove
                          </Button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                <Select
                  value={devRepoMode}
                  onValueChange={(v) => {
                    setDevRepoMode(v);
                    if (v === "pick" || v === "manual" || v === "auto") {
                      setDevelopmentRepoUrlInput("");
                    }
                    setDevRepoPickNonce((n) => n + 1);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <span className="flex min-w-0 flex-1 items-center gap-2">
                      {scmHost === "github" ? (
                        <IntegrationBrandImg src={githubMarkSvg} invertOnDark className="size-4" />
                      ) : (
                        <IntegrationBrandImg src={bitbucketMarkSvg} className="size-4" />
                      )}
                      <SelectValue />
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pick">Link an existing repository</SelectItem>
                    <SelectItem value="manual">Enter repository path manually</SelectItem>
                    <SelectItem value="auto">Create new repository</SelectItem>
                  </SelectContent>
                </Select>
                {(devRepoMode === "pick" || devRepoMode === "manual" || devRepoMode === "auto") && (
                  <DevelopmentRepoPathFields
                    mode={devRepoMode}
                    pathValue={developmentRepoUrlInput}
                    onPathChangeString={(v) => {
                      setDevelopmentRepoUrlInput(v);
                      if (devRepoMode === "pick") {
                        setDevRepoPickNonce((n) => n + 1);
                      }
                    }}
                    pickSelectKey={devRepoPickNonce}
                    scmHost={scmHost}
                    activeRepos={activeRepos}
                    reposLoading={reposLoading}
                    reposHasMore={reposHasMore}
                    onLoadMoreRepos={loadMoreRepos}
                    selectedGithubConnectionId={selectedGithubConnectionId}
                    selectedBitbucketConnectionId={selectedBitbucketConnectionId}
                    showPathError={Boolean(validationErrors.developmentRepoUrl)}
                    idSuffix="create"
                  />
                )}
              </>
            )}
            {validationErrors.developmentRepoUrl && (
              <p className="text-sm text-destructive">{validationErrors.developmentRepoUrl}</p>
            )}
          </RepositorySettingsSection>

          {useEditDevRepositoriesUi ? (
            <DevelopmentRepositoriesAddCard onAdd={appendDevMultiRow} />
          ) : null}

          {!useEditDevRepositoriesUi && (
            <Collapsible open={advancedMultiRepoOpen} onOpenChange={setAdvancedMultiRepoOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full justify-between gap-2 border-dashed text-muted-foreground"
                >
                  <span>Advanced: multiple repositories</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 transition-transform duration-200",
                      advancedMultiRepoOpen && "rotate-180",
                    )}
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-3 border-t border-border mt-3">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Add more than one clone for Cursor agents.{" "}
                  <span className="text-foreground font-medium">
                    Merge, preview tags, and image-save automation use the first &quot;Push&quot;
                    launchpad row only.
                  </span>
                </p>
                <div className="space-y-2">
                  <Label className="text-foreground">Launchpad repositories</Label>
                  <div className="space-y-3 rounded-md border border-border bg-muted/15 p-3">
                    {launchpadMultiRows.map((row, idx) => (
                      <div
                        key={`lp-${idx}`}
                        className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end"
                      >
                        <div className="space-y-1">
                          <span className="text-xs text-muted-foreground">Path</span>
                          <Input
                            value={row.path}
                            onChange={(e) => {
                              const next = [...launchpadMultiRows];
                              next[idx] = {
                                ...next[idx],
                                path: e.target.value,
                              };
                              setLaunchpadMultiRows(next);
                            }}
                            placeholder="github.com/org/repo"
                            className="font-mono text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <span className="text-xs text-muted-foreground">Branch / ref</span>
                          <Input
                            value={row.ref}
                            onChange={(e) => {
                              const next = [...launchpadMultiRows];
                              next[idx] = {
                                ...next[idx],
                                ref: e.target.value,
                              };
                              setLaunchpadMultiRows(next);
                            }}
                            placeholder="main"
                          />
                        </div>
                        <div className="space-y-1">
                          <span className="text-xs text-muted-foreground">Directory</span>
                          <Input
                            value={row.directory}
                            onChange={(e) => {
                              const next = [...launchpadMultiRows];
                              next[idx] = {
                                ...next[idx],
                                directory: e.target.value,
                              };
                              setLaunchpadMultiRows(next);
                            }}
                            placeholder="launchpad-1"
                            className="font-mono text-xs"
                          />
                        </div>
                        <label className="flex items-center gap-2 text-xs text-muted-foreground sm:pb-2">
                          <Checkbox
                            checked={Boolean(row.push)}
                            onCheckedChange={(v) => {
                              const next = [...launchpadMultiRows];
                              next[idx] = { ...next[idx], push: Boolean(v) };
                              setLaunchpadMultiRows(next);
                            }}
                          />
                          Push
                        </label>
                      </div>
                    ))}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          setLaunchpadMultiRows((prev) => [
                            ...prev,
                            {
                              path: "",
                              ref: "main",
                              directory: `launchpad-${prev.length + 1}`,
                              push: false,
                            },
                          ])
                        }
                      >
                        Add launchpad row
                      </Button>
                      {launchpadMultiRows.length > 1 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setLaunchpadMultiRows(
                              (prev) => prev.slice(0, -1) || [defaultLaunchpadMultiRow()],
                            )
                          }
                        >
                          Remove last
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">App repositories</Label>
                  <div className="space-y-3 rounded-md border border-border bg-muted/15 p-3">
                    {devMultiRows.map((row, idx) => (
                      <div
                        key={`adv-dev-${idx}`}
                        className="flex flex-col gap-2 rounded-md border border-border/60 bg-background/50 p-3"
                      >
                        <span className="text-xs text-muted-foreground">Repository {idx + 1}</span>
                        <Select
                          value={row.inputMode ?? "pick"}
                          onValueChange={(v) => {
                            setDevMultiRows((prev) => {
                              const next = [...prev];
                              next[idx] = {
                                ...next[idx],
                                inputMode: v,
                                path: "",
                              };
                              return next;
                            });
                            setDevRepoPickNonce((n) => n + 1);
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pick">Link an existing repository</SelectItem>
                            <SelectItem value="manual">Enter repository path manually</SelectItem>
                            <SelectItem value="auto">Create new repository</SelectItem>
                          </SelectContent>
                        </Select>
                        <DevelopmentRepoPathFields
                          mode={row.inputMode ?? "pick"}
                          pathValue={row.path}
                          onPathChangeString={(v) => {
                            setDevMultiRows((prev) => {
                              const next = [...prev];
                              next[idx] = { ...next[idx], path: v };
                              return next;
                            });
                            if ((row.inputMode ?? "pick") === "pick") {
                              setDevRepoPickNonce((n) => n + 1);
                            }
                          }}
                          pickSelectKey={`adv-dev-${idx}-${devRepoPickNonce}`}
                          scmHost={scmHost}
                          activeRepos={activeRepos}
                          reposLoading={reposLoading}
                          reposHasMore={reposHasMore}
                          onLoadMoreRepos={loadMoreRepos}
                          selectedGithubConnectionId={selectedGithubConnectionId}
                          selectedBitbucketConnectionId={selectedBitbucketConnectionId}
                          showPathError={Boolean(validationErrors.developmentRepoUrl)}
                          idSuffix={`adv-${idx}`}
                        />
                        <div className="grid gap-2 sm:grid-cols-2 sm:items-end">
                          <div className="space-y-1">
                            <span className="text-xs text-muted-foreground">Branch / ref</span>
                            <Input
                              value={row.ref}
                              onChange={(e) => {
                                setDevMultiRows((prev) => {
                                  const next = [...prev];
                                  next[idx] = {
                                    ...next[idx],
                                    ref: e.target.value,
                                  };
                                  return next;
                                });
                              }}
                              placeholder="main"
                            />
                          </div>
                          <div className="space-y-1">
                            <span className="text-xs text-muted-foreground">Directory</span>
                            <Input
                              value={row.directory}
                              onChange={(e) => {
                                setDevMultiRows((prev) => {
                                  const next = [...prev];
                                  next[idx] = {
                                    ...next[idx],
                                    directory: e.target.value,
                                  };
                                  return next;
                                });
                              }}
                              placeholder="development-1"
                              className="font-mono text-xs"
                            />
                          </div>
                        </div>
                        <div className="space-y-1 sm:col-span-3">
                          <span className="text-xs text-muted-foreground">
                            Repo details (optional)
                          </span>
                          <Textarea
                            value={row.details || ""}
                            onChange={(e) => {
                              const next = [...devMultiRows];
                              next[idx] = {
                                ...next[idx],
                                details: e.target.value,
                              };
                              setDevMultiRows(next);
                            }}
                            placeholder="Layout, stack, folders, APIs…"
                            rows={2}
                            className="min-h-[56px] resize-y text-xs"
                          />
                        </div>
                      </div>
                    ))}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          setDevMultiRows((prev) => [
                            ...prev,
                            {
                              path: "",
                              ref: "main",
                              directory: `development-${prev.length + 1}`,
                              inputMode: "auto",
                              details: "",
                            },
                          ])
                        }
                      >
                        Add development row
                      </Button>
                      {devMultiRows.length > 1 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setDevMultiRows((prev) => prev.slice(0, -1) || [defaultDevMultiRow()])
                          }
                        >
                          Remove last
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      ) : null}

      {!jiraOnly &&
      (showOAuthIntegrations || (showRepositoriesConfig && !isRepositoriesSettingsTab)) ? (
        <Card className="border-border shadow-sm overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-foreground flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5" aria-hidden>
                <IntegrationBrandImg src={githubMarkSvg} invertOnDark className="size-5" />
                <IntegrationBrandImg src={bitbucketMarkSvg} className="size-5" />
              </span>
              <span>Code host</span>
            </CardTitle>
            <p className="text-sm text-muted-foreground font-normal pt-1">
              {useEditCodeHostCopy ? (
                <>
                  Pick GitHub or Bitbucket and the account for this repo. Manage connections on{" "}
                  <Link
                    to={ACCOUNT_CONNECTIONS_PATH}
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    {ACCOUNT_CONNECTIONS_LABEL}
                  </Link>
                  ; reconnecting only refreshes an existing link.
                </>
              ) : (
                <>
                  One code host per project. Add accounts under{" "}
                  <Link
                    to={ACCOUNT_CONNECTIONS_PATH}
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    {ACCOUNT_CONNECTIONS_LABEL}
                  </Link>
                  .
                </>
              )}
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {showOAuthIntegrations && hasExpiredConnections ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span className="font-medium">Connection expired — Reconnect</span>
                  <Badge variant="destructive" className="ml-auto h-5">
                    Action required
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-destructive/90">
                  Reconnect expired accounts or sites in this form before saving.
                </p>
              </div>
            ) : null}
            {showOAuthIntegrations ? (
              <>
                {isEdit ? (
                  <>
                    <div className="space-y-2">
                      <Label>Code host accounts</Label>
                      <p className="text-xs text-muted-foreground">
                        Link a GitHub account, a Bitbucket account, or both. Each Launchpad or app
                        repository chooses which host to use. Connect accounts under{" "}
                        <Link
                          to={ACCOUNT_CONNECTIONS_PATH}
                          className="text-primary underline-offset-4 hover:underline"
                        >
                          {ACCOUNT_CONNECTIONS_LABEL}
                        </Link>
                        .
                      </p>
                    </div>
                    <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4 transition-colors">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                        <div className="font-medium text-foreground flex min-w-0 items-center gap-2">
                          <IntegrationBrandImg
                            src={githubMarkSvg}
                            invertOnDark
                            className="size-5 shrink-0"
                          />
                          <span>GitHub account</span>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full shrink-0 sm:w-auto"
                          disabled={integrationsLoading || oauthBusy}
                          onClick={async () => {
                            setOauthBusy("gh");
                            try {
                              oauthDraftRestoredRef.current = false;
                              onBeforeOAuthRedirect?.();
                              persistCreateGitJiraDraftForOAuth();
                              const opts = {
                                accessLevel: githubAccessLevel,
                                ...(oauthReturnTo ? { returnTo: oauthReturnTo } : {}),
                              };
                              const url = await getGithubOAuthAuthorizeUrl(
                                selectedGithubConnectionId,
                                opts,
                              );
                              window.location.href = url;
                            } catch (e) {
                              toast.error(e.message || "Could not start GitHub OAuth");
                              setOauthBusy(null);
                            }
                          }}
                        >
                          {oauthBusy === "gh" ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <IntegrationBrandImg
                              src={githubMarkSvg}
                              invertOnDark
                              className="mr-2 size-4"
                            />
                          )}
                          {selectedGithubConnectionId
                            ? "Reconnect selected account"
                            : "Add GitHub account"}
                        </Button>
                      </div>
                      <GithubAccessLevelPicker
                        idPrefix="project-gh-access-edit"
                        legend={
                          selectedGithubConnectionId
                            ? "Access when reconnecting"
                            : "Access for new connection"
                        }
                        value={githubAccessLevel}
                        onChange={setGithubAccessLevel}
                        disabled={integrationsLoading || Boolean(oauthBusy)}
                      />
                      {integrationsLoading ? (
                        <Skeleton
                          className="h-9 w-full"
                          role="status"
                          aria-busy="true"
                          aria-label="Loading GitHub accounts"
                        />
                      ) : (
                        <Select
                          value={selectedGithubConnectionId || undefined}
                          onValueChange={setSelectedGithubConnectionId}
                          disabled={githubConnections.length === 0}
                        >
                          <SelectTrigger className="w-full">
                            <span className="flex min-w-0 flex-1 items-center gap-2">
                              <IntegrationBrandImg
                                src={githubMarkSvg}
                                invertOnDark
                                className="size-4"
                              />
                              <SelectValue placeholder="Select GitHub account (optional)" />
                            </span>
                          </SelectTrigger>
                          <SelectContent className="max-h-72">
                            {githubConnections.map((c) => (
                              <SelectItem key={c.id} value={String(c.id)}>
                                {c.login ? `@${c.login}` : `Account #${c.id}`}
                                {` · ${normalizeGithubAccessLevel(c.accessLevel)}`}
                                {c.health?.status === "expired" ? " (expired)" : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {selectedGithubExpired ? (
                        <p className="text-xs text-destructive">
                          {selectedGithubConnection?.health?.message ||
                            "Selected GitHub account expired. Reconnect it."}
                        </p>
                      ) : null}
                    </div>
                    <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4 transition-colors">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                        <div className="font-medium text-foreground flex min-w-0 items-center gap-2">
                          <IntegrationBrandImg src={bitbucketMarkSvg} className="size-5 shrink-0" />
                          <span>Bitbucket account</span>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full shrink-0 sm:w-auto"
                          disabled={integrationsLoading || oauthBusy}
                          onClick={async () => {
                            setOauthBusy("bb");
                            try {
                              oauthDraftRestoredRef.current = false;
                              onBeforeOAuthRedirect?.();
                              persistCreateGitJiraDraftForOAuth();
                              const opts = {
                                accessLevel: bitbucketAccessLevel,
                                ...(oauthReturnTo ? { returnTo: oauthReturnTo } : {}),
                              };
                              const url = await getBitbucketOAuthAuthorizeUrl(
                                selectedBitbucketConnectionId,
                                opts,
                              );
                              window.location.href = url;
                            } catch (e) {
                              toast.error(e.message || "Could not start Bitbucket OAuth");
                              setOauthBusy(null);
                            }
                          }}
                        >
                          {oauthBusy === "bb" ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <IntegrationBrandImg src={bitbucketMarkSvg} className="mr-2 size-4" />
                          )}
                          {selectedBitbucketConnectionId
                            ? "Reconnect selected account"
                            : "Add Bitbucket account"}
                        </Button>
                      </div>
                      <BitbucketAccessLevelPicker
                        idPrefix="project-bb-access-edit"
                        legend={
                          selectedBitbucketConnectionId
                            ? "Access when reconnecting"
                            : "Access for new connection"
                        }
                        value={bitbucketAccessLevel}
                        onChange={setBitbucketAccessLevel}
                        disabled={integrationsLoading || Boolean(oauthBusy)}
                      />
                      {integrationsLoading ? (
                        <Skeleton
                          className="h-9 w-full"
                          role="status"
                          aria-busy="true"
                          aria-label="Loading Bitbucket accounts"
                        />
                      ) : (
                        <Select
                          value={selectedBitbucketConnectionId || undefined}
                          onValueChange={setSelectedBitbucketConnectionId}
                          disabled={bitbucketConnections.length === 0}
                        >
                          <SelectTrigger className="w-full">
                            <span className="flex min-w-0 flex-1 items-center gap-2">
                              <IntegrationBrandImg src={bitbucketMarkSvg} className="size-4" />
                              <SelectValue placeholder="Select Bitbucket account (optional)" />
                            </span>
                          </SelectTrigger>
                          <SelectContent className="max-h-72">
                            {bitbucketConnections.map((c) => (
                              <SelectItem key={c.id} value={String(c.id)}>
                                {c.login ? c.login : `Account #${c.id}`}
                                {` · ${normalizeBitbucketAccessLevel(c.accessLevel)}`}
                                {c.health?.status === "expired" ? " (expired)" : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {selectedBitbucketConnection &&
                      normalizeBitbucketAccessLevel(selectedBitbucketConnection.accessLevel) ===
                        BITBUCKET_ACCESS_LEVEL.READ ? (
                        <p className="text-xs text-muted-foreground">
                          Selected account has Read access. Reconnect with Write for agents, push,
                          and webhooks.
                        </p>
                      ) : null}
                      {selectedBitbucketExpired ? (
                        <p className="text-xs text-destructive">
                          {selectedBitbucketConnection?.health?.message ||
                            "Selected Bitbucket account expired. Reconnect it."}
                        </p>
                      ) : null}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>Code host</Label>
                      <Select
                        value={scmHost}
                        onValueChange={(v) => {
                          setScmHost(v);
                          setLaunchpadScmHost(v);
                          setPickedRepoPath("");
                          setGitRepoPathManual("");
                        }}
                        disabled={integrationsLoading}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="github">
                            <IntegrationBrandImg
                              src={githubMarkSvg}
                              invertOnDark
                              className="size-4"
                            />
                            GitHub
                          </SelectItem>
                          <SelectItem value="bitbucket">
                            <IntegrationBrandImg src={bitbucketMarkSvg} className="size-4" />
                            Bitbucket
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Choose the host for this project&apos;s first repository. You can add the
                        other host later in project settings. Connect accounts under{" "}
                        <Link
                          to={ACCOUNT_CONNECTIONS_PATH}
                          className="text-primary underline-offset-4 hover:underline"
                        >
                          {ACCOUNT_CONNECTIONS_LABEL}
                        </Link>
                        .
                      </p>
                    </div>
                    <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4 transition-colors">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                        <div className="font-medium text-foreground flex min-w-0 items-center gap-2">
                          {scmHost === "github" ? (
                            <>
                              <IntegrationBrandImg
                                src={githubMarkSvg}
                                invertOnDark
                                className="size-5 shrink-0"
                              />
                              <span>GitHub account</span>
                            </>
                          ) : (
                            <>
                              <IntegrationBrandImg
                                src={bitbucketMarkSvg}
                                className="size-5 shrink-0"
                              />
                              <span>Bitbucket account</span>
                            </>
                          )}
                        </div>
                        {scmHost === "github" ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full shrink-0 sm:w-auto"
                            disabled={integrationsLoading || oauthBusy}
                            onClick={async () => {
                              setOauthBusy("gh");
                              try {
                                oauthDraftRestoredRef.current = false;
                                onBeforeOAuthRedirect?.();
                                persistCreateGitJiraDraftForOAuth();
                                const opts = {
                                  accessLevel: githubAccessLevel,
                                  ...(oauthReturnTo ? { returnTo: oauthReturnTo } : {}),
                                };
                                const url = await getGithubOAuthAuthorizeUrl(undefined, opts);
                                window.location.href = url;
                              } catch (e) {
                                toast.error(e.message || "Could not start GitHub OAuth");
                                setOauthBusy(null);
                              }
                            }}
                          >
                            {oauthBusy === "gh" ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <IntegrationBrandImg
                                src={githubMarkSvg}
                                invertOnDark
                                className="mr-2 size-4"
                              />
                            )}
                            {useEditDevRepositoriesUi && selectedGithubConnectionId
                              ? "Reconnect selected account"
                              : "Add GitHub account"}
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full shrink-0 sm:w-auto"
                            disabled={integrationsLoading || oauthBusy}
                            onClick={async () => {
                              setOauthBusy("bb");
                              try {
                                oauthDraftRestoredRef.current = false;
                                onBeforeOAuthRedirect?.();
                                persistCreateGitJiraDraftForOAuth();
                                const opts = {
                                  accessLevel: bitbucketAccessLevel,
                                  ...(oauthReturnTo ? { returnTo: oauthReturnTo } : {}),
                                };
                                const url = await getBitbucketOAuthAuthorizeUrl(undefined, opts);
                                window.location.href = url;
                              } catch (e) {
                                toast.error(e.message || "Could not start Bitbucket OAuth");
                                setOauthBusy(null);
                              }
                            }}
                          >
                            {oauthBusy === "bb" ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <IntegrationBrandImg src={bitbucketMarkSvg} className="mr-2 size-4" />
                            )}
                            {useEditDevRepositoriesUi && selectedBitbucketConnectionId
                              ? "Reconnect selected account"
                              : "Add Bitbucket account"}
                          </Button>
                        )}
                      </div>
                      {scmHost === "github" ? (
                        <GithubAccessLevelPicker
                          idPrefix="project-gh-access"
                          legend={
                            selectedGithubConnectionId
                              ? "Access when reconnecting"
                              : "Access for new connection"
                          }
                          value={githubAccessLevel}
                          onChange={setGithubAccessLevel}
                          disabled={integrationsLoading || Boolean(oauthBusy)}
                        />
                      ) : (
                        <BitbucketAccessLevelPicker
                          idPrefix="project-bb-access"
                          legend={
                            selectedBitbucketConnectionId
                              ? "Access when reconnecting"
                              : "Access for new connection"
                          }
                          value={bitbucketAccessLevel}
                          onChange={setBitbucketAccessLevel}
                          disabled={integrationsLoading || Boolean(oauthBusy)}
                        />
                      )}
                      {integrationsLoading ? (
                        <Skeleton
                          className="h-9 w-full"
                          role="status"
                          aria-busy="true"
                          aria-label="Loading accounts"
                        />
                      ) : scmHost === "github" ? (
                        <Select
                          value={selectedGithubConnectionId || undefined}
                          onValueChange={setSelectedGithubConnectionId}
                          disabled={githubConnections.length === 0}
                        >
                          <SelectTrigger className="w-full">
                            <span className="flex min-w-0 flex-1 items-center gap-2">
                              <IntegrationBrandImg
                                src={githubMarkSvg}
                                invertOnDark
                                className="size-4"
                              />
                              <SelectValue placeholder="Select GitHub account" />
                            </span>
                          </SelectTrigger>
                          <SelectContent className="max-h-72">
                            {githubConnections.map((c) => (
                              <SelectItem key={c.id} value={String(c.id)}>
                                {c.login ? `@${c.login}` : `Account #${c.id}`}
                                {` · ${normalizeGithubAccessLevel(c.accessLevel)}`}
                                {c.health?.status === "expired" ? " (expired)" : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Select
                          value={selectedBitbucketConnectionId || undefined}
                          onValueChange={setSelectedBitbucketConnectionId}
                          disabled={bitbucketConnections.length === 0}
                        >
                          <SelectTrigger className="w-full">
                            <span className="flex min-w-0 flex-1 items-center gap-2">
                              <IntegrationBrandImg src={bitbucketMarkSvg} className="size-4" />
                              <SelectValue placeholder="Select Bitbucket account" />
                            </span>
                          </SelectTrigger>
                          <SelectContent className="max-h-72">
                            {bitbucketConnections.map((c) => (
                              <SelectItem key={c.id} value={String(c.id)}>
                                {c.login ? c.login : `Account #${c.id}`}
                                {` · ${normalizeBitbucketAccessLevel(c.accessLevel)}`}
                                {c.health?.status === "expired" ? " (expired)" : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {scmHost === "github" &&
                      selectedGithubConnection &&
                      normalizeGithubAccessLevel(selectedGithubConnection.accessLevel) ===
                        GITHUB_ACCESS_LEVEL.READ ? (
                        <p className="text-xs text-muted-foreground">
                          Selected account has Read access. Reconnect with Write for agents, push,
                          and repo setup.
                        </p>
                      ) : null}
                      {scmHost === "bitbucket" &&
                      selectedBitbucketConnection &&
                      normalizeBitbucketAccessLevel(selectedBitbucketConnection.accessLevel) ===
                        BITBUCKET_ACCESS_LEVEL.READ ? (
                        <p className="text-xs text-muted-foreground">
                          Selected account has Read access. Reconnect with Write for agents, push,
                          and webhooks.
                        </p>
                      ) : null}
                      {selectedScmExpired ? (
                        <p className="text-xs text-destructive">
                          {selectedScmConnection?.health?.message ||
                            "Selected code host account expired. Reconnect it."}
                        </p>
                      ) : null}
                    </div>
                  </>
                )}
              </>
            ) : null}

            {showRepositoriesConfig ? (
              <>
                {hideLaunchpadRepositoryPicker ? (
                  <MigrateLaunchpadRepoNotice />
                ) : (
                  <RepositorySettingsSection
                    variant={isRepositoriesSettingsTab ? "card" : "inline"}
                    title={
                      isRepositoriesSettingsTab ? "Launchpad repository" : "Launchpad Repository"
                    }
                    description={
                      isRepositoriesSettingsTab
                        ? "Hosts the client preview build and where release tags are pushed from this workspace."
                        : undefined
                    }
                  >
                    <Select
                      value={repoMode}
                      onValueChange={(v) => {
                        setRepoMode(v);
                        if (v !== "pick") setPickedRepoPath("");
                        if (v !== "manual") setGitRepoPathManual("");
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <span className="flex min-w-0 flex-1 items-center gap-2">
                          {scmHost === "github" ? (
                            <IntegrationBrandImg
                              src={githubMarkSvg}
                              invertOnDark
                              className="size-4"
                            />
                          ) : (
                            <IntegrationBrandImg src={bitbucketMarkSvg} className="size-4" />
                          )}
                          <SelectValue />
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        {isEdit ? (
                          <SelectItem value="keep">Keep current repository path</SelectItem>
                        ) : (
                          <SelectItem value="auto">Create new repository (default)</SelectItem>
                        )}
                        <SelectItem value="pick">Link an existing repository</SelectItem>
                        <SelectItem value="manual">Enter repository path manually</SelectItem>
                      </SelectContent>
                    </Select>
                    {repoMode === "pick" && (
                      <div className="pt-1">
                        <ScmRepositoryCombobox
                          host={scmHost}
                          repos={activeRepos}
                          value={pickedRepoPath}
                          onValueChange={setPickedRepoPath}
                          disabled={
                            !(scmHost === "github"
                              ? selectedGithubConnectionId
                              : selectedBitbucketConnectionId)
                          }
                          loading={reposLoading}
                          hasMore={Boolean(reposHasMore)}
                          onLoadMore={reposHasMore ? () => loadMoreRepos() : undefined}
                        />
                      </div>
                    )}
                    {repoMode === "manual" && (
                      <div className="space-y-1 pt-1">
                        <Input
                          id="gitRepoPathManual-shared"
                          placeholder={
                            scmHost === "github"
                              ? "github.com/org/repository"
                              : "bitbucket.org/workspace/repository"
                          }
                          value={gitRepoPath}
                          onChange={(e) => setGitRepoPathManual(e.target.value)}
                          className={validationErrors.gitRepoPath ? "border-destructive" : ""}
                        />
                        <p className="text-xs text-muted-foreground">
                          Must be a repo the selected{" "}
                          {scmHost === "github" ? "GitHub" : "Bitbucket"} account can access.
                        </p>
                      </div>
                    )}
                    {repoMode === "auto" && (
                      <p className="text-xs text-muted-foreground">
                        {useEditDevRepositoriesUi && !isEdit
                          ? "A new private Launchpad repository will be created in the Launchpad organization when you submit."
                          : `A new private repository will be created under your selected ${scmHost === "github" ? "GitHub" : "Bitbucket"} account when you submit.`}
                      </p>
                    )}
                    {repoMode === "keep" && isEdit && editProject?.gitRepoPath && (
                      <p className="text-xs text-muted-foreground font-mono break-all">
                        Current: <CurrentRepoPathDisplay path={editProject.gitRepoPath} />
                      </p>
                    )}
                    {showRepoMigrationHint && (
                      <p className="text-xs text-muted-foreground rounded-md border border-border bg-muted/20 p-2">
                        Saving a <strong>new</strong> path runs a one-time migration (branches and
                        tags pushed to the new remote; release tags must exist there afterward).
                      </p>
                    )}
                    {validationErrors.gitRepoPath && (
                      <p className="text-sm text-destructive">{validationErrors.gitRepoPath}</p>
                    )}
                  </RepositorySettingsSection>
                )}

                <RepositorySettingsSection
                  variant={isRepositoriesSettingsTab ? "card" : "inline"}
                  title={useEditDevRepositoriesUi ? "App repositories" : "App repository"}
                  description={
                    isRepositoriesSettingsTab
                      ? "App repositories agents, migrate tooling, and release-lock code changes use these repository clones."
                      : undefined
                  }
                >
                  {useEditDevRepositoriesUi ? (
                    <>
                      <p className="text-sm text-muted-foreground">
                        Link repositories your {scmHost === "github" ? "GitHub" : "Bitbucket"}{" "}
                        account can access. A branch is required for each row.
                      </p>
                      <div className="space-y-4 rounded-md border border-border bg-muted/15 p-3">
                        {devMultiRows.map((row, idx) => (
                          <div
                            key={`edit-dev-${idx}`}
                            className="flex flex-col gap-2 border-b border-border pb-4 last:border-b-0 last:pb-0 sm:flex-row sm:items-end sm:gap-2"
                          >
                            <div className="min-w-0 flex-1 space-y-2">
                              <span className="text-xs text-muted-foreground">
                                Repository {idx + 1}
                              </span>
                              <Select
                                value={row.inputMode ?? "pick"}
                                onValueChange={(v) => {
                                  setDevMultiRows((prev) => {
                                    const next = [...prev];
                                    next[idx] = {
                                      ...next[idx],
                                      inputMode: v,
                                      path: "",
                                      ref: "",
                                    };
                                    return next;
                                  });
                                  setDevRepoPickNonce((n) => n + 1);
                                }}
                              >
                                <SelectTrigger className="w-full">
                                  <span className="flex min-w-0 flex-1 items-center gap-2">
                                    {scmHost === "github" ? (
                                      <IntegrationBrandImg
                                        src={githubMarkSvg}
                                        invertOnDark
                                        className="size-4"
                                      />
                                    ) : (
                                      <IntegrationBrandImg
                                        src={bitbucketMarkSvg}
                                        className="size-4"
                                      />
                                    )}
                                    <SelectValue />
                                  </span>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pick">Link an existing repository</SelectItem>
                                  <SelectItem value="manual">
                                    Enter repository path manually
                                  </SelectItem>
                                  <SelectItem value="auto">Create new repository</SelectItem>
                                </SelectContent>
                              </Select>
                              <DevelopmentRepoPathFields
                                mode={row.inputMode ?? "pick"}
                                pathValue={row.path}
                                onPathChangeString={(v) => {
                                  const mode = row.inputMode ?? "pick";
                                  setDevMultiRows((prev) => {
                                    const next = [...prev];
                                    next[idx] = { ...next[idx], path: v, ref: "" };
                                    return next;
                                  });
                                  if (mode === "pick") {
                                    setDevRepoPickNonce((n) => n + 1);
                                  }
                                }}
                                pickSelectKey={`edit-dev-${idx}-${devRepoPickNonce}`}
                                scmHost={scmHost}
                                activeRepos={activeRepos}
                                reposLoading={reposLoading}
                                reposHasMore={reposHasMore}
                                onLoadMoreRepos={loadMoreRepos}
                                selectedGithubConnectionId={selectedGithubConnectionId}
                                selectedBitbucketConnectionId={selectedBitbucketConnectionId}
                                showPathError={Boolean(validationErrors.developmentRepoUrl)}
                                idSuffix={`edit-${idx}`}
                              />
                              <DevelopmentRepoBranchCombobox
                                repoPath={row.path ?? ""}
                                value={row.ref ?? ""}
                                onChange={(v) => {
                                  setDevMultiRows((prev) => {
                                    const next = [...prev];
                                    next[idx] = { ...next[idx], ref: v };
                                    return next;
                                  });
                                }}
                                branchData={
                                  devBranchDataByPath[normalizeRepoPathForCompare(row.path)] ??
                                  EMPTY_DEV_BRANCH_DATA
                                }
                                branchError={
                                  devBranchRemoteErrors[normalizeRepoPathForCompare(row.path)] || ""
                                }
                                onSearchBranches={(query) =>
                                  searchDevelopmentRepoBranches(row.path ?? "", query)
                                }
                                idSuffix={`edit-${idx}`}
                              />
                              <div className="space-y-1">
                                <Label className="text-xs font-normal text-muted-foreground">
                                  Repo details (optional)
                                </Label>
                                <Textarea
                                  value={row.details || ""}
                                  onChange={(e) => {
                                    setDevMultiRows((prev) => {
                                      const next = [...prev];
                                      next[idx] = {
                                        ...next[idx],
                                        details: e.target.value,
                                      };
                                      return next;
                                    });
                                  }}
                                  placeholder="Layout, stack, folders, APIs…"
                                  rows={2}
                                  className="min-h-[56px] resize-y text-xs"
                                />
                                <p className="text-xs text-muted-foreground">
                                  Optional notes for AI agents.
                                </p>
                              </div>
                            </div>
                            {devMultiRows.length > 1 ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="shrink-0 text-muted-foreground"
                                onClick={() =>
                                  setDevMultiRows((prev) => {
                                    const next = prev.filter((_, i) => i !== idx);
                                    return next.length
                                      ? next
                                      : [
                                          {
                                            ...defaultDevMultiRow(),
                                            inputMode: "pick",
                                          },
                                        ];
                                  })
                                }
                              >
                                Remove
                              </Button>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <>
                      <Select
                        value={devRepoMode}
                        onValueChange={(v) => {
                          setDevRepoMode(v);
                          if (v === "pick" || v === "manual" || v === "auto") {
                            setDevelopmentRepoUrlInput("");
                          }
                          setDevRepoPickNonce((n) => n + 1);
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <span className="flex min-w-0 flex-1 items-center gap-2">
                            {scmHost === "github" ? (
                              <IntegrationBrandImg
                                src={githubMarkSvg}
                                invertOnDark
                                className="size-4"
                              />
                            ) : (
                              <IntegrationBrandImg src={bitbucketMarkSvg} className="size-4" />
                            )}
                            <SelectValue />
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pick">Link an existing repository</SelectItem>
                          <SelectItem value="manual">Enter repository path manually</SelectItem>
                          <SelectItem value="auto">Create new repository</SelectItem>
                        </SelectContent>
                      </Select>
                      {(devRepoMode === "pick" ||
                        devRepoMode === "manual" ||
                        devRepoMode === "auto") && (
                        <DevelopmentRepoPathFields
                          mode={devRepoMode}
                          pathValue={developmentRepoUrlInput}
                          onPathChangeString={(v) => {
                            setDevelopmentRepoUrlInput(v);
                            if (devRepoMode === "pick") {
                              setDevRepoPickNonce((n) => n + 1);
                            }
                          }}
                          pickSelectKey={devRepoPickNonce}
                          scmHost={scmHost}
                          activeRepos={activeRepos}
                          reposLoading={reposLoading}
                          reposHasMore={reposHasMore}
                          onLoadMoreRepos={loadMoreRepos}
                          selectedGithubConnectionId={selectedGithubConnectionId}
                          selectedBitbucketConnectionId={selectedBitbucketConnectionId}
                          showPathError={Boolean(validationErrors.developmentRepoUrl)}
                          idSuffix="create"
                        />
                      )}
                    </>
                  )}
                  {validationErrors.developmentRepoUrl && (
                    <p className="text-sm text-destructive">
                      {validationErrors.developmentRepoUrl}
                    </p>
                  )}
                </RepositorySettingsSection>

                {useEditDevRepositoriesUi ? (
                  <DevelopmentRepositoriesAddCard onAdd={appendDevMultiRow} />
                ) : null}

                {!useEditDevRepositoriesUi && (
                  <Collapsible open={advancedMultiRepoOpen} onOpenChange={setAdvancedMultiRepoOpen}>
                    <CollapsibleTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full justify-between gap-2 border-dashed text-muted-foreground"
                      >
                        <span>Advanced: multiple repositories</span>
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 shrink-0 transition-transform duration-200",
                            advancedMultiRepoOpen && "rotate-180",
                          )}
                        />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-4 pt-3 border-t border-border mt-3">
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Add more than one clone for Cursor agents.{" "}
                        <span className="text-foreground font-medium">
                          Merge, preview tags, and image-save automation use the first
                          &quot;Push&quot; launchpad row only.
                        </span>
                      </p>
                      <div className="space-y-2">
                        <Label className="text-foreground">Launchpad repositories</Label>
                        <div className="space-y-3 rounded-md border border-border bg-muted/15 p-3">
                          {launchpadMultiRows.map((row, idx) => (
                            <div
                              key={`lp-${idx}`}
                              className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end"
                            >
                              <div className="space-y-1">
                                <span className="text-xs text-muted-foreground">Path</span>
                                <Input
                                  value={row.path}
                                  onChange={(e) => {
                                    const next = [...launchpadMultiRows];
                                    next[idx] = {
                                      ...next[idx],
                                      path: e.target.value,
                                    };
                                    setLaunchpadMultiRows(next);
                                  }}
                                  placeholder="github.com/org/repo"
                                  className="font-mono text-xs"
                                />
                              </div>
                              <div className="space-y-1">
                                <span className="text-xs text-muted-foreground">Branch / ref</span>
                                <Input
                                  value={row.ref}
                                  onChange={(e) => {
                                    const next = [...launchpadMultiRows];
                                    next[idx] = {
                                      ...next[idx],
                                      ref: e.target.value,
                                    };
                                    setLaunchpadMultiRows(next);
                                  }}
                                  placeholder="main"
                                />
                              </div>
                              <div className="space-y-1">
                                <span className="text-xs text-muted-foreground">Directory</span>
                                <Input
                                  value={row.directory}
                                  onChange={(e) => {
                                    const next = [...launchpadMultiRows];
                                    next[idx] = {
                                      ...next[idx],
                                      directory: e.target.value,
                                    };
                                    setLaunchpadMultiRows(next);
                                  }}
                                  placeholder="launchpad-1"
                                  className="font-mono text-xs"
                                />
                              </div>
                              <label className="flex items-center gap-2 text-xs text-muted-foreground sm:pb-2">
                                <Checkbox
                                  checked={Boolean(row.push)}
                                  onCheckedChange={(v) => {
                                    const next = [...launchpadMultiRows];
                                    next[idx] = { ...next[idx], push: Boolean(v) };
                                    setLaunchpadMultiRows(next);
                                  }}
                                />
                                Push
                              </label>
                            </div>
                          ))}
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() =>
                                setLaunchpadMultiRows((prev) => [
                                  ...prev,
                                  {
                                    path: "",
                                    ref: "main",
                                    directory: `launchpad-${prev.length + 1}`,
                                    push: false,
                                  },
                                ])
                              }
                            >
                              Add launchpad row
                            </Button>
                            {launchpadMultiRows.length > 1 ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setLaunchpadMultiRows(
                                    (prev) => prev.slice(0, -1) || [defaultLaunchpadMultiRow()],
                                  )
                                }
                              >
                                Remove last
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-foreground">App repositories</Label>
                        <div className="space-y-3 rounded-md border border-border bg-muted/15 p-3">
                          {devMultiRows.map((row, idx) => (
                            <div
                              key={`adv-dev-${idx}`}
                              className="flex flex-col gap-2 rounded-md border border-border/60 bg-background/50 p-3"
                            >
                              <span className="text-xs text-muted-foreground">
                                Repository {idx + 1}
                              </span>
                              <Select
                                value={row.inputMode ?? "pick"}
                                onValueChange={(v) => {
                                  setDevMultiRows((prev) => {
                                    const next = [...prev];
                                    next[idx] = {
                                      ...next[idx],
                                      inputMode: v,
                                      path: "",
                                    };
                                    return next;
                                  });
                                  setDevRepoPickNonce((n) => n + 1);
                                }}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pick">Link an existing repository</SelectItem>
                                  <SelectItem value="manual">
                                    Enter repository path manually
                                  </SelectItem>
                                  <SelectItem value="auto">Create new repository</SelectItem>
                                </SelectContent>
                              </Select>
                              <DevelopmentRepoPathFields
                                mode={row.inputMode ?? "pick"}
                                pathValue={row.path}
                                onPathChangeString={(v) => {
                                  setDevMultiRows((prev) => {
                                    const next = [...prev];
                                    next[idx] = { ...next[idx], path: v };
                                    return next;
                                  });
                                  if ((row.inputMode ?? "pick") === "pick") {
                                    setDevRepoPickNonce((n) => n + 1);
                                  }
                                }}
                                pickSelectKey={`adv-dev-${idx}-${devRepoPickNonce}`}
                                scmHost={scmHost}
                                activeRepos={activeRepos}
                                reposLoading={reposLoading}
                                reposHasMore={reposHasMore}
                                onLoadMoreRepos={loadMoreRepos}
                                selectedGithubConnectionId={selectedGithubConnectionId}
                                selectedBitbucketConnectionId={selectedBitbucketConnectionId}
                                showPathError={Boolean(validationErrors.developmentRepoUrl)}
                                idSuffix={`adv-${idx}`}
                              />
                              <div className="grid gap-2 sm:grid-cols-2 sm:items-end">
                                <div className="space-y-1">
                                  <span className="text-xs text-muted-foreground">
                                    Branch / ref
                                  </span>
                                  <Input
                                    value={row.ref}
                                    onChange={(e) => {
                                      setDevMultiRows((prev) => {
                                        const next = [...prev];
                                        next[idx] = {
                                          ...next[idx],
                                          ref: e.target.value,
                                        };
                                        return next;
                                      });
                                    }}
                                    placeholder="main"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <span className="text-xs text-muted-foreground">Directory</span>
                                  <Input
                                    value={row.directory}
                                    onChange={(e) => {
                                      setDevMultiRows((prev) => {
                                        const next = [...prev];
                                        next[idx] = {
                                          ...next[idx],
                                          directory: e.target.value,
                                        };
                                        return next;
                                      });
                                    }}
                                    placeholder="development-1"
                                    className="font-mono text-xs"
                                  />
                                </div>
                              </div>
                              <div className="space-y-1 sm:col-span-3">
                                <span className="text-xs text-muted-foreground">
                                  Repo details (optional)
                                </span>
                                <Textarea
                                  value={row.details || ""}
                                  onChange={(e) => {
                                    const next = [...devMultiRows];
                                    next[idx] = {
                                      ...next[idx],
                                      details: e.target.value,
                                    };
                                    setDevMultiRows(next);
                                  }}
                                  placeholder="Layout, stack, folders, APIs…"
                                  rows={2}
                                  className="min-h-[56px] resize-y text-xs"
                                />
                              </div>
                            </div>
                          ))}
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() =>
                                setDevMultiRows((prev) => [
                                  ...prev,
                                  {
                                    path: "",
                                    ref: "main",
                                    directory: `development-${prev.length + 1}`,
                                    inputMode: "auto",
                                    details: "",
                                  },
                                ])
                              }
                            >
                              Add development row
                            </Button>
                            {devMultiRows.length > 1 ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setDevMultiRows(
                                    (prev) => prev.slice(0, -1) || [defaultDevMultiRow()],
                                  )
                                }
                              >
                                Remove last
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {showJiraIntegration ? (
        <Card className="border-border shadow-sm overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-foreground flex flex-wrap items-center gap-2">
              <IntegrationBrandImg src={jiraMarkSvg} className="size-5" />
              <span>Jira</span>
              {integrationsLoading ? (
                <Skeleton
                  className="h-5 w-20 rounded-full"
                  role="status"
                  aria-busy="true"
                  aria-label="Loading Jira connection status"
                />
              ) : jiraSettingsConnected ? (
                <Badge variant="secondary">Connected</Badge>
              ) : (
                <Badge variant="outline">Not connected</Badge>
              )}
            </CardTitle>
            {jiraSettingsConnected ? (
              <p className="text-sm text-muted-foreground font-normal pt-1">
                Linked site
                {jiraLinkedSiteHost ? (
                  <>
                    : <span className="font-medium text-foreground">{jiraLinkedSiteHost}</span>
                  </>
                ) : jiraLinkedSiteDisplay ? (
                  <>
                    : <span className="font-medium text-foreground">{jiraLinkedSiteDisplay}</span>
                  </>
                ) : null}
                {String(jiraProjectKey ?? "").trim() ? (
                  <>
                    {" "}
                    · Project{" "}
                    <span className="font-mono font-medium text-foreground">
                      {String(jiraProjectKey).trim()}
                    </span>
                  </>
                ) : null}
              </p>
            ) : null}
            <p className="text-sm text-muted-foreground font-normal pt-1">
              {isEdit ? (
                <>
                  Link the Jira site and project for tickets. Sites are managed on{" "}
                  <Link
                    to={ACCOUNT_CONNECTIONS_PATH}
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    {ACCOUNT_CONNECTIONS_LABEL}
                  </Link>
                  .
                </>
              ) : (
                <>
                  Choose a saved Jira site and project key. Add sites on{" "}
                  <Link
                    to={ACCOUNT_CONNECTIONS_PATH}
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    {ACCOUNT_CONNECTIONS_LABEL}
                  </Link>
                  .
                </>
              )}
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4 transition-colors">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div className="font-medium text-foreground flex min-w-0 items-center gap-2">
                  <IntegrationBrandImg src={jiraMarkSvg} className="size-5 shrink-0" />
                  <span>Jira site</span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full shrink-0 sm:w-auto"
                  disabled={integrationsLoading || oauthBusy}
                  onClick={async () => {
                    setOauthBusy("ji");
                    try {
                      oauthDraftRestoredRef.current = false;
                      onBeforeOAuthRedirect?.();
                      persistCreateGitJiraDraftForOAuth();
                      const opts = oauthReturnTo ? { returnTo: oauthReturnTo } : {};
                      const url = jiraOAuthIsReconnect
                        ? await getJiraOAuthAuthorizeUrl(selectedJiraConnectionId, opts)
                        : await getJiraOAuthAuthorizeUrl(undefined, opts);
                      window.location.href = url;
                    } catch (e) {
                      toast.error(integrationToastFromAxios(e, "Could not start Jira OAuth"));
                      setOauthBusy(null);
                    }
                  }}
                >
                  {oauthBusy === "ji" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <IntegrationBrandImg src={jiraMarkSvg} className="mr-2 size-4" />
                  )}
                  {jiraOAuthButtonLabel}
                </Button>
              </div>
              {integrationsLoading ? (
                <Skeleton
                  className="h-9 w-full"
                  role="status"
                  aria-busy="true"
                  aria-label="Loading Jira sites"
                />
              ) : (
                <Select
                  value={selectedJiraConnectionId || undefined}
                  onValueChange={setSelectedJiraConnectionId}
                  disabled={jiraConnections.length === 0}
                >
                  <SelectTrigger className="w-full">
                    <span className="flex min-w-0 flex-1 items-center gap-2">
                      <IntegrationBrandImg src={jiraMarkSvg} className="size-4" />
                      <SelectValue placeholder="Select Jira site" />
                    </span>
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {jiraConnections.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.baseUrl || `Site #${c.id}`}
                        {c.health?.status === "expired" ? " (expired)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {selectedJiraExpired ? (
                <p className="text-xs text-destructive">
                  {selectedJiraConnection?.health?.message ||
                    "Selected Jira site expired. Reconnect it."}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="jiraProjectPick-shared">Jira project</Label>
              {!jiraOnly ? (
                <p className="text-xs text-muted-foreground">
                  Needed for tickets and backlog. Confluence only needs the Jira site above.
                </p>
              ) : null}
              {jiraProjectsLoading ? (
                <Skeleton
                  className="h-9 w-full"
                  role="status"
                  aria-busy="true"
                  aria-label="Loading Jira projects"
                />
              ) : !selectedJiraConnectionId ? (
                <p className="text-sm text-muted-foreground">
                  Select a Jira site to load projects.
                </p>
              ) : jiraProjects.length > 0 ? (
                <Select
                  value={
                    jiraProjects.some((p) => p.key === jiraProjectKey) ? jiraProjectKey : undefined
                  }
                  onValueChange={(key) => setJiraProjectKey(key)}
                >
                  <SelectTrigger
                    id="jiraProjectPick-shared"
                    className={cn(
                      "w-full",
                      validationErrors.jiraProjectKey ? "border-destructive" : "",
                    )}
                  >
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {jiraProjects.map((p) => (
                      <SelectItem key={p.id} value={p.key}>
                        <IntegrationBrandImg src={jiraMarkSvg} className="size-3.5" />
                        <span>
                          {p.key} — {p.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No Jira projects found for this site.
                </p>
              )}
              {validationErrors.jiraProjectKey ? (
                <p className="mt-1 text-sm text-destructive">{validationErrors.jiraProjectKey}</p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
});

export default ProjectGitJiraOAuthCard;
