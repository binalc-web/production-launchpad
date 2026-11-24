import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchProjectById } from "@/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { PrdEditor } from "@/pages/Project/PrdWorkspace/PrdEditor";
import { emptyPrdDocContent } from "@/pages/Project/PrdWorkspace/editor/prdContentHash";
import { EXPORT_DESTINATIONS } from "@/pages/Project/PrdWorkspace/export/exportRegistry";
import {
  createWorkspaceDocumentRevision,
  exportWorkspaceDocument,
  fetchWorkspaceDocumentRevision,
  fetchWorkspaceDocumentRevisions,
  generateWorkspaceDocumentFromSelection,
  linkWorkspaceDocumentJiraIssue,
  listConfluenceSpaces,
  restoreWorkspaceDocumentRevision,
  regenerateWorkspaceDocument,
  chatWorkspaceDocument,
  rewriteCaptureImport,
  resolveDiscoveryCaptureContext,
} from "@/api";
import { usePaginatedJiraTickets } from "@/hooks/usePaginatedJiraTickets";
import { ConfluenceSpacePicker } from "./ConfluenceSpacePicker";
import {
  Bookmark,
  FileDown,
  FileInput,
  FileUp,
  History,
  Link2,
  ListPlus,
  Loader2,
  MessageSquare,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { JiraIssueLink } from "@/components/ReleaseSuggestions/JiraIssueLink";
import { JiraProjectBadge } from "@/components/jira/JiraProjectBadge";
import { useClientInfoContext } from "@/pages/Project/ClientInfo/hooks/useClientInfoContext";
import { ProfileInsertSheet } from "../components/ProfileInsertSheet";
import { DocumentSkillBar } from "../components/DocumentSkillBar";
import { CaptureContextSheet } from "../components/CaptureContextSheet";
import { PrdChatPanel } from "@/pages/Project/PrdWorkspace/PrdChatPanel";
import { useProjectDiscoveryBridge } from "@/pages/Project/hooks/useProjectDiscoveryBridge";
import { useBlurredField } from "@/hooks/useBlurredField";

function parseBasicMarkdownToTipTap(md) {
  const lines = String(md || "").split("\n");
  const content = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      content.push({
        type: "heading",
        attrs: { level: heading[1].length },
        content: [{ type: "text", text: heading[2] }],
      });
      continue;
    }
    if (trimmed.startsWith("- ")) {
      content.push({
        type: "bulletList",
        content: [
          {
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: trimmed.slice(2) }],
              },
            ],
          },
        ],
      });
      continue;
    }
    content.push({
      type: "paragraph",
      content: [{ type: "text", text: trimmed }],
    });
  }
  return {
    type: "doc",
    content: content.length ? content : [{ type: "paragraph" }],
  };
}

function ToolbarDivider() {
  return <div className="h-5 w-px shrink-0 bg-border mx-0.5" aria-hidden />;
}

function versionDisplayLabel(entry, { isOriginal = false } = {}) {
  if (isOriginal) return "Original";
  if (entry?.changeSummary) return entry.changeSummary;
  if (entry?.revisionNumber) return `Revision ${entry.revisionNumber}`;
  return "Version";
}

