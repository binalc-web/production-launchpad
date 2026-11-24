import React, { useEffect, useState } from "react";
import { ScrollText } from "lucide-react";
import { consumePublicPreviewLogsStream } from "@/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useStickToBottomScroll } from "@/hooks/useStickToBottomScroll";
import { cn } from "@/lib/utils";

/**
 * Live preview.log viewer (SSE) for Client Link.
 * @param {{ open: boolean, onOpenChange: (open: boolean) => void, projectSlug?: string | null, projectName?: string | null }} props
 */
export function ClientLinkPreviewLogsDialog({ open, onOpenChange, projectSlug, projectName }) {
  const [logText, setLogText] = useState("");
  const [missing, setMissing] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [live, setLive] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const { containerRef, onScroll } = useStickToBottomScroll([logText]);

  useEffect(() => {
    if (!open) {
      setLogText("");
      setMissing(false);
      setConnecting(false);
      setLive(false);
      setErrorMessage(null);
      return undefined;
    }

    const slug = String(projectSlug || "").trim();
    if (!slug) {
      setErrorMessage("Project not found.");
      return undefined;
    }

    const ac = new AbortController();
    let cancelled = false;

    const appendChunk = (chunk) => {
      const text = String(chunk ?? "");
      if (!text) return;
      setLogText(
        (prev) =>
          prev + (prev && !prev.endsWith("\n") && !text.startsWith("\n") ? "\n" : "") + text,
      );
    };

    setConnecting(true);
    setLive(false);
    setErrorMessage(null);
    setLogText("");
    setMissing(false);

    (async () => {
      let reconnectAttempt = 0;
      while (!ac.signal.aborted && !cancelled) {
        try {
          await consumePublicPreviewLogsStream(slug, {
            signal: ac.signal,
            onEvent: (evt) => {
              if (ac.signal.aborted || cancelled) return true;
              const type = evt?.type;
              if (type === "heartbeat") {
                setLive(true);
                setConnecting(false);
                return false;
              }
              if (type === "ready") {
                setConnecting(false);
                setLive(true);
                setMissing(Boolean(evt.missing));
                setLogText("");
                return false;
              }
              if (type === "snapshot") {
                setConnecting(false);
                setLive(true);
                setMissing(false);
                setLogText(String(evt.content ?? ""));
                return false;
              }
              if (type === "append") {
                setConnecting(false);
                setLive(true);
                setMissing(false);
                appendChunk(evt.content);
                return false;
              }
              if (type === "error") {
                setErrorMessage(
                  typeof evt.message === "string" && evt.message.trim()
                    ? evt.message.trim()
                    : "Could not read preview logs.",
                );
                setConnecting(false);
                return false;
              }
              return false;
            },
          });
          if (ac.signal.aborted || cancelled) return;
          setLive(false);
          reconnectAttempt += 1;
          const delay = Math.min(30_000, 1000 * Math.min(reconnectAttempt, 6));
          await new Promise((r) => setTimeout(r, delay));
        } catch (err) {
          if (err?.name === "AbortError" || ac.signal.aborted || cancelled) return;
          setConnecting(false);
          setLive(false);
          setErrorMessage(err?.message || "Could not connect to preview logs.");
          reconnectAttempt += 1;
          const delay = Math.min(30_000, 1000 * Math.min(reconnectAttempt, 6));
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    })();

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [open, projectSlug]);

  const titleName =
    typeof projectName === "string" && projectName.trim() ? projectName.trim() : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-3 sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScrollText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            Preview logs
            <span
              className={cn(
                "ml-1 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                live
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                  : "bg-muted text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  live ? "bg-emerald-500" : "bg-muted-foreground/50",
                )}
                aria-hidden
              />
              {live ? "Live" : connecting ? "Connecting" : "Idle"}
            </span>
          </DialogTitle>
          <DialogDescription>
            {titleName
              ? `PM2 / preview output for ${titleName} (preview.log)`
              : "PM2 / preview output from preview.log"}
          </DialogDescription>
        </DialogHeader>

        {errorMessage ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {errorMessage}
          </p>
        ) : null}

        <div
          ref={containerRef}
          onScroll={onScroll}
          className="min-h-60 flex-1 overflow-auto rounded-lg border border-border bg-muted/40 p-3 font-mono text-xs leading-relaxed text-foreground"
        >
          {connecting && !logText ? (
            <div className="space-y-2" role="status" aria-busy="true" aria-label="Loading logs">
              {["w-[90%]", "w-[75%]", "w-[85%]", "w-[60%]", "w-[80%]"].map((w) => (
                <Skeleton key={w} className={cn("h-3 rounded-sm", w)} />
              ))}
            </div>
          ) : missing && !logText ? (
            <p className="text-muted-foreground">
              No preview.log yet — it appears when the preview server starts.
            </p>
          ) : logText ? (
            <pre className="whitespace-pre-wrap wrap-break-word">{logText}</pre>
          ) : (
            <p className="text-muted-foreground">Waiting for log output…</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
