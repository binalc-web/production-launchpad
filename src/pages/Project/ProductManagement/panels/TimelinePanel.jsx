import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { uploadDiscoveryDocument } from "@/api";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  ClipboardList,
  CloudUpload,
  Globe,
  Loader2,
  MessageSquare,
  Mic,
  Plus,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import { useClientInfoContext } from "@/pages/Project/ClientInfo/hooks/useClientInfoContext";
import { HubMeetingsPicker } from "@/pages/Project/ClientInfo/components/HubMeetingsPicker";
import { GranolaNotesPicker } from "@/pages/Project/ClientInfo/components/GranolaNotesPicker";
import { ConfluenceImportPanel } from "@/pages/Project/ClientInfo/components/ConfluenceImportPanel";
import {
  isConfluenceTimelineEntry,
  isGranolaTimelineEntry,
  isWebsiteEnrichTimelineEntry,
  TIMELINE_FILTERS,
  TIMELINE_EMPTY_STATES,
  TIMELINE_PAGE_SIZE,
} from "../constants";
import { TimelineEntryCard } from "../components/TimelineEntryCard";
import { WriteNoteDialog } from "../components/WriteNoteDialog";
import { WebsiteEnrichDialog } from "../components/WebsiteEnrichDialog";
import { EmptyState } from "../components/EmptyState";
import { QuestionnaireWorkspace } from "../components/QuestionnaireWorkspace";

