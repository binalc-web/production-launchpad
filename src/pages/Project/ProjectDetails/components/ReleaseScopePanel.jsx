import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  cursorAgentGithubGateMessage,
  fetchBacklogEpics,
  fetchCursorAgentGithubReadiness,
  fetchDeveloperRepoBranches,
  fetchReleaseScope,
  replaceReleaseScope,
} from "@/api";
import { CursorAgentGithubGateAlert } from "@/components/agent/CursorAgentGithubGateAlert";
import { LaunchpadQuestionsCard } from "@/components/LaunchpadQuestionsCard";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { JiraIssueLink } from "@/components/ReleaseSuggestions/JiraIssueLink";
import { JiraProjectBadge } from "@/components/jira/JiraProjectBadge";
import { usePaginatedJiraTickets } from "@/hooks/usePaginatedJiraTickets";
import { useReleaseScopeImplement } from "@/hooks/useReleaseScopeImplement";
import { isProjectJiraBacklogReady } from "@/lib/jiraBacklogReady";
import {
  navigateToApplicationImplement,
  navigateToBacklog,
  navigateToPreviewImplement,
} from "@/lib/releaseNavigation";
import { formatBackendLockAgentModeLabel } from "@/lib/projectStatusPresentation";
import { ScopeImplementHandoff } from "./console/ScopeImplementHandoff";
import {
  buildLiveImplementItemMap,
  resolveDisplayedImplementMeta,
} from "./releaseScopeImplementLiveStatus.util";
import {
  SCOPE_IMPLEMENT_BATCH_MODE,
  SCOPE_IMPLEMENT_EXECUTION,
  SCOPE_IMPLEMENT_RUN_MODE,
  scopeImplementActiveRunStatusMessage,
  scopeImplementStartApiPayload,
  scopeImplementStartToastMessage,
} from "../utils/scopeImplementRunMode";
import {
  formatBackendLockAgentModeShort,
  formatDevRepoRowCompact,
} from "@/lib/releaseLockPresentation";
import { cn } from "@/lib/utils";
import { buildUiPreferenceScope } from "@/lib/uiPreferences";
import { usePersistedUiState } from "@/hooks/usePersistedUiState";
import {
  DevelopmentRepoBranchCombobox,
  EMPTY_DEV_BRANCH_DATA,
} from "@/pages/Project/CreateProject/components/DevelopmentRepoBranchCombobox";
import { devRowsFromStored } from "@/utils/projectMultiRepoForm";
import { buildJiraScopePickerGroups } from "@/utils/releaseSuggestionJira";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  ExternalLink,
  GripVertical,
  Loader2,
  MinusCircle,
  Play,
  Save,
  XCircle,
} from "lucide-react";
import githubMarkSvg from "@/assets/apps/GitHub.svg";
import bitbucketMarkSvg from "@/assets/apps/BitBucket.svg";

/** Figma/Jira design preflight failures that need Integrations reconnect. */
const SCOPE_IMPLEMENT_FIGMA_ERROR_CODES = new Set([
  "FIGMA_NOT_CONNECTED",
  "FIGMA_TOKEN_EXPIRED",
  "FIGMA_SYNC_FAILED",
  "FIGMA_FILE_FORBIDDEN",
  "FIGMA_FILE_NOT_FOUND",
  "FIGMA_FILE_CHECK_FAILED",
  "JIRA_ATTACHMENT_INCOMPLETE",
  "JIRA_NOT_CONNECTED",
  "JIRA_CONTEXT_FAILED",
]);

/** Where scope implement agents apply changes. */
const SCOPE_IMPLEMENT_TARGET = {
  PLATFORM: "platform",
  DEVELOPMENT: "development",
};

const IMPLEMENT_SORT_MODE = {
  CUSTOM: "custom",
  TICKET: "ticket",
  TITLE: "title",
  EPIC: "epic",
};

/**
 * Prefer current Implement-tab arrow order when it lists every scope key;
 * otherwise fall back to saved scope sortOrder.
 */
function resolveImplementOrderedKeys({ mode, scope, implementOrder, implementKeys }) {
  const scopeKeys = scopeItemKeysInOrder(scope);
  if (mode === "all") {
    const orderHasAll =
      implementOrder.length === scopeKeys.length &&
      scopeKeys.every((key) => implementOrder.includes(key));
    return orderHasAll ? [...implementOrder] : [...scopeKeys];
  }
  return implementOrder.filter((key) => implementKeys.has(key));
}

/** Story keys in picker visible order (epic groups, top to bottom). */
function pickerStoryKeysInVisibleOrder(groups) {
  const keys = [];
  for (const group of groups ?? []) {
    for (const story of group.stories ?? []) {
      if (story?.key) keys.push(story.key);
    }
  }
  return keys;
}

/** Selected picker keys sorted by visible backlog/Jira order. */
function orderedSelectedPickerKeys(selectedKeys, groups) {
  const selected = selectedKeys instanceof Set ? selectedKeys : new Set(selectedKeys);
  return pickerStoryKeysInVisibleOrder(groups).filter((key) => selected.has(key));
}

