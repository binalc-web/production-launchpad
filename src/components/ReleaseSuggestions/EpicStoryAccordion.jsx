import React, { useState } from "react";
import { ChevronDown, Plus, Sparkles, Trash2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MarkdownEditField } from "@/components/MarkdownEditField";
import { AssistantMarkdown } from "@/components/chat/AssistantMarkdown";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  releaseDescriptionEpicExcludedPath,
  releaseDescriptionStoryExcludedPath,
} from "@/lib/releaseDescriptionEffective";
import { createEmptyThemes } from "@/lib/releaseDescriptionThemes";
import { cn } from "@/lib/utils";
import { JiraIssueLink } from "./JiraIssueLink";
import { EpicStoryChatSheet } from "./EpicStoryChatSheet";

export const epicTierBadgeClassName =
  "rounded-md border-primary/25 bg-primary/8 pl-1.5 pr-2 text-[10px] font-semibold uppercase tracking-wide text-primary shadow-none [&>svg]:size-3.5";

export const storyTierBadgeClassName =
  "rounded-md border-border bg-muted/50 pl-1.5 pr-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground shadow-none [&>svg]:size-3";

/** @deprecated Use epicTierBadgeClassName */
export const epicTierSlateBadgeClassName = epicTierBadgeClassName;

/** @deprecated Use storyTierBadgeClassName */
export const storyTierSlateBadgeClassName = storyTierBadgeClassName;

const epicCardClassName =
  "overflow-hidden rounded-xl border border-border bg-card shadow-sm border-l-4 border-l-primary/45";

const storiesNestClassName = "ml-0.5 space-y-2 border-l-2 border-primary/15 pl-4";

/**
 * Nested Epic → Story tree: read-only **or** full structured editor. One component keeps layout
 * and Jira key alignment consistent between preview and edit.
 *
 * @param {object} props
 * @param {'read'|'edit'} [props.mode] — `read` = preview (default for existing call sites); `edit` = release description editor
 * @param {Array<{ title: string, epicDescriptionMarkdown: string, features: Array<{ name: string, bodyMarkdown: string }> }>} props.themes
 * @param {object} [props.jiraReleaseSync]
 * @param {string} [props.className]
 * @param {string} [props.epicAccordionClassName] — read mode: per-epic item
 * @param {boolean} [props.stopTriggerPropagation] — read mode: e.g. inside suggestion cards
 * @param {(themes: Array<{ title: string, epicDescriptionMarkdown: string, features: Array<{ name: string, bodyMarkdown: string }> }>) => void} [props.onChange] — required when mode is `edit`
 * @param {boolean} [props.showReleaseScopeToggles] — edit: exclude from saved release
 * @param {Set<string>} [props.excludedPaths]
 * @param {(updater: (prev: Set<string>) => Set<string>) => void} [props.onExcludedPathsChange]
 * @param {boolean} [props.singleEpicOnly] — edit: one epic only (e.g. suggestion card); hides add/remove epic
 * @param {string|number} [props.projectId] — edit: required to enable per-epic / per-story AI chat refinement
 * @param {boolean} [props.showStoryInclusionToggles] — edit: include story in apply/create payload
 * @param {Set<number>} [props.includedStoryIndexes]
 * @param {(updater: (prev: Set<number>) => Set<number>) => void} [props.onIncludedStoryIndexesChange]
 */
