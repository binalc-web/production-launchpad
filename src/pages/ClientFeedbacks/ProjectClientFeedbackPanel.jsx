import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  approveProjectClientFeedback,
  deleteProjectClientFeedback,
  fetchProjectClientFeedback,
  fetchProjectClientFeedbackJiraPriorities,
  fetchProjectClientFeedbacks,
  fetchProjectSentryIntegration,
  importProjectSentryIssues,
  fetchReleases,
  getDeployMap,
  startFeedbackAiFixBatch,
} from "@/api";
import { ElementContextChip } from "@/components/ElementContextChip";
import {
  assembleFeedbackDescriptionWithElementContext,
  resolveFeedbackDescriptionDisplay,
} from "@/lib/feedbackElementContextDisplay.util";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  CalendarClock,
  Check,
  CheckCircle2,
  Code2,
  Film,
  FlaskConical,
  Inbox,
  Link,
  Loader2,
  Mail,
  Pencil,
  RefreshCw,
  Rocket,
  Search,
  Tag,
  Trash2,
  Eye,
  ClipboardCheck,
  Sparkles,
  GitBranch,
  GitCommit,
  GitPullRequest,
  Bug,
  ExternalLink,
  XCircle,
} from "lucide-react";
import { Link as RouterLink } from "react-router-dom";
import { formatSentryImportSummary, resolveSentryIssueInfo } from "@/lib/sentryIntegration";
import { buildProjectSettingsPath } from "@/pages/Project/ProjectSettings/constants";
import { toast } from "sonner";
import { logger } from "@/utils/logger";
import { cn, formatProjectVersionLabel } from "@/lib/utils";
import jiraMarkSvg from "@/assets/apps/Jira.svg";
import { JiraLabelsCombobox } from "./JiraLabelsCombobox";
import { QaReportSnapshotPanel } from "@/components/feedback/QaReportSnapshotPanel";
import VisualCompareSnapshotPanel from "@/components/feedback/VisualCompareSnapshotPanel";
import { FeedbackAiFixButton } from "./FeedbackAiFixButton";
import { FeedbackAiFixDrawer } from "./FeedbackAiFixDrawer";
import { useFeedbackAiFix } from "@/hooks/useFeedbackAiFix";
import { buildUiPreferenceScope } from "@/lib/uiPreferences";
import { usePageUiPreferences } from "@/hooks/usePageUiPreferences";
import {
  isAiFixCompleted,
  isAiFixFailed,
  isAiFixRunning,
  formatAiFixBranchBrowseUrl,
  formatAiFixBranchLabel,
  formatAiFixCommitBrowseUrl,
  formatAiFixShortCommit,
  resolveAiFixMergeAction,
  formatFeedbackAiFixFailureMessage,
  isFeedbackAiFixDeployed,
} from "@/lib/feedbackAiFixLabels";

const AI_FIX_STATUS_FILTER_KEYS = ["all", "fixed", "failed"];

/**
 * Visible Failed status after an AI fix attempt (Fixed is shown on the action button).
 * @param {{ status?: string|null, error?: string|null, className?: string }} props
 */
function AiFixOutcomeBadge({ status, error, className }) {
  if (!isAiFixFailed(status)) return null;

  const message = formatFeedbackAiFixFailureMessage(error, status);
  const badge = (
    <Badge
      variant="outline"
      className={cn(
        "shrink-0 gap-1 border-destructive/35 bg-destructive/10 text-xs font-semibold text-destructive",
        message && "cursor-help",
        className,
      )}
    >
      <XCircle className="size-3 shrink-0" aria-hidden />
      Failed
    </Badge>
  );

  if (!message) return badge;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{badge}</TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-sm text-xs leading-relaxed">
        {message}
      </TooltipContent>
    </Tooltip>
  );
}

/** @param {{ item: object, deployEnvironments: object[], className?: string }} props */
function AiFixDeployedBadge({ item, deployEnvironments, className }) {
  if (!isFeedbackAiFixDeployed(item, deployEnvironments)) return null;
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 border-emerald-500/35 bg-emerald-500/10 text-xs font-semibold text-emerald-800 dark:text-emerald-300",
        className,
      )}
    >
      <Rocket className="size-3 shrink-0" aria-hidden />
      Deployed
    </Badge>
  );
}

function AiFixGitBadges({ result, className }) {
  const branch = formatAiFixBranchLabel(result);
  const shortSha = formatAiFixShortCommit(result);
  const branchUrl =
    result?.mergeMode === "fix_only" || result?.mergeAction === "fix_only"
      ? formatAiFixBranchBrowseUrl(result)
      : null;
  const mergedCommitUrl =
    result?.mergeMode === "merged_to_target" ? formatAiFixCommitBrowseUrl(result) : null;
  const prUrl = typeof result?.prUrl === "string" && result.prUrl ? result.prUrl : null;
  if (!branch && !shortSha && !prUrl) return null;
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {prUrl ? (
        <a href={prUrl} target="_blank" rel="noopener noreferrer" title={prUrl}>
          <Badge
            variant="outline"
            className="gap-1 text-[11px] font-medium text-primary hover:bg-primary/8"
          >
            <GitPullRequest className="size-3 shrink-0" aria-hidden />
            {result?.prNumber ? `PR #${result.prNumber}` : "Pull request"}
          </Badge>
        </a>
      ) : null}
      {branch ? (
        branchUrl ? (
          <a
            href={branchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex max-w-[min(100%,220px)]"
            title={branch}
          >
            <Badge
              variant="outline"
              className="max-w-full gap-1 font-mono text-[11px] font-normal text-primary hover:bg-primary/8"
            >
              <GitBranch className="size-3 shrink-0" aria-hidden />
              <span className="truncate">{branch}</span>
            </Badge>
          </a>
        ) : (
          <Badge
            variant="outline"
            className="max-w-[min(100%,220px)] gap-1 font-mono text-[11px] font-normal text-muted-foreground"
            title={branch}
          >
            <GitBranch className="size-3 shrink-0" aria-hidden />
            <span className="truncate">{branch}</span>
          </Badge>
        )
      ) : null}
      {shortSha ? (
        mergedCommitUrl ? (
          <a
            href={mergedCommitUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={result?.commitHash || shortSha}
          >
            <Badge
              variant="outline"
              className="gap-1 font-mono text-[11px] font-normal tabular-nums text-primary hover:bg-primary/8"
            >
              <GitCommit className="size-3 shrink-0" aria-hidden />
              {shortSha}
            </Badge>
          </a>
        ) : (
          <Badge
            variant="outline"
            className="gap-1 font-mono text-[11px] font-normal tabular-nums text-muted-foreground"
            title={result?.commitHash || shortSha}
          >
            <GitCommit className="size-3 shrink-0" aria-hidden />
            {shortSha}
          </Badge>
        )
      ) : null}
    </div>
  );
}

const FEEDBACK_LIST_PAGE_SIZE = 20;
/** Backend clamps list pageSize to 100. */
const FEEDBACK_LIST_MAX_PAGE_SIZE = 100;
/** Poll cadence while any listed item has an in-flight AI fix (SSE only covers one item). */
const FEEDBACK_ACTIVE_FIX_POLL_MS = 5000;

function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatRelativeTime(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const diff = Date.now() - d.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 45) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return d.toLocaleDateString();
}

