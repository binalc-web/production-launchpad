import { useMemo } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  QA_ANALYTICS_RANGE_OPTIONS,
  QA_PROJECT_STATE_OPTIONS,
} from "@/pages/QaAnalytics/qaAnalyticsDisplay.js";
import { QaAnalyticsTruncatingControl } from "@/pages/QaAnalytics/components/QaAnalyticsTruncatedText.jsx";
import { QaAnalyticsDatePicker } from "@/pages/QaAnalytics/components/QaAnalyticsDatePicker.jsx";

function FilterFields({ state, onChange, showPortfolioFilters }) {
  const rangeLabel =
    QA_ANALYTICS_RANGE_OPTIONS.find((opt) => opt.id === state.range)?.label ?? state.range;
  const projectStateLabel =
    QA_PROJECT_STATE_OPTIONS.find((opt) => opt.id === (state.projectState || "active"))?.label ??
    state.projectState;

  return (
    <>
      <div className="flex min-w-[140px] flex-col gap-1">
        <label className="text-xs font-medium text-muted-foreground">Range</label>
        <Select value={state.range} onValueChange={(value) => onChange({ range: value })}>
          <QaAnalyticsTruncatingControl label={rangeLabel}>
            <SelectTrigger className="h-9 max-w-full">
              <SelectValue />
            </SelectTrigger>
          </QaAnalyticsTruncatingControl>
          <SelectContent>
            {QA_ANALYTICS_RANGE_OPTIONS.map((opt) => (
              <SelectItem key={opt.id} value={opt.id}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {state.range === "custom" ? (
        <>
          <QaAnalyticsDatePicker
            label="From (UTC date)"
            value={state.from ? state.from.slice(0, 10) : ""}
            onChange={(from) => onChange({ from })}
          />
          <QaAnalyticsDatePicker
            label="To (UTC date, inclusive)"
            value={state.to ? state.to.slice(0, 10) : ""}
            onChange={(to) => onChange({ to })}
          />
        </>
      ) : null}

      <div className="flex min-w-[140px] flex-col gap-1">
        <label className="text-xs font-medium text-muted-foreground">Environment</label>
        <Input
          className="h-9"
          placeholder="All environments"
          value={state.environment}
          title={state.environment || undefined}
          onChange={(e) => onChange({ environment: e.target.value })}
        />
      </div>

      {showPortfolioFilters ? (
        <div className="flex min-w-[140px] flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Project Status</label>
          <Select
            value={state.projectState || "active"}
            onValueChange={(value) => onChange({ projectState: value })}
          >
            <QaAnalyticsTruncatingControl label={projectStateLabel}>
              <SelectTrigger className="h-9 max-w-full">
                <SelectValue />
              </SelectTrigger>
            </QaAnalyticsTruncatingControl>
            <SelectContent>
              {QA_PROJECT_STATE_OPTIONS.map((opt) => (
                <SelectItem key={opt.id} value={opt.id} title={opt.label}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
    </>
  );
}

/**
 * @param {{ state: object, onChange: (patch: object) => void, showPortfolioFilters?: boolean }} props
 */
export function QaAnalyticsFilterRail({ state, onChange, showPortfolioFilters = false }) {
  const fields = useMemo(
    () => (
      <FilterFields state={state} onChange={onChange} showPortfolioFilters={showPortfolioFilters} />
    ),
    [state, onChange, showPortfolioFilters],
  );

  return (
    <>
      <div className="hidden flex-wrap items-end gap-3 rounded-xl border border-border/60 bg-background/95 p-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:flex sticky top-0 z-10">
        {fields}
      </div>

      <div className="md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button type="button" variant="outline" className="h-11 w-full justify-start gap-2">
              <SlidersHorizontal className="size-4" aria-hidden />
              Filters
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>QA Analytics filters</SheetTitle>
              <SheetDescription>Adjust range, environment, and project filters.</SheetDescription>
            </SheetHeader>
            <div className="mt-4 flex flex-col gap-4 pb-6">{fields}</div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
