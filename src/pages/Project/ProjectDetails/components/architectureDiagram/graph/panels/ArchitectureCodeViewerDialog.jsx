import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchUnderstandFileContent } from "@/api";

/**
 * Slide-up code preview for file nodes (optional UA parity).
 */
export function ArchitectureCodeViewerDialog({
  open,
  onOpenChange,
  projectId,
  filePath,
  fileName,
}) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !projectId || !filePath) {
      setContent("");
      setError("");
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    void fetchUnderstandFileContent(projectId, filePath)
      .then((data) => {
        if (cancelled) return;
        setContent(typeof data?.content === "string" ? data.content : "");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(typeof err?.error === "string" ? err.error : "Could not load file content.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, projectId, filePath]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-hidden">
        <DialogHeader>
          <DialogTitle className="truncate text-sm">
            {fileName || filePath || "File preview"}
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[65vh] overflow-auto rounded-md border border-border bg-muted/30 p-3">
          {loading ? (
            <div className="space-y-2" role="status" aria-busy="true" aria-label="Loading file">
              {["w-3/4", "w-full", "w-5/6", "w-2/3", "w-full", "w-1/2"].map((width, i) => (
                <Skeleton key={i} className={`h-3 ${width}`} />
              ))}
            </div>
          ) : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {!loading && !error ? (
            <pre className="whitespace-pre-wrap break-all text-xs text-foreground">
              {content || "Empty file."}
            </pre>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