export function DocumentEditorChrome({
  projectId,
  activeDoc,
  saving,
  onEditorUpdate,
  onDocumentApplied,
  onReload,
  onRename,
  onSkillChange,
  onEditorBlur,
  flushPendingSave,
}) {
  const [, setSearchParams] = useSearchParams();
  const { setBacklogSuggestionBootstrap } = useProjectDiscoveryBridge();
  const nameField = useBlurredField({
    entityId: activeDoc?.id,
    serverValue: activeDoc?.name ?? "",
    onSave: onRename,
    saveErrorMessage: "Failed to rename document",
  });
  const [selectionText, setSelectionText] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [originalSnapshot, setOriginalSnapshot] = useState(null);
  const [revisions, setRevisions] = useState([]);
  const [revisionsLoading, setRevisionsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [jiraOpen, setJiraOpen] = useState(false);
  const [jiraSearch, setJiraSearch] = useState("");
  const [manualJiraKey, setManualJiraKey] = useState("");
  const [jiraReady, setJiraReady] = useState(false);
  const [jiraStatusHint, setJiraStatusHint] = useState("");

  const {
    tickets: jiraTickets,
    loading: jiraLoading,
    loadingMore: jiraLoadingMore,
    hasMore: jiraHasMore,
    projectKey: jiraProjectKey,
    sentinelRef: jiraSentinelRef,
  } = usePaginatedJiraTickets({
    projectId,
    enabled: jiraReady,
    isActive: jiraOpen,
    resetKey: `${projectId}:${jiraOpen}`,
    includeEpic: true,
    includeStory: true,
    includeTask: true,
    search: jiraSearch,
  });
  const [profileInsertOpen, setProfileInsertOpen] = useState(false);
  const [confluenceOpen, setConfluenceOpen] = useState(false);
  const [confluenceSpaces, setConfluenceSpaces] = useState([]);
  const [confluenceSpacesLoading, setConfluenceSpacesLoading] = useState(false);
  const [confluenceSpaceId, setConfluenceSpaceId] = useState("");
  const [confluenceSpaceKey, setConfluenceSpaceKey] = useState("");
  const [confluenceParentPageId, setConfluenceParentPageId] = useState("");
  const [confluencePickerSession, setConfluencePickerSession] = useState(0);
  const [nameVersionOpen, setNameVersionOpen] = useState(false);
  const [versionName, setVersionName] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewEntry, setPreviewEntry] = useState(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareEntry, setCompareEntry] = useState(null);
  const [captureSheetOpen, setCaptureSheetOpen] = useState(false);
  const [captureSheetDefaultMode, setCaptureSheetDefaultMode] = useState("as_is");
  const [chatOpen, setChatOpen] = useState(false);
  const fileInputRef = useRef(null);
  const editorRef = useRef(null);
  const profileInsertRangeRef = useRef(null);
  const captureInsertRangeRef = useRef(null);
  const confluenceInFlightRef = useRef(false);
  const { clientDetails } = useClientInfoContext();

  const captureEntryCount = useMemo(() => {
    const list = Array.isArray(clientDetails?.timeline) ? clientDetails.timeline : [];
    return list.length;
  }, [clientDetails?.timeline]);

  const openCaptureSheet = useCallback(({ defaultMode = "as_is" } = {}) => {
    setCaptureSheetDefaultMode(defaultMode);
    setCaptureSheetOpen(true);
  }, []);

  const insertCaptureContent = useCallback(
    (tipTapDoc) => {
      const editor = editorRef.current;
      const range = captureInsertRangeRef.current;
      const nodes = Array.isArray(tipTapDoc?.content)
        ? tipTapDoc.content
        : Array.isArray(tipTapDoc)
          ? tipTapDoc
          : [{ type: "paragraph", content: [{ type: "text", text: "" }] }];

      if (editor) {
        const chain = editor.chain().focus();
        if (range) {
          chain.deleteRange(range);
        }
        chain.insertContent(nodes).run();
      } else {
        const existing = activeDoc?.content || emptyPrdDocContent();
        onEditorUpdate({
          type: "doc",
          content: [...(existing.content || []), ...nodes],
        });
      }
      captureInsertRangeRef.current = null;
    },
    [activeDoc?.content, onEditorUpdate],
  );

  const extraSlashCommands = useMemo(
    () => [
      {
        title: "Profile",
        description: "Insert information from discovery profiles",
        searchTerms: ["profile", "persona", "client", "company", "competitors", "product"],
        command: ({ range }) => {
          profileInsertRangeRef.current = range;
          setProfileInsertOpen(true);
        },
      },
      {
        title: "Capture import",
        description: "Import discovery capture — as-is, rewritten, or full regen",
        searchTerms: ["capture", "import", "rewrite", "regenerate"],
        command: ({ range }) => {
          captureInsertRangeRef.current = range;
          openCaptureSheet({ defaultMode: "rewrite" });
        },
      },
    ],
    [openCaptureSheet],
  );

  const handleProfileInsert = useCallback((content) => {
    const editor = editorRef.current;
    const range = profileInsertRangeRef.current;
    if (!editor || !range) return;
    editor
      .chain()
      .focus()
      .deleteRange(range)
      .insertContent(content?.content || content)
      .run();
    profileInsertRangeRef.current = null;
  }, []);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    fetchProjectById(projectId)
      .then((project) => {
        if (cancelled) return;
        const linked = Boolean(project?.jiraConnectionId);
        setJiraReady(linked);
        if (!linked) {
          setJiraStatusHint(
            "Connect Jira for this project under Integrations in Project settings.",
          );
        } else {
          setJiraStatusHint("");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setJiraReady(false);
          setJiraStatusHint("");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const editorDoc = {
    content: activeDoc?.content || emptyPrdDocContent(),
    title: activeDoc?.name,
  };

  const runAction = async (fn) => {
    setActionLoading(true);
    try {
      await fn();
    } catch (err) {
      const msg =
        typeof err?.error === "string"
          ? err.error
          : typeof err?.message === "string"
            ? err.message
            : "Action failed";
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const loadRevisions = useCallback(async () => {
    if (!projectId || !activeDoc?.id) return;
    setRevisionsLoading(true);
    try {
      const data = await fetchWorkspaceDocumentRevisions(projectId, activeDoc.id);
      setOriginalSnapshot(data.original || null);
      setRevisions(data.revisions || []);
    } catch (err) {
      toast.error(err?.error || "Failed to load revisions");
    } finally {
      setRevisionsLoading(false);
    }
  }, [projectId, activeDoc?.id]);

  const openHistory = () => {
    setHistoryOpen(true);
    loadRevisions();
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(editorDoc.content, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(activeDoc?.name || "document").replace(/\s+/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openConfluenceDialog = useCallback(() => {
    if (!jiraReady) {
      toast.error(
        jiraStatusHint || "Connect Atlassian under Connected accounts to export to Confluence.",
      );
      return;
    }
    setConfluenceSpaces([]);
    setConfluenceSpaceId("");
    setConfluenceSpaceKey("");
    setConfluencePickerSession((n) => n + 1);
    setConfluenceOpen(true);
  }, [jiraReady, jiraStatusHint]);

  useEffect(() => {
    if (!confluenceOpen || !projectId || !jiraReady) return;
    if (confluenceInFlightRef.current) return;
    confluenceInFlightRef.current = true;
    let cancelled = false;
    setConfluenceSpacesLoading(true);
    listConfluenceSpaces(projectId)
      .then((data) => {
        if (cancelled) return;
        setConfluenceSpaces(data?.spaces || []);
      })
      .catch((err) => {
        if (cancelled) return;
        toast.error(err?.error || "Failed to load Confluence spaces");
        setConfluenceOpen(false);
      })
      .finally(() => {
        confluenceInFlightRef.current = false;
        if (!cancelled) setConfluenceSpacesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [confluenceOpen, projectId, jiraReady]);

  const runExport = useCallback(
    async (destinationId) => {
      const dest = EXPORT_DESTINATIONS.find((d) => d.id === destinationId);
      if (!dest) return;
      await dest.export({
        doc: editorDoc,
        projectId,
        docId: activeDoc?.id,
        options: {
          exportJson: handleExportJson,
          openConfluenceDialog,
        },
      });
    },
    [activeDoc?.id, editorDoc, openConfluenceDialog, projectId],
  );

  const exportToConfluence = () =>
    runAction(async () => {
      const existingLink = (activeDoc?.confluenceLinks || []).at(-1);
      if (!confluenceSpaceId && !existingLink?.pageId) {
        toast.error("Select a Confluence space");
        return;
      }
      const data = await exportWorkspaceDocument(projectId, activeDoc.id, {
        destination: "confluence",
        spaceId: confluenceSpaceId || existingLink?.spaceId,
        spaceKey:
          confluenceSpaceKey ||
          confluenceSpaces.find((s) => s.id === confluenceSpaceId)?.key ||
          existingLink?.spaceKey,
        parentPageId: confluenceParentPageId.trim() || undefined,
      });
      onDocumentApplied?.(data.document);
      setConfluenceOpen(false);
      toast.success("Exported to Confluence");
    });

  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || "");
        if (file.name.endsWith(".json")) {
          const json = JSON.parse(text);
          onEditorUpdate(json?.content ? json.content : json);
        } else {
          onEditorUpdate(parseBasicMarkdownToTipTap(text));
        }
        toast.success("Document imported");
      } catch {
        toast.error("Invalid import file");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const createFromSelection = () =>
    runAction(async () => {
      const data = await generateWorkspaceDocumentFromSelection(projectId, activeDoc.id, {
        selectionText,
      });
      onDocumentApplied?.(data.document);
      await onReload?.();
      toast.success("New document created from selection");
    });

  const handleRegenerateFromCapture = (body) =>
    runAction(async () => {
      await flushPendingSave?.();
      const data = await regenerateWorkspaceDocument(projectId, activeDoc.id, body);
      onDocumentApplied?.(data.document);
      captureInsertRangeRef.current = null;
      setCaptureSheetOpen(false);
      toast.success("Document regenerated from capture");
    });

  const handleCaptureImport = ({ mode, ...body }) => {
    if (mode === "regenerate") {
      return handleRegenerateFromCapture(body);
    }

    return runAction(async () => {
      await flushPendingSave?.();

      if (mode === "as_is") {
        const data = await resolveDiscoveryCaptureContext(projectId, {
          selectedCaptureEntryIds: body.selectedCaptureEntryIds,
          captureContextText: body.captureContextText,
        });
        insertCaptureContent(parseBasicMarkdownToTipTap(data.captureContextText));
        setCaptureSheetOpen(false);
        toast.success("Capture inserted");
        return;
      }

      if (mode === "rewrite") {
        const data = await rewriteCaptureImport(projectId, activeDoc.id, body);
        insertCaptureContent(data.content);
        setCaptureSheetOpen(false);
        toast.success("Rewritten capture inserted");
      }
    });
  };

  const openDocumentChat = useCallback(() => {
    setChatOpen(true);
  }, []);

  const handleDocumentChat = useCallback(
    async ({ message, conversationHistory, selectionText: sel, attachmentIds }) => {
      setActionLoading(true);
      try {
        await flushPendingSave?.();
        const data = await chatWorkspaceDocument(projectId, activeDoc.id, {
          message,
          conversationHistory,
          selectionText: (sel || selectionText || "").trim() || undefined,
          ...(Array.isArray(attachmentIds) && attachmentIds.length ? { attachmentIds } : {}),
        });
        if (data?.action === "clarify") {
          return { reply: data.reply, action: "clarify" };
        }
        onDocumentApplied?.(data.document);
        toast.success("Document updated");
        return { reply: data.reply, action: "edit" };
      } catch (err) {
        const msg =
          typeof err?.error === "string"
            ? err.error
            : typeof err?.message === "string"
              ? err.message
              : "AI edit failed";
        toast.error(msg);
        throw err;
      } finally {
        setActionLoading(false);
      }
    },
    [activeDoc?.id, flushPendingSave, onDocumentApplied, projectId, selectionText],
  );

  const navigateToBacklogSuggestions = () => {
    const text = selectionText.trim();
    if (!text) return;
    setBacklogSuggestionBootstrap({
      manualContextText: `## Document selection\n${text}`,
      sourceDocId: activeDoc?.id,
      sourceDocName: activeDoc?.name,
    });
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("section", "backlog");
        next.set("area", "suggestions");
        return next;
      },
      { replace: true },
    );
    toast.message("Your selection is ready — click Generate suggestions.");
  };

  const openJiraLinkDialog = () => {
    setJiraOpen(true);
    setJiraSearch("");
  };

  const linkManualJira = () =>
    runAction(async () => {
      const issueKey = manualJiraKey.trim().toUpperCase();
      if (!issueKey) {
        toast.error("Enter a Jira issue key");
        return;
      }
      const data = await linkWorkspaceDocumentJiraIssue(projectId, activeDoc.id, { issueKey });
      onDocumentApplied?.(data.document);
      setJiraOpen(false);
      setManualJiraKey("");
      toast.success(`Linked ${data.jiraLink?.issueKey}`);
    });

  const linkJira = (ticket) =>
    runAction(async () => {
      const data = await linkWorkspaceDocumentJiraIssue(projectId, activeDoc.id, {
        issueKey: ticket.key || ticket.issueKey,
        url: ticket.url,
      });
      onDocumentApplied?.(data.document);
      setJiraOpen(false);
      toast.success(`Linked ${data.jiraLink?.issueKey}`);
    });

  const restoreRevision = (revisionId) =>
    runAction(async () => {
      const data = await restoreWorkspaceDocumentRevision(projectId, activeDoc.id, revisionId);
      onDocumentApplied?.(data.document);
      setHistoryOpen(false);
      toast.success("Version restored");
    });

  const saveNamedVersion = () =>
    runAction(async () => {
      const label = versionName.trim();
      if (!label) {
        toast.error("Enter a version name");
        return;
      }
      const data = await createWorkspaceDocumentRevision(projectId, activeDoc.id, {
        changeSummary: label,
      });
      onDocumentApplied?.(data.document);
      setNameVersionOpen(false);
      setVersionName("");
      toast.success("Version saved");
      if (historyOpen) await loadRevisions();
    });

  const openPreview = (revisionId, label) =>
    runAction(async () => {
      const data = await fetchWorkspaceDocumentRevision(projectId, activeDoc.id, revisionId);
      setPreviewEntry({ label, content: data.content });
      setPreviewOpen(true);
    });

  const openCompare = (revisionId, label) =>
    runAction(async () => {
      const data = await fetchWorkspaceDocumentRevision(projectId, activeDoc.id, revisionId);
      setCompareEntry({ label, content: data.content });
      setCompareOpen(true);
    });

  const renderVersionActions = (revisionId, label) => (
    <div className="mt-2 flex flex-wrap gap-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => openPreview(revisionId, label)}
      >
        Preview
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => openCompare(revisionId, label)}
      >
        Compare
      </Button>
      <Button type="button" size="sm" variant="outline" onClick={() => restoreRevision(revisionId)}>
        Restore
      </Button>
    </div>
  );

  const hasSelection = selectionText.trim().length > 0;

  return (
    <div className="flex flex-1 min-h-0 flex-col">
      {/* Toolbar wraps so Export / Import / History stay visible without horizontal scroll */}
      <div className="flex flex-wrap items-center gap-x-1 gap-y-1.5 border-b px-3 py-1.5 min-h-10 shrink-0">
        <Input
          value={nameField.value}
          onChange={nameField.onChange}
          onFocus={nameField.onFocus}
          onBlur={nameField.onBlur}
          placeholder="Untitled"
          className="h-7 w-[7.5rem] sm:w-36 shrink-0 font-medium border-0 shadow-none focus-visible:ring-1 px-1.5"
          aria-label="Document name"
        />
        <ToolbarDivider />
        <DocumentSkillBar doc={activeDoc} saving={saving} onSkillChange={onSkillChange} />
        <ToolbarDivider />
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs shrink-0"
          disabled={actionLoading || captureEntryCount === 0}
          title={
            captureEntryCount === 0
              ? "Add capture entries in Discovery → Capture first"
              : "Import from capture"
          }
          onClick={() => openCaptureSheet({ defaultMode: "as_is" })}
        >
          {actionLoading ? (
            <Loader2 className="size-3.5 animate-spin sm:mr-1.5" />
          ) : (
            <FileInput className="size-3.5 sm:mr-1.5" />
          )}
          <span className="hidden sm:inline">From capture</span>
        </Button>
        <Button
          type="button"
          size="sm"
          variant={chatOpen ? "secondary" : "ghost"}
          className="h-7 px-2 text-xs shrink-0"
          disabled={actionLoading}
          onClick={() => setChatOpen((open) => !open)}
        >
          <MessageSquare className="size-3.5 sm:mr-1.5" />
          <span className="hidden sm:inline">AI chat</span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs shrink-0">
              <FileDown className="size-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {EXPORT_DESTINATIONS.map((dest) => (
              <DropdownMenuItem
                key={dest.id}
                className="cursor-pointer"
                onClick={() => void runExport(dest.id)}
              >
                {dest.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs shrink-0"
          onClick={() => fileInputRef.current?.click()}
        >
          <FileUp className="size-3.5 sm:mr-1.5" />
          <span className="hidden sm:inline">Import</span>
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".md,.json,text/markdown,application/json"
          className="hidden"
          onChange={handleImportFile}
        />
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs shrink-0"
          onClick={() => setNameVersionOpen(true)}
        >
          <Bookmark className="size-3.5 sm:mr-1.5" />
          <span className="hidden sm:inline">Name this version</span>
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs shrink-0"
          onClick={openHistory}
        >
          <History className="size-3.5 sm:mr-1.5" />
          <span className="hidden sm:inline">History</span>
        </Button>
        {saving ? (
          <span className="text-xs text-muted-foreground px-1 shrink-0">Saving…</span>
        ) : null}
        {actionLoading ? (
          <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
        ) : null}
      </div>

      {(activeDoc?.jiraLinks || []).length > 0 ? (
        <div className="flex flex-wrap gap-2 border-b px-4 py-2">
          {activeDoc.jiraLinks.map((link) => (
            <JiraIssueLink
              key={`${link.issueKey}-${link.linkedAt}`}
              issueKey={link.issueKey}
              url={link.url}
            />
          ))}
        </div>
      ) : null}

      {(activeDoc?.confluenceLinks || []).length > 0 ? (
        <div className="flex flex-wrap gap-2 border-b px-4 py-2">
          {activeDoc.confluenceLinks.map((link) => (
            <a
              key={`${link.pageId}-${link.linkedAt}`}
              href={link.url || "#"}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-primary underline-offset-2 hover:underline"
            >
              Confluence: {link.pageId}
            </a>
          ))}
        </div>
      ) : null}

      <div className="flex flex-1 min-h-0">
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div className="flex-1 overflow-y-auto p-4 min-h-[360px] min-w-0">
              <PrdEditor
                document={{ content: activeDoc?.content || emptyPrdDocContent() }}
                onUpdate={(doc) => onEditorUpdate(doc.content)}
                onBlur={onEditorBlur}
                onSelectionChange={setSelectionText}
                onEditorReady={(editor) => {
                  editorRef.current = editor;
                }}
                extraSlashCommands={extraSlashCommands}
                forceSyncKey={activeDoc?.updatedAt}
              />
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent className="w-56">
            <ContextMenuItem disabled={!hasSelection} onSelect={openDocumentChat}>
              <Wand2 className="size-4" />
              Run AI on selection
            </ContextMenuItem>
            <ContextMenuItem disabled={!hasSelection} onSelect={navigateToBacklogSuggestions}>
              <ListPlus className="size-4" />
              Suggest backlog items
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem disabled={!hasSelection} onSelect={createFromSelection}>
              Create New Document
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onSelect={openJiraLinkDialog}>
              <Link2 className="size-4" />
              Create/Link JIRA Item
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>

        {chatOpen ? (
          <PrdChatPanel
            key={activeDoc?.id}
            onChat={handleDocumentChat}
            projectId={projectId}
            selectionText={selectionText.trim() || undefined}
            disabled={actionLoading || !activeDoc?.id}
            title="Document chat"
            intro="I edit this document using discovery, project memory, and product IA. Ask for a diagram and I'll add a Mermaid flowchart. If your ask is ambiguous, I'll ask a few clarifying questions before changing the doc."
            placeholder="e.g. Expand goals for executives…"
            submitLabel="Send"
          />
        ) : null}
      </div>

      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Document history</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-4">
            {revisionsLoading ? (
              <div
                className="mt-4 space-y-2"
                role="status"
                aria-busy="true"
                aria-label="Loading document history"
              >
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-lg" />
                ))}
              </div>
            ) : (
              <ul className="mt-4 space-y-2">
                {originalSnapshot ? (
                  <li key={originalSnapshot.id} className="rounded-lg border p-3 text-sm">
                    <div className="font-medium">
                      {versionDisplayLabel(originalSnapshot, {
                        isOriginal: true,
                      })}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(originalSnapshot.createdAt).toLocaleString()}
                    </div>
                    {renderVersionActions(
                      originalSnapshot.id,
                      versionDisplayLabel(originalSnapshot, {
                        isOriginal: true,
                      }),
                    )}
                  </li>
                ) : null}
                {[...revisions].reverse().map((rev) => (
                  <li key={rev.id} className="rounded-lg border p-3 text-sm">
                    <div className="font-medium">{versionDisplayLabel(rev)}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(rev.createdAt).toLocaleString()}
                    </div>
                    {renderVersionActions(rev.id, versionDisplayLabel(rev))}
                  </li>
                ))}
                {!revisions.length ? (
                  <p className="text-sm text-muted-foreground">
                    No named versions yet. Use &quot;Name this version&quot; to save a snapshot.
                  </p>
                ) : null}
              </ul>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={nameVersionOpen} onOpenChange={setNameVersionOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Name this version</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="version-name">Version name</Label>
            <Input
              id="version-name"
              value={versionName}
              onChange={(e) => setVersionName(e.target.value)}
              placeholder="e.g. Milestone 1 review"
              maxLength={500}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setNameVersionOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={saveNamedVersion} disabled={actionLoading}>
              Save version
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewEntry?.label || "Preview"}</DialogTitle>
          </DialogHeader>
          <div className="min-h-[280px] rounded-lg border p-3">
            {previewEntry?.content ? (
              <PrdEditor document={{ content: previewEntry.content }} editable={false} />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
        <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Compare versions</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="min-h-[240px] rounded-lg border p-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                {compareEntry?.label || "Selected version"}
              </p>
              {compareEntry?.content ? (
                <PrdEditor document={{ content: compareEntry.content }} editable={false} />
              ) : null}
            </div>
            <div className="min-h-[240px] rounded-lg border p-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Current document</p>
              <PrdEditor
                document={{
                  content: activeDoc?.content || emptyPrdDocContent(),
                }}
                editable={false}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={jiraOpen} onOpenChange={setJiraOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Link JIRA item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="jira-manual-key">Issue key</Label>
              <div className="flex gap-2">
                <Input
                  id="jira-manual-key"
                  value={manualJiraKey}
                  onChange={(e) => setManualJiraKey(e.target.value)}
                  placeholder="e.g. PROJ-123"
                  className="font-mono"
                />
                <Button type="button" size="sm" onClick={linkManualJira} disabled={actionLoading}>
                  Link
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Link by key without searching — works even when Jira search is unavailable.
              </p>
            </div>
            {jiraReady ? (
              <>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Label htmlFor="jira-search">Search existing issues</Label>
                    {jiraProjectKey ? <JiraProjectBadge projectKey={jiraProjectKey} /> : null}
                  </div>
                  <Input
                    id="jira-search"
                    value={jiraSearch}
                    onChange={(e) => setJiraSearch(e.target.value)}
                    placeholder="Summary or key (searches Jira)"
                  />
                </div>
                {jiraLoading && !jiraTickets.length ? (
                  <div
                    className="space-y-1"
                    role="status"
                    aria-busy="true"
                    aria-label="Loading Jira tickets"
                  >
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-8 w-full" />
                    ))}
                  </div>
                ) : (
                  <ul className="max-h-48 overflow-y-auto space-y-1">
                    {jiraTickets.map((t) => (
                      <li key={t.key || t.issueKey}>
                        <button
                          type="button"
                          className="w-full text-left rounded-md border px-2 py-1.5 text-sm hover:bg-muted/50"
                          onClick={() => linkJira(t)}
                        >
                          <span className="font-mono text-primary">{t.key || t.issueKey}</span>
                          <span className="ml-2 text-muted-foreground">{t.summary || t.title}</span>
                        </button>
                      </li>
                    ))}
                    <li ref={jiraSentinelRef} className="h-1 list-none" aria-hidden />
                  </ul>
                )}
                {jiraLoadingMore ? (
                  <Skeleton
                    className="h-8 w-full"
                    role="status"
                    aria-busy="true"
                    aria-label="Loading more Jira tickets"
                  />
                ) : null}
                {!jiraHasMore && jiraTickets.length > 0 && !jiraLoadingMore ? (
                  <p className="text-xs text-muted-foreground">End of list</p>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{jiraStatusHint}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setJiraOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={confluenceOpen}
        onOpenChange={(open) => {
          if (!open) confluenceInFlightRef.current = false;
          setConfluenceOpen(open);
        }}
      >
        <DialogContent className="flex max-h-[min(92vh,640px)] flex-col gap-0 overflow-hidden sm:max-w-xl">
          <DialogHeader className="shrink-0 pb-2">
            <DialogTitle>Export to Confluence</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto py-1 pr-1">
            {(activeDoc?.confluenceLinks || []).length > 0 ? (
              <p className="text-xs text-muted-foreground">
                Re-export updates the linked Confluence page with the current document content.
              </p>
            ) : null}
            <div className="space-y-1">
              <Label>Confluence space</Label>
              {confluenceSpacesLoading ? (
                <Skeleton
                  className="h-9 w-full"
                  role="status"
                  aria-busy="true"
                  aria-label="Loading Confluence spaces"
                />
              ) : (
                <ConfluenceSpacePicker
                  key={confluencePickerSession}
                  spaces={confluenceSpaces}
                  value={confluenceSpaceId}
                  disabled={confluenceSpacesLoading}
                  onChange={(space) => {
                    setConfluenceSpaceId(space.id);
                    setConfluenceSpaceKey(space.key);
                  }}
                />
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="confluence-parent">Parent page ID (optional)</Label>
              <Input
                id="confluence-parent"
                value={confluenceParentPageId}
                onChange={(e) => setConfluenceParentPageId(e.target.value)}
                placeholder="Confluence page ID"
              />
            </div>
          </div>
          <DialogFooter className="shrink-0 border-t border-border pt-4">
            <Button type="button" variant="outline" onClick={() => setConfluenceOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={exportToConfluence}
              disabled={
                actionLoading ||
                (confluenceSpacesLoading && !(activeDoc?.confluenceLinks || []).length)
              }
            >
              Export
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ProfileInsertSheet
        open={profileInsertOpen}
        onOpenChange={setProfileInsertOpen}
        personas={clientDetails?.personas}
        onInsert={handleProfileInsert}
      />

      <CaptureContextSheet
        open={captureSheetOpen}
        onOpenChange={setCaptureSheetOpen}
        projectId={projectId}
        defaultSkillId={activeDoc?.skillId}
        defaultMode={captureSheetDefaultMode}
        loading={actionLoading}
        onSubmit={handleCaptureImport}
      />
    </div>
  );
}
