import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatQaDuration,
  formatQaRate,
  formatMatrixRowMetric,
} from "@/pages/QaAnalytics/qaAnalyticsDisplay.js";
import { QaAnalyticsActionMatrixChart } from "@/pages/QaAnalytics/components/charts/QaAnalyticsActionMatrixChart.jsx";
import { QaAnalyticsTruncatedText } from "@/pages/QaAnalytics/components/QaAnalyticsTruncatedText.jsx";
import { cn } from "@/lib/utils";

/**
 * @param {{ matrix?: object, matrixMetric?: string, onCellClick?: (row: object, outcome?: string) => void }} props
 */
export function QaAnalyticsEnvironmentMatrix({ matrix, matrixMetric = "count", onCellClick }) {
  const rows = matrix?.rows ?? [];
  const columns = matrix?.columns ?? [];
  const columnTotals = matrix?.columnTotals ?? {};

  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {matrix?.title || "Environment × Test-case outcome"}
          </CardTitle>
          <CardDescription>No environment data in this period.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {matrix?.title || "Environment × Test-case outcome"}
        </CardTitle>
        <CardDescription>
          Test-case grain. Metric: {matrixMetric}. Rates suppressed when n &lt; 5. Click a cell to
          filter evidence.
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Environment</TableHead>
              <TableHead className="text-right">n</TableHead>
              {columns.map((col) => (
                <TableHead key={col} className="text-right capitalize">
                  {col}
                </TableHead>
              ))}
              <TableHead className="text-right">
                {matrixMetric === "flakyRate"
                  ? "Flaky rate"
                  : matrixMetric === "medianDurationMs"
                    ? "Median duration"
                    : "Pass rate"}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.environmentId}>
                <TableCell className="font-medium">{row.environmentId}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.insufficient ? "Insufficient" : row.n}
                </TableCell>
                {columns.map((col) => {
                  const cell = row.cells?.find((c) => c.outcome === col);
                  return (
                    <TableCell
                      key={col}
                      className={cn(
                        "text-right tabular-nums",
                        onCellClick && !row.insufficient && "cursor-pointer hover:bg-muted/50",
                      )}
                      onClick={() => !row.insufficient && onCellClick?.(row, col)}
                    >
                      {row.insufficient ? "—" : (cell?.count ?? 0)}
                    </TableCell>
                  );
                })}
                <TableCell className="text-right tabular-nums">
                  {formatMatrixRowMetric(row, matrixMetric === "count" ? "passRate" : matrixMetric)}
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="font-medium">
              <TableCell>Total</TableCell>
              <TableCell className="text-right tabular-nums">{columnTotals.total ?? "—"}</TableCell>
              {columns.map((col) => (
                <TableCell key={col} className="text-right tabular-nums">
                  {columnTotals[col] ?? "—"}
                </TableCell>
              ))}
              <TableCell />
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/**
 * @param {{ matrix?: object, onCellClick?: (row: object, outcome?: string) => void }} props
 */
export function QaAnalyticsRunEnvironmentMatrix({ matrix, onCellClick }) {
  const rows = matrix?.rows ?? [];
  const columns = matrix?.columns ?? [];

  if (rows.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{matrix?.title || "Environment × Run status"}</CardTitle>
        <CardDescription>
          Operational run-grain view (passed, failed, cancelled, interrupted, running).
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Environment</TableHead>
              <TableHead className="text-right">n</TableHead>
              {columns.map((col) => (
                <TableHead key={col} className="text-right capitalize">
                  {col}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.environmentId}>
                <TableCell className="font-medium">{row.environmentId}</TableCell>
                <TableCell className="text-right tabular-nums">{row.n}</TableCell>
                {columns.map((col) => {
                  const cell = row.cells?.find((c) => c.outcome === col);
                  return (
                    <TableCell
                      key={col}
                      className={cn(
                        "text-right tabular-nums",
                        onCellClick && "cursor-pointer hover:bg-muted/50",
                      )}
                      onClick={() => onCellClick?.(row, col)}
                    >
                      {cell?.count ?? 0}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/**
 * @param {{ points?: object[], formula?: object, onSelect?: (point: object) => void }} props
 */
export function QaAnalyticsActionMatrix({ points = [], formula, onSelect }) {
  if (points.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Portfolio action matrix</CardTitle>
          <CardDescription>
            <QaAnalyticsTruncatedText lineClamp={2} text="No projects with QA activity." />
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Portfolio action matrix</CardTitle>
        <CardDescription>
          <QaAnalyticsTruncatedText
            lineClamp={2}
            text={`X: ${formula?.xAxis || "Active QA users"} · Y: ${formula?.yAxis || "Test-case pass rate"} · Size: ${formula?.bubbleSize || "Live run count"}`}
          />
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <QaAnalyticsActionMatrixChart points={points} onSelect={onSelect} />

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead className="text-right">Active users</TableHead>
                <TableHead className="text-right">Test-case pass rate</TableHead>
                <TableHead className="text-right">Runs</TableHead>
                <TableHead>Severity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {points.map((p) => (
                <TableRow
                  key={p.projectId}
                  className={cn(onSelect && "cursor-pointer hover:bg-muted/50")}
                  onClick={() => onSelect?.(p)}
                >
                  <TableCell>{p.name}</TableCell>
                  <TableCell className="text-right tabular-nums">{p.x}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatQaRate(p.y)}</TableCell>
                  <TableCell className="text-right tabular-nums">{p.bubbleSize}</TableCell>
                  <TableCell>
                    <span className="sr-only">Severity: </span>
                    {p.severity}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
