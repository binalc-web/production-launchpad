import React, { useCallback, useRef } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { previewRoutePathname } from "@/lib/clientLinkEmbeddedPreviewSrc";
import { ClientLinkCommentThreadPanel } from "./ClientLinkCommentThreadPanel";
import { ClientLinkCommentAuthorRow } from "./ClientLinkCommentAuthorRow";
import { ClientLinkCommentCategoryBadge } from "./ClientLinkCommentCategory";
import {
  PREVIEW_COMMENT_CATEGORIES,
  PREVIEW_COMMENT_CATEGORY_LABELS,
  PREVIEW_COMMENT_CATEGORY_LIST_BORDER_CLASS,
  normalizePreviewCommentCategory,
  previewCommentElementLabel,
} from "@/lib/previewCommentCategory.util";
import { MessageSquare } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

function CommentListSkeleton() {
  return (
    <div className="space-y-2" role="status" aria-busy="true" aria-label="Loading comments">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-2 rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-2">
            <Skeleton className="size-6 rounded-full" />
            <Skeleton className="h-3 w-24 rounded-sm" />
          </div>
          <Skeleton className="h-3 w-full rounded-sm" />
          <Skeleton className="h-3 w-[70%] rounded-sm" />
        </div>
      ))}
    </div>
  );
}

/** Portaled Select menus sit outside SheetContent — allow them through dismiss guards. */
function isSelectPortalTarget(target) {
  return (
    target instanceof Element &&
    (target.closest('[data-slot="select-content"]') ||
      target.closest('[data-slot="select-trigger"]'))
  );
}

const commentSidebarSelectContentClassName = "z-[1000020]";

/**
 * Sidebar listing preview feedback threads with reply and resolve actions.
 */
