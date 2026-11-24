import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Inline banner shown while viewing a read-only archived chat thread.
 */
export function ViewingOlderChatBanner({
  onBackToCurrent,
  loading = false,
  threadLabel = "",
  error = "",
}) {
  const label = typeof threadLabel === "string" ? threadLabel.trim() : "";
  const errorText = typeof error === "string" ? error.trim() : "";

  return (
    <div className="flex shrink-0 flex-col gap-1 border-b border-border bg-muted/50 px-3 py-2 sm:px-4">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-foreground">Viewing older chat</p>
          {loading ? (
            <Skeleton
              className="mt-1 h-3 w-40"
              role="status"
              aria-busy="true"
              aria-label="Loading older chat"
            />
          ) : label ? (
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{label}</p>
          ) : null}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 shrink-0 text-xs"
          onClick={onBackToCurrent}
        >
          Back to current chat
        </Button>
      </div>
      {!loading && errorText ? (
        <p className="text-[11px] leading-snug text-destructive" role="alert">
          {errorText}
        </p>
      ) : null}
    </div>
  );
}