function IssueTypeBadge({ type }) {
  const t = String(type || "Issue").trim();
  if (t === "Bug") {
    return (
      <Badge
        variant="outline"
        className="border-destructive/35 bg-destructive/10 font-semibold uppercase tracking-wider text-destructive"
      >
        {t}
      </Badge>
    );
  }
  if (t === "Story") {
    return (
      <Badge
        variant="outline"
        className="border-primary/40 bg-primary/10 font-semibold uppercase tracking-wider text-primary"
      >
        Improvements
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="font-medium">
      {t}
    </Badge>
  );
}

const FEEDBACK_SOURCE_CONFIG = {
  CLIENT_LINK: { label: "Client Link", Icon: Link },
  CODE_SNIPPET: { label: "Code Snippet", Icon: Code2 },
  QA_REPORT: { label: "QA Report Issues", Icon: ClipboardCheck },
  SENTRY: { label: "Sentry Issues", Icon: Bug },
  VISUAL_TEST: { label: "Visual test issues", Icon: Eye },
};

const FEEDBACK_SOURCE_TAB_KEYS = [
  "CLIENT_LINK",
  "CODE_SNIPPET",
  "QA_REPORT",
  "VISUAL_TEST",
  "SENTRY",
];

const FEEDBACK_PANEL_UI_SCHEMA = {
  filterReleaseId: { defaultValue: "all", type: "string" },
  filterFeedbackSource: { defaultValue: "CLIENT_LINK", allowed: FEEDBACK_SOURCE_TAB_KEYS },
  filterAiFixStatus: { defaultValue: "all", allowed: AI_FIX_STATUS_FILTER_KEYS },
  descriptionQuery: { defaultValue: "", type: "string" },
  // Auto deploy defaults every Fix with AI to "fix, merge, and deploy" on the chosen environment.
  autoDeployEnabled: { defaultValue: false, type: "boolean" },
  autoDeployEnvironmentId: { defaultValue: "", type: "string" },
};

function normalizeFeedbackSource(source) {
  const key = String(source || "CLIENT_LINK")
    .trim()
    .toUpperCase();
  return FEEDBACK_SOURCE_CONFIG[key] ? key : "CLIENT_LINK";
}

function FeedbackSourceBadge({ source }) {
  const key = normalizeFeedbackSource(source);
  const cfg = FEEDBACK_SOURCE_CONFIG[key] || FEEDBACK_SOURCE_CONFIG.CLIENT_LINK;
  const { label, Icon } = cfg;
  return (
    <Badge variant="outline" className="gap-1 text-xs font-medium text-muted-foreground">
      <Icon className="size-3 shrink-0" aria-hidden />
      {label}
    </Badge>
  );
}

function SentryIssueBadge({ item }) {
  const info = resolveSentryIssueInfo(item);
  if (!info?.shortId && !info?.permalink) return null;
  const label = info.shortId || "Sentry issue";
  const badge = (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 font-mono text-[11px] font-normal",
        info.permalink ? "text-primary hover:bg-primary/8" : "text-muted-foreground",
      )}
    >
      <Bug className="size-3 shrink-0" aria-hidden />
      {label}
      {info.level ? <span className="font-sans text-muted-foreground">· {info.level}</span> : null}
    </Badge>
  );
  if (!info.permalink) return badge;
  return (
    <a href={info.permalink} target="_blank" rel="noopener noreferrer" title="Open in Sentry">
      {badge}
    </a>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3" role="status" aria-busy="true" aria-label="Loading feedback">
      {[1, 2, 3].map((k) => (
        <div key={k} className="rounded-2xl border border-border/80 bg-card/40 p-4 shadow-sm">
          <div className="flex gap-3">
            <Skeleton className="h-6 w-16 shrink-0 rounded-full" />
            <Skeleton className="h-4 flex-1 rounded-md" />
          </div>
          <Skeleton className="mt-3 h-3 w-full rounded-md" />
          <Skeleton className="mt-2 h-3 w-[85%] rounded-md" />
          <div className="mt-4 flex gap-2">
            <Skeleton className="h-9 w-28 rounded-lg" />
            <Skeleton className="h-9 w-24 rounded-lg" />
            <Skeleton className="h-9 w-28 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Project-scoped client feedback list, filters, and detail dialogs.
 * @param {object} props
 * @param {string|number} props.projectId
 * @param {boolean} [props.embedded]
 * @param {string} [props.projectName]
 * @param {object|null} [props.projectSummary] — Jira/overview metadata for header
 * @param {() => void} [props.onQueueChange] — called after approve/delete
 * @param {boolean} [props.waitingForProject] — parent overview still loading (standalone)
 * @param {number} [props.reloadSignal] — increment to force list reload (standalone refresh)
 */
export function ProjectClientFeedbackPanel({
  projectId,
  embedded = false,
  projectName,
  projectSummary = null,
  onQueueChange,
  waitingForProject = false,
  reloadSignal = 0,
}) {
  const resolvedProjectId = projectId ? String(projectId) : "";
  const feedbackScope = buildUiPreferenceScope({ projectId: resolvedProjectId || null });
  const [prefs, setPref] = usePageUiPreferences(feedbackScope, FEEDBACK_PANEL_UI_SCHEMA, {
    debouncedKeys: ["descriptionQuery"],
  });
  const filterReleaseId = prefs.filterReleaseId;
  const filterFeedbackSource = prefs.filterFeedbackSource;
  const filterAiFixStatus = prefs.filterAiFixStatus;
  const descriptionQuery = prefs.descriptionQuery;
  const setFilterReleaseId = useCallback((value) => setPref("filterReleaseId", value), [setPref]);
  const setFilterFeedbackSource = useCallback(
    (value) => setPref("filterFeedbackSource", value),
    [setPref],
  );
  const setFilterAiFixStatus = useCallback(
    (value) => setPref("filterAiFixStatus", value),
    [setPref],
  );
  const setDescriptionQuery = useCallback((value) => setPref("descriptionQuery", value), [setPref]);

  const [items, setItems] = useState([]);
  const [sentryLinked, setSentryLinked] = useState(null);

  useEffect(() => {
    if (!resolvedProjectId) return undefined;
    let cancelled = false;
    fetchProjectSentryIntegration(resolvedProjectId)
      .then((data) => {
        if (!cancelled) setSentryLinked(Boolean(data?.linked));
      })
      .catch(() => {
        if (!cancelled) setSentryLinked(null);
      });
    return () => {
      cancelled = true;
    };
  }, [resolvedProjectId]);
  const [itemsTotal, setItemsTotal] = useState(0);
  const [listPage, setListPage] = useState(1);
  const [loadedItemsProjectId, setLoadedItemsProjectId] = useState("");
  const [loadingItems, setLoadingItems] = useState(() => Boolean(resolvedProjectId));
  const [loadingMore, setLoadingMore] = useState(false);
  const listScrollRef = useRef(null);
  const loadMoreSentinelRef = useRef(null);
  const loadingMoreRef = useRef(false);
  const [selectedFeedbackId, setSelectedFeedbackId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [releases, setReleases] = useState([]);
  const [releasesLoading, setReleasesLoading] = useState(false);
  const [jiraPriorities, setJiraPriorities] = useState([]);
  const [jiraPrioritiesLoading, setJiraPrioritiesLoading] = useState(false);
  const [jiraPrioritiesMessage, setJiraPrioritiesMessage] = useState("");
  const [approvePriority, setApprovePriority] = useState("");
  const [approveLabels, setApproveLabels] = useState([]);
  const [descriptionEditMode, setDescriptionEditMode] = useState(false);
  const [fixStartBusy, setFixStartBusy] = useState(false);
  const [aiFixDrawerOpen, setAiFixDrawerOpen] = useState(false);
  const [aiFixDrawerItem, setAiFixDrawerItem] = useState(null);
  const [aiFixDrawerBulkItems, setAiFixDrawerBulkItems] = useState([]);
  const [aiFixDrawerMode, setAiFixDrawerMode] = useState("view");
  const [selectedSnippetIds, setSelectedSnippetIds] = useState(() => new Set());
  const [deployEnvironments, setDeployEnvironments] = useState([]);
  const [deployEnvsLoading, setDeployEnvsLoading] = useState(false);

  const [editedDescription, setEditedDescription] = useState("");

  const displayProject = projectSummary ?? (projectName ? { projectName } : null);

  const listPageRef = useRef(1);
  listPageRef.current = listPage;
  const listRequestSeqRef = useRef(0);

  const loadProjectItems = useCallback(
    async (pid, { page = 1, append = false, silent = false } = {}) => {
      if (!pid) {
        setItems([]);
        setItemsTotal(0);
        setListPage(1);
        setLoadedItemsProjectId("");
        setLoadingItems(false);
        setLoadingMore(false);
        loadingMoreRef.current = false;
        return;
      }
      if (silent && !append) {
        // Background refresh: keep rows on screen and re-read every loaded page in one request.
        const seq = ++listRequestSeqRef.current;
        try {
          const loadedPages = Math.max(listPageRef.current, 1);
          const data = await fetchProjectClientFeedbacks(pid, {
            page: 1,
            pageSize: Math.min(loadedPages * FEEDBACK_LIST_PAGE_SIZE, FEEDBACK_LIST_MAX_PAGE_SIZE),
          });
          if (seq !== listRequestSeqRef.current) return;
          const freshItems = Array.isArray(data?.items) ? data.items : [];
          const freshIds = new Set(freshItems.map((it) => it.id));
          setItemsTotal(Number(data?.total) || 0);
          setItems((prev) => [
            ...freshItems,
            ...prev.slice(freshItems.length).filter((it) => !freshIds.has(it.id)),
          ]);
          setLoadedItemsProjectId(String(pid));
        } catch (err) {
          logger.error("reported_issues_list_refresh", err);
        }
        return;
      }
      if (!append) listRequestSeqRef.current += 1;
      if (append) {
        if (loadingMoreRef.current) return;
        loadingMoreRef.current = true;
        setLoadingMore(true);
      } else {
        setLoadingItems(true);
      }
      try {
        const data = await fetchProjectClientFeedbacks(pid, {
          page,
          pageSize: FEEDBACK_LIST_PAGE_SIZE,
        });
        const newItems = Array.isArray(data?.items) ? data.items : [];
        const total = Number(data?.total) || 0;
        setItemsTotal(total);
        setListPage(page);
        setItems((prev) => (append ? [...prev, ...newItems] : newItems));
      } catch (err) {
        logger.error("reported_issues_list", err);
        toast.error(err?.error || "Failed to load project issues");
        if (!append) {
          setItems([]);
          setItemsTotal(0);
          setListPage(1);
        }
      } finally {
        if (append) {
          loadingMoreRef.current = false;
          setLoadingMore(false);
        } else {
          setLoadingItems(false);
          setLoadedItemsProjectId(String(pid));
        }
      }
    },
    [],
  );

  useEffect(() => {
    void loadProjectItems(resolvedProjectId);
  }, [resolvedProjectId, loadProjectItems]);

  useEffect(() => {
    if (reloadSignal > 0 && resolvedProjectId) {
      void loadProjectItems(resolvedProjectId, { silent: true });
    }
  }, [reloadSignal, resolvedProjectId, loadProjectItems]);

  useEffect(() => {
    if (!resolvedProjectId) {
      setReleases([]);
      setReleasesLoading(false);
      return;
    }
    let cancelled = false;
    setReleasesLoading(true);
    void (async () => {
      try {
        const data = await fetchReleases(resolvedProjectId);
        if (!cancelled) setReleases(Array.isArray(data) ? data : []);
      } catch (err) {
        logger.error("client_feedbacks_releases", err);
        if (!cancelled) setReleases([]);
      } finally {
        if (!cancelled) setReleasesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [resolvedProjectId]);

  useEffect(() => {
    if (!selectedFeedbackId || !resolvedProjectId) {
      setJiraPriorities([]);
      setJiraPrioritiesMessage("");
      setJiraPrioritiesLoading(false);
      return;
    }
    let cancelled = false;
    setJiraPriorities([]);
    setJiraPrioritiesLoading(true);
    setJiraPrioritiesMessage("");
    void (async () => {
      try {
        const data = await fetchProjectClientFeedbackJiraPriorities(resolvedProjectId);
        if (cancelled) return;
        const list = Array.isArray(data?.priorities) ? data.priorities : [];
        setJiraPriorities(list);
        setJiraPrioritiesMessage(
          list.length === 0 ? data?.message || "Set priority on Jira project first." : "",
        );
      } catch (err) {
        logger.error("client_feedbacks_jira_priorities", err);
        if (cancelled) return;
        setJiraPriorities([]);
        setJiraPrioritiesMessage(err?.error || "Could not load Jira priorities for this project.");
      } finally {
        if (!cancelled) setJiraPrioritiesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedFeedbackId, resolvedProjectId]);

  useEffect(() => {
    setApprovePriority("");
    setApproveLabels([]);
    setDescriptionEditMode(false);
    setEditedDescription("");
  }, [selectedFeedbackId]);

  useEffect(() => {
    if (detail?.description !== undefined && detail?.description !== null) {
      const display = resolveFeedbackDescriptionDisplay(
        String(detail.description),
        detail.pickedElementContext,
      );
      setEditedDescription(display.userText);
    }
  }, [detail?.id, detail?.description, detail?.pickedElementContext]);

  useEffect(() => {
    if (!resolvedProjectId) {
      setDeployEnvironments([]);
      setDeployEnvsLoading(false);
      return undefined;
    }
    let cancelled = false;
    setDeployEnvsLoading(true);
    void getDeployMap(resolvedProjectId)
      .then((data) => {
        if (cancelled) return;
        setDeployEnvironments(Array.isArray(data?.environments) ? data.environments : []);
      })
      .catch((err) => {
        logger.error("client_feedbacks_deploy_environments", err);
        if (!cancelled) setDeployEnvironments([]);
      })
      .finally(() => {
        if (!cancelled) setDeployEnvsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [resolvedProjectId]);

  // Fall back to the first deploy-map environment when the stored one was removed.
  const autoDeployEnvironmentId = deployEnvironments.some(
    (env) => env.id === prefs.autoDeployEnvironmentId,
  )
    ? prefs.autoDeployEnvironmentId
    : (deployEnvironments[0]?.id ?? "");
  const autoDeployEnabled = Boolean(prefs.autoDeployEnabled);
  const autoDeployActive = autoDeployEnabled && Boolean(autoDeployEnvironmentId);
  const setAutoDeployEnabled = useCallback(
    (value) => setPref("autoDeployEnabled", Boolean(value)),
    [setPref],
  );
  const setAutoDeployEnvironmentId = useCallback(
    (value) => setPref("autoDeployEnvironmentId", value),
    [setPref],
  );

  useEffect(() => {
    if (!resolvedProjectId || !selectedFeedbackId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setDetailLoading(true);
      try {
        const data = await fetchProjectClientFeedback(resolvedProjectId, selectedFeedbackId);
        if (!cancelled) setDetail(data);
      } catch (err) {
        if (!cancelled) {
          logger.error("reported_issues_detail", err);
          toast.error(err?.error || "Failed to load feedback details");
          setSelectedFeedbackId(null);
        }
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [resolvedProjectId, selectedFeedbackId]);

  const releaseVersionLookup = useMemo(() => {
    const releaseIdToName = new Map();
    const projectVersionIdToLabel = new Map();
    for (const rel of releases) {
      const rid = rel?.id != null ? Number(rel.id) : NaN;
      if (Number.isInteger(rid) && rid > 0) {
        releaseIdToName.set(
          rid,
          typeof rel?.name === "string" && rel.name.trim() ? rel.name.trim() : `Release ${rid}`,
        );
      }
      for (const v of Array.isArray(rel?.versions) ? rel.versions : []) {
        const vid = v?.id != null ? Number(v.id) : NaN;
        if (!Number.isInteger(vid) || vid < 1) continue;
        const label = formatProjectVersionLabel(v?.version);
        if (label) projectVersionIdToLabel.set(vid, label);
      }
    }
    return { releaseIdToName, projectVersionIdToLabel };
  }, [releases]);

  const releaseFilterOptions = useMemo(() => {
    const byId = new Map(releaseVersionLookup.releaseIdToName);
    const clientLinkItems = items.filter(
      (it) => normalizeFeedbackSource(it.feedbackSource) === "CLIENT_LINK",
    );
    for (const it of clientLinkItems) {
      const rid = it?.releaseId != null ? Number(it.releaseId) : NaN;
      if (Number.isInteger(rid) && rid > 0 && !byId.has(rid)) {
        byId.set(rid, `Release #${rid}`);
      }
    }
    return [...byId.entries()].sort((a, b) => a[0] - b[0]).map(([id, name]) => ({ id, name }));
  }, [releaseVersionLookup, items]);

  const hasUnassignedRelease = useMemo(
    () =>
      items.some(
        (it) =>
          normalizeFeedbackSource(it.feedbackSource) === "CLIENT_LINK" && it.releaseId == null,
      ),
    [items],
  );

  const isClientLinkTab = filterFeedbackSource === "CLIENT_LINK";
  const isSnippetTab = filterFeedbackSource === "CODE_SNIPPET";

  useEffect(() => {
    if (!isClientLinkTab) {
      setFilterReleaseId("all");
    }
  }, [isClientLinkTab]);

  useEffect(() => {
    setSelectedSnippetIds(new Set());
  }, [filterFeedbackSource, resolvedProjectId]);

  const sourceCounts = useMemo(() => {
    const counts = Object.fromEntries(FEEDBACK_SOURCE_TAB_KEYS.map((key) => [key, 0]));
    for (const it of items) {
      const key = normalizeFeedbackSource(it.feedbackSource);
      counts[key] += 1;
    }
    return counts;
  }, [items]);

  const filtersActive =
    (isClientLinkTab && filterReleaseId !== "all") ||
    filterAiFixStatus !== "all" ||
    descriptionQuery.trim().length > 0;

  const filteredItems = useMemo(() => {
    let list = items.filter(
      (it) => normalizeFeedbackSource(it.feedbackSource) === filterFeedbackSource,
    );
    if (isClientLinkTab) {
      if (filterReleaseId === "unassigned") {
        list = list.filter((it) => it.releaseId == null);
      } else if (filterReleaseId !== "all") {
        const rid = Number(filterReleaseId);
        if (Number.isInteger(rid) && rid > 0) {
          list = list.filter((it) => Number(it.releaseId) === rid);
        }
      }
    }
    if (filterAiFixStatus === "fixed") {
      list = list.filter((it) => isAiFixCompleted(it.aiFixStatus));
    } else if (filterAiFixStatus === "failed") {
      list = list.filter((it) => isAiFixFailed(it.aiFixStatus));
    }
    const q = descriptionQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((it) => {
        const desc = String(it.description || "").toLowerCase();
        const email = String(it.reporterEmail || "").toLowerCase();
        return desc.includes(q) || email.includes(q);
      });
    }
    return list;
  }, [
    items,
    filterReleaseId,
    descriptionQuery,
    filterFeedbackSource,
    filterAiFixStatus,
    isClientLinkTab,
  ]);

  const selectedSnippetItems = useMemo(
    () => filteredItems.filter((item) => selectedSnippetIds.has(String(item.id))),
    [filteredItems, selectedSnippetIds],
  );

  const selectableSnippetItems = useMemo(
    () => filteredItems.filter((item) => !isAiFixRunning(item.aiFixStatus)),
    [filteredItems],
  );

  const allSelectableSnippetsSelected =
    isSnippetTab &&
    selectableSnippetItems.length > 0 &&
    selectableSnippetItems.every((item) => selectedSnippetIds.has(String(item.id)));

  const toggleSnippetSelection = useCallback((feedbackId) => {
    const id = String(feedbackId || "").trim();
    if (!id) return;
    setSelectedSnippetIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAllSnippetItems = useCallback(() => {
    setSelectedSnippetIds(new Set(selectableSnippetItems.map((item) => String(item.id))));
  }, [selectableSnippetItems]);

  const clearSnippetSelection = useCallback(() => {
    setSelectedSnippetIds(new Set());
  }, []);

  const waitingForSelectedProjectItems =
    Boolean(resolvedProjectId) && loadedItemsProjectId !== String(resolvedProjectId);
  const showIssuesListLoader = waitingForProject || loadingItems || waitingForSelectedProjectItems;
  const hasMoreItems = items.length < itemsTotal;

  useEffect(() => {
    const root = listScrollRef.current;
    const sentinel = loadMoreSentinelRef.current;
    if (!root || !sentinel || !hasMoreItems || loadingItems || loadingMore || !resolvedProjectId) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        void loadProjectItems(resolvedProjectId, { page: listPage + 1, append: true });
      },
      { root, rootMargin: "160px", threshold: 0 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMoreItems, listPage, loadProjectItems, loadingItems, loadingMore, resolvedProjectId]);

  const handleApprove = useCallback(
    async (feedbackId, { priority = "", labels = [], description = undefined } = {}) => {
      if (!resolvedProjectId || !feedbackId) return;
      setActionLoadingId(String(feedbackId));
      try {
        const payload = {
          ...(priority ? { priority } : {}),
          ...(Array.isArray(labels) && labels.length ? { labels } : {}),
        };
        if (typeof description === "string") {
          const t = description.trim();
          if (!t) {
            toast.error("Description cannot be empty");
            setActionLoadingId("");
            return;
          }
          payload.description = t;
        }
        const res = await approveProjectClientFeedback(resolvedProjectId, feedbackId, payload);
        toast.success(
          res?.jiraTicket
            ? `Created Jira ticket ${res.jiraTicket}`
            : "Feedback approved successfully",
        );
        setSelectedFeedbackId((prev) => (prev === feedbackId ? null : prev));
        await loadProjectItems(resolvedProjectId, { silent: true });
        onQueueChange?.();
      } catch (err) {
        logger.error("reported_issues_approve", err);
        toast.error(err?.error || "Failed to approve feedback");
      } finally {
        setActionLoadingId("");
      }
    },
    [loadProjectItems, onQueueChange, resolvedProjectId],
  );

  const aiFix = useFeedbackAiFix(resolvedProjectId, {
    onTerminal: () => {
      if (resolvedProjectId) void loadProjectItems(resolvedProjectId, { silent: true });
    },
  });

  const resolveItemAiFix = useCallback(
    (item) => {
      const tracked = aiFix.feedbackId === item.id;
      const pendingThisItem = fixStartBusy && aiFixDrawerItem?.id === item.id;
      const hookStatus = tracked ? aiFix.status : null;
      const itemStatus = item.aiFixStatus;
      let status = itemStatus;
      if (pendingThisItem) {
        status = "QUEUED";
      } else if (hookStatus) {
        const hookRunning = isAiFixRunning(hookStatus);
        const itemRunning = isAiFixRunning(itemStatus);
        if (tracked && hookRunning) {
          // Retry/new run for this item — live hook status beats stale terminal row data.
          status = hookStatus;
        } else if (
          hookRunning &&
          !itemRunning &&
          !fixStartBusy &&
          itemStatus &&
          isAiFixCompleted(itemStatus)
        ) {
          // Ignore stale running hook left over after a completed item was already loaded.
          status = itemStatus;
        } else {
          status = hookStatus;
        }
      }
      return {
        status,
        result: tracked && aiFix.result != null ? aiFix.result : item.aiFixResult,
        error: tracked && aiFix.error != null ? aiFix.error : (item.aiFixError ?? null),
        streamLog: tracked ? aiFix.streamLog : [],
        isRunning: pendingThisItem || isAiFixRunning(status),
      };
    },
    [
      aiFix.feedbackId,
      aiFix.status,
      aiFix.result,
      aiFix.error,
      aiFix.streamLog,
      aiFix.isRunning,
      fixStartBusy,
      aiFixDrawerItem?.id,
    ],
  );

  const openAiFixDrawer = useCallback(
    (item, { mode = "view" } = {}) => {
      aiFix.watchFeedback(item.id);
      setAiFixDrawerItem(item);
      setAiFixDrawerBulkItems([]);
      setAiFixDrawerMode(mode);
      setAiFixDrawerOpen(true);
    },
    [aiFix],
  );

  const openBulkAiFixDrawer = useCallback((bulkItems, { mode = "confirm" } = {}) => {
    if (!Array.isArray(bulkItems) || bulkItems.length < 2) return;
    setAiFixDrawerItem(null);
    setAiFixDrawerBulkItems(bulkItems);
    setAiFixDrawerMode(mode);
    setAiFixDrawerOpen(true);
  }, []);

  const runFixForItem = useCallback(
    async (item, body = {}) => {
      if (!resolvedProjectId || !item?.id) return;
      setFixStartBusy(true);
      setAiFixDrawerMode("view");
      const optimisticRunningPatch = {
        aiFixStatus: "QUEUED",
        aiFixError: null,
      };
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, ...optimisticRunningPatch } : i)),
      );
      setAiFixDrawerItem((prev) =>
        prev?.id === item.id ? { ...prev, ...optimisticRunningPatch } : prev,
      );
      setDetail((prev) => (prev?.id === item.id ? { ...prev, ...optimisticRunningPatch } : prev));
      try {
        const snap = await aiFix.startFor(item.id, body);
        const startedStatus = snap?.aiFixStatus ?? "QUEUED";
        const startedPatch = {
          aiFixStatus: startedStatus,
          aiFixError: snap?.aiFixError ?? null,
          ...(snap?.aiFixResult != null ? { aiFixResult: snap.aiFixResult } : {}),
        };
        setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, ...startedPatch } : i)));
        setAiFixDrawerItem((prev) => (prev?.id === item.id ? { ...prev, ...startedPatch } : prev));
        setDetail((prev) => (prev?.id === item.id ? { ...prev, ...startedPatch } : prev));
        const nextDescription = String(body.issueDescription || "").trim();
        const prevDescription = String(item.description || "").trim();
        const aiFixOptionsPatch = {
          ...(body.mergeAction ? { mergeAction: body.mergeAction } : {}),
          ...(body.deployEnvironmentId ? { deployEnvironmentId: body.deployEnvironmentId } : {}),
        };
        const metadataPatch =
          Object.keys(aiFixOptionsPatch).length > 0
            ? {
                ...(item.metadata && typeof item.metadata === "object" ? item.metadata : {}),
                aiFixOptions: {
                  ...(item.metadata?.aiFixOptions && typeof item.metadata.aiFixOptions === "object"
                    ? item.metadata.aiFixOptions
                    : {}),
                  ...aiFixOptionsPatch,
                },
              }
            : null;
        if (nextDescription && nextDescription !== prevDescription) {
          setItems((prev) =>
            prev.map((i) =>
              i.id === item.id
                ? {
                    ...i,
                    description: nextDescription,
                    ...(metadataPatch ? { metadata: metadataPatch } : {}),
                  }
                : i,
            ),
          );
          setAiFixDrawerItem((prev) =>
            prev?.id === item.id
              ? {
                  ...prev,
                  description: nextDescription,
                  ...(metadataPatch ? { metadata: metadataPatch } : {}),
                }
              : prev,
          );
          setDetail((prev) =>
            prev?.id === item.id ? { ...prev, description: nextDescription } : prev,
          );
        } else if (metadataPatch) {
          setItems((prev) =>
            prev.map((i) => (i.id === item.id ? { ...i, metadata: metadataPatch } : i)),
          );
          setAiFixDrawerItem((prev) =>
            prev?.id === item.id ? { ...prev, metadata: metadataPatch } : prev,
          );
        }
      } catch (err) {
        logger.error("feedback_ai_fix_start", err);
        toast.error(err?.error || err?.message || "Failed to start AI fix");
      } finally {
        setFixStartBusy(false);
      }
    },
    [aiFix, resolvedProjectId],
  );

  const [importingSentryIssues, setImportingSentryIssues] = useState(false);
  const handleImportSentryIssues = useCallback(async () => {
    if (!resolvedProjectId) return;
    setImportingSentryIssues(true);
    try {
      const result = await importProjectSentryIssues(resolvedProjectId);
      toast.success(formatSentryImportSummary(result));
      await loadProjectItems(resolvedProjectId, { silent: true });
    } catch (err) {
      toast.error(err?.error || err?.message || "Could not import Sentry issues");
    } finally {
      setImportingSentryIssues(false);
    }
  }, [resolvedProjectId, loadProjectItems]);

  const handleFixWithAi = useCallback(
    (item) => {
      openAiFixDrawer(item, { mode: "confirm" });
    },
    [openAiFixDrawer],
  );

  const handleBulkConfirmStart = useCallback(
    async (body) => {
      if (!resolvedProjectId || selectedSnippetItems.length < 2) return;
      setFixStartBusy(true);
      try {
        await startFeedbackAiFixBatch(resolvedProjectId, {
          feedbackIds: selectedSnippetItems.map((item) => item.id),
          repoPath: body.repoPath,
          sourceBranch: body.sourceBranch,
          targetBranch: body.targetBranch,
          ...(body.mergeAction ? { mergeAction: body.mergeAction } : {}),
          ...(body.deployEnvironmentId ? { deployEnvironmentId: body.deployEnvironmentId } : {}),
        });
        toast.success(`Started AI fix for ${selectedSnippetItems.length} issues`);
        clearSnippetSelection();
        setAiFixDrawerOpen(false);
        setAiFixDrawerBulkItems([]);
        await loadProjectItems(resolvedProjectId, { silent: true });
      } catch (err) {
        logger.error("feedback_ai_fix_batch_start", err);
        toast.error(err?.error || err?.message || "Failed to start bulk AI fix");
      } finally {
        setFixStartBusy(false);
      }
    },
    [clearSnippetSelection, loadProjectItems, resolvedProjectId, selectedSnippetItems],
  );

  const handleDrawerConfirmStart = useCallback(
    (body) => {
      if (aiFixDrawerBulkItems.length >= 2) {
        void handleBulkConfirmStart(body);
        return;
      }
      if (!aiFixDrawerItem) return;
      void runFixForItem(aiFixDrawerItem, body);
    },
    [aiFixDrawerBulkItems.length, aiFixDrawerItem, handleBulkConfirmStart, runFixForItem],
  );

  const handleBulkFixWithAi = useCallback(() => {
    if (selectedSnippetItems.length < 2) return;
    openBulkAiFixDrawer(selectedSnippetItems, { mode: "confirm" });
  }, [openBulkAiFixDrawer, selectedSnippetItems]);

  useEffect(() => {
    // Prefer the actively tracked run so auto-watch does not steal focus mid-retry.
    if (aiFix.feedbackId && isAiFixRunning(aiFix.status)) return;
    // Never switch the tracked item out from under an open single-item drawer.
    if (aiFixDrawerOpen && aiFixDrawerItem) return;
    const running = items.find((i) => isAiFixRunning(i.aiFixStatus));
    if (running && running.id !== aiFix.feedbackId) aiFix.watchFeedback(running.id);
  }, [
    items,
    aiFix.feedbackId,
    aiFix.status,
    aiFix.watchFeedback,
    aiFixDrawerOpen,
    aiFixDrawerItem,
  ]);

  const hasActiveFix = aiFix.isRunning || items.some((i) => isAiFixRunning(i.aiFixStatus));
  const aiFixRef = useRef(aiFix);
  aiFixRef.current = aiFix;

  useEffect(() => {
    if (!resolvedProjectId || !hasActiveFix) return undefined;
    const timer = setInterval(() => {
      if (document.visibilityState === "hidden") return;
      void loadProjectItems(resolvedProjectId, { silent: true });
      // SSE can drop without a terminal event; re-read the tracked item so it cannot freeze.
      const { feedbackId, refresh } = aiFixRef.current;
      if (feedbackId) void refresh(feedbackId);
    }, FEEDBACK_ACTIVE_FIX_POLL_MS);
    return () => clearInterval(timer);
  }, [resolvedProjectId, hasActiveFix, loadProjectItems]);

  useEffect(() => {
    if (!aiFix.feedbackId || !aiFix.status) return;
    const patchFromHook = (row) => {
      if (!row || row.id !== aiFix.feedbackId) return row;
      const itemTerminal = !isAiFixRunning(row.aiFixStatus);
      const hookRunning = isAiFixRunning(aiFix.status);
      // Stale COMPLETED row + leftover running hook from another session — keep completed.
      if (hookRunning && itemTerminal && row.aiFixStatus && isAiFixCompleted(row.aiFixStatus)) {
        return row;
      }
      return {
        ...row,
        aiFixStatus: aiFix.status,
        aiFixResult: aiFix.result ?? row.aiFixResult,
        aiFixError: hookRunning ? null : (aiFix.error ?? row.aiFixError),
      };
    };
    setItems((prev) => prev.map((item) => patchFromHook(item)));
    setAiFixDrawerItem((prev) => patchFromHook(prev));
    setDetail((prev) => patchFromHook(prev));
  }, [aiFix.feedbackId, aiFix.status, aiFix.result, aiFix.error]);

  const handleDelete = useCallback(
    async (feedbackId) => {
      if (!resolvedProjectId || !feedbackId) return;
      setActionLoadingId(String(feedbackId));
      try {
        await deleteProjectClientFeedback(resolvedProjectId, feedbackId);
        toast.success("Report removed from queue");
        setSelectedFeedbackId((prev) => (prev === feedbackId ? null : prev));
        setPendingDeleteId(null);
        await loadProjectItems(resolvedProjectId, { silent: true });
        onQueueChange?.();
      } catch (err) {
        logger.error("reported_issues_delete", err);
        toast.error(err?.error || "Failed to delete feedback");
      } finally {
        setActionLoadingId("");
      }
    },
    [loadProjectItems, onQueueChange, resolvedProjectId],
  );

  const openDeleteConfirm = useCallback((id) => {
    setPendingDeleteId(String(id));
  }, []);

  const handleRefreshList = useCallback(async () => {
    if (!resolvedProjectId || loadingItems) return;
    await loadProjectItems(resolvedProjectId);
    if (aiFix.feedbackId) void aiFix.refresh(aiFix.feedbackId);
    onQueueChange?.();
  }, [
    aiFix.feedbackId,
    aiFix.refresh,
    loadProjectItems,
    loadingItems,
    onQueueChange,
    resolvedProjectId,
  ]);

  const feedbackStatsSidebar =
    embedded && items.length > 0 ? (
      <aside className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-4 xl:sticky xl:top-4 xl:self-start">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          By source
        </p>
        <div className="space-y-2">
          {FEEDBACK_SOURCE_TAB_KEYS.map((key) => {
            const { label } = FEEDBACK_SOURCE_CONFIG[key];
            return (
              <div key={key} className="flex items-center justify-between gap-2 text-xs">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-semibold tabular-nums">{sourceCounts[key] ?? 0}</span>
              </div>
            );
          })}
        </div>
        <div className="border-t border-border/60 pt-2 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Showing</span>
            <span className="font-semibold tabular-nums">{filteredItems.length}</span>
          </div>
          <div className="mt-1 flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Total loaded</span>
            <span className="font-semibold tabular-nums">{items.length}</span>
          </div>
        </div>
      </aside>
    ) : null;

  const filterIdPrefix = embedded ? "embedded" : "standalone";

  return (
    <>
      <section
        className={cn(
          "flex min-h-0 min-w-0 flex-1 flex-col gap-5",
          embedded ? "w-full" : "lg:flex-1",
        )}
      >
        <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div
            className={cn(
              "flex min-w-0 flex-wrap items-center gap-2",
              embedded ? "justify-start" : "justify-center",
            )}
          >
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              {displayProject?.projectName ?? projectName ?? "Issues"}
            </h2>
            {displayProject ? (
              <div className="flex items-center gap-2 rounded-lg bg-muted px-4 py-2 text-sm font-medium text-foreground">
                <img
                  src={jiraMarkSvg}
                  alt=""
                  className="size-5 shrink-0 dark:opacity-90"
                  aria-hidden
                />
                <span className="min-w-0 truncate">
                  {displayProject.jiraProjectKey ? (
                    <>
                      <span className="font-semibold tabular-nums">
                        {String(displayProject.jiraProjectKey)}
                      </span>
                      {displayProject.jiraProjectDisplayName || displayProject.projectName ? (
                        <>
                          <span className="mx-1.5 font-normal text-muted-foreground">—</span>
                          <span className="font-normal">
                            {displayProject.jiraProjectDisplayName || displayProject.projectName}
                          </span>
                        </>
                      ) : null}
                    </>
                  ) : displayProject.jiraConnectionId ? (
                    <span className="font-normal text-foreground">
                      {displayProject.jiraConnectionLabel ? (
                        <>
                          <span>{displayProject.jiraConnectionLabel}</span>
                          {displayProject.jiraSiteHost ? (
                            <>
                              <span className="text-muted-foreground"> · </span>
                              <span className="font-normal text-muted-foreground">
                                {displayProject.jiraSiteHost}
                              </span>
                            </>
                          ) : null}
                        </>
                      ) : displayProject.jiraSiteHost ? (
                        <span>{displayProject.jiraSiteHost}</span>
                      ) : (
                        <span className="text-muted-foreground">
                          Jira connected — select a project key in settings
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="font-normal text-muted-foreground">
                      Jira not linked for this workspace
                    </span>
                  )}
                </span>
              </div>
            ) : null}
          </div>
          {resolvedProjectId ? (
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-0 sm:flex-row sm:items-center sm:justify-end">
              <div className="flex shrink-0 flex-wrap items-center gap-2 rounded-lg border border-border/70 bg-muted/15 px-2.5 py-1.5">
                <Rocket className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                {!deployEnvsLoading && deployEnvironments.length === 0 ? (
                  <Tooltip delayDuration={200}>
                    <TooltipTrigger asChild>
                      <span className="inline-flex cursor-not-allowed items-center gap-2">
                        <Label
                          htmlFor={`${filterIdPrefix}-client-feedback-auto-deploy`}
                          className="text-sm font-medium whitespace-nowrap"
                        >
                          Auto deploy
                        </Label>
                        <Switch
                          id={`${filterIdPrefix}-client-feedback-auto-deploy`}
                          checked={autoDeployEnabled}
                          onCheckedChange={setAutoDeployEnabled}
                          disabled
                          aria-label="Auto deploy after AI fixes"
                        />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-[16rem] text-xs">
                      Add an environment on the Environment tab to enable auto deploy.
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <>
                    <Label
                      htmlFor={`${filterIdPrefix}-client-feedback-auto-deploy`}
                      className="text-sm font-medium whitespace-nowrap"
                    >
                      Auto deploy
                    </Label>
                    <Switch
                      id={`${filterIdPrefix}-client-feedback-auto-deploy`}
                      checked={autoDeployEnabled}
                      onCheckedChange={setAutoDeployEnabled}
                      disabled={deployEnvsLoading}
                      aria-label="Auto deploy after AI fixes"
                    />
                  </>
                )}
                {deployEnvsLoading ? (
                  <Skeleton
                    className="h-8 w-full rounded-lg sm:w-[min(100%,180px)]"
                    role="status"
                    aria-busy="true"
                    aria-label="Loading deploy environments"
                  />
                ) : autoDeployEnabled && deployEnvironments.length > 0 ? (
                  <>
                    <Label
                      htmlFor={`${filterIdPrefix}-client-feedback-auto-deploy-env`}
                      className="sr-only"
                    >
                      Auto deploy environment
                    </Label>
                    <Select
                      value={autoDeployEnvironmentId}
                      onValueChange={setAutoDeployEnvironmentId}
                    >
                      <SelectTrigger
                        id={`${filterIdPrefix}-client-feedback-auto-deploy-env`}
                        className="h-8 w-full rounded-lg sm:w-[min(100%,180px)]"
                      >
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
                  </>
                ) : null}
              </div>
              <div className="w-full sm:w-[min(100%,160px)]">
                <Label
                  htmlFor={`${filterIdPrefix}-client-feedback-ai-fix-status-filter`}
                  className="sr-only"
                >
                  Filter by AI fix status
                </Label>
                <Select
                  value={filterAiFixStatus}
                  onValueChange={setFilterAiFixStatus}
                  disabled={loadingItems}
                >
                  <SelectTrigger
                    id={`${filterIdPrefix}-client-feedback-ai-fix-status-filter`}
                    className="h-9 w-full rounded-lg"
                  >
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="fixed">Fixed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0 self-start sm:self-auto"
                onClick={() => void handleRefreshList()}
                disabled={loadingItems}
                aria-label="Refresh feedback list"
                title="Refresh feedback list"
              >
                <RefreshCw className={cn("size-4", loadingItems && "animate-spin")} aria-hidden />
              </Button>
              <div className="relative w-full sm:w-[min(100%,260px)]">
                <Search
                  className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Label
                  htmlFor={`${filterIdPrefix}-client-feedback-desc-search`}
                  className="sr-only"
                >
                  Search issue description or reporter
                </Label>
                <Input
                  id={`${filterIdPrefix}-client-feedback-desc-search`}
                  type="search"
                  autoComplete="off"
                  placeholder="Search description or email…"
                  value={descriptionQuery}
                  onChange={(e) => setDescriptionQuery(e.target.value)}
                  className="h-9 pl-9"
                  disabled={loadingItems}
                />
              </div>
              {filtersActive ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 shrink-0 self-start sm:self-auto"
                  onClick={() => {
                    setFilterReleaseId("all");
                    setFilterAiFixStatus("all");
                    setDescriptionQuery("");
                  }}
                >
                  Clear filters
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>

        {resolvedProjectId ? (
          <Tabs
            value={filterFeedbackSource}
            onValueChange={setFilterFeedbackSource}
            className="w-full shrink-0 gap-0"
          >
            <TabsList
              variant="segmented-sub"
              className="w-full gap-1.5 grid grid-cols-2 md:grid-cols-5"
              aria-label="Filter by feedback source"
            >
              {FEEDBACK_SOURCE_TAB_KEYS.map((key) => {
                const { label, Icon } = FEEDBACK_SOURCE_CONFIG[key];
                const count = sourceCounts[key] ?? 0;
                return (
                  <TabsTrigger key={key} value={key} className="flex-1 justify-center gap-1.5">
                    <Icon className="size-3.5 shrink-0" aria-hidden />
                    <span>{label}</span>
                    <Badge
                      variant={filterFeedbackSource === key ? "default" : "secondary"}
                      className="h-5 min-w-5 px-1.5 text-[10px] tabular-nums"
                    >
                      {count}
                    </Badge>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        ) : null}

        {filterFeedbackSource === "SENTRY" && sentryLinked ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 bg-muted/15 px-3 py-2">
            <p className="text-xs text-muted-foreground">
              New Sentry issues arrive automatically. Import to pull in existing unresolved ones.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => void handleImportSentryIssues()}
              disabled={importingSentryIssues || loadingItems}
            >
              {importingSentryIssues ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <Bug className="size-3.5" aria-hidden />
              )}
              Import from Sentry
            </Button>
          </div>
        ) : null}

        {isSnippetTab && filteredItems.length > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 bg-muted/15 px-3 py-2">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8"
                onClick={() =>
                  allSelectableSnippetsSelected ? clearSnippetSelection() : selectAllSnippetItems()
                }
                disabled={selectableSnippetItems.length === 0 || loadingItems}
              >
                {allSelectableSnippetsSelected ? "Clear all" : "Select all"}
              </Button>
              {selectedSnippetIds.size > 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8"
                  onClick={clearSnippetSelection}
                >
                  Clear ({selectedSnippetIds.size})
                </Button>
              ) : null}
            </div>
            {selectedSnippetIds.size >= 2 ? (
              <Button
                type="button"
                size="sm"
                className="h-8 gap-1.5"
                disabled={fixStartBusy}
                onClick={handleBulkFixWithAi}
              >
                {fixStartBusy ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                ) : (
                  <Sparkles className="size-3.5" aria-hidden />
                )}
                Fix with AI ({selectedSnippetIds.size})
              </Button>
            ) : null}
          </div>
        ) : null}

        <div
          className={cn(
            "min-h-0 flex-1",
            embedded
              ? "grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(280px,20rem)] xl:items-start"
              : "flex flex-col overflow-hidden",
          )}
        >
          <div
            className={cn(
              "flex min-h-0 flex-col overflow-hidden",
              embedded && "min-h-[280px] max-h-[calc(100vh-11rem)]",
              !embedded && "flex-1",
            )}
          >
            {isClientLinkTab ? (
              <div className="mb-4 flex shrink-0 justify-end">
                <div className="w-full sm:w-[min(100%,220px)]">
                  <Label
                    htmlFor={`${filterIdPrefix}-client-feedback-release-filter`}
                    className="sr-only"
                  >
                    Filter by release
                  </Label>
                  <Select
                    value={filterReleaseId}
                    onValueChange={setFilterReleaseId}
                    disabled={loadingItems}
                  >
                    <SelectTrigger
                      id={`${filterIdPrefix}-client-feedback-release-filter`}
                      className="h-9 w-full rounded-lg"
                    >
                      <SelectValue placeholder="All releases" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All releases</SelectItem>
                      {hasUnassignedRelease ? (
                        <SelectItem value="unassigned">No release linked</SelectItem>
                      ) : null}
                      {releaseFilterOptions.map(({ id, name }) => (
                        <SelectItem key={id} value={String(id)}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : null}
            <div
              ref={listScrollRef}
              className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain pb-6"
            >
              {showIssuesListLoader ? (
                <ListSkeleton />
              ) : filterFeedbackSource === "SENTRY" &&
                sentryLinked === false &&
                filteredItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/80 bg-muted/15 px-6 py-16 text-center">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Bug className="size-6" aria-hidden />
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">Sentry is not linked</p>
                    <p className="max-w-sm text-sm text-muted-foreground">
                      Link a Sentry project to this LaunchPad project. Its unresolved issues will
                      show up here, ready for Fix with AI.
                    </p>
                  </div>
                  <Button type="button" variant="outline" size="sm" asChild>
                    <RouterLink to={buildProjectSettingsPath(resolvedProjectId, "integrations")}>
                      Link Sentry project
                    </RouterLink>
                  </Button>
                </div>
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/80 bg-muted/15 px-6 py-16 text-center">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Inbox className="size-6" aria-hidden />
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">All caught up</p>
                    <p className="max-w-sm text-sm text-muted-foreground">
                      No pending issues for this project. New feedback from the client link will
                      land here.
                    </p>
                  </div>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/80 bg-muted/15 px-6 py-14 text-center">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                    <Search className="size-6" aria-hidden />
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">No matching issues</p>
                    <p className="max-w-sm text-sm text-muted-foreground">
                      {filtersActive
                        ? `No ${FEEDBACK_SOURCE_CONFIG[filterFeedbackSource]?.label?.toLowerCase() ?? "matching"} issues match your filters. ${sourceCounts[filterFeedbackSource] ?? 0} in this source, ${items.length} total loaded.`
                        : `No ${FEEDBACK_SOURCE_CONFIG[filterFeedbackSource]?.label?.toLowerCase() ?? ""} feedback yet.`}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFilterReleaseId("all");
                      setFilterAiFixStatus("all");
                      setDescriptionQuery("");
                    }}
                  >
                    Reset filters
                  </Button>
                </div>
              ) : (
                <ul className="space-y-3">
                  {filteredItems.map((item) => {
                    const busy = actionLoadingId === String(item.id);
                    const open = selectedFeedbackId === item.id;
                    const aiFixState = resolveItemAiFix(item);
                    const snippetSelected = selectedSnippetIds.has(String(item.id));
                    const snippetSelectionDisabled = aiFixState.isRunning;
                    const descDisplay = resolveFeedbackDescriptionDisplay(
                      String(item.description || ""),
                      item.pickedElementContext,
                    );
                    const desc = descDisplay.userText;
                    const preview = desc.length > 220 ? `${desc.slice(0, 220)}…` : desc;
                    return (
                      <li key={item.id}>
                        <article
                          className={cn(
                            "group rounded-2xl border bg-card/60 p-4 shadow-sm transition-all duration-200",
                            open
                              ? "border-primary/40 ring-1 ring-primary/15"
                              : snippetSelected
                                ? "border-primary/35 ring-1 ring-primary/10"
                                : "border-border/80 hover:border-primary/25 hover:shadow-md",
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 flex-1 items-start gap-3">
                              {isSnippetTab ? (
                                <Checkbox
                                  className="mt-0.5"
                                  checked={snippetSelected}
                                  disabled={snippetSelectionDisabled || busy}
                                  onCheckedChange={() => toggleSnippetSelection(item.id)}
                                  aria-label={`Select issue from ${item.reporterEmail || "reporter"}`}
                                />
                              ) : null}
                              <div className="min-w-0 flex-1 overflow-x-auto [-ms-overflow-style:none] scrollbar-thin">
                                <div className="flex w-max max-w-full flex-nowrap items-center gap-2 pr-1">
                                  <IssueTypeBadge type={item.jiraIssueType} />
                                  <FeedbackSourceBadge source={item.feedbackSource} />
                                  <SentryIssueBadge item={item} />
                                  <Badge
                                    variant="outline"
                                    className="max-w-[min(100%,240px)] gap-1 text-xs font-medium text-muted-foreground"
                                    title={item.reporterEmail}
                                  >
                                    <Mail className="size-3 shrink-0" aria-hidden />
                                    <span className="truncate">{item.reporterEmail}</span>
                                  </Badge>
                                  {item.releaseId != null && (
                                    <Badge
                                      variant="outline"
                                      className="max-w-[min(100%,200px)] gap-1 text-xs font-normal text-muted-foreground"
                                      title={
                                        releaseVersionLookup.releaseIdToName.get(
                                          Number(item.releaseId),
                                        )
                                          ? undefined
                                          : `Release #${item.releaseId}`
                                      }
                                    >
                                      <Tag className="size-3 shrink-0" aria-hidden />
                                      {(() => {
                                        const rid = Number(item.releaseId);
                                        const nm = releaseVersionLookup.releaseIdToName.get(rid);
                                        if (nm) {
                                          return <span className="truncate">{nm}</span>;
                                        }
                                        if (releasesLoading) {
                                          return (
                                            <Skeleton
                                              className="h-3 w-14 rounded-sm"
                                              role="status"
                                              aria-busy="true"
                                              aria-label="Loading release name"
                                            />
                                          );
                                        }
                                        return (
                                          <span
                                            className="truncate tabular-nums"
                                            title={`Release #${rid}`}
                                          >
                                            Release #{rid}
                                          </span>
                                        );
                                      })()}
                                    </Badge>
                                  )}
                                  {item.projectVersionId != null && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs font-medium tabular-nums text-muted-foreground"
                                      title={
                                        releaseVersionLookup.projectVersionIdToLabel.get(
                                          Number(item.projectVersionId),
                                        )
                                          ? undefined
                                          : `Version #${item.projectVersionId}`
                                      }
                                    >
                                      {(() => {
                                        const vid = Number(item.projectVersionId);
                                        const lbl =
                                          releaseVersionLookup.projectVersionIdToLabel.get(vid);
                                        if (lbl) return lbl;
                                        if (releasesLoading) {
                                          return (
                                            <Skeleton
                                              className="h-3 w-14 rounded-sm"
                                              role="status"
                                              aria-busy="true"
                                              aria-label="Loading revision label"
                                            />
                                          );
                                        }
                                        return "Unknown revision";
                                      })()}
                                    </Badge>
                                  )}
                                  {item.recordingSessionId ? (
                                    <Badge
                                      variant="outline"
                                      className="gap-1 text-xs font-medium text-muted-foreground"
                                    >
                                      <Film className="size-3 shrink-0" aria-hidden />
                                      Screen recording
                                    </Badge>
                                  ) : null}
                                  <AiFixOutcomeBadge
                                    status={aiFixState.status}
                                    error={aiFixState.error}
                                  />
                                  <AiFixDeployedBadge
                                    item={item}
                                    deployEnvironments={deployEnvironments}
                                  />
                                  <AiFixGitBadges result={item.aiFixResult} />
                                </div>
                              </div>
                            </div>
                            <time
                              className="shrink-0 text-xs text-muted-foreground"
                              dateTime={item.createdAt}
                              title={formatDateTime(item.createdAt)}
                            >
                              {formatRelativeTime(item.createdAt) || formatDateTime(item.createdAt)}
                            </time>
                          </div>

                          <div className="mt-3 space-y-2">
                            {descDisplay.hasElementContext ? (
                              <ElementContextChip
                                tag={descDisplay.tag}
                                inspectorCtx={descDisplay.inspectorCtx}
                                contextBlock={descDisplay.contextBlock}
                              />
                            ) : null}
                            {preview ? (
                              <p className="whitespace-pre-wrap wrap-break-word text-sm leading-relaxed text-muted-foreground">
                                {preview}
                              </p>
                            ) : null}
                          </div>

                          <Separator className="my-4 bg-border/60" />

                          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5 [-ms-overflow-style:none] scrollbar-thin">
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              className="shrink-0 gap-1.5 rounded-lg"
                              onClick={() => setSelectedFeedbackId(item.id)}
                              disabled={busy}
                            >
                              <Eye className="size-3.5" aria-hidden />
                              View &amp; Edit
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="shrink-0 gap-1.5 rounded-lg border-destructive/40 text-destructive hover:bg-destructive/10"
                              onClick={() => openDeleteConfirm(item.id)}
                              disabled={busy}
                            >
                              <Trash2 className="size-3.5" aria-hidden />
                              InActive
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              className="shrink-0 gap-1.5 rounded-lg"
                              onClick={() =>
                                void handleApprove(item.id, {
                                  priority: "",
                                  labels: [],
                                })
                              }
                              disabled={busy}
                            >
                              {busy ? (
                                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                              ) : (
                                <CheckCircle2 className="size-3.5" aria-hidden />
                              )}
                              Create Ticket
                            </Button>
                            <FeedbackAiFixButton
                              status={aiFixState.status}
                              busy={fixStartBusy && aiFixDrawerItem?.id === item.id}
                              disabled={busy}
                              onStart={() => handleFixWithAi(item)}
                              onOpenDetails={() => openAiFixDrawer(item)}
                            />
                          </div>
                        </article>
                      </li>
                    );
                  })}
                  {loadingMore ? (
                    <li
                      className="space-y-2"
                      role="status"
                      aria-busy="true"
                      aria-label="Loading more issues"
                    >
                      <Skeleton className="h-24 w-full rounded-2xl" />
                      <Skeleton className="h-24 w-full rounded-2xl" />
                    </li>
                  ) : null}
                  <div ref={loadMoreSentinelRef} className="h-px w-full shrink-0" aria-hidden />
                </ul>
              )}
            </div>
          </div>
          {feedbackStatsSidebar}
        </div>
      </section>

      <Dialog
        open={Boolean(selectedFeedbackId)}
        onOpenChange={(open) => {
          if (!open) setSelectedFeedbackId(null);
        }}
      >
        <DialogContent className="max-h-[min(92vh,880px)] max-w-3xl gap-0 overflow-hidden border-border/80 p-0 sm:max-w-3xl">
          <div className="max-h-[min(92vh,880px)] overflow-y-auto">
            <DialogHeader className="border-b border-border/70 bg-muted/15 px-6 py-2 text-left">
              <DialogTitle className="text-left text-xl font-semibold tracking-tight">
                Feedback Detail
              </DialogTitle>
              <DialogDescription className="text-left text-xs leading-relaxed">
                Edit the description if needed, set priority and labels, then create a Jira ticket
                or inactive the feedback from the queue.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 px-6 py-5">
              {detailLoading || !detail ? (
                <div
                  className="space-y-4 py-4"
                  role="status"
                  aria-busy="true"
                  aria-label="Loading feedback detail"
                >
                  <Skeleton className="h-4 w-[75%] rounded-md" />
                  <Skeleton className="h-4 w-[50%] rounded-md" />
                  <Skeleton className="h-40 w-full rounded-xl" />
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <IssueTypeBadge type={detail.jiraIssueType} />
                    <FeedbackSourceBadge source={detail.feedbackSource} />
                    <SentryIssueBadge item={detail} />
                    <AiFixOutcomeBadge
                      status={resolveItemAiFix(detail).status}
                      error={resolveItemAiFix(detail).error}
                    />
                    <AiFixDeployedBadge item={detail} deployEnvironments={deployEnvironments} />
                    {detail.recordingSessionId ? (
                      <Badge variant="outline" className="gap-1 text-xs">
                        <Film className="size-3" aria-hidden />
                        Screen recording
                      </Badge>
                    ) : null}
                  </div>

                  <dl className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-border/60 bg-muted/10 px-3 py-2.5">
                      <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Reporter
                      </dt>
                      <dd className="mt-1 truncate text-sm font-medium">{detail.reporterEmail}</dd>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-muted/10 px-3 py-2.5">
                      <dt className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        <CalendarClock className="size-3" aria-hidden />
                        Reported
                      </dt>
                      <dd className="mt-1 text-sm font-medium tabular-nums">
                        {formatDateTime(detail.createdAt)}
                      </dd>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-muted/10 px-3 py-2.5">
                      <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Release
                      </dt>
                      <dd
                        className="mt-1 wrap-break-word text-sm font-medium"
                        title={
                          detail.releaseId != null ? `Release #${detail.releaseId}` : undefined
                        }
                      >
                        {detail.releaseId == null
                          ? "—"
                          : (() => {
                              const rid = Number(detail.releaseId);
                              const nm = releaseVersionLookup.releaseIdToName.get(rid);
                              if (nm) return nm;
                              if (releasesLoading) {
                                return (
                                  <Skeleton
                                    className="h-4 w-24 rounded-sm"
                                    role="status"
                                    aria-busy="true"
                                    aria-label="Loading release name"
                                  />
                                );
                              }
                              return (
                                <span className="tabular-nums text-muted-foreground">
                                  Release #{rid}
                                </span>
                              );
                            })()}
                      </dd>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-muted/10 px-3 py-2.5">
                      <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Revision
                      </dt>
                      <dd
                        className="mt-1 text-sm font-medium tabular-nums"
                        title={
                          detail.projectVersionId != null
                            ? `Version #${detail.projectVersionId}`
                            : undefined
                        }
                      >
                        {detail.projectVersionId == null
                          ? "—"
                          : (() => {
                              const vid = Number(detail.projectVersionId);
                              const lbl = releaseVersionLookup.projectVersionIdToLabel.get(vid);
                              if (lbl) return lbl;
                              if (releasesLoading) {
                                return (
                                  <Skeleton
                                    className="h-4 w-24 rounded-sm"
                                    role="status"
                                    aria-busy="true"
                                    aria-label="Loading revision label"
                                  />
                                );
                              }
                              return (
                                <span className="text-muted-foreground">Unknown revision</span>
                              );
                            })()}
                      </dd>
                    </div>
                  </dl>

                  {detail.aiFixResult ? (
                    <div className="rounded-xl border border-border/60 bg-muted/10 px-3 py-2.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        AI fix result
                      </p>
                      <div className="mt-2">
                        <AiFixGitBadges result={detail.aiFixResult} />
                      </div>
                      {detail.aiFixResult?.prUrl ? (
                        <a
                          href={detail.aiFixResult.prUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-block text-xs text-primary underline-offset-2 hover:underline"
                        >
                          View pull request
                        </a>
                      ) : detail.aiFixResult?.mergeMode === "merged_to_target" &&
                        formatAiFixCommitBrowseUrl(detail.aiFixResult) ? (
                        <a
                          href={formatAiFixCommitBrowseUrl(detail.aiFixResult)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-block text-xs text-primary underline-offset-2 hover:underline"
                        >
                          View merged changes
                        </a>
                      ) : null}
                    </div>
                  ) : null}

                  {normalizeFeedbackSource(detail.feedbackSource) === "QA_REPORT" &&
                  detail.metadata?.qaReportSnapshot ? (
                    <QaReportSnapshotPanel snapshot={detail.metadata.qaReportSnapshot} />
                  ) : null}

                  {normalizeFeedbackSource(detail.feedbackSource) === "VISUAL_TEST" &&
                  detail.metadata?.visualCompareSnapshot ? (
                    <VisualCompareSnapshotPanel snapshot={detail.metadata.visualCompareSnapshot} />
                  ) : null}

                  {resolveSentryIssueInfo(detail)?.permalink ? (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/80 bg-muted/20 px-3 py-2 text-sm">
                      <span className="text-muted-foreground">
                        Reported by Sentry
                        {detail.metadata?.culprit ? ` in ${detail.metadata.culprit}` : ""}
                      </span>
                      <Button type="button" variant="outline" size="sm" asChild>
                        <a
                          href={resolveSentryIssueInfo(detail).permalink}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="size-3.5" aria-hidden />
                          Open in Sentry
                        </a>
                      </Button>
                    </div>
                  ) : null}

                  {typeof detail.metadata?.jiraIssueKey === "string" &&
                  detail.metadata.jiraIssueKey.trim() ? (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/80 bg-muted/20 px-3 py-2 text-sm">
                      <span className="text-muted-foreground">
                        Linked Jira issue{" "}
                        <span className="font-medium text-foreground">
                          {detail.metadata.jiraIssueKey.trim()}
                        </span>
                      </span>
                      {typeof detail.metadata?.jiraUrl === "string" &&
                      detail.metadata.jiraUrl.trim() ? (
                        <Button type="button" variant="outline" size="sm" asChild>
                          <a
                            href={detail.metadata.jiraUrl.trim()}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="size-3.5" aria-hidden />
                            Open in Jira
                          </a>
                        </Button>
                      ) : null}
                    </div>
                  ) : null}

                  {Array.isArray(detail.metadata?.consoleLogs) &&
                  detail.metadata.consoleLogs.length ? (
                    <details className="rounded-xl border border-border/60 bg-muted/10 px-3 py-2.5">
                      <summary className="cursor-pointer text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Console logs at report time ({detail.metadata.consoleLogs.length}
                        {detail.metadata.consoleLogs.some((e) => e?.level === "error")
                          ? `, ${detail.metadata.consoleLogs.filter((e) => e?.level === "error").length} errors`
                          : ""}
                        )
                      </summary>
                      <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed">
                        {detail.metadata.consoleLogs.map((entry, i) => (
                          <span
                            key={i}
                            className={
                              entry?.level === "error"
                                ? "block text-destructive"
                                : entry?.level === "warn"
                                  ? "block text-amber-600 dark:text-amber-400"
                                  : "block text-muted-foreground"
                            }
                          >
                            {`${String(entry?.level || "log").toUpperCase()} ${entry?.message || ""}`}
                          </span>
                        ))}
                      </pre>
                    </details>
                  ) : null}

                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <Label
                        htmlFor={`${filterIdPrefix}-client-feedback-detail-description`}
                        className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                      >
                        Description
                      </Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5 rounded-lg border-border/50 text-muted-foreground hover:text-foreground"
                        onClick={() => setDescriptionEditMode((prev) => !prev)}
                        aria-label={
                          descriptionEditMode ? "Done editing description" : "Edit description"
                        }
                      >
                        {descriptionEditMode ? (
                          <>
                            <Check className="size-4" aria-hidden /> Done editing
                          </>
                        ) : (
                          <>
                            <Pencil className="size-4" aria-hidden /> Edit description
                          </>
                        )}
                      </Button>
                    </div>
                    {descriptionEditMode ? (
                      <div className="mt-2 space-y-2">
                        {(() => {
                          const display = resolveFeedbackDescriptionDisplay(
                            String(detail.description || ""),
                            detail.pickedElementContext,
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
                          id={`${filterIdPrefix}-client-feedback-detail-description`}
                          value={editedDescription}
                          onChange={(e) => setEditedDescription(e.target.value)}
                          rows={6}
                          className="min-h-[140px] resize-y text-sm"
                        />
                      </div>
                    ) : (
                      <div className="mt-2 space-y-2 rounded-xl border border-border/50 bg-muted/5 p-3">
                        {(() => {
                          const display = resolveFeedbackDescriptionDisplay(
                            String(detail.description || ""),
                            detail.pickedElementContext,
                          );
                          return (
                            <>
                              {display.hasElementContext ? (
                                <ElementContextChip
                                  tag={display.tag}
                                  inspectorCtx={display.inspectorCtx}
                                  contextBlock={display.contextBlock}
                                />
                              ) : null}
                              {editedDescription ? (
                                <p className="whitespace-pre-wrap wrap-break-word text-sm leading-relaxed text-foreground/90">
                                  {editedDescription}
                                </p>
                              ) : null}
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor={`${filterIdPrefix}-detail-approve-priority`}
                      className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      Priority (optional)
                    </Label>
                    <Select
                      value={approvePriority || "__none__"}
                      onValueChange={(value) =>
                        setApprovePriority(value === "__none__" ? "" : value)
                      }
                      disabled={jiraPrioritiesLoading}
                    >
                      <SelectTrigger
                        id={`${filterIdPrefix}-detail-approve-priority`}
                        className="w-full rounded-lg"
                      >
                        <SelectValue
                          placeholder={jiraPrioritiesLoading ? undefined : "No priority selected"}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">No priority</SelectItem>
                        {jiraPriorities.map((p) => (
                          <SelectItem key={String(p.id || p.name)} value={String(p.name)}>
                            {String(p.name)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {jiraPrioritiesMessage ? (
                      <p className="text-xs text-muted-foreground">{jiraPrioritiesMessage}</p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor={`${filterIdPrefix}-detail-approve-labels`}
                      className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      Labels (optional)
                    </Label>
                    <JiraLabelsCombobox
                      id={`${filterIdPrefix}-detail-approve-labels`}
                      projectId={resolvedProjectId}
                      value={approveLabels}
                      onChange={setApproveLabels}
                      disabled={Boolean(actionLoadingId)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Lowercase letters, numbers, dot, underscore, hyphen. Up to 10 labels.
                    </p>
                  </div>

                  {detail.recordingSessionId && detail.recordingPreviewUrl ? (
                    <div>
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Screen recording
                      </Label>
                      <div className="mt-2 overflow-hidden rounded-2xl border border-border/70 bg-muted/20 p-2 shadow-inner">
                        <video
                          controls
                          preload="metadata"
                          src={detail.recordingPreviewUrl}
                          className="mx-auto max-h-[min(52vh,480px)] w-full object-contain"
                        >
                          Your browser does not support video playback.
                        </video>
                      </div>
                    </div>
                  ) : detail.imagePreviewUrl ? (
                    <div>
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {detail.recordingSessionId ? "Screenshot (fallback)" : "Screenshot"}
                      </Label>
                      {detail.recordingSessionId ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Recording preview is not ready yet, showing screenshot.
                        </p>
                      ) : null}
                      <div className="mt-2 overflow-hidden rounded-2xl border border-border/70 bg-muted/20 p-2 shadow-inner">
                        <img
                          src={detail.imagePreviewUrl}
                          alt="Screenshot attached to this report"
                          className="mx-auto max-h-[min(52vh,480px)] w-full object-contain"
                        />
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </div>

            {!detailLoading && detail ? (
              <DialogFooter className="border-t border-border/70 bg-muted/10 px-6 py-4">
                <Button type="button" variant="outline" onClick={() => setSelectedFeedbackId(null)}>
                  Close
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="border-destructive/45 text-destructive hover:bg-destructive/10"
                  onClick={() => openDeleteConfirm(detail.id)}
                  disabled={actionLoadingId === String(detail.id)}
                >
                  <Trash2 className="mr-2 size-4" aria-hidden />
                  InActive
                </Button>
                <Button
                  type="button"
                  variant="default"
                  disabled={actionLoadingId === String(detail.id)}
                  onClick={() =>
                    void handleApprove(detail.id, {
                      priority: approvePriority,
                      labels: approveLabels,
                      description: assembleFeedbackDescriptionWithElementContext(
                        editedDescription,
                        detail.pickedElementContext,
                        detail.description,
                      ),
                    })
                  }
                  className="gap-2"
                >
                  {actionLoadingId === String(detail.id) ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <CheckCircle2 className="size-4" aria-hidden />
                  )}
                  Create Ticket
                </Button>
                {(() => {
                  const aiFixState = resolveItemAiFix(detail);
                  return (
                    <FeedbackAiFixButton
                      size="default"
                      status={aiFixState.status}
                      busy={fixStartBusy && aiFixDrawerItem?.id === detail.id}
                      disabled={actionLoadingId === String(detail.id)}
                      onStart={() => handleFixWithAi(detail)}
                      onOpenDetails={() => openAiFixDrawer(detail)}
                    />
                  );
                })()}
              </DialogFooter>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(pendingDeleteId)}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteId(null);
        }}
      >
        <DialogContent className="border-border/80 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Mark this report inactive?</DialogTitle>
            <DialogDescription>
              It will be hidden from the review queue. Data is kept for audit; the screenshot stays
              in storage.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setPendingDeleteId(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!pendingDeleteId || actionLoadingId === pendingDeleteId}
              onClick={() => pendingDeleteId && handleDelete(pendingDeleteId)}
            >
              {actionLoadingId === pendingDeleteId ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                "Confirm inactive"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FeedbackAiFixDrawer
        open={aiFixDrawerOpen}
        onOpenChange={(open) => {
          setAiFixDrawerOpen(open);
          if (!open) {
            setAiFixDrawerMode("view");
            setAiFixDrawerBulkItems([]);
          }
        }}
        mode={aiFixDrawerMode}
        projectId={resolvedProjectId}
        feedbackSource={
          aiFixDrawerBulkItems.length >= 2
            ? "CODE_SNIPPET"
            : aiFixDrawerItem
              ? normalizeFeedbackSource(aiFixDrawerItem.feedbackSource)
              : ""
        }
        mergeAction={
          aiFixDrawerBulkItems.length >= 2
            ? "fix_and_merge"
            : aiFixDrawerItem
              ? resolveAiFixMergeAction(aiFixDrawerItem)
              : "fix_and_merge"
        }
        bulkItems={
          aiFixDrawerBulkItems.length >= 2
            ? aiFixDrawerBulkItems.map((item) => ({
                id: item.id,
                description: String(item.description || ""),
                pickedElementContext: item.pickedElementContext || null,
              }))
            : []
        }
        defaultMergeAction={autoDeployActive ? "fix_merge_deploy" : "fix_and_merge"}
        defaultDeployEnvironmentId={autoDeployActive ? autoDeployEnvironmentId : ""}
        qaSourceBranch={aiFixDrawerItem?.metadata?.qaReportSnapshot?.context?.selectedBranch || ""}
        feedbackDescription={
          aiFixDrawerItem?.description ? String(aiFixDrawerItem.description) : ""
        }
        pickedElementContext={aiFixDrawerItem?.pickedElementContext || null}
        feedbackTitle={
          aiFixDrawerBulkItems.length >= 2
            ? `${aiFixDrawerBulkItems.length} snippet issues`
            : aiFixDrawerItem?.description
              ? String(aiFixDrawerItem.description).slice(0, 160)
              : ""
        }
        status={aiFixDrawerItem ? resolveItemAiFix(aiFixDrawerItem).status : null}
        result={aiFixDrawerItem ? resolveItemAiFix(aiFixDrawerItem).result : null}
        error={aiFixDrawerItem ? resolveItemAiFix(aiFixDrawerItem).error : null}
        streamLog={
          aiFixDrawerItem && aiFix.feedbackId === aiFixDrawerItem.id ? aiFix.streamLog : []
        }
        isRunning={aiFixDrawerItem ? resolveItemAiFix(aiFixDrawerItem).isRunning : false}
        busy={fixStartBusy}
        clarifying={aiFix.clarifying}
        onConfirmStart={handleDrawerConfirmStart}
        onCancel={() => void aiFix.cancel()}
        onClarify={async (prompt) => {
          try {
            await aiFix.clarify(prompt);
            toast.success("Answers sent — continuing AI fix");
          } catch (err) {
            toast.error(
              typeof err?.error === "string"
                ? err.error
                : typeof err?.message === "string"
                  ? err.message
                  : "Could not send answers",
            );
          }
        }}
      />
    </>
  );
}