export function ClientLinkCommentSidebar({
  open,
  onOpenChange,
  blockOutsideDismiss = false,
  widthPx = 384,
  onWidthChange,
  comments = [],
  loading = false,
  error = null,
  statusFilter = "all",
  onStatusFilterChange,
  pageFilter = "current",
  onPageFilterChange,
  categoryFilter = "all",
  onCategoryFilterChange,
  currentPreviewPath = "/",
  selectedThreadId = null,
  onSelectThread,
  onFocusOnPage,
  onReply,
  onResolve,
  onReopen,
  onDelete,
  onLogicBodyChange,
  onFixWithAi,
}) {
  const resizeDragRef = useRef({
    dragging: false,
    startX: 0,
    startWidth: widthPx,
  });

  const selected = comments.find((c) => c.id === selectedThreadId) || null;

  /** Drag the left edge to resize the comments panel width. */
  const handleResizePointerDown = useCallback(
    (event) => {
      event.preventDefault();
      resizeDragRef.current = {
        dragging: true,
        startX: event.clientX,
        startWidth: widthPx,
      };

      const handlePointerMove = (moveEvent) => {
        if (!resizeDragRef.current.dragging) return;
        const deltaX = resizeDragRef.current.startX - moveEvent.clientX;
        onWidthChange?.(resizeDragRef.current.startWidth + deltaX);
      };

      const handlePointerUp = () => {
        resizeDragRef.current.dragging = false;
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    },
    [widthPx, onWidthChange],
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        overlayClassName="z-[1000010]"
        className="z-[1000010] flex min-w-[280px] shrink-0 max-w-[50vw] flex-col gap-0 p-0 sm:max-w-[50vw]"
        style={{ width: widthPx }}
        onPointerDownOutside={(e) => {
          if (isSelectPortalTarget(e.target)) return;
          if (blockOutsideDismiss) e.preventDefault();
        }}
        onInteractOutside={(e) => {
          if (isSelectPortalTarget(e.target)) return;
          if (blockOutsideDismiss) e.preventDefault();
        }}
      >
        <div className="relative flex min-h-0 flex-1 flex-col">
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize feedback panel"
            className="absolute top-0 left-0 z-10 h-full w-1.5 cursor-col-resize touch-none hover:bg-border/80"
            onPointerDown={handleResizePointerDown}
          />
          <SheetHeader className="border-b px-4 py-3 text-left">
            <SheetTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="size-4 text-amber-600" />
              Feedback
            </SheetTitle>
            <SheetDescription className="text-xs">
              Feedback stays pinned to the element as you scroll.
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-wrap gap-2 border-b px-4 py-2">
            <Select value={statusFilter} onValueChange={onStatusFilterChange}>
              <SelectTrigger className="h-8 w-[120px] text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent
                position="popper"
                sideOffset={4}
                className={commentSidebarSelectContentClassName}
              >
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
            <Select value={pageFilter} onValueChange={onPageFilterChange}>
              <SelectTrigger className="h-8 min-w-[130px] flex-1 text-xs">
                <SelectValue placeholder="Page" />
              </SelectTrigger>
              <SelectContent
                position="popper"
                sideOffset={4}
                className={commentSidebarSelectContentClassName}
              >
                <SelectItem value="current">This page</SelectItem>
                <SelectItem value="all">All pages</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={onCategoryFilterChange}>
              <SelectTrigger className="h-8 w-[130px] text-xs">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent
                position="popper"
                sideOffset={4}
                className={commentSidebarSelectContentClassName}
              >
                <SelectItem value="all">All feedback types</SelectItem>
                {PREVIEW_COMMENT_CATEGORIES.map((key) => (
                  <SelectItem key={key} value={key}>
                    {PREVIEW_COMMENT_CATEGORY_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error ? <p className="px-4 py-2 text-xs text-destructive">{error}</p> : null}

          <div className="grid min-h-0 flex-1 grid-rows-[1fr_auto]">
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="space-y-2 p-3">
                {loading ? (
                  <CommentListSkeleton />
                ) : comments.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Turn on Comment on page, then click part of the preview.
                  </p>
                ) : (
                  comments.map((comment, index) => {
                    const isSelected = selectedThreadId === comment.id;
                    const categoryKey = normalizePreviewCommentCategory(comment.category);
                    const routeLabel = previewRoutePathname(
                      comment.previewPath || currentPreviewPath,
                    );
                    return (
                      <button
                        key={comment.id}
                        type="button"
                        className={cn(
                          "w-full rounded-lg border p-3 text-left transition",
                          PREVIEW_COMMENT_CATEGORY_LIST_BORDER_CLASS[categoryKey],
                          isSelected
                            ? "border-amber-500 bg-muted ring-1 ring-inset ring-amber-500"
                            : "border-border bg-card hover:bg-muted",
                        )}
                        onClick={() => onSelectThread?.(comment.id)}
                      >
                        <div className="mb-1 flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              #{index + 1} {previewCommentElementLabel(comment)}
                            </p>
                            <p className="truncate text-[11px] text-muted-foreground">
                              {routeLabel}
                            </p>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-1">
                            <ClientLinkCommentCategoryBadge category={comment.category} />
                            <Badge
                              variant={comment.status === "resolved" ? "secondary" : "outline"}
                              className="text-[10px]"
                            >
                              {comment.status === "resolved" ? "Resolved" : "Open"}
                            </Badge>
                          </div>
                        </div>
                        <p className="line-clamp-2 text-xs text-foreground">
                          {comment.body?.trim() || comment.logicBody?.trim() || "No text yet"}
                        </p>
                        <ClientLinkCommentAuthorRow
                          authorEmail={comment.authorEmail}
                          createdAt={comment.createdAt}
                          compact
                          className="mt-1.5"
                        />
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {selected ? (
              <div className="border-t border-border bg-background p-3">
                <ClientLinkCommentThreadPanel
                  comment={selected}
                  onReply={onReply}
                  onResolve={onResolve}
                  onReopen={onReopen}
                  onDelete={onDelete}
                  onFocusOnPage={onFocusOnPage}
                  onLogicBodyChange={onLogicBodyChange}
                  onFixWithAi={onFixWithAi}
                />
              </div>
            ) : null}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
