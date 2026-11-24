import { useCallback, useEffect, useRef, useState } from "react";
import {
  createBacklogEpic,
  createBacklogStory,
  deleteBacklogEpic,
  deleteBacklogStory,
  fetchBacklogEpics,
  updateBacklogEpic,
  updateBacklogStory,
} from "@/api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MarkdownEditField } from "@/components/MarkdownEditField";
import { EpicStoryChatSheet } from "@/components/ReleaseSuggestions/EpicStoryChatSheet";
import { epicTierBadgeClassName } from "@/components/ReleaseSuggestions/EpicStoryAccordion";
import { BacklogEpicAiSheet } from "../components/BacklogEpicAiSheet";
import {
  BacklogBoardControls,
  BacklogEpicMeta,
  BacklogStoryMeta,
  useBacklogBoardControls,
} from "../components/BacklogBoardControls";
import { cn } from "@/lib/utils";
import { ChevronDown, Loader2, Plus, Sparkles, Trash2, Zap } from "lucide-react";
import { toast } from "sonner";

const STATUS_OPTIONS = [
  { value: "backlog", label: "Backlog" },
  { value: "ready", label: "Ready" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
];

function BacklogBoardSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-busy="true" aria-label="Loading backlog">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

/** Local text state; PATCH only on blur (not while typing). */
function useBlurredField({ entityId, serverValue, onSave, saveErrorMessage }) {
  const [value, setValue] = useState(serverValue);
  const savedRef = useRef(serverValue);
  const focusedRef = useRef(false);
  const entityIdRef = useRef(entityId);
  const valueRef = useRef(serverValue);
  const onSaveRef = useRef(onSave);
  valueRef.current = value;
  onSaveRef.current = onSave;

  useEffect(() => {
    if (entityIdRef.current !== entityId) {
      entityIdRef.current = entityId;
      savedRef.current = serverValue;
      setValue(serverValue);
      focusedRef.current = false;
      return;
    }
    if (!focusedRef.current) {
      savedRef.current = serverValue;
      setValue(serverValue);
    }
  }, [entityId, serverValue]);

  const persistIfDirty = useCallback(async () => {
    if (valueRef.current === savedRef.current) return;
    const next = valueRef.current;
    const previous = savedRef.current;
    savedRef.current = next;
    try {
      await onSaveRef.current(next);
    } catch (err) {
      savedRef.current = previous;
      setValue(previous);
      toast.error(typeof err?.error === "string" ? err.error : saveErrorMessage);
      throw err;
    }
  }, [saveErrorMessage]);

  useEffect(() => {
    return () => {
      if (valueRef.current === savedRef.current) return;
      const next = valueRef.current;
      const previous = savedRef.current;
      savedRef.current = next;
      void Promise.resolve(onSaveRef.current(next)).catch((err) => {
        savedRef.current = previous;
        setValue(previous);
        toast.error(typeof err?.error === "string" ? err.error : saveErrorMessage);
      });
    };
  }, [entityId, saveErrorMessage]);

  return {
    value,
    onChange: (e) => setValue(e.target.value),
    onFocus: () => {
      focusedRef.current = true;
    },
    onBlur: () => {
      focusedRef.current = false;
      void persistIfDirty();
    },
    /** Apply AI or external updates without waiting for server round-trip. */
    syncValue: (next) => {
      const text = next == null ? "" : String(next);
      savedRef.current = text;
      setValue(text);
    },
  };
}

function StoryRow({
  story,
  storyIndex,
  epicDescription,
  projectId,
  disabled,
  onStoryPatch,
  onPersist,
  onDelete,
}) {
  const [chatOpen, setChatOpen] = useState(false);
  const [descOpen, setDescOpen] = useState(Boolean(story.body?.trim()));

  const titleField = useBlurredField({
    entityId: story.id,
    serverValue: story.title,
    saveErrorMessage: "Could not save story",
    onSave: async (title) => {
      onStoryPatch(story.id, { title });
      await onPersist({ title });
    },
  });

  const bodyField = useBlurredField({
    entityId: story.id,
    serverValue: story.body ?? "",
    saveErrorMessage: "Could not save story",
    onSave: async (body) => {
      onStoryPatch(story.id, { body });
      await onPersist({ body });
    },
  });

  return (
    <Collapsible open={descOpen} onOpenChange={setDescOpen}>
      <div className="overflow-hidden rounded-lg border border-border bg-background">
        <div className="flex flex-wrap items-center gap-2 px-3 py-2">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold tabular-nums text-muted-foreground">
            {storyIndex + 1}
          </span>
          <Input
            {...titleField}
            disabled={disabled}
            className="h-9 min-w-[10rem] flex-1 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            placeholder="Story title"
          />
          <div className="flex shrink-0 items-center gap-1.5">
            <Select
              value={story.type}
              onValueChange={async (v) => {
                onStoryPatch(story.id, { type: v });
                try {
                  await onPersist({ type: v });
                } catch (err) {
                  toast.error(typeof err?.error === "string" ? err.error : "Could not save story");
                }
              }}
              disabled={disabled}
            >
              <SelectTrigger className="h-8 w-[6.5rem] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="story">Story</SelectItem>
                <SelectItem value="task">Task</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={story.status}
              onValueChange={async (v) => {
                onStoryPatch(story.id, { status: v });
                try {
                  await onPersist({ status: v });
                } catch (err) {
                  toast.error(typeof err?.error === "string" ? err.error : "Could not save story");
                }
              }}
              disabled={disabled}
            >
              <SelectTrigger className="h-8 w-[7.5rem] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-primary hover:bg-primary/10 hover:text-primary"
              disabled={disabled}
              title="Refine with AI"
              onClick={() => setChatOpen(true)}
            >
              <Sparkles className="h-3.5 w-3.5" />
            </Button>
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
              onClick={onDelete}
              disabled={disabled}
              aria-label="Delete story"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <div className="px-3 pb-2 pl-11">
          <BacklogStoryMeta story={story} />
        </div>
        <CollapsibleContent className="border-t border-border/60 px-3 pb-3 pt-2">
          <MarkdownEditField
            {...bodyField}
            disabled={disabled}
            rows={2}
            className="min-h-[64px] resize-y text-sm"
            placeholder="Description (markdown supported)"
          />
        </CollapsibleContent>
      </div>
      <EpicStoryChatSheet
        open={chatOpen}
        onOpenChange={setChatOpen}
        projectId={projectId}
        target={{
          type: "story",
          title: titleField.value,
          description: bodyField.value,
          epicContext: epicDescription ?? "",
          siblingNames: [],
        }}
        onConfirm={async (suggestion) => {
          const title =
            typeof suggestion?.title === "string" && suggestion.title.trim()
              ? suggestion.title.trim()
              : titleField.value;
          const body =
            typeof suggestion?.description === "string" && suggestion.description.trim()
              ? suggestion.description.trim()
              : bodyField.value;
          titleField.syncValue(title);
          bodyField.syncValue(body);
          onStoryPatch(story.id, { title, body });
          try {
            await onPersist({ title, body });
            toast.success("Story updated from AI suggestion");
          } catch (err) {
            toast.error(typeof err?.error === "string" ? err.error : "Could not save story");
          }
        }}
      />
    </Collapsible>
  );
}

function EpicBlock({
  epic,
  projectId,
  onEpicPatch,
  onStoryPatch,
  onReload,
  disabled,
  onGenerateStories,
}) {
  const [open, setOpen] = useState(true);
  const [busy, setBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [epicChatOpen, setEpicChatOpen] = useState(false);
  const persistEpic = useCallback(
    async (patch) => {
      await updateBacklogEpic(projectId, epic.id, patch);
    },
    [projectId, epic.id],
  );

  const titleField = useBlurredField({
    entityId: epic.id,
    serverValue: epic.title,
    saveErrorMessage: "Could not save epic",
    onSave: async (title) => {
      onEpicPatch(epic.id, { title });
      await persistEpic({ title });
    },
  });

  const descriptionField = useBlurredField({
    entityId: epic.id,
    serverValue: epic.description ?? "",
    saveErrorMessage: "Could not save epic",
    onSave: async (description) => {
      onEpicPatch(epic.id, { description });
      await persistEpic({ description });
    },
  });

  const addStory = async () => {
    setBusy(true);
    try {
      await createBacklogStory(projectId, {
        epicId: epic.id,
        title: "New story",
        body: "",
      });
      await onReload();
    } catch (err) {
      toast.error(typeof err?.error === "string" ? err.error : "Could not add story");
    } finally {
      setBusy(false);
    }
  };

  const confirmDeleteEpic = async () => {
    setBusy(true);
    try {
      await deleteBacklogEpic(projectId, epic.id);
      await onReload();
      setDeleteOpen(false);
    } catch (err) {
      toast.error(typeof err?.error === "string" ? err.error : "Could not delete epic");
    } finally {
      setBusy(false);
    }
  };

  const rowDisabled = disabled || busy;
  const storyCount = (epic.stories ?? []).length;

  return (
    <Collapsible
      id={`backlog-epic-${epic.id}`}
      open={open}
      onOpenChange={setOpen}
      className="scroll-mt-4 overflow-hidden rounded-xl border border-border bg-card shadow-sm border-l-4 border-l-primary/45"
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/25 px-3 py-3 sm:px-4">
        <CollapsibleTrigger asChild>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0">
            <ChevronDown
              className={cn("h-4 w-4 transition-transform duration-200", open && "rotate-180")}
              aria-hidden
            />
          </Button>
        </CollapsibleTrigger>
        <Badge variant="secondary" className={epicTierBadgeClassName}>
          <Zap className="shrink-0" aria-hidden />
          Epic
        </Badge>
        <Input
          {...titleField}
          disabled={rowDisabled}
          className="h-9 min-w-[10rem] flex-1 border-0 bg-transparent font-semibold shadow-none focus-visible:ring-0"
        />
        <Select
          value={epic.status}
          onValueChange={async (v) => {
            onEpicPatch(epic.id, { status: v });
            try {
              await persistEpic({ status: v });
            } catch (err) {
              toast.error(typeof err?.error === "string" ? err.error : "Could not save epic");
            }
          }}
          disabled={rowDisabled}
        >
          <SelectTrigger className="h-8 w-[7.5rem] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {storyCount} {storyCount === 1 ? "story" : "stories"}
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 shrink-0 text-primary hover:bg-primary/10 hover:text-primary"
          disabled={rowDisabled}
          title="Refine epic with AI"
          onClick={() => setEpicChatOpen(true)}
        >
          <Sparkles className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={() => setDeleteOpen(true)}
          disabled={rowDisabled}
          aria-label="Delete epic"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
        <div className="basis-full">
          <BacklogEpicMeta epic={epic} />
        </div>
      </div>
      <CollapsibleContent className="space-y-4 px-4 py-4">
        <MarkdownEditField
          {...descriptionField}
          disabled={rowDisabled}
          rows={3}
          className="min-h-[72px] resize-y text-sm"
          placeholder="Epic description (markdown supported)"
        />
        <div className="ml-0.5 space-y-2 border-l-2 border-primary/15 pl-4">
          <p className="text-xs font-medium text-muted-foreground">
            Stories
            {storyCount > 0 ? (
              <span className="ml-1.5 tabular-nums text-muted-foreground/80">({storyCount})</span>
            ) : null}
          </p>
          {(epic.stories ?? []).map((story, storyIndex) => (
            <StoryRow
              key={story.id}
              story={story}
              storyIndex={storyIndex}
              epicDescription={descriptionField.value}
              projectId={projectId}
              disabled={rowDisabled}
              onStoryPatch={(storyId, patch) => onStoryPatch(epic.id, storyId, patch)}
              onPersist={(patch) => updateBacklogStory(projectId, story.id, patch)}
              onDelete={async () => {
                setBusy(true);
                try {
                  await deleteBacklogStory(projectId, story.id);
                  await onReload();
                } catch (err) {
                  toast.error(
                    typeof err?.error === "string" ? err.error : "Could not delete story",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-2 border-t border-border pt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={addStory}
            disabled={rowDisabled}
          >
            <Plus className="h-3.5 w-3.5" />
            Add story
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => onGenerateStories?.(epic)}
            disabled={rowDisabled}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Generate stories
          </Button>
        </div>
      </CollapsibleContent>

      <EpicStoryChatSheet
        open={epicChatOpen}
        onOpenChange={setEpicChatOpen}
        projectId={projectId}
        target={{
          type: "epic",
          title: titleField.value,
          description: descriptionField.value,
          siblingNames: (epic.stories ?? []).map((s) => s.title).filter(Boolean),
        }}
        onConfirm={async (suggestion) => {
          const title =
            typeof suggestion?.title === "string" && suggestion.title.trim()
              ? suggestion.title.trim()
              : titleField.value;
          const description =
            typeof suggestion?.description === "string" && suggestion.description.trim()
              ? suggestion.description.trim()
              : descriptionField.value;
          titleField.syncValue(title);
          descriptionField.syncValue(description);
          onEpicPatch(epic.id, { title, description });
          try {
            await persistEpic({ title, description });
            toast.success("Epic updated from AI suggestion");
          } catch (err) {
            toast.error(typeof err?.error === "string" ? err.error : "Could not save epic");
          }
        }}
      />

      <Dialog
        open={deleteOpen}
        onOpenChange={(next) => {
          if (!busy) setDeleteOpen(next);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete epic?</DialogTitle>
            <DialogDescription className="text-left leading-relaxed">
              Delete epic{" "}
              <span className="font-medium text-foreground">
                &ldquo;{titleField.value.trim() || "Untitled epic"}&rdquo;
              </span>{" "}
              and all {(epic.stories ?? []).length}{" "}
              {(epic.stories ?? []).length === 1 ? "story" : "stories"}? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void confirmDeleteEpic()}
              disabled={busy}
            >
              {busy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  Deleting…
                </>
              ) : (
                "Delete epic"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Collapsible>
  );
}

export function BacklogBoardPanel({ projectId, jiraReady, onOpenSuggestions }) {
  const [loading, setLoading] = useState(true);
  const [epics, setEpics] = useState([]);
  const [creating, setCreating] = useState(false);
  const [aiCreateOpen, setAiCreateOpen] = useState(false);
  const [aiAddStoriesEpic, setAiAddStoriesEpic] = useState(null);
  const board = useBacklogBoardControls(epics, projectId);

  const load = useCallback(
    async ({ showSpinner = false } = {}) => {
      if (!projectId || jiraReady) return;
      if (showSpinner) setLoading(true);
      try {
        const data = await fetchBacklogEpics(projectId);
        setEpics(data.epics ?? []);
      } catch (err) {
        toast.error(typeof err?.error === "string" ? err.error : "Failed to load backlog");
      } finally {
        if (showSpinner) setLoading(false);
      }
    },
    [projectId, jiraReady],
  );

  useEffect(() => {
    void load({ showSpinner: true });
  }, [load]);

  const patchEpicLocally = useCallback((epicId, patch) => {
    setEpics((prev) => prev.map((e) => (e.id === epicId ? { ...e, ...patch } : e)));
  }, []);

  const patchStoryLocally = useCallback((epicId, storyId, patch) => {
    setEpics((prev) =>
      prev.map((e) => {
        if (e.id !== epicId) return e;
        return {
          ...e,
          stories: (e.stories ?? []).map((s) => (s.id === storyId ? { ...s, ...patch } : s)),
        };
      }),
    );
  }, []);

  const addEpic = async () => {
    setCreating(true);
    try {
      const created = await createBacklogEpic(projectId, {
        title: "New epic",
        description: "",
      });
      await load();
      toast.success("Epic added successfully.");
      const epicId = created?.id;
      if (epicId != null) {
        requestAnimationFrame(() => {
          document
            .getElementById(`backlog-epic-${epicId}`)
            ?.scrollIntoView({ behavior: "smooth", block: "center" });
        });
      }
    } catch (err) {
      toast.error(typeof err?.error === "string" ? err.error : "Could not create epic");
    } finally {
      setCreating(false);
    }
  };

  if (jiraReady) {
    return (
      <Alert>
        <AlertTitle>Backlog managed in Jira</AlertTitle>
        <AlertDescription className="space-y-3">
          <p>
            This project uses Jira for epics and stories. Use Suggestions to generate epics and
            stories in Jira, then compose releases from Jira issues.
          </p>
          <Button type="button" size="sm" className="gap-2" onClick={onOpenSuggestions}>
            <Sparkles className="h-3.5 w-3.5" />
            Open suggestions
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (loading) {
    return <BacklogBoardSkeleton />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Product backlog</h2>
          <p className="text-sm text-muted-foreground">
            Organize work as epics and stories before adding them to releases.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={onOpenSuggestions}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Suggestions
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setAiCreateOpen(true)}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Create with AI
          </Button>
          <Button type="button" size="sm" className="gap-2" onClick={addEpic} disabled={creating}>
            <Plus className="h-3.5 w-3.5" />
            Add epic
          </Button>
        </div>
      </div>

      <BacklogEpicAiSheet
        open={aiCreateOpen}
        onOpenChange={setAiCreateOpen}
        projectId={projectId}
        mode="create"
        onCreated={() => void load()}
      />
      <BacklogEpicAiSheet
        open={!!aiAddStoriesEpic}
        onOpenChange={(next) => {
          if (!next) setAiAddStoriesEpic(null);
        }}
        projectId={projectId}
        mode="add_stories"
        existingEpic={
          aiAddStoriesEpic
            ? {
                id: aiAddStoriesEpic.id,
                title: aiAddStoriesEpic.title,
                description: aiAddStoriesEpic.description ?? "",
              }
            : undefined
        }
        onCreated={() => {
          setAiAddStoriesEpic(null);
          void load();
        }}
      />

      {epics.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center space-y-4">
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            No epics yet. Add one manually or generate suggestions from Discovery Capture using
            Suggestions.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() => setAiCreateOpen(true)}
            >
              <Sparkles className="h-4 w-4" />
              Create with AI
            </Button>
            <Button type="button" variant="outline" className="gap-2" onClick={onOpenSuggestions}>
              <Sparkles className="h-4 w-4" />
              Generate from Capture
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <BacklogBoardControls board={board} />
          {board.visible.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center">
              <p className="text-sm text-muted-foreground">No epics match these filters.</p>
            </div>
          ) : (
            board.visible.map((epic) => (
              <EpicBlock
                key={epic.id}
                epic={epic}
                projectId={projectId}
                onEpicPatch={patchEpicLocally}
                onStoryPatch={patchStoryLocally}
                onReload={load}
                disabled={false}
                onGenerateStories={setAiAddStoriesEpic}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
