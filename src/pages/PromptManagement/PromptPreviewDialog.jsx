import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchManagedPromptById } from "@/api";
import { getCategoryLabel } from "./managedPromptUiLabels";
import { PromptCopyButton } from "./components/PromptCopyButton";

function PromptBodySkeleton() {
  return (
    <div className="space-y-3" role="status" aria-busy="true" aria-label="Loading prompt">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-20" />
      </div>
      <div className="space-y-2 rounded-md border border-border bg-muted/20 p-4">
        {["w-full", "w-11/12", "w-4/5", "w-full", "w-3/4", "w-5/6", "w-2/3"].map((width, i) => (
          <Skeleton key={i} className={`h-3 ${width}`} />
        ))}
      </div>
    </div>
  );
}

/**
 * @param {object} props
 * @param {boolean} props.open
 * @param {(open: boolean) => void} props.onOpenChange
 * @param {object|null} props.row
 */
export function PromptPreviewDialog({ open, onOpenChange, row }) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open || !row?.id) {
      setContent("");
      setError(null);
      setLoading(false);
      return;
    }

    if (typeof row.content === "string") {
      setContent(row.content);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setContent("");

    void fetchManagedPromptById(row.id)
      .then((full) => {
        if (cancelled) return;
        setContent(String(full?.content ?? ""));
      })
      .catch((e) => {
        if (cancelled) return;
        setError(typeof e?.error === "string" ? e.error : "Failed to load prompt");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, row?.id, row?.content]);

  const charCount = content.length;
  const listCharCount = typeof row?.contentLength === "number" ? row.contentLength : null;
  const categoryLabel = getCategoryLabel(row?.category);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[960px]">
        <DialogHeader className="shrink-0 space-y-2 border-b px-6 py-4 text-left">
          <div className="flex flex-wrap items-start gap-2 pr-6">
            <DialogTitle className="min-w-0 flex-1 text-left leading-tight">
              {row?.name || "Prompt preview"}
            </DialogTitle>
            <Badge variant="secondary" className="shrink-0 font-normal text-muted-foreground">
              {categoryLabel.title}
            </Badge>
          </div>
          {row?.key ? <p className="font-mono text-xs text-muted-foreground">{row.key}</p> : null}
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <PromptBodySkeleton />
          ) : error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-medium text-muted-foreground">Prompt body</p>
                <PromptCopyButton text={content} />
              </div>
              <pre className="max-h-[min(60vh,520px)] overflow-auto whitespace-pre-wrap rounded-md border border-border bg-muted/20 p-4 font-mono text-xs leading-relaxed text-foreground">
                {content || "(empty prompt)"}
              </pre>
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 flex-col gap-2 border-t px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {(loading ? listCharCount : charCount)?.toLocaleString() ?? "—"} characters
          </p>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <PromptCopyButton text={content} disabled={loading || Boolean(error)} />
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
