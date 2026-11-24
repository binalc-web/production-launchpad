import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function AiHomeBriefing({ briefing, loading, onAsk, onOpenCard, onStartLoop, className }) {
  if (loading) {
    return (
      <div
        className={cn("mx-auto w-full max-w-2xl space-y-3", className)}
        role="status"
        aria-busy="true"
        aria-label="Loading briefing"
      >
        <Skeleton className="mx-auto h-7 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="mx-auto h-4 w-4/5" />
      </div>
    );
  }
  if (!briefing) return null;

  return (
    <div className={cn("mx-auto w-full max-w-2xl space-y-6", className)}>
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-[1.75rem]">
          {briefing.headline || "What can I help with?"}
        </h1>
        {briefing.overview ? (
          <p className="text-sm leading-relaxed text-muted-foreground">{briefing.overview}</p>
        ) : null}
      </div>
      {Array.isArray(briefing.cards) && briefing.cards.length ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {briefing.cards.slice(0, 6).map((card) => (
            <button
              key={card.projectId}
              type="button"
              onClick={() => onOpenCard?.(card)}
              className="rounded-xl border border-border bg-background p-3 text-left shadow-sm transition-colors hover:border-primary/40 hover:bg-muted/40"
            >
              <p className="truncate text-sm font-semibold text-foreground">{card.projectName}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{card.summary}</p>
            </button>
          ))}
        </div>
      ) : (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            onClick={() => onAsk?.("Help me create a project")}
          >
            Create a project
          </Button>
        </div>
      )}
      {onStartLoop ? (
        <div className="flex justify-center">
          <Button type="button" variant="secondary" onClick={onStartLoop}>
            Run delivery loop on last project
          </Button>
        </div>
      ) : null}
    </div>
  );
}
