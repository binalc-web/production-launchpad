import { Cell, Pie, PieChart } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { buildOutcomeDistributionData } from "@/pages/QaAnalytics/qaAnalyticsChartData.js";
import { formatQaRate } from "@/pages/QaAnalytics/qaAnalyticsDisplay.js";

const OUTCOME_ORDER = ["passed", "failed", "flaky", "skipped"];

/**
 * @param {{ breakdowns?: { testCaseStatusMix?: Record<string, number> }, passRate?: number|null, insufficient?: boolean, minSample?: number }} props
 */
export function QaProjectTestResultsDonut({
  breakdowns,
  passRate,
  insufficient = false,
  minSample = 5,
}) {
  const mix = breakdowns?.testCaseStatusMix ?? {};
  const orderedMix = Object.fromEntries(
    OUTCOME_ORDER.filter((key) => (mix[key] ?? 0) > 0).map((key) => [key, mix[key]]),
  );
  const data = buildOutcomeDistributionData(Object.keys(orderedMix).length ? orderedMix : mix);
  const total = data.reduce((sum, row) => sum + row.count, 0);

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Test results overview</CardTitle>
          <CardDescription>No test-case results in this period.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const chartConfig = Object.fromEntries(
    data.map((row) => [row.status, { label: row.status, color: row.fill }]),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Test results overview</CardTitle>
        <CardDescription>
          Test-case outcomes from live runs. Slice percentages are shares of all recorded results.
          Pass rate (passed / (passed + failed)):{" "}
          {insufficient ? "Insufficient data" : formatQaRate(passRate)}.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {insufficient ? (
          <Alert>
            <AlertDescription>
              Fewer than {minSample} test-case results — pass rate is suppressed, but outcome counts
              are shown.
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-center">
          <div className="relative mx-auto w-full max-w-[320px]">
            <ChartContainer
              config={chartConfig}
              className="mx-auto aspect-square h-[260px] w-full min-h-[260px]"
            >
              <PieChart accessibilityLayer>
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Pie
                  data={data}
                  dataKey="count"
                  nameKey="status"
                  innerRadius={58}
                  outerRadius={96}
                  paddingAngle={2}
                  strokeWidth={2}
                >
                  {data.map((entry) => (
                    <Cell key={entry.status} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-semibold tabular-nums">{total}</span>
              <span className="text-xs text-muted-foreground">results</span>
            </div>
          </div>

          <ul className="flex flex-col gap-2 text-sm">
            {data.map((row) => (
              <li key={row.status} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 capitalize">
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: row.fill }} />
                  {row.status}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {row.count} ({total > 0 ? ((row.count / total) * 100).toFixed(1) : 0}%)
                </span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
