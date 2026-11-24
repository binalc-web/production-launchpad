import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buildActiveDrillFilters } from "@/pages/QaAnalytics/qaAnalyticsDisplay.js";

/**
 * @param {{ state: object, onClear: () => void, onRemove: (key: string) => void }} props
 */
export function QaAnalyticsFilterBanner({ state, onClear, onRemove }) {
  const active = buildActiveDrillFilters(state);
  if (active.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
      <span className="text-xs font-medium text-muted-foreground">Active drill:</span>
      {active.map((item) => (
        <Badge key={item.key} variant="secondary" className="gap-1 pr-1">
          {item.label}
          <button
            type="button"
            className="rounded-sm p-0.5 hover:bg-muted"
            aria-label={`Remove ${item.label} filter`}
            onClick={() => onRemove(item.key)}
          >
            <X className="size-3" aria-hidden />
          </button>
        </Badge>
      ))}
      <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={onClear}>
        Clear all
      </Button>
    </div>
  );
}
