import { Button } from "@/components/ui/button";

/**
 * @param {{ variant?: "product"|"filtered"|"insufficient", onClearFilters?: () => void, onWidenRange?: () => void }} props
 */
export function QaAnalyticsEmptyState({ variant = "product", onClearFilters, onWidenRange }) {
  if (variant === "filtered") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/70 bg-muted/20 px-6 py-12 text-center">
        <p className="text-sm font-medium">No runs match these filters</p>
        <p className="max-w-md text-sm text-muted-foreground">
          Try clearing drill filters or widening the date range.
        </p>
        {onClearFilters ? (
          <Button type="button" variant="outline" size="sm" onClick={onClearFilters}>
            Clear filters
          </Button>
        ) : null}
      </div>
    );
  }

  if (variant === "insufficient") {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/70 bg-muted/20 px-6 py-10 text-center">
        <p className="text-sm font-medium">Insufficient sample in this window</p>
        <p className="max-w-md text-sm text-muted-foreground">
          Rates and severity claims are suppressed when n &lt; 5 known outcomes.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/70 bg-muted/20 px-6 py-12 text-center">
      <p className="text-sm font-medium">No QA activity yet in this period</p>
      <p className="max-w-md text-sm text-muted-foreground">
        Run tests in the QA App or widen the date range to see adoption and quality signals.
      </p>
      {onWidenRange ? (
        <Button type="button" variant="outline" size="sm" onClick={onWidenRange}>
          Try last 30 days
        </Button>
      ) : null}
    </div>
  );
}
