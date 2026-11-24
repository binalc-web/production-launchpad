import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { FileText, Loader2, Maximize2, Minimize2, Plus, Presentation, Trash2 } from "lucide-react";
import { useClientInfoContext } from "@/pages/Project/ClientInfo/hooks/useClientInfoContext";
import { hasDiscoverySignal } from "@/pages/Project/ProductManagement/utils/workflowStatus";
import { EmptyState } from "../components/EmptyState";
import { CreateDocumentDialog } from "../components/CreateDocumentDialog";
import { DocumentEditorChrome } from "./DocumentEditorChrome";
import { KickoffPresentationEditor } from "./KickoffPresentationEditor";
import { useWorkspaceDocuments } from "./useWorkspaceDocuments";
import { useKickoffPresentation } from "./useKickoffPresentation";
import { workspaceItemNameExists } from "../utils/workspaceDocumentNames";

function DocumentsPanelSkeleton() {
  return (
    <div
      className="ds-inset flex min-h-[min(70vh,720px)] flex-col overflow-hidden rounded-xl md:min-h-[560px] md:flex-row"
      role="status"
      aria-busy="true"
      aria-label="Loading documents"
    >
      <div className="flex w-full shrink-0 flex-col border-b bg-muted/20 md:max-w-[240px] md:border-b-0 md:border-r">
        <div className="border-b p-3 sm:p-4">
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="space-y-1 p-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      </div>
      <div className="flex-1 space-y-3 p-4 sm:p-6">
        <Skeleton className="h-7 w-1/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}

export function DocumentsPanel() {
  const { projectId, refresh, discoveryData, clientDetails } = useClientInfoContext();
  const canGenerate = hasDiscoverySignal(clientDetails, discoveryData);
  const [activeItem, setActiveItem] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = useCallback(() => {
    setIsExpanded((value) => !value);
  }, []);

  useEffect(() => {
    if (!isExpanded) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isExpanded]);

  useEffect(() => {
    if (!isExpanded) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setIsExpanded(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isExpanded]);

  const {
    docs,
    setActiveId,
    loading: docsLoading,
    saving,
    createOpen,
    setCreateOpen,
    deleteTarget,
    setDeleteTarget,
    deleting,
    load: loadDocs,
    handleCreateSubmit,
    handleDeleteConfirm,
    handleEditorUpdate,
    handleRename,
    handleSkillChange,
    applyDocument,
    flushPendingSave,
  } = useWorkspaceDocuments(projectId, refresh);

  const {
    presentations,
    setActiveId: setActivePresentationId,
    loading: presentationsLoading,
    saving: presentationSaving,
    load: loadPresentations,
    handleGenerateSubmit,
    handleHtmlChange,
    handleSkillChange: handlePresentationSkillChange,
    handleRegenerate,
    handleThemeChange,
    applyPresentation,
  } = useKickoffPresentation(projectId, refresh);

  const loading = docsLoading || presentationsLoading;

  const defaultDeckName = useMemo(() => {
    const projectName =
      clientDetails?.companyName || clientDetails?.personas?.company?.name || "Project";
    return `Kickoff Presentation: ${projectName}`;
  }, [clientDetails]);

  const workspaceItems = useMemo(() => {
    const items = [
      ...docs.map((d) => ({
        kind: "document",
        id: d.id,
        name: d.name,
        updatedAt: d.updatedAt,
        status: null,
      })),
      ...presentations.map((p) => ({
        kind: "deck",
        id: p.id,
        name: p.name,
        updatedAt: p.updatedAt,
        status: p.status,
      })),
    ];
    return items.sort((a, b) => {
      const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      if (timeB !== timeA) return timeB - timeA;
      return (a.name || "").localeCompare(b.name || "");
    });
  }, [docs, presentations]);

  const selectWorkspaceItem = useCallback(
    (item) => {
      if (!item) {
        setActiveItem(null);
        return;
      }
      setActiveItem({ kind: item.kind, id: item.id });
      if (item.kind === "document") {
        setActiveId(item.id);
      } else {
        setActivePresentationId(item.id);
      }
    },
    [setActiveId, setActivePresentationId],
  );

  useEffect(() => {
    if (loading) return;
    if (activeItem) {
      const stillExists = workspaceItems.some(
        (item) => item.kind === activeItem.kind && item.id === activeItem.id,
      );
      if (!stillExists) {
        selectWorkspaceItem(workspaceItems[0] || null);
      }
      return;
    }
    if (workspaceItems.length > 0) {
      selectWorkspaceItem(workspaceItems[0]);
    }
  }, [loading, workspaceItems, activeItem, selectWorkspaceItem]);

  const activeDoc =
    activeItem?.kind === "document" ? docs.find((d) => d.id === activeItem.id) || null : null;
  const activePresentation =
    activeItem?.kind === "deck" ? presentations.find((p) => p.id === activeItem.id) || null : null;

  const handleCreateWorkspaceItem = useCallback(
    async ({ itemType, name, skillId, autoUpdateOnCapture }) => {
      if (itemType === "deck") {
        const id = await handleGenerateSubmit({ name, skillId });
        if (id) selectWorkspaceItem({ kind: "deck", id, name, updatedAt: null, status: null });
        return;
      }
      const id = await handleCreateSubmit({ name, skillId, autoUpdateOnCapture });
      if (id) selectWorkspaceItem({ kind: "document", id, name, updatedAt: null, status: null });
    },
    [handleCreateSubmit, handleGenerateSubmit, selectWorkspaceItem],
  );

  if (loading) {
    return <DocumentsPanelSkeleton />;
  }

  const sidebarListClassName = cn(
    "flex-1 space-y-1 overflow-y-auto p-2",
    isExpanded ? "min-h-0 max-md:max-h-[35vh]" : "max-h-[min(40vh,280px)] md:max-h-none",
  );

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden md:flex-row",
        isExpanded
          ? "fixed inset-0 z-50 h-dvh max-h-dvh w-screen rounded-none border-0 bg-background"
          : "ds-inset min-h-[min(70vh,720px)] overflow-hidden rounded-xl md:min-h-[560px]",
      )}
    >
      <aside
        className={cn(
          "flex w-full shrink-0 flex-col border-b bg-muted/20 md:max-w-[240px] md:border-b-0 md:border-r",
          isExpanded && "min-h-0",
        )}
      >
        <div className="space-y-2 border-b p-3 sm:p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase text-muted-foreground">Workspace</span>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className={cn("size-8", isExpanded && "bg-muted")}
                title={isExpanded ? "Exit fullscreen" : "Fullscreen"}
                aria-label={isExpanded ? "Exit fullscreen" : "Fullscreen"}
                onClick={toggleExpanded}
              >
                {isExpanded ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-8"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="size-4" />
              </Button>
            </div>
          </div>
        </div>

        <ul className={sidebarListClassName}>
          {workspaceItems.length === 0 ? (
            <li className="px-2 py-6 text-center text-xs text-muted-foreground">
              No documents or decks yet. Use + to create one.
            </li>
          ) : (
            workspaceItems.map((item) => {
              const isActive = activeItem?.kind === item.kind && activeItem?.id === item.id;
              const isDocument = item.kind === "document";

              if (isDocument) {
                return (
                  <li key={`doc-${item.id}`}>
                    <div
                      className={cn(
                        "w-full flex items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors",
                        isActive ? "bg-background shadow-sm" : "hover:bg-background/60",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => selectWorkspaceItem(item)}
                        className="flex min-w-0 flex-1 items-center gap-2 text-left cursor-pointer"
                      >
                        <FileText className="size-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">{item.name}</span>
                      </button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-7 shrink-0 text-destructive"
                        onClick={() => setDeleteTarget(item.id)}
                        aria-label={`Delete ${item.name}`}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </li>
                );
              }

              return (
                <li key={`deck-${item.id}`}>
                  <button
                    type="button"
                    onClick={() => selectWorkspaceItem(item)}
                    className={cn(
                      "w-full flex items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors cursor-pointer",
                      isActive ? "bg-background shadow-sm" : "hover:bg-background/60",
                    )}
                  >
                    <Presentation className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate flex-1">{item.name}</span>
                    {["pending", "generating"].includes(item.status) ? (
                      <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
                    ) : null}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </aside>

      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col overflow-hidden",
          isExpanded ? "min-h-0" : "min-h-[min(50vh,480px)] md:min-h-0",
        )}
      >
        {activeItem?.kind === "document" && activeDoc ? (
          <DocumentEditorChrome
            projectId={projectId}
            activeDoc={activeDoc}
            saving={saving}
            onEditorUpdate={handleEditorUpdate}
            onDocumentApplied={applyDocument}
            onReload={loadDocs}
            onRename={handleRename}
            onSkillChange={handleSkillChange}
            onEditorBlur={flushPendingSave}
            flushPendingSave={flushPendingSave}
          />
        ) : activeItem?.kind === "deck" && activePresentation ? (
          <KickoffPresentationEditor
            projectId={projectId}
            presentation={activePresentation}
            saving={presentationSaving}
            onHtmlChange={handleHtmlChange}
            onSkillChange={handlePresentationSkillChange}
            onRegenerate={handleRegenerate}
            onThemeChange={handleThemeChange}
            onPresentationApplied={applyPresentation}
            onReload={loadPresentations}
          />
        ) : (
          <EmptyState
            icon={FileText}
            title="Nothing selected"
            description="Create a document or generate a deck to get started."
            action={
              <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="size-4 mr-2" />
                New
              </Button>
            }
            className="m-4 border-0"
          />
        )}
      </div>

      <CreateDocumentDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultName="Untitled"
        defaultDeckName={defaultDeckName}
        canGenerate={canGenerate}
        onSubmit={handleCreateWorkspaceItem}
        validateName={(name) =>
          workspaceItemNameExists(docs, presentations, name)
            ? "A document or deck with this name already exists"
            : null
        }
      />

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete document?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This document will be permanently removed. This action cannot be undone.
          </p>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