export function EpicStoryAccordion({
  mode = "read",
  themes: themesProp,
  jiraReleaseSync,
  className,
  epicAccordionClassName,
  stopTriggerPropagation = false,
  onChange,
  showReleaseScopeToggles = false,
  excludedPaths: excludedPathsProp,
  onExcludedPathsChange,
  singleEpicOnly = false,
  projectId,
  showStoryInclusionToggles = false,
  includedStoryIndexes: includedStoryIndexesProp,
  onIncludedStoryIndexesChange,
}) {
  /** Edit-mode AI chat target: { type: 'epic'|'story', epicIdx, storyIdx? } */
  const [chatTarget, setChatTarget] = useState(null);
  const aiChatEnabled = mode === "edit" && projectId != null;
  const isEdit = mode === "edit";

  const themes = isEdit
    ? Array.isArray(themesProp) && themesProp.length > 0
      ? themesProp
      : createEmptyThemes()
    : themesProp;

  const stop = stopTriggerPropagation
    ? (e) => {
        e.stopPropagation();
      }
    : undefined;

  if (!isEdit) {
    if (!themes?.length) {
      return (
        <p className="text-sm italic text-slate-500 dark:text-slate-400">
          No epics in this description.
        </p>
      );
    }

    return (
      <Accordion type="multiple" defaultValue={[]} className={cn("w-full space-y-3", className)}>
        {themes.map((theme, epicIdx) => {
          const epicValue = `epic-${epicIdx}`;
          const jiraEpic = jiraReleaseSync?.epics?.[epicIdx];
          const storyCount = (theme.features || []).length;
          return (
            <AccordionItem
              key={epicValue}
              value={epicValue}
              className={cn("border-b-0", epicCardClassName, epicAccordionClassName)}
            >
              <AccordionTrigger
                className="gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/40 hover:no-underline"
                onClick={stop}
              >
                <span className="flex min-w-0 flex-1 items-center gap-2.5">
                  <Badge variant="secondary" className={epicTierBadgeClassName}>
                    <Zap className="shrink-0" aria-hidden />
                    Epic
                  </Badge>
                  {jiraEpic?.key ? (
                    <JiraIssueLink issueKey={jiraEpic.key} url={jiraEpic.url} />
                  ) : null}
                  <span className="min-w-0 flex-1 text-base font-semibold leading-snug">
                    {theme.title?.trim() || "Untitled epic"}
                  </span>
                  {storyCount > 0 ? (
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {storyCount} {storyCount === 1 ? "story" : "stories"}
                    </span>
                  ) : null}
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 border-t border-border px-4 pb-4 pt-4">
                {theme.epicDescriptionMarkdown?.trim() ? (
                  <div className="rounded-lg bg-muted/30 px-3 py-2.5">
                    <AssistantMarkdown
                      text={theme.epicDescriptionMarkdown.trim()}
                      className="text-sm text-muted-foreground"
                    />
                  </div>
                ) : (
                  <p className="text-xs italic text-muted-foreground">No epic description.</p>
                )}
                {(theme.features || []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">No stories yet.</p>
                ) : (
                  <div className={storiesNestClassName}>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">Stories</p>
                    <Accordion type="multiple" defaultValue={[]} className="space-y-1.5">
                      {(theme.features || []).map((f, storyIdx) => {
                        const sv = `story-${epicIdx}-${storyIdx}`;
                        const jiraStory = jiraEpic?.stories?.[storyIdx];
                        return (
                          <AccordionItem
                            key={sv}
                            value={sv}
                            className="overflow-hidden rounded-lg border border-border/80 bg-background"
                          >
                            <AccordionTrigger
                              className="gap-2 px-3 py-2.5 text-left transition-colors hover:bg-muted/30 hover:no-underline"
                              onClick={stop}
                            >
                              <span className="flex min-w-0 flex-1 items-center gap-2">
                                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold tabular-nums text-muted-foreground">
                                  {storyIdx + 1}
                                </span>
                                {jiraStory?.key ? (
                                  <JiraIssueLink issueKey={jiraStory.key} url={jiraStory.url} />
                                ) : null}
                                <span className="min-w-0 text-sm font-medium leading-snug">
                                  {f.name?.trim() || "Untitled story"}
                                </span>
                              </span>
                            </AccordionTrigger>
                            <AccordionContent className="border-t border-border/60 px-3 pb-3 pt-2">
                              <AssistantMarkdown
                                text={f.bodyMarkdown?.trim() || ""}
                                className="text-sm text-muted-foreground"
                                emptyLabel="No description."
                              />
                            </AccordionContent>
                          </AccordionItem>
                        );
                      })}
                    </Accordion>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    );
  }

  /* mode === 'edit' */
  if (typeof onChange !== "function") {
    return null;
  }

  const excludedPaths = excludedPathsProp instanceof Set ? excludedPathsProp : new Set();

  const includedStoryIndexes =
    includedStoryIndexesProp instanceof Set ? includedStoryIndexesProp : new Set();

  const storyInclusionActive = showStoryInclusionToggles && includedStoryIndexesProp instanceof Set;

  const setStoryIncluded = (storyIdx, included) => {
    if (!onIncludedStoryIndexesChange) return;
    onIncludedStoryIndexesChange((prev) => {
      const base = prev instanceof Set ? prev : new Set();
      const next = new Set(base);
      if (included) next.add(storyIdx);
      else next.delete(storyIdx);
      return next;
    });
  };

  const applyExcludedUpdate = (mutate) => {
    if (!onExcludedPathsChange) return;
    onExcludedPathsChange((prev) => {
      const next = new Set(prev);
      mutate(next);
      return next;
    });
  };

  const setEpicExcluded = (epicIdx, excluded) => {
    const epicKey = releaseDescriptionEpicExcludedPath(epicIdx);
    applyExcludedUpdate((next) => {
      if (excluded) {
        next.add(epicKey);
        for (const k of [...next]) {
          if (k.startsWith(`${epicKey}:`)) next.delete(k);
        }
      } else {
        next.delete(epicKey);
      }
    });
  };

  const setStoryExcluded = (epicIdx, storyIdx, excluded) => {
    const storyKey = releaseDescriptionStoryExcludedPath(epicIdx, storyIdx);
    applyExcludedUpdate((next) => {
      if (excluded) next.add(storyKey);
      else next.delete(storyKey);
    });
  };

  const updateThemes = (next) => {
    onChange(next);
  };

  const resolvedChatTarget =
    chatTarget && themes[chatTarget.epicIdx]
      ? buildChatTargetPayload({ chatTarget, themes })
      : null;

  const handleChatConfirm = (suggestion) => {
    if (!chatTarget) return;
    const { type, epicIdx, storyIdx } = chatTarget;
    const next = themes.map((t, i) => {
      if (i !== epicIdx) return t;
      if (type === "epic") {
        return {
          ...t,
          title:
            typeof suggestion.title === "string" && suggestion.title.length > 0
              ? suggestion.title
              : t.title,
          epicDescriptionMarkdown:
            typeof suggestion.description === "string" && suggestion.description.length > 0
              ? suggestion.description
              : t.epicDescriptionMarkdown,
        };
      }
      const feats = (t.features || []).map((row, j) =>
        j === storyIdx
          ? {
              ...row,
              name:
                typeof suggestion.title === "string" && suggestion.title.length > 0
                  ? suggestion.title
                  : row.name,
              bodyMarkdown:
                typeof suggestion.description === "string" && suggestion.description.length > 0
                  ? suggestion.description
                  : row.bodyMarkdown,
            }
          : row,
      );
      return { ...t, features: feats };
    });
    updateThemes(next);
  };

  return (
    <div className={cn("space-y-3", className)}>
      <Accordion
        type="multiple"
        defaultValue={singleEpicOnly ? ["edit-epic-0"] : []}
        className="w-full space-y-3"
      >
        {themes.map((theme, epicIdx) => {
          const ev = `edit-epic-${epicIdx}`;
          const jiraEpic = jiraReleaseSync?.epics?.[epicIdx];
          const epicKey = releaseDescriptionEpicExcludedPath(epicIdx);
          const epicExcluded = excludedPaths.has(epicKey);
          const storyCount = (theme.features || []).length;
          return (
            <AccordionItem
              key={ev}
              value={ev}
              className={cn("border-b-0", epicCardClassName, epicExcluded && "opacity-60")}
            >
              <AccordionTrigger className="gap-3 px-4 py-3.5 hover:bg-muted/40 hover:no-underline">
                <span className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
                  <Badge variant="secondary" className={epicTierBadgeClassName}>
                    <Zap className="shrink-0" aria-hidden />
                    Epic
                  </Badge>
                  {jiraEpic?.key ? (
                    <JiraIssueLink issueKey={jiraEpic.key} url={jiraEpic.url} />
                  ) : null}
                  <span className="min-w-0 flex-1 truncate text-base font-semibold">
                    {theme.title?.trim() || `Epic ${epicIdx + 1}`}
                  </span>
                  {storyCount > 0 ? (
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {storyCount} {storyCount === 1 ? "story" : "stories"}
                    </span>
                  ) : null}
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 border-t border-border px-4 pb-4 pt-4">
                {showReleaseScopeToggles ? (
                  <div className="flex items-start gap-2.5 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                    <Checkbox
                      id={`release-scope-epic-${epicIdx}`}
                      checked={epicExcluded}
                      onCheckedChange={(v) => setEpicExcluded(epicIdx, v === true)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-0.5"
                    />
                    <label
                      htmlFor={`release-scope-epic-${epicIdx}`}
                      className="cursor-pointer select-none text-xs leading-snug text-muted-foreground"
                    >
                      <span className="font-medium text-foreground">
                        Exclude from saved release
                      </span>
                      <span className="text-muted-foreground">
                        {" "}
                        — Omits this epic and its stories when saving. Does not delete Jira issues.
                      </span>
                    </label>
                  </div>
                ) : null}
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Epic title</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={theme.title}
                        onChange={(e) => {
                          const next = themes.map((t, i) =>
                            i === epicIdx ? { ...t, title: e.target.value } : t,
                          );
                          updateThemes(next);
                        }}
                        placeholder="e.g. Payments reliability"
                        className="font-medium"
                      />
                      {aiChatEnabled ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="shrink-0 text-primary hover:bg-primary/10 hover:text-primary"
                              title="Refine this epic with AI"
                              onClick={() => setChatTarget({ type: "epic", epicIdx })}
                            >
                              <Sparkles className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            Refine title and description with AI
                          </TooltipContent>
                        </Tooltip>
                      ) : null}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Epic description</Label>
                    <MarkdownEditField
                      value={theme.epicDescriptionMarkdown}
                      onChange={(e) => {
                        const next = themes.map((t, i) =>
                          i === epicIdx ? { ...t, epicDescriptionMarkdown: e.target.value } : t,
                        );
                        updateThemes(next);
                      }}
                      rows={4}
                      className="min-h-[88px] resize-y text-sm"
                      placeholder="Pitch, client fit, risks — appears on the Jira epic"
                    />
                  </div>
                </div>
                <div className={storiesNestClassName}>
                  <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs font-medium text-muted-foreground">
                      Stories
                      {storyCount > 0 ? (
                        <span className="ml-1.5 tabular-nums text-muted-foreground/80">
                          ({storyCount})
                        </span>
                      ) : null}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 w-full gap-1 text-xs sm:w-auto"
                      onClick={() => {
                        const next = themes.map((t, i) =>
                          i === epicIdx
                            ? {
                                ...t,
                                features: [...t.features, { name: "", bodyMarkdown: "" }],
                              }
                            : t,
                        );
                        updateThemes(next);
                      }}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add story
                    </Button>
                  </div>
                  {(theme.features || []).map((f, storyIdx) => {
                    const jiraStory = jiraEpic?.stories?.[storyIdx];
                    const storyKey = releaseDescriptionStoryExcludedPath(epicIdx, storyIdx);
                    const storyExcluded = excludedPaths.has(storyKey);
                    const storyIncluded =
                      !storyInclusionActive || includedStoryIndexes.has(storyIdx);
                    return (
                      <Collapsible
                        key={`${epicIdx}-${storyIdx}`}
                        defaultOpen={Boolean(f.bodyMarkdown?.trim())}
                        className={cn(
                          "overflow-hidden rounded-lg border border-border bg-background transition-opacity",
                          storyExcluded && "opacity-60",
                          showStoryInclusionToggles && !storyIncluded && "opacity-45",
                        )}
                      >
                        <div className="flex items-center gap-2 px-3 py-2">
                          {showStoryInclusionToggles ? (
                            <Checkbox
                              id={`backlog-story-include-${epicIdx}-${storyIdx}`}
                              checked={storyIncluded}
                              onCheckedChange={(v) => setStoryIncluded(storyIdx, v === true)}
                              onClick={(e) => e.stopPropagation()}
                              aria-label={
                                storyIncluded
                                  ? "Included — click to exclude"
                                  : "Excluded — click to include"
                              }
                              className="shrink-0"
                            />
                          ) : null}
                          {showReleaseScopeToggles && !epicExcluded ? (
                            <Checkbox
                              id={`release-scope-story-${epicIdx}-${storyIdx}`}
                              checked={storyExcluded}
                              onCheckedChange={(v) =>
                                setStoryExcluded(epicIdx, storyIdx, v === true)
                              }
                              onClick={(e) => e.stopPropagation()}
                              aria-label="Exclude story from saved release"
                              className="shrink-0"
                            />
                          ) : null}
                          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold tabular-nums text-muted-foreground">
                            {storyIdx + 1}
                          </span>
                          {jiraStory?.key ? (
                            <JiraIssueLink
                              issueKey={jiraStory.key}
                              url={jiraStory.url}
                              className="shrink-0"
                            />
                          ) : null}
                          <Input
                            className="h-9 min-w-0 flex-1 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                            value={f.name}
                            onChange={(e) => {
                              const next = themes.map((t, i) => {
                                if (i !== epicIdx) return t;
                                const feats = t.features.map((row, j) =>
                                  j === storyIdx ? { ...row, name: e.target.value } : row,
                                );
                                return { ...t, features: feats };
                              });
                              updateThemes(next);
                            }}
                            placeholder="Story title"
                          />
                          <div className="flex shrink-0 items-center">
                            {aiChatEnabled ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-primary hover:bg-primary/10 hover:text-primary"
                                    title="Refine with AI"
                                    onClick={() =>
                                      setChatTarget({ type: "story", epicIdx, storyIdx })
                                    }
                                  >
                                    <Sparkles className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs">
                                  Refine title and description with AI
                                </TooltipContent>
                              </Tooltip>
                            ) : null}
                            <CollapsibleTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground [&[data-state=open]>svg]:rotate-180"
                                title="Toggle description"
                              >
                                <ChevronDown className="h-4 w-4 transition-transform duration-200" />
                              </Button>
                            </CollapsibleTrigger>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              disabled={(theme.features || []).length <= 1}
                              title="Remove story"
                              onClick={() => {
                                const next = themes.map((t, i) => {
                                  if (i !== epicIdx) return t;
                                  const feats = t.features.filter((_, j) => j !== storyIdx);
                                  return {
                                    ...t,
                                    features: feats.length
                                      ? feats
                                      : [{ name: "", bodyMarkdown: "" }],
                                  };
                                });
                                updateThemes(next);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                        <CollapsibleContent className="border-t border-border/60 px-3 pb-3 pt-2">
                          <MarkdownEditField
                            className="min-h-[64px] resize-y text-sm"
                            value={f.bodyMarkdown}
                            onChange={(e) => {
                              const next = themes.map((t, i) => {
                                if (i !== epicIdx) return t;
                                const feats = t.features.map((row, j) =>
                                  j === storyIdx ? { ...row, bodyMarkdown: e.target.value } : row,
                                );
                                return { ...t, features: feats };
                              });
                              updateThemes(next);
                            }}
                            placeholder="User value and acceptance notes (markdown)"
                          />
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })}
                </div>
                {singleEpicOnly ? null : (
                  <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1 text-xs"
                      title="Adds another Epic block to this release description (local draft only)."
                      onClick={() => {
                        updateThemes([
                          ...themes,
                          {
                            title: "",
                            epicDescriptionMarkdown: "",
                            features: [{ name: "", bodyMarkdown: "" }],
                          },
                        ]);
                      }}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add epic
                    </Button>
                    {themes.length > 1 ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1 text-xs text-destructive hover:text-destructive"
                            onClick={() => {
                              const next = themes.filter((_, i) => i !== epicIdx);
                              updateThemes(next);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Remove epic
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs text-xs">
                          Removes from release description only — does not change Jira.
                        </TooltipContent>
                      </Tooltip>
                    ) : null}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
      {aiChatEnabled && resolvedChatTarget ? (
        <EpicStoryChatSheet
          open={!!chatTarget}
          onOpenChange={(o) => {
            if (!o) setChatTarget(null);
          }}
          projectId={projectId}
          target={resolvedChatTarget}
          onConfirm={handleChatConfirm}
        />
      ) : null}
    </div>
  );
}

/**
 * Build the payload passed to the chat sheet from the current themes + selected target.
 * @param {object} args
 * @param {{ type: 'epic'|'story', epicIdx: number, storyIdx?: number }} args.chatTarget
 * @param {Array<{ title: string, epicDescriptionMarkdown: string, features: Array<{ name: string, bodyMarkdown: string }> }>} args.themes
 */
function buildChatTargetPayload({ chatTarget, themes }) {
  const epic = themes[chatTarget.epicIdx];
  if (!epic) return null;
  if (chatTarget.type === "epic") {
    const siblingNames = (epic.features || [])
      .map((f) => (typeof f?.name === "string" ? f.name.trim() : ""))
      .filter(Boolean);
    return {
      type: "epic",
      title: typeof epic.title === "string" ? epic.title : "",
      description:
        typeof epic.epicDescriptionMarkdown === "string" ? epic.epicDescriptionMarkdown : "",
      siblingNames,
    };
  }
  const story = (epic.features || [])[chatTarget.storyIdx];
  if (!story) return null;
  const epicTitle = typeof epic.title === "string" ? epic.title.trim() : "";
  const epicDesc =
    typeof epic.epicDescriptionMarkdown === "string" ? epic.epicDescriptionMarkdown.trim() : "";
  const epicContextLines = [];
  if (epicTitle) epicContextLines.push(`Title: ${epicTitle}`);
  if (epicDesc) {
    epicContextLines.push("");
    epicContextLines.push(epicDesc);
  }
  const siblingNames = (epic.features || [])
    .map((f, j) => (j !== chatTarget.storyIdx && typeof f?.name === "string" ? f.name.trim() : ""))
    .filter(Boolean);
  return {
    type: "story",
    title: typeof story.name === "string" ? story.name : "",
    description: typeof story.bodyMarkdown === "string" ? story.bodyMarkdown : "",
    epicContext: epicContextLines.join("\n"),
    siblingNames,
  };
}