export function TimelinePanel({ filter: controlledFilter, onFilterChange }) {
  const { projectId, hubProjectId, clientDetails, refresh } = useClientInfoContext();
  const [internalFilter, setInternalFilter] = useState("all");
  const filter = controlledFilter ?? internalFilter;
  const setFilter = onFilterChange ?? setInternalFilter;
  const [uploading, setUploading] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [websiteOpen, setWebsiteOpen] = useState(false);
  const [hubOpen, setHubOpen] = useState(false);
  const [granolaOpen, setGranolaOpen] = useState(false);
  const [confluenceOpen, setConfluenceOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(TIMELINE_PAGE_SIZE);
  const inputRef = useRef(null);
  const questionnaireRef = useRef(null);

  useEffect(() => {
    setVisibleCount(TIMELINE_PAGE_SIZE);
  }, [filter]);

  const entries = useMemo(() => {
    const list = clientDetails?.timeline || [];
    const sorted = [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (filter === "all") return sorted;
    if (filter === "questionnaires") return [];
    if (filter === "granola") return sorted.filter((e) => isGranolaTimelineEntry(e));
    if (filter === "confluence") return sorted.filter((e) => isConfluenceTimelineEntry(e));
    if (filter === "website") return sorted.filter((e) => isWebsiteEnrichTimelineEntry(e));
    if (filter === "text_note") {
      return sorted.filter(
        (e) =>
          e.type === "text_note" && !isGranolaTimelineEntry(e) && !isConfluenceTimelineEntry(e),
      );
    }
    return sorted.filter((e) => e.type === filter);
  }, [clientDetails?.timeline, filter]);

  const visibleEntries = useMemo(() => entries.slice(0, visibleCount), [entries, visibleCount]);

  const hasMoreEntries = visibleCount < entries.length;

  const isSupportedUpload = (file) => {
    const name = file?.name?.toLowerCase() || "";
    const type = file?.type || "";
    return (
      name.endsWith(".txt") ||
      name.endsWith(".md") ||
      name.endsWith(".markdown") ||
      name.endsWith(".pdf") ||
      type === "text/plain" ||
      type === "text/markdown" ||
      type === "text/x-markdown" ||
      type === "application/pdf"
    );
  };

  const handleUpload = useCallback(
    async (files) => {
      if (!files?.length) return;
      setUploading(true);
      try {
        for (const file of files) {
          if (!isSupportedUpload(file)) {
            toast.error("Only .txt, .md, and .pdf files are supported");
            continue;
          }
          await uploadDiscoveryDocument(projectId, file);
        }
        await refresh({ silent: true });
        toast.success("Uploaded to timeline — profiles updating in background");
      } catch (err) {
        toast.error(err?.error || "Upload failed");
      } finally {
        setUploading(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [projectId, refresh],
  );

  const openNewQuestionnaire = useCallback(() => {
    setFilter("questionnaires");
    requestAnimationFrame(() => questionnaireRef.current?.openCreateDialog());
  }, [setFilter]);

  const handleTimelineRefresh = useCallback(() => refresh({ silent: true }), [refresh]);

  const emptyConfig = TIMELINE_EMPTY_STATES[filter] || TIMELINE_EMPTY_STATES.all;
  const EmptyIcon = emptyConfig.icon;

  const emptyAction = (() => {
    switch (emptyConfig.actionKey) {
      case "note":
        return (
          <Button type="button" size="sm" onClick={() => setNoteOpen(true)}>
            {emptyConfig.actionLabel}
          </Button>
        );
      case "upload":
        return (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => inputRef.current?.click()}
          >
            {emptyConfig.actionLabel}
          </Button>
        );
      case "website":
        return (
          <Button type="button" size="sm" variant="outline" onClick={() => setWebsiteOpen(true)}>
            {emptyConfig.actionLabel}
          </Button>
        );
      case "hub":
        return (
          <Button type="button" size="sm" variant="outline" onClick={() => setHubOpen(true)}>
            {emptyConfig.actionLabel}
          </Button>
        );
      case "granola":
        return (
          <Button type="button" size="sm" variant="outline" onClick={() => setGranolaOpen(true)}>
            {emptyConfig.actionLabel}
          </Button>
        );
      case "confluence":
        return (
          <Button type="button" size="sm" variant="outline" onClick={() => setConfluenceOpen(true)}>
            {emptyConfig.actionLabel}
          </Button>
        );
      case "questionnaire":
        return (
          <Button type="button" size="sm" onClick={openNewQuestionnaire}>
            {emptyConfig.actionLabel}
          </Button>
        );
      default:
        return null;
    }
  })();

  const showQuestionnaireWorkspace = filter === "questionnaires";

  const addActionsBar = (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" size="sm" className="gap-2 w-full sm:w-auto">
            <Plus className="size-4" />
            Add
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onSelect={() => setNoteOpen(true)}>
            <MessageSquare className="size-4 mr-2" />
            Write note
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => inputRef.current?.click()} disabled={uploading}>
            <CloudUpload className="size-4 mr-2" />
            Upload file (.txt, .md, .pdf)
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setWebsiteOpen(true)}>
            <Globe className="size-4 mr-2" />
            Enrich website
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              setHubOpen(true);
              setGranolaOpen(false);
              setConfluenceOpen(false);
            }}
          >
            <Video className="size-4 mr-2" />
            Link Hub meeting
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              setGranolaOpen(true);
              setHubOpen(false);
              setConfluenceOpen(false);
            }}
          >
            <Mic className="size-4 mr-2" />
            Import Granola meeting
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              setConfluenceOpen(true);
              setHubOpen(false);
              setGranolaOpen(false);
            }}
          >
            <BookOpen className="size-4 mr-2" />
            Import Confluence page
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={openNewQuestionnaire}>
            <ClipboardList className="size-4 mr-2" />
            New questionnaire
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".txt,.md,.markdown,.pdf,text/plain,text/markdown,application/pdf"
        multiple
        onChange={(e) => handleUpload(e.target.files)}
      />
    </>
  );

  const filterChips = (
    <div className="flex flex-col gap-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Filter
      </p>
      <div className="flex flex-wrap gap-1 lg:flex-col lg:items-stretch">
        {TIMELINE_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors lg:rounded-md lg:px-3 lg:py-1.5 lg:text-left lg:text-xs",
              filter === f.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );

  const timelineMain = (
    <>
      {hubOpen ? (
        <HubMeetingsPicker
          projectId={projectId}
          hubProjectId={hubProjectId}
          onIngested={() => {
            refresh({ silent: true });
            setFilter("hub_meeting");
          }}
          disabled={uploading}
        />
      ) : null}

      {granolaOpen ? (
        <GranolaNotesPicker
          projectId={projectId}
          onImported={() => {
            refresh({ silent: true });
            setGranolaOpen(false);
            setFilter("granola");
          }}
          disabled={uploading}
        />
      ) : null}

      {confluenceOpen ? (
        <ConfluenceImportPanel
          projectId={projectId}
          onImported={() => {
            refresh({ silent: true });
            setConfluenceOpen(false);
            setFilter("confluence");
          }}
          disabled={uploading}
        />
      ) : null}

      {showQuestionnaireWorkspace ? (
        <QuestionnaireWorkspace ref={questionnaireRef} />
      ) : entries.length === 0 ? (
        <EmptyState
          icon={EmptyIcon}
          title={emptyConfig.title}
          description={emptyConfig.description}
          action={emptyAction}
        />
      ) : (
        <div className="pt-2">
          {visibleEntries.map((entry) => (
            <TimelineEntryCard
              key={entry.id}
              entry={entry}
              projectId={projectId}
              onRefresh={handleTimelineRefresh}
            />
          ))}
          {hasMoreEntries ? (
            <div className="flex justify-center pb-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setVisibleCount((c) => Math.min(c + TIMELINE_PAGE_SIZE, entries.length))
                }
              >
                View more ({entries.length - visibleCount} remaining)
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </>
  );

  return (
    <div className="w-full space-y-4 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(280px,22rem)] lg:gap-6 lg:space-y-0 lg:items-start">
      <div className="min-w-0 space-y-4 order-2 lg:order-1">{timelineMain}</div>

      <div className="space-y-4 lg:sticky lg:top-4 lg:self-start order-1 lg:order-2">
        <div className="ds-inset space-y-4 rounded-xl p-3">
          {addActionsBar}
          {filterChips}
        </div>
      </div>

      <WriteNoteDialog
        open={noteOpen}
        onOpenChange={setNoteOpen}
        projectId={projectId}
        onSaved={() => refresh({ silent: true })}
      />
      <WebsiteEnrichDialog
        open={websiteOpen}
        onOpenChange={setWebsiteOpen}
        projectId={projectId}
        onSaved={() => refresh({ silent: true })}
      />
    </div>
  );
}
