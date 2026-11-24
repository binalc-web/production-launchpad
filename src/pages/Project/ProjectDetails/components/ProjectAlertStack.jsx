import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

function AlertCard({ variant, children, onDismiss, dismissible = false, className }) {
  const variants = {
    primary: "border-primary/25 bg-primary/5 text-foreground",
    success: "border-emerald-200 bg-emerald-50/90 text-emerald-950",
    warning: "border-amber-200 bg-amber-50/90 text-amber-950",
    danger: "border-red-200 bg-red-50/90 text-red-950",
  };

  return (
    <div
      className={cn(
        "relative rounded-lg border px-4 py-3 shadow-sm",
        variants[variant],
        className,
      )}
    >
      {dismissible && onDismiss ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 size-7"
          onClick={onDismiss}
          aria-label="Dismiss"
        >
          <X className="size-3.5" />
        </Button>
      ) : null}
      {children}
    </div>
  );
}

export function ProjectAlertStack({
  showDeferredScratchCard,
  deferredScratchPrompt,
  onDeferredScratchPromptChange,
  onStartDeferredScratchAgent,
  scratchAgentSubmitting,
  scratchAgentBannerOpen,
  scratchAgentStatusLine,
  onStopScratchAgent,
  stopScratchSubmitting,
  scratchPreviewBuildingBanner,
  showScratchVersionFailedBanner,
}) {
  const [dismissed, setDismissed] = useState(() => new Set());

  const alerts = useMemo(() => {
    const list = [];
    if (showDeferredScratchCard) {
      list.push({ id: "scratch-start", priority: 1, variant: "primary", dismissible: false });
    }
    if (scratchAgentBannerOpen) {
      list.push({ id: "agent-running", priority: 2, variant: "success", dismissible: false });
    }
    if (showScratchVersionFailedBanner) {
      list.push({ id: "version-failed", priority: 3, variant: "danger", dismissible: true });
    }
    if (scratchPreviewBuildingBanner) {
      list.push({ id: "preview-building", priority: 4, variant: "warning", dismissible: true });
    }
    return list
      .filter((a) => !dismissed.has(a.id))
      .sort((a, b) => a.priority - b.priority);
  }, [
    showDeferredScratchCard,
    scratchAgentBannerOpen,
    showScratchVersionFailedBanner,
    scratchPreviewBuildingBanner,
    dismissed,
  ]);

  const top = alerts[0];
  if (!top) return null;

  if (top.id === "scratch-start") {
    return (
      <AlertCard variant="primary" className="mb-4">
        <div className="flex items-start gap-3 pr-8">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" aria-hidden />
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <h2 className="text-base font-semibold">Start project from scratch</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                No release yet. Enter what the Cursor agent should build or change in your repository.
                This creates release 1.0.0 and starts the agent.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="deferred-scratch-prompt">Agent prompt</Label>
              <Textarea
                id="deferred-scratch-prompt"
                placeholder="Describe what the agent should build or change..."
                value={deferredScratchPrompt}
                onChange={(e) => onDeferredScratchPromptChange(e.target.value)}
                rows={4}
                className="resize-y min-h-[100px] bg-background"
                disabled={scratchAgentSubmitting}
              />
            </div>
            <Button
              type="button"
              onClick={onStartDeferredScratchAgent}
              disabled={scratchAgentSubmitting}
              className="gap-2"
            >
              {scratchAgentSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Starting…
                </>
              ) : (
                "Start Cursor agent"
              )}
            </Button>
          </div>
        </div>
      </AlertCard>
    );
  }

  if (top.id === "agent-running") {
    return (
      <AlertCard variant="success" className="mb-4">
        <div className="flex gap-3">
          <Loader2 className="h-5 w-5 shrink-0 animate-spin text-emerald-600" aria-hidden />
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-sm font-semibold leading-tight">Cursor agent is running</p>
            <p className="text-sm leading-snug opacity-90">
              Changes will appear in Releases soon after the agent finishes.
            </p>
            {scratchAgentStatusLine ? (
              <p className="text-xs leading-snug font-mono break-words opacity-80">
                {scratchAgentStatusLine}
              </p>
            ) : null}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 border-red-200 text-red-800 hover:bg-red-50"
            disabled={stopScratchSubmitting}
            onClick={onStopScratchAgent}
          >
            Stop agent
          </Button>
        </div>
      </AlertCard>
    );
  }

  if (top.id === "version-failed") {
    return (
      <AlertCard
        variant="danger"
        dismissible
        className="mb-4"
        onDismiss={() => setDismissed((s) => new Set(s).add("version-failed"))}
      >
        <p className="text-sm font-medium leading-snug pr-8">
          Version creation failed after the agent finished. Check server logs or retry from the release
          flow.
        </p>
      </AlertCard>
    );
  }

  if (top.id === "preview-building") {
    return (
      <AlertCard
        variant="warning"
        dismissible
        className="mb-4"
        onDismiss={() => setDismissed((s) => new Set(s).add("preview-building"))}
      >
        <div className="flex gap-3 pr-8">
          <Loader2 className="h-5 w-5 shrink-0 animate-spin text-amber-600" aria-hidden />
          <p className="text-sm font-medium leading-snug">
            Creating version and build… This may take a minute after the agent finishes.
          </p>
        </div>
      </AlertCard>
    );
  }

  return null;
}