/** Saved scope item keys in sortOrder (for implement queue defaults). */
function scopeItemKeysInOrder(scope) {
  const sorted = [...(scope?.items ?? [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  return sorted
    .map((item) => {
      if (item.jiraIssueKey) return `j:${item.jiraIssueKey}`;
      if (item.backlogStoryId != null) return `b:${item.backlogStoryId}`;
      return null;
    })
    .filter(Boolean);
}

function scopeStoryTitleByKey(groups, key) {
  for (const group of groups) {
    const story = group.stories.find((s) => s.key === key);
    if (story) return story.title;
  }
  return key;
}

function naturalCompare(a, b) {
  return String(a ?? "").localeCompare(String(b ?? ""), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function fallbackStoryLabel(key) {
  if (typeof key !== "string") return "";
  if (key.startsWith("j:")) return key.slice(2);
  if (key.startsWith("b:")) return `Story ${key.slice(2)}`;
  return key;
}

/** Story summary shown beside a Jira key. Empty when the title is only the key. */
function storyTitleBesideKey(story) {
  const title = String(story?.title ?? "").trim();
  const key = String(story?.jiraIssueKey ?? "").trim();
  if (!title) return "";
  if (key && title.toUpperCase() === key.toUpperCase()) return "";
  return title;
}

function buildStoryMetaIndex(groups) {
  const storyIndex = new Map();
  const epicOrder = new Map();

  for (const [groupIndex, group] of (groups ?? []).entries()) {
    epicOrder.set(group.epicKey, groupIndex);
    for (const [storyIndexInGroup, story] of (group.stories ?? []).entries()) {
      if (!story?.key) continue;
      storyIndex.set(story.key, {
        ...story,
        epicKey: group.epicKey,
        epicTitle: group.epicTitle,
        epicOrder: groupIndex,
        storyOrder: storyIndexInGroup,
      });
    }
  }

  return { storyIndex, epicOrder };
}

function sortImplementKeys(keys, groups, sortMode) {
  const list = Array.isArray(keys) ? [...keys] : [];
  if (sortMode === IMPLEMENT_SORT_MODE.CUSTOM || list.length < 2) {
    return list;
  }

  const { storyIndex } = buildStoryMetaIndex(groups);

  return list.sort((a, b) => {
    const storyA = storyIndex.get(a);
    const storyB = storyIndex.get(b);
    const titleA = storyA?.title || fallbackStoryLabel(a);
    const titleB = storyB?.title || fallbackStoryLabel(b);
    const ticketA = storyA?.jiraIssueKey || fallbackStoryLabel(a);
    const ticketB = storyB?.jiraIssueKey || fallbackStoryLabel(b);
    const epicOrderA = storyA?.epicOrder ?? Number.MAX_SAFE_INTEGER;
    const epicOrderB = storyB?.epicOrder ?? Number.MAX_SAFE_INTEGER;
    const storyOrderA = storyA?.storyOrder ?? Number.MAX_SAFE_INTEGER;
    const storyOrderB = storyB?.storyOrder ?? Number.MAX_SAFE_INTEGER;

    if (sortMode === IMPLEMENT_SORT_MODE.TICKET) {
      return naturalCompare(ticketA, ticketB) || naturalCompare(titleA, titleB);
    }
    if (sortMode === IMPLEMENT_SORT_MODE.TITLE) {
      return naturalCompare(titleA, titleB) || naturalCompare(ticketA, ticketB);
    }
    if (sortMode === IMPLEMENT_SORT_MODE.EPIC) {
      return (
        epicOrderA - epicOrderB ||
        naturalCompare(storyA?.epicTitle, storyB?.epicTitle) ||
        storyOrderA - storyOrderB ||
        naturalCompare(titleA, titleB)
      );
    }
    return 0;
  });
}

function buildImplementScopeGroups({ scope, pickerGroups, fallbackGroups }) {
  const scopeKeys = new Set(scopeItemKeysInOrder(scope));
  if (scopeKeys.size === 0) return [];

  const fallbackStoryIndex = new Map();
  for (const group of fallbackGroups ?? []) {
    for (const story of group.stories ?? []) {
      if (story?.key) fallbackStoryIndex.set(story.key, story);
    }
  }

  const enrichedGroups = [];
  const seenKeys = new Set();

  for (const group of pickerGroups ?? []) {
    const stories = (group.stories ?? [])
      .filter((story) => story?.key && scopeKeys.has(story.key))
      .map((story) => {
        seenKeys.add(story.key);
        const fallbackStory = fallbackStoryIndex.get(story.key);
        return {
          ...story,
          title: story.title || fallbackStory?.title || fallbackStoryLabel(story.key),
          implementStatus: fallbackStory?.implementStatus ?? null,
          implementOutcome: fallbackStory?.implementOutcome ?? null,
        };
      });

    if (stories.length > 0) {
      enrichedGroups.push({
        epicKey: group.epicKey,
        epicTitle: group.epicTitle || "Epic",
        stories,
      });
    }
  }

  for (const group of fallbackGroups ?? []) {
    const stories = (group.stories ?? [])
      .filter((story) => story?.key && scopeKeys.has(story.key) && !seenKeys.has(story.key))
      .map((story) => ({
        ...story,
        title: story.title || fallbackStoryLabel(story.key),
      }));

    if (stories.length > 0) {
      enrichedGroups.push({
        epicKey: group.epicKey,
        epicTitle: group.epicTitle || "Epic",
        stories,
      });
    }
  }

  return enrichedGroups;
}

function scopeImplementTargetLabel(target, backendLockAgentMode) {
  if (target === SCOPE_IMPLEMENT_TARGET.DEVELOPMENT) {
    const modeLabel = formatBackendLockAgentModeLabel(backendLockAgentMode);
    return `Dev repo · ${modeLabel}`;
  }
  return "Implement in Preview";
}

function isDevelopmentImplementTarget(target) {
  return target === SCOPE_IMPLEMENT_TARGET.DEVELOPMENT;
}

/** Confirm-dialog title — always names preview vs App repositories destination. */
function scopeImplementConfirmTitle(target) {
  return isDevelopmentImplementTarget(target)
    ? "Start implement in App repositories?"
    : "Start implement in Preview?";
}

/** Short destination badge for confirm UI. */
function scopeImplementConfirmDestinationBadge(target) {
  return isDevelopmentImplementTarget(target) ? "App repositories (dev repos)" : "Preview only";
}

function ScopePickerListSkeleton({ rows, label }) {
  return (
    <div className="space-y-2 py-2" role="status" aria-busy="true" aria-label={label}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <Skeleton className="size-4 rounded-sm" />
          <Skeleton className="h-4 flex-1" />
        </div>
      ))}
    </div>
  );
}

function ReleaseScopeSkeleton() {
  return (
    <div className="space-y-4 py-2" role="status" aria-busy="true" aria-label="Loading scope">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

/** Checkbox ack copy — re-states destination so user must confirm the target. */
function scopeImplementConfirmAckLabel(target) {
  return isDevelopmentImplementTarget(target)
    ? "I confirm Cursor agent(s) will implement the selected release scope items in the development repositories (App repositories), not Preview."
    : "I confirm Cursor agent(s) will implement the selected release scope items in Preview only (not App repositories development repositories).";
}

/** Primary CTA when starting implement. */
function scopeImplementConfirmStartLabel(target) {
  return isDevelopmentImplementTarget(target) ? "Start in App repositories" : "Start in Preview";
}

/**
 * Development repo rows for implement base-branch pickers (multi JSON or plain path).
 * @param {string | null | undefined} developmentRepoUrl
 * @returns {Array<{ path: string, ref: string }>}
 */
function scopeImplementDevRepoRows(developmentRepoUrl) {
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
 * Human-readable development repo lines (multi JSON or plain path) — never raw config JSON.
 * @param {string | null | undefined} developmentRepoUrl
 * @returns {string[]}
 */
function formatScopeImplementDevRepoLines(developmentRepoUrl) {
  return scopeImplementDevRepoRows(developmentRepoUrl).map((row) => formatDevRepoRowCompact(row));
}

function ScopeImplementTargetMenu({
  target,
  onTargetChange,
  developmentRepoUrl,
  backendLockAgentMode,
  disabled,
}) {
  const hasDevRepo = Boolean(typeof developmentRepoUrl === "string" && developmentRepoUrl.trim());
  const targetLabel = scopeImplementTargetLabel(target, backendLockAgentMode);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="min-w-0 gap-1.5 max-w-[220px]"
          disabled={disabled}
        >
          <span className="min-w-0 flex-1 truncate" title={targetLabel}>
            {targetLabel}
          </span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuItem onClick={() => onTargetChange(SCOPE_IMPLEMENT_TARGET.PLATFORM)}>
          Implement in Preview
        </DropdownMenuItem>
        {hasDevRepo ? (
          <DropdownMenuItem onClick={() => onTargetChange(SCOPE_IMPLEMENT_TARGET.DEVELOPMENT)}>
            Implement in App repositories
            <span className="ml-auto text-xs text-muted-foreground">
              {formatBackendLockAgentModeLabel(backendLockAgentMode)}
            </span>
          </DropdownMenuItem>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <DropdownMenuItem disabled>Implement in App repositories</DropdownMenuItem>
              </div>
            </TooltipTrigger>
            <TooltipContent side="left">
              Link a development repository in project settings first.
            </TooltipContent>
          </Tooltip>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function scopeStoryKey(story) {
  if (story?.jiraIssueKey) return `j:${story.jiraIssueKey}`;
  if (story?.backlogStoryId != null) return `b:${story.backlogStoryId}`;
  return null;
}

function selectionState(storyKeys, selectedKeys) {
  const keys = storyKeys.filter(Boolean);
  if (keys.length === 0) {
    return { checked: false, indeterminate: false, selectedCount: 0, total: 0 };
  }
  const selectedCount = keys.filter((k) => selectedKeys.has(k)).length;
  if (selectedCount === 0) {
    return {
      checked: false,
      indeterminate: false,
      selectedCount: 0,
      total: keys.length,
    };
  }
  if (selectedCount === keys.length) {
    return {
      checked: true,
      indeterminate: false,
      selectedCount,
      total: keys.length,
    };
  }
  return {
    checked: false,
    indeterminate: true,
    selectedCount,
    total: keys.length,
  };
}

function toggleEpicKeys(storyKeys, selectedKeys, selectAll) {
  const next = new Set(selectedKeys);
  for (const key of storyKeys) {
    if (!key) continue;
    if (selectAll) next.add(key);
    else next.delete(key);
  }
  return next;
}

/** Map legacy release-description scope to native backlog story keys (title match). */
function matchLegacyScopeToBacklogKeys(scope, nativeEpics) {
  const keys = new Set();
  if (!scope?.epics?.length || !nativeEpics?.length) return keys;
  const norm = (s) =>
    String(s ?? "")
      .trim()
      .toLowerCase();
  for (const epic of scope.epics) {
    const nativeEpic = nativeEpics.find((e) => norm(e.title) === norm(epic.epicTitle));
    if (!nativeEpic) continue;
    for (const story of epic.stories ?? []) {
      const nativeStory = (nativeEpic.stories ?? []).find(
        (s) => norm(s.title) === norm(story.title),
      );
      if (nativeStory?.id != null) keys.add(`b:${nativeStory.id}`);
    }
  }
  return keys;
}

function ScopeEpicTree({
  groups,
  selectedKeys,
  onToggleStory,
  onToggleEpic,
  disabled = false,
  selectable = true,
  emptyMessage = "No stories in this epic.",
  renderStoryMeta,
  isStorySelectable,
}) {
  if (!groups.length) return null;

  return (
    <div className="space-y-2">
      {groups.map((group) => {
        const storyKeys = group.stories.map((s) => s.key).filter(Boolean);
        const selectableStoryKeys = isStorySelectable
          ? storyKeys.filter((key) => {
              const story = group.stories.find((s) => s.key === key);
              return story ? isStorySelectable(story) : true;
            })
          : storyKeys;
        const { checked, indeterminate, selectedCount, total } = selectionState(
          selectableStoryKeys,
          selectedKeys,
        );

        return (
          <Collapsible
            key={group.epicKey}
            defaultOpen
            className="rounded-lg border border-border/80 bg-background overflow-hidden"
          >
            <div className="flex items-center gap-2 border-b border-border/60 bg-muted/25 px-2 py-2">
              {selectable ? (
                <Checkbox
                  checked={indeterminate ? "indeterminate" : checked}
                  disabled={disabled || selectableStoryKeys.length === 0}
                  onCheckedChange={(v) => onToggleEpic(selectableStoryKeys, v === true)}
                  className="shrink-0"
                  aria-label={`Select all stories in ${group.epicTitle}`}
                />
              ) : null}
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="group/trigger flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-0.5 text-left text-sm font-medium transition-colors hover:bg-muted/40"
                >
                  <ChevronDown
                    className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]/trigger:rotate-180"
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate">{group.epicTitle}</span>
                  {selectable ? (
                    <Badge
                      variant="secondary"
                      className="shrink-0 text-[10px] font-normal tabular-nums"
                    >
                      {selectedCount}/{total}
                    </Badge>
                  ) : (
                    <Badge
                      variant="secondary"
                      className="shrink-0 text-[10px] font-normal tabular-nums"
                    >
                      {total}
                    </Badge>
                  )}
                </button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent>
              {group.stories.length === 0 ? (
                <p className="px-3 py-2.5 text-xs text-muted-foreground">{emptyMessage}</p>
              ) : (
                <ul className="m-0 list-none border-t border-border/40 p-1.5 pl-3 space-y-0.5">
                  {group.stories.map((story) => {
                    const isChecked = selectedKeys.has(story.key);
                    const storySelectable = !isStorySelectable || isStorySelectable(story);
                    const storyDisabled = disabled || !storySelectable;
                    const storyLabel =
                      storyTitleBesideKey(story) || (!story.jiraIssueKey ? story.title : "");
                    return (
                      <li key={story.key}>
                        <label
                          className={cn(
                            "flex items-start gap-2 rounded-md py-1.5 pr-2 text-sm transition-colors",
                            selectable && storySelectable && "cursor-pointer pl-6",
                            !selectable && "pl-3",
                            selectable && storySelectable && !disabled && "hover:bg-muted/40",
                            selectable && isChecked && "bg-primary/5",
                            storyDisabled && selectable && "cursor-default opacity-80",
                          )}
                        >
                          {selectable ? (
                            <Checkbox
                              checked={isChecked}
                              disabled={storyDisabled}
                              onCheckedChange={() => onToggleStory(story.key)}
                              className="mt-0.5 shrink-0"
                            />
                          ) : null}
                          <span className="min-w-0 flex-1 flex flex-wrap items-center gap-2">
                            {story.jiraIssueKey ? (
                              <JiraIssueLink
                                issueKey={story.jiraIssueKey}
                                url={story.jiraIssueUrl}
                              />
                            ) : null}
                            {storyLabel ? (
                              <span className="min-w-0 font-medium">{storyLabel}</span>
                            ) : null}
                            {renderStoryMeta?.(story)}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
}

function scopeStoryByKey(groups, key) {
  for (const group of groups ?? []) {
    const story = group.stories?.find((s) => s.key === key);
    if (story) return story;
  }
  return null;
}

function ImplementSortMenu({ value, onChange, disabled }) {
  const options = [
    { id: IMPLEMENT_SORT_MODE.CUSTOM, label: "Custom order" },
    { id: IMPLEMENT_SORT_MODE.TICKET, label: "Ticket number" },
    { id: IMPLEMENT_SORT_MODE.TITLE, label: "Title" },
    { id: IMPLEMENT_SORT_MODE.EPIC, label: "Epic" },
  ];
  const activeLabel = options.find((option) => option.id === value)?.label ?? "Sort";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" size="sm" variant="outline" disabled={disabled} className="gap-1.5">
          Sort: {activeLabel}
          <ChevronDown className="h-3.5 w-3.5" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {options.map((option) => (
          <DropdownMenuItem key={option.id} onClick={() => onChange(option.id)}>
            <span className="flex w-full items-center justify-between gap-3">
              <span>{option.label}</span>
              {value === option.id ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> : null}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ImplementOrderQueue({ orderedKeys, groups, disabled, onMoveUp, onMoveDown, onReorder }) {
  const [draggedKey, setDraggedKey] = useState(null);

  if (!orderedKeys.length) {
    return (
      <p className="text-sm text-muted-foreground rounded-lg border border-dashed border-border px-3 py-4 text-center">
        Select stories below to build the implement queue.
      </p>
    );
  }

  return (
    <ol className="space-y-1.5 rounded-lg border border-border bg-muted/10 p-2">
      {orderedKeys.map((key, index) => {
        const story = scopeStoryByKey(groups, key);
        const storyLabel =
          storyTitleBesideKey(story) ||
          (!story?.jiraIssueKey
            ? story?.title || scopeStoryTitleByKey(groups, key) || fallbackStoryLabel(key)
            : "");
        return (
          <li
            key={key}
            draggable={!disabled}
            onDragStart={() => setDraggedKey(key)}
            onDragOver={(event) => {
              if (disabled || draggedKey == null || draggedKey === key) return;
              event.preventDefault();
            }}
            onDrop={(event) => {
              event.preventDefault();
              if (disabled || draggedKey == null || draggedKey === key) return;
              onReorder?.(draggedKey, key);
              setDraggedKey(null);
            }}
            onDragEnd={() => setDraggedKey(null)}
            className={cn(
              "flex items-center gap-2 rounded-md border border-border/60 bg-background px-2 py-1.5 text-sm",
              !disabled && "cursor-grab",
              draggedKey === key && "opacity-60",
            )}
          >
            <span className="flex h-7 w-6 shrink-0 items-center justify-center text-muted-foreground">
              <GripVertical className="h-3.5 w-3.5" aria-hidden />
            </span>
            <span className="w-5 shrink-0 text-xs tabular-nums text-muted-foreground">
              {index + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex min-w-0 flex-wrap items-center gap-2">
                {story?.jiraIssueKey ? (
                  <JiraIssueLink issueKey={story.jiraIssueKey} url={story.jiraIssueUrl} />
                ) : null}
                {storyLabel ? (
                  <span className="min-w-0 truncate font-medium">{storyLabel}</span>
                ) : null}
              </span>
            </span>
            {story?.implementOutcome ? implementOutcomeLinks(story.implementOutcome) : null}
            <div className="flex shrink-0 items-center gap-0.5">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                disabled={disabled || index === 0}
                onClick={() => onMoveUp(index)}
                aria-label="Move up"
              >
                <ChevronUp className="h-3.5 w-3.5" aria-hidden />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                disabled={disabled || index === orderedKeys.length - 1}
                onClick={() => onMoveDown(index)}
                aria-label="Move down"
              >
                <ChevronDown className="h-3.5 w-3.5" aria-hidden />
              </Button>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function implementItemStatusBadge(status) {
  const s = String(status ?? "").toLowerCase();
  if (s === "running") {
    return (
      <Badge variant="secondary" className="gap-1 text-[10px] font-normal">
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
        Running
      </Badge>
    );
  }
  if (s === "awaiting_questions") {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-amber-200 bg-amber-50 text-[10px] font-normal text-amber-800"
      >
        Needs answers
      </Badge>
    );
  }
  if (s === "succeeded") {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-emerald-200 bg-emerald-50 text-[10px] font-normal text-emerald-800"
      >
        <CheckCircle2 className="h-3 w-3" aria-hidden />
        Done
      </Badge>
    );
  }
  if (s === "failed") {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-destructive/30 bg-destructive/5 text-[10px] font-normal text-destructive"
      >
        <XCircle className="h-3 w-3" aria-hidden />
        Failed
      </Badge>
    );
  }
  if (s === "cancelled") {
    return (
      <Badge variant="outline" className="text-[10px] font-normal">
        Cancelled
      </Badge>
    );
  }
  if (s === "skipped") {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-amber-200 bg-amber-50 text-[10px] font-normal text-amber-700"
      >
        <MinusCircle className="h-3 w-3" aria-hidden />
        Skipped
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1 text-[10px] font-normal">
      <Circle className="h-3 w-3" aria-hidden />
      Queued
    </Badge>
  );
}

/** Short SHA for compact commit links on Done/Failed rows. */
function shortCommitSha(sha) {
  const value = String(sha || "").trim();
  return value.length > 7 ? value.slice(0, 7) : value;
}

/** Commit browse URL for GitHub or Bitbucket repository. */
function developmentCommitBrowseUrl(outcome) {
  const repoUrl = String(outcome?.repositoryUrl || "").replace(/\/$/, "");
  const sha = String(outcome?.commitHash || "").trim();
  if (!repoUrl || !sha) return null;
  return `${repoUrl}/commit/${encodeURIComponent(sha)}`;
}

/** Branch browse URL for GitHub or Bitbucket repository. */
function developmentBranchBrowseUrl(outcome) {
  const repoUrl = String(outcome?.repositoryUrl || "").replace(/\/$/, "");
  const branch = String(outcome?.branchName || "").trim();
  if (!repoUrl || !branch) return null;
  if (repoUrl.includes("bitbucket.org")) {
    return `${repoUrl}/branch/${encodeURIComponent(branch)}`;
  }
  return `${repoUrl}/tree/${encodeURIComponent(branch)}`;
}

/** Infer code host from outcome / PR URL for brand mark next to PR links. */
function resolveOutcomeCodeHost(outcome) {
  const haystack = `${outcome?.prUrl || ""} ${outcome?.repositoryUrl || ""}`.toLowerCase();
  if (haystack.includes("bitbucket.org")) return "bitbucket";
  return "github";
}

/**
 * Clickable PR badge (GitHub / Bitbucket mark + PR #).
 * @param {{ prUrl?: string|null, prNumber?: number|null, repositoryUrl?: string|null, repositoryName?: string|null, showRepoLabel?: boolean }} opts
 */
function scopePrLinkBadge({
  prUrl,
  prNumber = null,
  repositoryUrl = null,
  repositoryName = null,
  showRepoLabel = false,
}) {
  const href = typeof prUrl === "string" ? prUrl.trim() : "";
  if (!href) return null;
  const codeHost = resolveOutcomeCodeHost({ prUrl: href, repositoryUrl });
  const hostMark = codeHost === "bitbucket" ? bitbucketMarkSvg : githubMarkSvg;
  const hostLabel = codeHost === "bitbucket" ? "Bitbucket" : "GitHub";
  const repoLabel =
    showRepoLabel && typeof repositoryName === "string" && repositoryName.trim()
      ? repositoryName.trim()
      : null;
  const numberLabel = prNumber ? `#${prNumber}` : "Pull request";
  const label = repoLabel
    ? `${repoLabel} ${numberLabel}`
    : prNumber
      ? `PR #${prNumber}`
      : "Pull request";
  return (
    <Badge
      variant="outline"
      className="gap-1 px-1.5 py-0 text-[10px] font-normal hover:bg-muted/60"
      asChild
    >
      <a href={href} target="_blank" rel="noopener noreferrer">
        <img src={hostMark} alt="" className="h-3 w-3 shrink-0" aria-hidden />
        <span className="sr-only">{hostLabel} </span>
        {label}
        <ExternalLink className="h-3 w-3" aria-hidden />
      </a>
    </Badge>
  );
}

/**
 * Normalize shared / outcome PR lists for badge rendering.
 * @param {unknown} list
 * @param {{ prUrl?: string|null, prNumber?: number|null, repositoryUrl?: string|null, repositoryName?: string|null }|null} [singular]
 * @returns {Array<{ prUrl: string, prNumber: number|null, repositoryUrl?: string|null, repositoryName?: string|null }>}
 */
function normalizeImplementPrList(list, singular = null) {
  const rows = [];
  if (Array.isArray(list)) {
    for (const row of list) {
      const prUrl = typeof row?.prUrl === "string" ? row.prUrl.trim() : "";
      if (!prUrl) continue;
      rows.push({
        prUrl,
        prNumber: row?.prNumber ?? null,
        repositoryUrl: row?.repositoryUrl ?? null,
        repositoryName: row?.repositoryName ?? null,
      });
    }
  }
  if (rows.length === 0 && singular?.prUrl) {
    const prUrl = String(singular.prUrl).trim();
    if (prUrl) {
      rows.push({
        prUrl,
        prNumber: singular.prNumber ?? null,
        repositoryUrl: singular.repositoryUrl ?? null,
        repositoryName: singular.repositoryName ?? null,
      });
    }
  }
  const seen = new Set();
  return rows.filter((r) => {
    if (seen.has(r.prUrl)) return false;
    seen.add(r.prUrl);
    return true;
  });
}

/**
 * Persistent PR / commit / branch / repo links next to Done/Failed badges (development target).
 * Priority: PR → commit → branch; repo only when no PR is shown.
 * @param {object|null|undefined} outcome
 * @param {Array<{ prUrl?: string|null, prNumber?: number|null, repositoryUrl?: string|null, repositoryName?: string|null }>|{ prUrl?: string|null, prNumber?: number|null }|null} [sharedPrFallback]
 */
function implementOutcomeLinks(outcome, sharedPrFallback = null) {
  const sharedList = Array.isArray(sharedPrFallback)
    ? normalizeImplementPrList(sharedPrFallback)
    : normalizeImplementPrList(null, sharedPrFallback);

  if (!outcome || typeof outcome !== "object") {
    if (sharedList.length === 0) return null;
    const showRepoLabel = sharedList.length > 1;
    return (
      <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
        {sharedList.map((pr) => (
          <span key={pr.prUrl}>{scopePrLinkBadge({ ...pr, showRepoLabel })}</span>
        ))}
      </span>
    );
  }

  const pullRequests = normalizeImplementPrList(
    outcome.pullRequests,
    outcome.prUrl
      ? {
          prUrl: outcome.prUrl,
          prNumber: outcome.prNumber,
          repositoryUrl: outcome.repositoryUrl,
          repositoryName: outcome.repositoryName,
        }
      : sharedList[0] || null,
  );
  // When outcome has no PRs, fall back to shared list (sequential shared-PR runs).
  const prList = pullRequests.length > 0 ? pullRequests : sharedList;

  const primary = [];
  if (prList.length > 0) {
    const showRepoLabel = prList.length > 1;
    for (const pr of prList) {
      primary.push(<span key={pr.prUrl}>{scopePrLinkBadge({ ...pr, showRepoLabel })}</span>);
    }
  } else if (outcome.kind === "plan_branch") {
    // Plan mode: plan docs live on the pushed branch — prefer branch over commit.
    const branchHref = developmentBranchBrowseUrl(outcome);
    if (branchHref) {
      primary.push(
        <a
          key="branch"
          href={branchHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          View branch
          <ExternalLink className="h-3 w-3" aria-hidden />
        </a>,
      );
    } else {
      const commitHref = developmentCommitBrowseUrl(outcome);
      if (commitHref) {
        primary.push(
          <a
            key="commit"
            href={commitHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline"
          >
            {shortCommitSha(outcome.commitHash)}
            <ExternalLink className="h-3 w-3" aria-hidden />
          </a>,
        );
      }
    }
  } else {
    const commitHref = developmentCommitBrowseUrl(outcome);
    if (commitHref) {
      primary.push(
        <a
          key="commit"
          href={commitHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline"
        >
          {shortCommitSha(outcome.commitHash)}
          <ExternalLink className="h-3 w-3" aria-hidden />
        </a>,
      );
    } else {
      const branchHref = developmentBranchBrowseUrl(outcome);
      if (branchHref) {
        primary.push(
          <a
            key="branch"
            href={branchHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            View branch
            <ExternalLink className="h-3 w-3" aria-hidden />
          </a>,
        );
      }
    }
  }

  // Repo name is redundant when a PR link already points at that repository.
  if (prList.length === 0 && outcome.repositoryUrl && outcome.repositoryName) {
    primary.push(
      <a
        key="repo"
        href={outcome.repositoryUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:underline"
      >
        {outcome.repositoryName}
        <ExternalLink className="h-3 w-3" aria-hidden />
      </a>,
    );
  }

  if (primary.length === 0) return null;
  return <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">{primary}</span>;
}

function storyTypeBadge(story) {
  if (!story.type) return null;
  return (
    <Badge variant="outline" className="text-[10px] font-normal">
      {story.type}
    </Badge>
  );
}

function ReleaseScopeEditorTab({
  jiraReady,
  scope,
  scopePickerKeys,
  isScopeDirty,
  loading,
  saving,
  implementActive,
  canEditScope,
  hasPickerStories,
  scopeItemCount,
  search,
  onSearchChange,
  pickerSearchRef,
  pickerGroups,
  searchFilteredEmpty,
  jiraTicketsLoading,
  jiraTicketsLoadingMore,
  jiraTicketsError,
  jiraHasMore,
  jiraProjectKey,
  jiraSentinelRef,
  onTogglePickerKey,
  onTogglePickerEpic,
  onSave,
  onGoToBacklog,
  backlogLinkLabel,
  currentScopeGroups,
  isLocked,
}) {
  const draftCount = scopePickerKeys.size;
  const showEditablePicker = canEditScope && hasPickerStories;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="text-xs font-normal tabular-nums">
          {canEditScope ? `${draftCount} selected` : `${scopeItemCount} in scope`}
        </Badge>
        {isScopeDirty ? (
          <Badge
            variant="outline"
            className="text-xs font-normal border-amber-300 bg-amber-50 text-amber-900"
          >
            Unsaved changes
          </Badge>
        ) : null}
        {scope?.source && scope.source !== "scope_items" ? (
          <span className="text-xs text-muted-foreground">
            Legacy scope from{" "}
            {scope.source === "legacy_jira_sync" ? "Jira sync" : "release description"} — save to
            migrate.
          </span>
        ) : null}
      </div>

      {scopeItemCount === 0 && !hasPickerStories ? (
        <Alert>
          <AlertTitle>No stories in scope</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>
              {jiraReady
                ? "No Jira stories or tasks are available yet. Create issues in Jira or via Backlog suggestions, then return here to add them to this release."
                : "Your backlog is empty. Create epics and stories in Backlog, then return here to assign them to this release."}
            </p>
            {canEditScope ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="gap-1.5"
                onClick={onGoToBacklog}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {backlogLinkLabel}
              </Button>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      {showEditablePicker ? (
        <>
          {draftCount === 0 ? (
            <p className="text-sm text-muted-foreground rounded-lg border border-dashed border-border bg-muted/20 px-3 py-2.5">
              No stories in scope yet. Select items below, then save.
            </p>
          ) : null}

          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Label htmlFor="release-scope-search">
                {`Select from ${jiraReady ? "Jira" : "backlog"}`}
              </Label>
              {jiraReady && jiraProjectKey ? (
                <JiraProjectBadge projectKey={jiraProjectKey} />
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">
              Expand an epic to see stories. Search queries Jira; scroll for more issues.
            </p>
            <Input
              ref={pickerSearchRef}
              id="release-scope-search"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search epics or stories…"
              className="h-9 max-w-md"
            />
          </div>

          <div className="max-h-96 overflow-y-auto pr-1">
            {jiraReady && jiraTicketsLoading ? (
              <ScopePickerListSkeleton rows={5} label="Loading Jira issues" />
            ) : jiraReady && jiraTicketsError ? (
              <p className="py-4 text-sm text-destructive">{jiraTicketsError}</p>
            ) : searchFilteredEmpty ? (
              <div className="py-4">
                <p className="text-sm text-muted-foreground">
                  No stories match &ldquo;{search.trim()}&rdquo;.
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="link"
                  className="mt-1 h-auto p-0 text-sm"
                  onClick={() => onSearchChange("")}
                >
                  Clear search
                </Button>
              </div>
            ) : (
              <>
                <ScopeEpicTree
                  groups={pickerGroups}
                  selectedKeys={scopePickerKeys}
                  onToggleStory={onTogglePickerKey}
                  onToggleEpic={onTogglePickerEpic}
                  emptyMessage={
                    jiraReady
                      ? "No stories or tasks under this epic in Jira yet."
                      : "No stories in this epic yet — add them in Backlog."
                  }
                  renderStoryMeta={(story) => (
                    <>
                      {storyTypeBadge(story)}
                      {scopePickerKeys.has(story.key) ? (
                        <Badge variant="secondary" className="text-[10px] font-normal">
                          In scope
                        </Badge>
                      ) : null}
                    </>
                  )}
                />
                {jiraReady ? <div ref={jiraSentinelRef} className="h-1" aria-hidden /> : null}
                {jiraReady && jiraTicketsLoadingMore ? (
                  <ScopePickerListSkeleton rows={2} label="Loading more Jira issues" />
                ) : null}
                {jiraReady && !jiraHasMore && !jiraTicketsLoadingMore && pickerGroups.length > 0 ? (
                  <p className="text-xs text-muted-foreground py-1">End of list</p>
                ) : null}
              </>
            )}
          </div>

          <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center justify-between gap-2 border-t border-border bg-card/95 px-1 pt-3 backdrop-blur-sm">
            {isScopeDirty ? (
              <p className="text-xs text-muted-foreground">
                Save before implementing on the Implement tab.
              </p>
            ) : (
              <span />
            )}
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="gap-2"
              onClick={onSave}
              disabled={!isScopeDirty || saving || loading || implementActive}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Save className="h-4 w-4" aria-hidden />
              )}
              Save scope
            </Button>
          </div>
        </>
      ) : null}

      {scopeItemCount > 0 && !showEditablePicker ? (
        <ScopeEpicTree
          groups={currentScopeGroups}
          selectedKeys={new Set()}
          onToggleStory={() => {}}
          onToggleEpic={() => {}}
          selectable={false}
          emptyMessage="No stories under this epic."
          renderStoryMeta={(story) => (
            <>
              {storyTypeBadge(story)}
              {story.implementStatus ? implementItemStatusBadge(story.implementStatus) : null}
              {story.implementOutcome ? implementOutcomeLinks(story.implementOutcome) : null}
            </>
          )}
        />
      ) : null}

      {!canEditScope && scopeItemCount === 0 && hasPickerStories ? (
        <p className="text-sm text-muted-foreground">
          {isLocked
            ? "This release is locked — scope cannot be changed."
            : "You do not have permission to edit release scope."}
        </p>
      ) : null}
    </div>
  );
}

function ReleaseScopeImplementTab({
  scopeItemCount,
  isActiveRelease,
  canImplement,
  isScopeDirty,
  implementActive,
  implementStarting,
  implementKeys,
  implementOrder,
  implementRun,
  implementCancelling,
  implementContinuing,
  implementResumable,
  implementClarifying,
  onClarifyImplement,
  onContinueImplement,
  currentScopeGroups,
  implementSortMode,
  implementTarget,
  onImplementTargetChange,
  developmentRepoUrl,
  backendLockAgentMode,
  hideTargetPicker = false,
  onImplementSortModeChange,
  onToggleImplementKey,
  onToggleImplementEpic,
  onSelectAllImplement,
  onMoveImplementUp,
  onMoveImplementDown,
  onReorderImplement,
  onOpenImplementConfirm,
  onCancelImplement,
  runningAgentId,
}) {
  if (scopeItemCount === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-8 text-center space-y-2">
        <p className="text-sm font-medium text-foreground">No saved scope yet</p>
        <p className="text-sm text-muted-foreground">
          Activate a release and save scope in Release Management → Active release before running
          implement agents.
        </p>
      </div>
    );
  }

  const selectedImplementCount = implementOrder.length;
  const liveImplementMap = buildLiveImplementItemMap(implementRun?.items);

  const implementDisabled =
    !canImplement || implementActive || implementStarting || implementContinuing || isScopeDirty;
  const isSequentialSeparatePrRun =
    implementRun?.execution === SCOPE_IMPLEMENT_EXECUTION.SEQUENTIAL ||
    (!implementRun?.execution && implementRun?.mode === "all" && !implementRun?.batchMode);
  const isSequentialSharedPrRun =
    implementRun?.batchMode === SCOPE_IMPLEMENT_BATCH_MODE.SEQUENTIAL_AGENTS_SHARED_PR;
  const isParallelBatchRun =
    implementRun?.execution === SCOPE_IMPLEMENT_EXECUTION.BATCH &&
    implementRun?.batchMode === SCOPE_IMPLEMENT_BATCH_MODE.PARALLEL_AGENTS_SEPARATE_PRS;
  const isCombinedBatchRun =
    implementRun?.execution === SCOPE_IMPLEMENT_EXECUTION.BATCH &&
    implementRun?.batchMode === SCOPE_IMPLEMENT_BATCH_MODE.SINGLE_AGENT_SHARED_PR;
  const isSequentialRun = isSequentialSeparatePrRun || isSequentialSharedPrRun;
  const runStatus = String(implementRun?.status ?? "").toLowerCase();
  const isAwaitingQuestions = runStatus === "awaiting_questions";
  const clarifyQuestions = Array.isArray(implementRun?.questions) ? implementRun.questions : [];
  const isTerminalRun =
    runStatus === "completed" ||
    runStatus === "partial" ||
    runStatus === "failed" ||
    runStatus === "cancelled";
  const showImplementRunPanel = Boolean(implementRun && (implementActive || isTerminalRun));
  const canContinueImplement =
    Boolean(implementResumable) && canImplement && isTerminalRun && !implementActive;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            {scopeItemCount} saved {scopeItemCount === 1 ? "story" : "stories"} in this release.
            Select stories, set run order, then start Cursor agents.
          </p>
          {isScopeDirty ? (
            <p className="text-xs text-amber-700">
              Unsaved scope changes in Release Management — save before implementing.
            </p>
          ) : null}
          {!isActiveRelease ? (
            <p className="text-xs text-amber-700">
              Set this release to Active to run Implement agents.
            </p>
          ) : null}
        </div>
        {canImplement ? (
          <div className="flex flex-wrap items-center gap-2">
            {!hideTargetPicker ? (
              <ScopeImplementTargetMenu
                target={implementTarget}
                onTargetChange={onImplementTargetChange}
                developmentRepoUrl={developmentRepoUrl}
                backendLockAgentMode={backendLockAgentMode}
                disabled={implementDisabled}
              />
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={implementDisabled}
              onClick={onSelectAllImplement}
            >
              Select all
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1.5"
              disabled={implementDisabled || selectedImplementCount === 0}
              onClick={() => onOpenImplementConfirm("selected")}
            >
              <Play className="h-3.5 w-3.5" aria-hidden />
              Implement selected ({selectedImplementCount})
            </Button>
            <Button
              type="button"
              size="sm"
              className="gap-1.5"
              disabled={implementDisabled}
              onClick={() => onOpenImplementConfirm("all")}
            >
              <Play className="h-3.5 w-3.5" aria-hidden />
              Implement all ({scopeItemCount})
            </Button>
          </div>
        ) : null}
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Implement order
          </p>
          <ImplementSortMenu
            value={implementSortMode}
            onChange={onImplementSortModeChange}
            disabled={implementActive || isScopeDirty}
          />
        </div>
        <ImplementOrderQueue
          orderedKeys={implementOrder}
          groups={currentScopeGroups}
          disabled={implementActive || isScopeDirty}
          onMoveUp={onMoveImplementUp}
          onMoveDown={onMoveImplementDown}
          onReorder={onReorderImplement}
        />
      </div>

      {showImplementRunPanel ? (
        <Alert
          className={
            isAwaitingQuestions
              ? "border-amber-200 bg-amber-50/60"
              : implementActive
                ? "border-primary/30 bg-primary/5"
                : runStatus === "failed" || runStatus === "partial"
                  ? "border-destructive/30 bg-destructive/5"
                  : "border-border bg-muted/20"
          }
        >
          <AlertTitle className="flex flex-wrap items-center gap-2">
            {isAwaitingQuestions
              ? "Waiting for clarifying answers"
              : implementActive
                ? "Implementation in progress"
                : runStatus === "completed"
                  ? "Implementation finished"
                  : runStatus === "partial"
                    ? "Implementation partially completed"
                    : runStatus === "failed"
                      ? (implementRun.items ?? []).some((i) => i.status === "skipped")
                        ? "Implementation stopped after a story failed"
                        : "Implementation finished with failures"
                      : "Implementation cancelled"}
            <Badge variant="secondary" className="text-[10px] font-normal">
              {implementRun.progress?.done ?? 0}/{implementRun.progress?.total ?? 0}
            </Badge>
            {(() => {
              const sharedPrs = normalizeImplementPrList(
                implementRun.sharedPullRequests,
                implementRun.sharedPrUrl
                  ? {
                      prUrl: implementRun.sharedPrUrl,
                      prNumber: implementRun.sharedPrNumber,
                    }
                  : null,
              );
              if (sharedPrs.length === 0) return null;
              const showRepoLabel = sharedPrs.length > 1;
              return sharedPrs.map((pr) => (
                <span key={pr.prUrl}>{scopePrLinkBadge({ ...pr, showRepoLabel })}</span>
              ));
            })()}
          </AlertTitle>
          <AlertDescription className="space-y-3">
            {isAwaitingQuestions ? (
              <p className="text-sm">
                The implement agent needs a few decisions before continuing. Answer below — no code
                will be published until then.
              </p>
            ) : implementActive ? (
              <p className="text-sm">
                {scopeImplementActiveRunStatusMessage({
                  target: implementRun?.target,
                  isSequentialSharedPrRun,
                  isSequentialSeparatePrRun,
                  isParallelBatchRun,
                  isCombinedBatchRun,
                })}
              </p>
            ) : canContinueImplement ? (
              <p className="text-sm">
                Retry the failed story and continue the remaining queue on the same run.
              </p>
            ) : null}
            {runningAgentId ? (
              <p className="text-xs text-muted-foreground font-mono">Agent: {runningAgentId}</p>
            ) : null}
            {isAwaitingQuestions && clarifyQuestions.length > 0 ? (
              <LaunchpadQuestionsCard
                questions={clarifyQuestions}
                sending={implementClarifying}
                continueMode="implement"
                onSubmit={(prompt) => void onClarifyImplement?.(prompt)}
              />
            ) : null}
            <ul className="space-y-1.5 max-h-48 overflow-y-auto">
              {(implementRun.items ?? []).map((item) => {
                const sharedFallback = normalizeImplementPrList(
                  implementRun.sharedPullRequests,
                  implementRun.sharedPrUrl
                    ? {
                        prUrl: implementRun.sharedPrUrl,
                        prNumber: implementRun.sharedPrNumber,
                      }
                    : null,
                );
                const showSharedFallback =
                  sharedFallback.length > 0 &&
                  (item.status === "succeeded" ||
                    item.status === "failed" ||
                    item.status === "running");
                return (
                  <li key={item.id} className="flex flex-wrap items-center gap-2 text-sm">
                    {implementItemStatusBadge(item.status)}
                    {item.attempts > 1 ? (
                      <span className="text-[10px] font-normal text-muted-foreground">
                        {item.status === "running" ? "Retrying…" : `${item.attempts} attempts`}
                      </span>
                    ) : null}
                    {item.jiraIssueKey ? (
                      <span className="shrink-0 font-mono text-xs text-primary">
                        {item.jiraIssueKey}
                      </span>
                    ) : null}
                    <span className="min-w-0 flex-1 truncate">
                      {storyTitleBesideKey(item) || (!item.jiraIssueKey ? item.title : "")}
                    </span>
                    {implementOutcomeLinks(
                      item.outcomeSnapshot,
                      showSharedFallback ? sharedFallback : null,
                    )}
                    {item.error ? (
                      <span
                        className="text-xs text-destructive truncate max-w-[min(100%,28rem)]"
                        title={item.error}
                      >
                        {item.error}
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
            {implementActive ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={implementCancelling}
                onClick={() => void onCancelImplement()}
              >
                {implementCancelling ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Cancelling…
                  </>
                ) : isSequentialRun ? (
                  "Cancel queue"
                ) : isParallelBatchRun ? (
                  "Cancel parallel run"
                ) : (
                  "Cancel"
                )}
              </Button>
            ) : canContinueImplement ? (
              <Button
                type="button"
                size="sm"
                disabled={implementContinuing}
                onClick={() => void onContinueImplement?.()}
              >
                {implementContinuing ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Continuing…
                  </>
                ) : isSequentialRun ? (
                  "Continue queue"
                ) : (
                  "Continue from failure"
                )}
              </Button>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="max-h-96 overflow-y-auto pr-1">
        <ScopeEpicTree
          groups={currentScopeGroups}
          selectedKeys={implementKeys}
          onToggleStory={onToggleImplementKey}
          onToggleEpic={onToggleImplementEpic}
          selectable={canImplement}
          disabled={implementActive || isScopeDirty}
          emptyMessage="No stories under this epic."
          renderStoryMeta={(story) => {
            const meta = resolveDisplayedImplementMeta(story, liveImplementMap);
            return (
              <>
                {storyTypeBadge(story)}
                {meta.status ? implementItemStatusBadge(meta.status) : null}
                {meta.outcome ? implementOutcomeLinks(meta.outcome) : null}
              </>
            );
          }}
        />
      </div>
    </div>
  );
}

export function ReleaseScopePanel({
  release,
  project,
  canEdit = false,
  viewMode = "scope",
  forcedImplementTarget = null,
}) {
  const jiraReady = isProjectJiraBacklogReady(project);
  const [, setSearchParams] = useSearchParams();
  const pickerSearchRef = useRef(null);
  const releaseScopeScope = buildUiPreferenceScope({ projectId: project?.id });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scope, setScope] = useState(null);
  const [scopePickerKeys, setScopePickerKeys] = useState(new Set());
  const [implementKeys, setImplementKeys] = useState(new Set());
  const [implementOrder, setImplementOrder] = useState([]);
  const [search, setSearch] = usePersistedUiState({
    scope: releaseScopeScope,
    key: "releaseScope.search",
    defaultValue: "",
    type: "string",
    debounceMs: 150,
  });
  const [implementRunMode, setImplementRunMode] = usePersistedUiState({
    scope: releaseScopeScope,
    key: "releaseScope.implementRunMode",
    defaultValue: SCOPE_IMPLEMENT_RUN_MODE.ONE_AT_A_TIME,
    allowed: [
      SCOPE_IMPLEMENT_RUN_MODE.ONE_AT_A_TIME,
      SCOPE_IMPLEMENT_RUN_MODE.ALL_SEQUENTIAL,
      SCOPE_IMPLEMENT_RUN_MODE.ALL_PARALLEL,
      SCOPE_IMPLEMENT_RUN_MODE.ALL_COMBINED,
    ],
  });
  const [implementTarget, setImplementTarget] = usePersistedUiState({
    scope: releaseScopeScope,
    key: "releaseScope.implementTarget",
    defaultValue: SCOPE_IMPLEMENT_TARGET.PLATFORM,
    allowed: [SCOPE_IMPLEMENT_TARGET.PLATFORM, SCOPE_IMPLEMENT_TARGET.DEVELOPMENT],
  });
  const effectiveImplementTarget =
    forcedImplementTarget === SCOPE_IMPLEMENT_TARGET.PLATFORM ||
    forcedImplementTarget === SCOPE_IMPLEMENT_TARGET.DEVELOPMENT
      ? forcedImplementTarget
      : implementTarget;
  const hideTargetPicker = Boolean(forcedImplementTarget);
  const [implementSortMode, setImplementSortMode] = usePersistedUiState({
    scope: releaseScopeScope,
    key: "releaseScope.implementSortMode",
    defaultValue: IMPLEMENT_SORT_MODE.CUSTOM,
    allowed: [
      IMPLEMENT_SORT_MODE.CUSTOM,
      IMPLEMENT_SORT_MODE.TICKET,
      IMPLEMENT_SORT_MODE.TITLE,
      IMPLEMENT_SORT_MODE.EPIC,
    ],
  });
  const [implementConfirm, setImplementConfirm] = useState(null);
  const [implementAcknowledged, setImplementAcknowledged] = useState(false);
  /** @type {[Record<string, string>, Function]} */
  const [implementRepoBranchByPath, setImplementRepoBranchByPath] = useState({});
  /** @type {[Record<string, typeof EMPTY_DEV_BRANCH_DATA>, Function]} */
  const [implementBranchDataByPath, setImplementBranchDataByPath] = useState({});
  /** @type {[Record<string, string>, Function]} */
  const [implementBranchesErrorByPath, setImplementBranchesErrorByPath] = useState({});
  const [githubGateMessage, setGithubGateMessage] = useState(null);
  const [githubGateLoading, setGithubGateLoading] = useState(false);

  const [nativeEpics, setNativeEpics] = useState([]);
  const legacyPickerMappedRef = useRef(false);

  const {
    tickets: jiraTickets,
    loading: jiraTicketsLoading,
    loadingMore: jiraTicketsLoadingMore,
    error: jiraTicketsError,
    hasMore: jiraHasMore,
    projectKey: jiraProjectKey,
    sentinelRef: jiraSentinelRef,
  } = usePaginatedJiraTickets({
    projectId: project?.id,
    enabled: jiraReady,
    isActive: true,
    resetKey: project?.id,
    typesOverride: "all",
    search,
    includeEpic: true,
    includeStory: true,
    includeTask: true,
  });

  const {
    run: implementRun,
    resumable: implementResumable,
    starting: implementStarting,
    cancelling: implementCancelling,
    continuing: implementContinuing,
    clarifying: implementClarifying,
    isActive: implementActive,
    start: startImplement,
    cancel: cancelImplement,
    continueRun: continueImplement,
    clarify: clarifyImplement,
  } = useReleaseScopeImplement(release?.id);

  const loadScope = useCallback(async () => {
    if (!release?.id) return;
    setLoading(true);
    try {
      const data = await fetchReleaseScope(release.id);
      setScope(data);
      const keys = new Set();
      for (const item of data.items ?? []) {
        if (item.backlogStoryId) keys.add(`b:${item.backlogStoryId}`);
        if (item.jiraIssueKey) keys.add(`j:${item.jiraIssueKey}`);
      }
      setScopePickerKeys(keys);
    } catch (err) {
      toast.error(typeof err?.error === "string" ? err.error : "Failed to load scope");
    } finally {
      setLoading(false);
    }
  }, [release?.id]);

  useEffect(() => {
    loadScope();
    setImplementKeys(new Set());
    setImplementOrder([]);
    legacyPickerMappedRef.current = false;
  }, [loadScope, release?.id]);

  // Keep arrow order when the scope key set is unchanged; reseed when scope membership changes.
  useEffect(() => {
    if (!scope?.items?.length) {
      setImplementOrder([]);
      setImplementKeys(new Set());
      return;
    }
    const scopeKeys = scopeItemKeysInOrder(scope);
    setImplementOrder((prev) => {
      const sameSet =
        prev.length === scopeKeys.length && scopeKeys.every((key) => prev.includes(key));
      return sameSet ? prev : scopeKeys;
    });
    setImplementKeys((prev) => {
      const sameSet = prev.size === scopeKeys.length && scopeKeys.every((key) => prev.has(key));
      return sameSet ? prev : new Set(scopeKeys);
    });
  }, [scope?.items]);

  useEffect(() => {
    if (forcedImplementTarget) return;
    if (
      implementTarget !== SCOPE_IMPLEMENT_TARGET.DEVELOPMENT ||
      (typeof project?.developmentRepoUrl === "string" && project.developmentRepoUrl.trim())
    ) {
      return;
    }
    setImplementTarget(SCOPE_IMPLEMENT_TARGET.PLATFORM);
  }, [forcedImplementTarget, implementTarget, project?.developmentRepoUrl, setImplementTarget]);

  useEffect(() => {
    if (
      legacyPickerMappedRef.current ||
      jiraReady ||
      !scope ||
      scope.source === "scope_items" ||
      nativeEpics.length === 0
    ) {
      return;
    }
    const matched = matchLegacyScopeToBacklogKeys(scope, nativeEpics);
    if (matched.size > 0) {
      setScopePickerKeys(matched);
      legacyPickerMappedRef.current = true;
    }
  }, [scope, nativeEpics, jiraReady]);

  useEffect(() => {
    if (!project?.id || jiraReady) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchBacklogEpics(project.id);
        if (!cancelled) setNativeEpics(data.epics ?? []);
      } catch {
        if (!cancelled) setNativeEpics([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [project?.id, jiraReady]);

  const savedScopeKeys = useMemo(() => {
    const keys = new Set();
    for (const item of scope?.items ?? []) {
      if (item.backlogStoryId) keys.add(`b:${item.backlogStoryId}`);
      if (item.jiraIssueKey) keys.add(`j:${item.jiraIssueKey}`);
    }
    return keys;
  }, [scope?.items]);

  const isScopeDirty = useMemo(() => {
    if (savedScopeKeys.size !== scopePickerKeys.size) return true;
    for (const k of scopePickerKeys) {
      if (!savedScopeKeys.has(k)) return true;
    }
    return false;
  }, [savedScopeKeys, scopePickerKeys]);

  const currentScopeStories = useMemo(() => {
    const stories = [];
    for (const epic of scope?.epics ?? []) {
      for (const story of epic.stories ?? []) {
        const key = scopeStoryKey(story);
        if (key) {
          stories.push({
            ...story,
            key,
            epicTitle: epic.epicTitle,
            implementStatus: story.implementStatus ?? null,
            implementOutcome: story.implementOutcome ?? null,
          });
        }
      }
    }
    return stories;
  }, [scope?.epics]);

  const scopeItemCount = currentScopeStories.length;

  const currentScopeGroups = useMemo(() => {
    return (scope?.epics ?? []).map((epic) => ({
      epicKey: epic.epicKey,
      epicTitle: epic.epicTitle || "Epic",
      stories: (epic.stories ?? [])
        .map((story) => {
          const key = scopeStoryKey(story);
          if (!key) return null;
          return {
            key,
            title: story.title,
            jiraIssueKey: story.jiraIssueKey,
            jiraIssueUrl: story.jiraIssueUrl,
            type: story.type,
            status: story.status,
            implementStatus: story.implementStatus ?? null,
            implementOutcome: story.implementOutcome ?? null,
          };
        })
        .filter(Boolean),
    }));
  }, [scope?.epics]);

  const unfilteredPickerGroups = useMemo(() => {
    if (jiraReady) {
      return buildJiraScopePickerGroups(jiraTickets, {
        includeEpic: true,
        includeStory: true,
        includeTask: true,
      });
    }

    return nativeEpics.map((epic) => ({
      epicKey: `native-epic-${epic.id}`,
      epicTitle: epic.title,
      stories: (epic.stories ?? []).map((s) => ({
        key: `b:${s.id}`,
        backlogStoryId: s.id,
        title: s.title,
        type: s.type,
        status: s.status,
      })),
    }));
  }, [jiraReady, jiraTickets, nativeEpics]);

  const pickerStoryCount = useMemo(
    () => unfilteredPickerGroups.reduce((n, g) => n + g.stories.length, 0),
    [unfilteredPickerGroups],
  );

  const hasPickerStories = jiraReady
    ? pickerStoryCount > 0 || jiraHasMore || jiraTicketsLoading
    : nativeEpics.length > 0;
  const searchQuery = search.trim().toLowerCase();

  const pickerGroups = useMemo(() => {
    if (jiraReady) return unfilteredPickerGroups;
    if (!searchQuery) return unfilteredPickerGroups;
    return unfilteredPickerGroups
      .map((group) => {
        const epicTitle = String(group.epicTitle ?? "").toLowerCase();
        const epicMatches = epicTitle.includes(searchQuery);
        const stories = epicMatches
          ? group.stories
          : group.stories.filter((story) => {
              const title = String(story.title ?? "").toLowerCase();
              const key = String(story.jiraIssueKey ?? story.key ?? "").toLowerCase();
              return title.includes(searchQuery) || key.includes(searchQuery);
            });
        return { ...group, stories };
      })
      .filter(
        (g) =>
          g.stories.length > 0 ||
          String(g.epicTitle ?? "")
            .toLowerCase()
            .includes(searchQuery),
      );
  }, [jiraReady, unfilteredPickerGroups, searchQuery]);

  const implementScopeGroups = useMemo(
    () =>
      buildImplementScopeGroups({
        scope,
        pickerGroups: unfilteredPickerGroups,
        fallbackGroups: currentScopeGroups,
      }),
    [scope, unfilteredPickerGroups, currentScopeGroups],
  );

  const searchFilteredEmpty =
    Boolean(search.trim()) &&
    pickerGroups.length === 0 &&
    !(jiraReady && (jiraTicketsLoading || jiraTicketsLoadingMore));

  const togglePickerKey = (key) => {
    setScopePickerKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleImplementKey = (key) => {
    setImplementKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
        setImplementOrder((order) => order.filter((k) => k !== key));
      } else {
        next.add(key);
        setImplementOrder((order) => (order.includes(key) ? order : [...order, key]));
      }
      return next;
    });
  };

  const toggleImplementEpic = (storyKeys, selectAll) => {
    setImplementKeys((prev) => {
      const next = toggleEpicKeys(storyKeys, prev, selectAll);
      setImplementOrder((order) => {
        if (selectAll) {
          const merged = [...order];
          for (const key of storyKeys) {
            if (key && next.has(key) && !merged.includes(key)) merged.push(key);
          }
          return merged;
        }
        return order.filter((k) => next.has(k));
      });
      return next;
    });
  };

  const selectAllImplement = useCallback(() => {
    const keys = scopeItemKeysInOrder(scope);
    setImplementKeys(new Set(keys));
    setImplementOrder(
      implementSortMode === IMPLEMENT_SORT_MODE.CUSTOM
        ? keys
        : sortImplementKeys(keys, implementScopeGroups, implementSortMode),
    );
  }, [implementScopeGroups, implementSortMode, scope]);

  const moveImplementUp = useCallback(
    (index) => {
      setImplementSortMode(IMPLEMENT_SORT_MODE.CUSTOM);
      setImplementOrder((prev) => {
        if (index <= 0 || index >= prev.length) return prev;
        const next = [...prev];
        [next[index - 1], next[index]] = [next[index], next[index - 1]];
        return next;
      });
    },
    [setImplementSortMode],
  );

  const moveImplementDown = useCallback(
    (index) => {
      setImplementSortMode(IMPLEMENT_SORT_MODE.CUSTOM);
      setImplementOrder((prev) => {
        if (index < 0 || index >= prev.length - 1) return prev;
        const next = [...prev];
        [next[index], next[index + 1]] = [next[index + 1], next[index]];
        return next;
      });
    },
    [setImplementSortMode],
  );

  const reorderImplement = useCallback(
    (draggedKey, targetKey) => {
      setImplementSortMode(IMPLEMENT_SORT_MODE.CUSTOM);
      setImplementOrder((prev) => {
        const fromIndex = prev.indexOf(draggedKey);
        const targetIndex = prev.indexOf(targetKey);
        if (fromIndex < 0 || targetIndex < 0 || fromIndex === targetIndex) return prev;
        const next = [...prev];
        const [moved] = next.splice(fromIndex, 1);
        next.splice(targetIndex, 0, moved);
        return next;
      });
    },
    [setImplementSortMode],
  );

  useEffect(() => {
    if (implementSortMode === IMPLEMENT_SORT_MODE.CUSTOM) return;
    setImplementOrder((prev) => sortImplementKeys(prev, implementScopeGroups, implementSortMode));
  }, [implementKeys, implementScopeGroups, implementSortMode]);

  const buildImplementItemsPayload = useCallback(
    (orderedKeys) =>
      orderedKeys.map((key, sortOrder) =>
        key.startsWith("j:")
          ? { jiraIssueKey: key.slice(2), sortOrder }
          : { backlogStoryId: Number(key.slice(2)), sortOrder },
      ),
    [],
  );

  const togglePickerEpic = (storyKeys, selectAll) => {
    setScopePickerKeys((prev) => toggleEpicKeys(storyKeys, prev, selectAll));
  };

  const handleSave = async () => {
    if (!release?.id) return;
    setSaving(true);
    try {
      const orderedKeys = orderedSelectedPickerKeys(scopePickerKeys, unfilteredPickerGroups);
      const items = buildImplementItemsPayload(orderedKeys);
      await replaceReleaseScope(release.id, items);
      toast.success("Release scope saved");
      await loadScope();
    } catch (err) {
      toast.error(typeof err?.error === "string" ? err.error : "Failed to save scope");
    } finally {
      setSaving(false);
    }
  };

  const isLocked = release?.status === "locked";
  const isActiveRelease = String(release?.status ?? "").toLowerCase() === "active";
  const canEditScope = canEdit && !isLocked;
  const canImplement = canEdit && !isLocked && isActiveRelease && scopeItemCount > 0;

  const goToBacklog = useCallback(() => {
    navigateToBacklog(setSearchParams, { jiraReady });
  }, [setSearchParams, jiraReady]);

  const backlogLinkLabel = jiraReady ? "Backlog → Suggestions" : "Backlog → Board";

  useEffect(() => {
    if (!implementConfirm || !project?.id) {
      setGithubGateMessage(null);
      setGithubGateLoading(false);
      return undefined;
    }
    let cancelled = false;
    setGithubGateLoading(true);
    fetchCursorAgentGithubReadiness(project.id, {
      implementTarget: implementConfirm.target,
    })
      .then((data) => {
        if (!cancelled) setGithubGateMessage(cursorAgentGithubGateMessage(data));
      })
      .catch(() => {
        if (!cancelled) {
          setGithubGateMessage("Could not verify GitHub access for Cursor agents.");
        }
      })
      .finally(() => {
        if (!cancelled) setGithubGateLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [implementConfirm, project?.id]);

  useEffect(() => {
    if (!implementConfirm) {
      setImplementAcknowledged(false);
      setImplementRepoBranchByPath({});
      setImplementBranchDataByPath({});
      setImplementBranchesErrorByPath({});
    }
  }, [implementConfirm]);

  const implementDevRepoRows = useMemo(
    () => scopeImplementDevRepoRows(project?.developmentRepoUrl),
    [project?.developmentRepoUrl],
  );

  useEffect(() => {
    if (
      !implementConfirm ||
      !isDevelopmentImplementTarget(implementConfirm.target) ||
      !project?.id ||
      implementDevRepoRows.length === 0
    ) {
      return undefined;
    }
    let cancelled = false;
    const paths = implementDevRepoRows.map((row) => row.path);
    setImplementBranchDataByPath((prev) => {
      const next = { ...prev };
      for (const path of paths) {
        next[path] = { ...EMPTY_DEV_BRANCH_DATA, loading: true };
      }
      return next;
    });
    setImplementBranchesErrorByPath({});

    void Promise.all(
      implementDevRepoRows.map(async (row) => {
        try {
          const data = await fetchDeveloperRepoBranches(project.id, row.path);
          if (cancelled) return;
          const list = Array.isArray(data?.branches) ? data.branches : [];
          const def =
            (typeof data?.defaultBranch === "string" && data.defaultBranch.trim()) ||
            (row.ref && list.includes(row.ref) ? row.ref : "") ||
            list[0] ||
            row.ref ||
            "main";
          setImplementBranchDataByPath((prev) => ({
            ...prev,
            [row.path]: { loading: false, branches: list, defaultBranch: def },
          }));
          setImplementRepoBranchByPath((prev) => {
            const existing = String(prev[row.path] || "").trim();
            if (existing) return prev;
            return {
              ...prev,
              [row.path]: list.includes(def) ? def : list[0] || def,
            };
          });
        } catch (err) {
          if (cancelled) return;
          setImplementBranchDataByPath((prev) => ({
            ...prev,
            [row.path]: EMPTY_DEV_BRANCH_DATA,
          }));
          setImplementBranchesErrorByPath((prev) => ({
            ...prev,
            [row.path]:
              typeof err?.error === "string" ? err.error : "Could not load repository branches.",
          }));
        }
      }),
    );

    return () => {
      cancelled = true;
    };
  }, [implementConfirm, project?.id, implementDevRepoRows]);

  const searchImplementBranchesForPath = useCallback(
    (repoPath) => async (query) => {
      const q = String(query || "").trim();
      const path = String(repoPath || "").trim();
      const cached = implementBranchDataByPath[path];
      if (!project?.id || !path || q.length < 2) {
        return { branches: [], defaultBranch: cached?.defaultBranch || "" };
      }
      const data = await fetchDeveloperRepoBranches(project.id, path, { q });
      return {
        branches: Array.isArray(data?.branches) ? data.branches : [],
        defaultBranch: data?.defaultBranch || cached?.defaultBranch || "",
      };
    },
    [project?.id, implementBranchDataByPath],
  );

  const wasImplementActiveRef = useRef(false);

  useEffect(() => {
    if (implementActive) {
      wasImplementActiveRef.current = true;
      return;
    }
    if (!wasImplementActiveRef.current || !implementRun) return;
    wasImplementActiveRef.current = false;
    void loadScope();
    if (implementRun.status === "failed") {
      toast.error("Scope implementation finished with failures");
    } else if (implementRun.status === "partial") {
      toast.warning("Scope implementation partially completed");
    } else if (implementRun.status === "completed") {
      toast.success("Scope implementation finished");
    } else if (implementRun.status === "cancelled") {
      toast.info("Implement queue cancelled");
    }
  }, [implementActive, implementRun, loadScope]);

  const openImplementConfirm = (mode) => {
    const orderedKeys = resolveImplementOrderedKeys({
      mode,
      scope,
      implementOrder,
      implementKeys,
    });
    const count = orderedKeys.length;
    if (count === 0) {
      toast.error(
        mode === "all"
          ? "Add at least one story to release scope first."
          : "Select at least one story to implement.",
      );
      return;
    }
    if (mode === "all") {
      setImplementKeys(new Set(orderedKeys));
      // Only fill an incomplete queue — never overwrite a complete arrow-ordered queue.
      setImplementOrder((prev) => {
        const scopeKeys = scopeItemKeysInOrder(scope);
        const orderHasAll =
          prev.length === scopeKeys.length && scopeKeys.every((key) => prev.includes(key));
        return orderHasAll ? prev : orderedKeys;
      });
    }
    setImplementConfirm({ mode, count, target: effectiveImplementTarget, orderedKeys });
  };

  const handleCancelImplement = async () => {
    try {
      await cancelImplement();
    } catch (err) {
      const msg =
        typeof err?.error === "string"
          ? err.error
          : typeof err?.message === "string"
            ? err.message
            : "Could not cancel implementation";
      toast.error(msg);
    }
  };

  const handleContinueImplement = async () => {
    try {
      await continueImplement();
      toast.success("Continuing implementation from where it stopped");
    } catch (err) {
      const msg =
        typeof err?.error === "string"
          ? err.error
          : typeof err?.message === "string"
            ? err.message
            : "Could not continue implementation";
      toast.error(msg);
    }
  };

  const handleClarifyImplement = async (prompt) => {
    try {
      await clarifyImplement(prompt);
      toast.success("Answers sent — continuing implementation");
    } catch (err) {
      const msg =
        typeof err?.error === "string"
          ? err.error
          : typeof err?.message === "string"
            ? err.message
            : "Could not send answers";
      toast.error(msg);
    }
  };

  const submitImplement = async () => {
    if (!implementConfirm || !release?.id) return;
    if (!implementAcknowledged) {
      toast.error("Check the confirmation box before starting.");
      return;
    }
    if (githubGateMessage) {
      toast.error(githubGateMessage);
      return;
    }
    const { mode, target, orderedKeys } = implementConfirm;
    const needsBaseBranch = isDevelopmentImplementTarget(target);
    const repoBranches = needsBaseBranch
      ? implementDevRepoRows.map((row) => ({
          path: row.path,
          branch: String(implementRepoBranchByPath[row.path] || "").trim(),
        }))
      : [];
    if (needsBaseBranch) {
      const missing = repoBranches.find((row) => !row.branch);
      if (missing || repoBranches.length === 0) {
        toast.error(
          implementDevRepoRows.length > 1
            ? "Select a base branch for every development repository."
            : "Select a base branch.",
        );
        return;
      }
    }
    const apiPayload = scopeImplementStartApiPayload(target, implementRunMode);
    const body = {
      mode,
      ...apiPayload,
      target,
      items: buildImplementItemsPayload(orderedKeys ?? implementOrder),
      ...(needsBaseBranch
        ? {
            baseBranch: repoBranches[0]?.branch,
            repoBranches,
          }
        : {}),
    };
    try {
      await startImplement(body);
      setImplementConfirm(null);
      toast.success(scopeImplementStartToastMessage(target, implementRunMode));
    } catch (err) {
      const msg =
        typeof err?.error === "string"
          ? err.error
          : typeof err?.message === "string"
            ? err.message
            : "Failed to start implement";
      const errorCode = typeof err?.code === "string" ? err.code : "";
      if (SCOPE_IMPLEMENT_FIGMA_ERROR_CODES.has(errorCode)) {
        toast.error(msg, {
          action: {
            label: "Connected accounts",
            onClick: () => {
              window.location.assign("/settings/integrations");
            },
          },
        });
        return;
      }
      toast.error(msg);
    }
  };

  const runningAgentId =
    implementRun?.items?.find((i) => i.status === "running")?.agentId ??
    implementRun?.agentId ??
    null;

  const implementConfirmIsDev = isDevelopmentImplementTarget(implementConfirm?.target);
  const implementConfirmDestBadge = scopeImplementConfirmDestinationBadge(implementConfirm?.target);
  const implementConfirmDevRepoLines = formatScopeImplementDevRepoLines(
    project?.developmentRepoUrl,
  );
  const implementBranchesBusy =
    implementConfirmIsDev &&
    (implementDevRepoRows.length === 0 ||
      implementDevRepoRows.some((row) => {
        const data = implementBranchDataByPath[row.path];
        return !data || data.loading || Boolean(implementBranchesErrorByPath[row.path]);
      }) ||
      implementDevRepoRows.some(
        (row) => !String(implementRepoBranchByPath[row.path] || "").trim(),
      ));

  return (
    <div className="rounded-xl border border-border bg-card p-4 md:p-6 space-y-4">
      <div>
        <h3 className="text-base font-semibold text-foreground">
          {viewMode === "implement" ? "Implement scoped stories" : "Release scope"}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {viewMode === "implement"
            ? forcedImplementTarget === SCOPE_IMPLEMENT_TARGET.DEVELOPMENT
              ? "Agents write to your development repositories (App repositories). Scope is managed in Release Management → Active release."
              : "Agents write to the LaunchPad frontend preview only. Scope is managed in Release Management → Active release."
            : jiraReady
              ? "Choose Jira stories for this release, save scope, then open Preview or App repositories to implement."
              : "Choose backlog stories for this release, save scope, then open Preview or App repositories to implement."}
        </p>
      </div>

      {viewMode === "implement" &&
      forcedImplementTarget === SCOPE_IMPLEMENT_TARGET.DEVELOPMENT &&
      !(typeof project?.developmentRepoUrl === "string" && project.developmentRepoUrl.trim()) ? (
        <Alert variant="destructive">
          <AlertTitle>Development repository required</AlertTitle>
          <AlertDescription>
            Link a development repository in project settings before implementing in App
            repositories.
          </AlertDescription>
        </Alert>
      ) : null}

      {loading ? (
        <ReleaseScopeSkeleton />
      ) : viewMode === "implement" ? (
        <ReleaseScopeImplementTab
          scopeItemCount={scopeItemCount}
          isActiveRelease={isActiveRelease}
          canImplement={
            canImplement &&
            !(
              forcedImplementTarget === SCOPE_IMPLEMENT_TARGET.DEVELOPMENT &&
              !(
                typeof project?.developmentRepoUrl === "string" && project.developmentRepoUrl.trim()
              )
            )
          }
          isScopeDirty={isScopeDirty}
          implementActive={implementActive}
          implementStarting={implementStarting}
          implementKeys={implementKeys}
          implementOrder={implementOrder}
          implementRun={implementRun}
          implementCancelling={implementCancelling}
          implementContinuing={implementContinuing}
          implementResumable={implementResumable}
          implementClarifying={implementClarifying}
          currentScopeGroups={implementScopeGroups}
          implementSortMode={implementSortMode}
          implementTarget={effectiveImplementTarget}
          onImplementTargetChange={setImplementTarget}
          developmentRepoUrl={project?.developmentRepoUrl}
          backendLockAgentMode={project?.backendLockAgentMode}
          hideTargetPicker={hideTargetPicker}
          onImplementSortModeChange={setImplementSortMode}
          onToggleImplementKey={toggleImplementKey}
          onToggleImplementEpic={toggleImplementEpic}
          onSelectAllImplement={selectAllImplement}
          onMoveImplementUp={moveImplementUp}
          onMoveImplementDown={moveImplementDown}
          onReorderImplement={reorderImplement}
          onOpenImplementConfirm={openImplementConfirm}
          onCancelImplement={handleCancelImplement}
          onContinueImplement={handleContinueImplement}
          onClarifyImplement={handleClarifyImplement}
          runningAgentId={runningAgentId}
        />
      ) : (
        <div className="space-y-4">
          <ReleaseScopeEditorTab
            jiraReady={jiraReady}
            scope={scope}
            scopePickerKeys={scopePickerKeys}
            isScopeDirty={isScopeDirty}
            loading={loading}
            saving={saving}
            implementActive={implementActive}
            canEditScope={canEditScope}
            hasPickerStories={hasPickerStories}
            scopeItemCount={scopeItemCount}
            search={search}
            onSearchChange={setSearch}
            pickerSearchRef={pickerSearchRef}
            pickerGroups={pickerGroups}
            searchFilteredEmpty={searchFilteredEmpty}
            jiraTicketsLoading={jiraTicketsLoading}
            jiraTicketsLoadingMore={jiraTicketsLoadingMore}
            jiraTicketsError={jiraTicketsError}
            jiraHasMore={jiraHasMore}
            jiraProjectKey={jiraProjectKey}
            jiraSentinelRef={jiraSentinelRef}
            onTogglePickerKey={togglePickerKey}
            onTogglePickerEpic={togglePickerEpic}
            onSave={() => void handleSave()}
            onGoToBacklog={goToBacklog}
            backlogLinkLabel={backlogLinkLabel}
            currentScopeGroups={currentScopeGroups}
            isLocked={isLocked}
          />
          <ScopeImplementHandoff
            project={project}
            canImplement={canImplement}
            isScopeDirty={isScopeDirty}
            scopeItemCount={scopeItemCount}
            onGoPreview={() => navigateToPreviewImplement(setSearchParams)}
            onGoApplication={() => navigateToApplicationImplement(setSearchParams)}
          />
        </div>
      )}

      <Dialog
        open={Boolean(implementConfirm)}
        onOpenChange={(open) => {
          if (!open && !implementStarting) setImplementConfirm(null);
        }}
      >
        <DialogContent className="flex max-h-[min(90vh,720px)] w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader className="shrink-0 space-y-1.5 px-6 pb-3 pt-6 pr-12">
            <DialogTitle>{scopeImplementConfirmTitle(implementConfirm?.target)}</DialogTitle>
            <DialogDescription className="sr-only">
              Confirm scope implementation target, base branch, and agent run mode.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-6">
            <div
              className={cn(
                "space-y-2 rounded-lg border px-3 py-2.5 text-sm",
                implementConfirmIsDev
                  ? "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-50"
                  : "border-sky-300 bg-sky-50 text-sky-950 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-50",
              )}
              role="status"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="secondary"
                  className={cn(
                    "font-semibold",
                    implementConfirmIsDev
                      ? "bg-amber-200 text-amber-950 dark:bg-amber-900 dark:text-amber-50"
                      : "bg-sky-200 text-sky-950 dark:bg-sky-900 dark:text-sky-50",
                  )}
                >
                  {implementConfirmDestBadge}
                </Badge>
                <span className="font-medium">
                  {implementConfirmIsDev
                    ? "Writes to your development repository"
                    : "Preview workspace only"}
                </span>
                {implementConfirmIsDev ? (
                  <span className="text-xs opacity-80">
                    {formatBackendLockAgentModeShort(project?.backendLockAgentMode)}
                  </span>
                ) : null}
              </div>
              {implementConfirmIsDev && implementConfirmDevRepoLines.length > 0 ? (
                <ul className="space-y-1 border-t border-amber-300/60 pt-2 dark:border-amber-800/60">
                  {implementConfirmDevRepoLines.map((line) => (
                    <li key={line} className="break-all font-mono text-xs leading-snug opacity-90">
                      {line}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            <div className="grid items-start gap-3 sm:grid-cols-2">
              <div className="space-y-3 min-w-0">
                <p className="text-sm text-foreground">
                  <strong>{implementConfirm?.count ?? 0}</strong> scope{" "}
                  {implementConfirm?.count === 1 ? "item" : "items"} in Implement-tab order.
                </p>
                {(implementConfirm?.orderedKeys ?? []).length > 0 ? (
                  <ul className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-border bg-background/70 p-2">
                    {implementConfirm.orderedKeys.map((key) => {
                      const story = scopeStoryByKey(implementScopeGroups, key);
                      const title = storyTitleBesideKey(story);
                      const issueKey =
                        story?.jiraIssueKey ||
                        (String(key).startsWith("j:") ? String(key).slice(2) : "");
                      const label =
                        title || (!issueKey ? story?.title || fallbackStoryLabel(key) : "");
                      return (
                        <li
                          key={key}
                          className="flex min-w-0 flex-wrap items-baseline gap-2 text-sm"
                        >
                          {issueKey ? (
                            <span className="shrink-0 font-mono text-xs text-primary">
                              {issueKey}
                            </span>
                          ) : null}
                          {label ? <span className="min-w-0 font-medium">{label}</span> : null}
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
                {implementConfirmIsDev ? (
                  <div className="space-y-3 rounded-lg border border-border bg-muted/40 p-3">
                    {implementDevRepoRows.length === 0 ? (
                      <p className="text-sm text-destructive">
                        No development repository configured for this project.
                      </p>
                    ) : (
                      implementDevRepoRows.map((row, idx) => {
                        const branchData =
                          implementBranchDataByPath[row.path] ?? EMPTY_DEV_BRANCH_DATA;
                        const branchError = implementBranchesErrorByPath[row.path] || "";
                        return (
                          <div key={row.path} className="space-y-1.5">
                            {implementDevRepoRows.length > 1 ? (
                              <p className="truncate font-mono text-xs text-muted-foreground">
                                {row.path}
                              </p>
                            ) : null}
                            <DevelopmentRepoBranchCombobox
                              repoPath={row.path}
                              value={implementRepoBranchByPath[row.path] || ""}
                              onChange={(next) =>
                                setImplementRepoBranchByPath((prev) => ({
                                  ...prev,
                                  [row.path]: next,
                                }))
                              }
                              branchData={branchData}
                              branchError={branchError}
                              onSearchBranches={searchImplementBranchesForPath(row.path)}
                              idSuffix={`implement-base-${idx}`}
                              label={
                                implementDevRepoRows.length > 1
                                  ? `Base branch (${idx + 1})`
                                  : "Base branch"
                              }
                              labelClassName="text-sm font-medium text-foreground"
                              disabled={implementStarting || branchData.loading}
                            />
                          </div>
                        );
                      })
                    )}
                    <p className="text-xs text-muted-foreground">
                      Clone source and PR / auto-merge base
                      {implementDevRepoRows.length > 1 ? " per repository" : ""}. Type to search all
                      branches.
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Agents stay in Launchpad preview — they will not change your development
                    repository.
                  </p>
                )}
              </div>

              {implementConfirmIsDev ? (
                <div className="min-w-0 space-y-1.5 rounded-lg border border-border bg-muted/40 p-3">
                  <p className="text-sm font-medium text-foreground">How should agents run?</p>
                  <div className="flex flex-col gap-2">
                    <label className="flex min-w-0 cursor-pointer items-start gap-2 text-sm">
                      <input
                        type="radio"
                        name="implement-run-mode"
                        className="mt-1 shrink-0"
                        checked={implementRunMode === SCOPE_IMPLEMENT_RUN_MODE.ONE_AT_A_TIME}
                        onChange={() => setImplementRunMode(SCOPE_IMPLEMENT_RUN_MODE.ONE_AT_A_TIME)}
                      />
                      <span className="min-w-0 leading-snug">
                        <strong>One at a time</strong>
                        <span className="text-muted-foreground"> — separate PR per story</span>
                      </span>
                    </label>
                    <label className="flex min-w-0 cursor-pointer items-start gap-2 text-sm">
                      <input
                        type="radio"
                        name="implement-run-mode"
                        className="mt-1 shrink-0"
                        checked={implementRunMode === SCOPE_IMPLEMENT_RUN_MODE.ALL_SEQUENTIAL}
                        onChange={() =>
                          setImplementRunMode(SCOPE_IMPLEMENT_RUN_MODE.ALL_SEQUENTIAL)
                        }
                      />
                      <span className="min-w-0 leading-snug">
                        <strong>Sequential agents</strong>
                        <span className="text-muted-foreground">
                          {" "}
                          — one shared PR, commit per story
                        </span>
                      </span>
                    </label>
                    <label className="flex min-w-0 cursor-pointer items-start gap-2 text-sm">
                      <input
                        type="radio"
                        name="implement-run-mode"
                        className="mt-1 shrink-0"
                        checked={implementRunMode === SCOPE_IMPLEMENT_RUN_MODE.ALL_PARALLEL}
                        onChange={() => setImplementRunMode(SCOPE_IMPLEMENT_RUN_MODE.ALL_PARALLEL)}
                      />
                      <span className="min-w-0 leading-snug">
                        <strong>Parallel agents</strong>
                        <span className="text-muted-foreground"> — separate PR each</span>
                      </span>
                    </label>
                    <label className="flex min-w-0 cursor-pointer items-start gap-2 text-sm">
                      <input
                        type="radio"
                        name="implement-run-mode"
                        className="mt-1 shrink-0"
                        checked={implementRunMode === SCOPE_IMPLEMENT_RUN_MODE.ALL_COMBINED}
                        onChange={() => setImplementRunMode(SCOPE_IMPLEMENT_RUN_MODE.ALL_COMBINED)}
                      />
                      <span className="min-w-0 leading-snug">
                        <strong>Combined prompt</strong>
                        <span className="text-muted-foreground"> — one agent / one PR</span>
                      </span>
                    </label>
                  </div>
                </div>
              ) : (
                <div className="min-w-0 space-y-1.5 rounded-lg border border-border bg-muted/40 p-3">
                  <p className="text-sm font-medium text-foreground">How agents run</p>
                  <p className="text-sm text-muted-foreground leading-snug">
                    Stories run{" "}
                    <strong className="font-medium text-foreground">one at a time</strong> on the
                    same agent (follow-ups after the first) in Implement-tab order. Each story
                    force-merges to preview <span className="font-mono text-xs">main</span>.
                  </p>
                </div>
              )}
            </div>

            <CursorAgentGithubGateAlert loading={githubGateLoading} message={githubGateMessage} />
            <div
              className={cn(
                "flex items-start gap-3 rounded-lg border px-3 py-2.5",
                implementConfirmIsDev
                  ? "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950"
                  : "border-sky-300 bg-sky-50 dark:border-sky-800 dark:bg-sky-950",
              )}
            >
              <Checkbox
                id="implement-scope-ack"
                checked={implementAcknowledged}
                onCheckedChange={(v) => setImplementAcknowledged(Boolean(v === true))}
                className="mt-0.5 shrink-0"
              />
              <Label
                htmlFor="implement-scope-ack"
                className="cursor-pointer text-sm font-medium leading-snug"
              >
                {scopeImplementConfirmAckLabel(implementConfirm?.target)}
              </Label>
            </div>
          </div>

          <DialogFooter className="shrink-0 gap-2 border-t border-border bg-background px-6 py-4 sm:gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setImplementConfirm(null)}
              disabled={implementStarting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void submitImplement()}
              disabled={
                implementStarting ||
                githubGateLoading ||
                Boolean(githubGateMessage) ||
                !implementAcknowledged ||
                (implementConfirmIsDev && implementBranchesBusy)
              }
            >
              {implementStarting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Starting…
                </>
              ) : (
                scopeImplementConfirmStartLabel(implementConfirm?.target)
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
