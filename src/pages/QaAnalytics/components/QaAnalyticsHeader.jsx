import { Button } from "@/components/ui/button";
import { formatQaDateTime } from "@/pages/QaAnalytics/qaAnalyticsDisplay.js";

/**
 * @param {{ title: string, generatedAt?: string|null, onMethodology?: () => void }} props
 */
export function QaAnalyticsHeader({ title, generatedAt, onMethodology }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">Last Updated: {formatQaDateTime(generatedAt)}</p>
      </div>
      {onMethodology ? (
        <Button type="button" variant="outline" size="sm" onClick={onMethodology}>
          Methodology
        </Button>
      ) : null}
    </div>
  );
}
