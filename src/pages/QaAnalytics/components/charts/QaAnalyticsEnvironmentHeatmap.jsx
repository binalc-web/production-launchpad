import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMatrixRowMetric } from "@/pages/QaAnalytics/qaAnalyticsDisplay.js";
import { buildEnvironmentHeatmapCells } from "@/pages/QaAnalytics/qaAnalyticsChartData.js";
import { cn } from "@/lib/utils";

function heatColor(intensity, maxIntensity) {
  if (!intensity || !maxIntensity) return "bg-muted/30";
  const ratio = Math.min(1, intensity / maxIntensity);
  if (ratio >= 0.75) return "bg-destructive/70 text-destructive-foreground";
  if (ratio >= 0.5) return "bg-amber-500/60 text-amber-950";
  if (ratio >= 0.25) return "bg-primary/40 text-primary-foreground";
  return "bg-primary/15 text-foreground";
}

const METRIC_DESCRIPTIONS = {
  count: "Test-case outcome intensity by environment. Darker cells indicate higher counts.",
  passRate: "Cell share of row volume (%). Darker cells indicate higher concentration.",
  flakyRate: "Test-case counts by outcome (flaky rate shown in pass-rate column).",
  medianDurationMs: "Outcome counts colored by row median duration intensity.",
};

/**
 * @param {{ matrix?: object, matrixMetric?: string, onCellClick?: (row: object, outcome?: string) => void }} props
 */
export function QaAnalyticsEnvironmentHeatmap({ matrix, matrixMetric = "count", onCellClick }) {
  const { cells, columns, rows, maxCount } = buildEnvironmentHeatmapCells(matrix, matrixMetric);

  if (rows.length === 0) return null;

  const lastColumnLabel =
    matrixMetric === "flakyRate"
      ? "Flaky rate"
      : matrixMetric === "medianDurationMs"
        ? "Median duration"
        : "Pass rate";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Environment heatmap</CardTitle>
        <CardDescription>
          {METRIC_DESCRIPTIONS[matrixMetric] || METRIC_DESCRIPTIONS.count}
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <div className="min-w-[480px]">
          <div
            className="grid gap-1"
            style={{
              gridTemplateColumns: `140px repeat(${columns.length}, minmax(72px, 1fr)) 88px`,
            }}
          >
            <div className="text-xs font-medium text-muted-foreground">Environment</div>
            {columns.map((col) => (
              <div
                key={col}
                className="text-center text-xs font-medium capitalize text-muted-foreground"
              >
                {col}
              </div>
            ))}
            <div className="text-right text-xs font-medium text-muted-foreground">
              {lastColumnLabel}
            </div>

            {rows.map((row) => (
              <div key={row.environmentId} className="contents">
                <div className="truncate py-2 text-sm font-medium">{row.environmentId}</div>
                {columns.map((col) => {
                  const cell = cells.find(
                    (item) => item.environmentId === row.environmentId && item.outcome === col,
                  );
                  const intensity = cell?.intensity ?? 0;
                  return (
                    <button
                      key={`${row.environmentId}-${col}`}
                      type="button"
                      disabled={row.insufficient}
                      className={cn(
                        "rounded-md px-2 py-3 text-center text-xs tabular-nums transition-colors",
                        heatColor(intensity, maxCount),
                        onCellClick && !row.insufficient && "hover:ring-2 hover:ring-primary/40",
                      )}
                      onClick={() => !row.insufficient && onCellClick?.(row, col)}
                    >
                      {cell?.display ?? (row.insufficient ? "—" : "0")}
                    </button>
                  );
                })}
                <div className="py-2 text-right text-sm tabular-nums">
                  {row.insufficient
                    ? "—"
                    : formatMatrixRowMetric(
                        row,
                        matrixMetric === "count" ? "passRate" : matrixMetric,
                      )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
