import { History } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Shown when the active chat thread is empty but older archived messages exist.
 */
export function ArchivedChatHistoryHint({ onViewOlderChats, loading = false }) {
  return (
    <div className="rounded-lg border border-border/80 bg-muted/30 px-3 py-2.5">
      <div className="flex items-start gap-2">
        <History className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-foreground">
            Previous messages are in Older chats
          </p>
          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
            Your current chat thread is empty. Earlier conversation history was archived and is
            still available from the history menu.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2 h-7 text-xs"
            disabled={loading}
            onClick={onViewOlderChats}
          >
            {loading ? "Loading…" : "View older chats"}
          </Button>
        </div>
      </div>
    </div>
  );
}
