import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, Cell, Line, Pie, PieChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatQaRate } from "@/pages/QaAnalytics/qaAnalyticsDisplay.js";
import {
  buildOutcomeDistributionData,
  QA_CHART_COLORS,
} from "@/pages/QaAnalytics/qaAnalyticsChartData.js";
import { QaAnalyticsChartDataTable } from "@/pages/QaAnalytics/components/QaAnalyticsChartDataTable.jsx";

const trendConfig = {
  runs: { label: "Runs (run grain)", color: QA_CHART_COLORS.runs },
  testCasePassRate: { label: "Test-case pass rate", color: QA_CHART_COLORS.passRate },
  comparisonPassRate: { label: "Prior period pass rate", color: QA_CHART_COLORS.comparison },
};

/**
 * @param {{ trend?: { current?: object[], comparison?: object[] } }} props
 */
export function QaAnalyticsTrendChart({ trend }) {
  const comparison = trend?.comparison ?? [];
  const data = useMemo(
    () =>
      (trend?.current ?? []).map((row, index) => ({
        ...row,
        comparisonPassRate: comparison[index]?.testCasePassRate ?? null,
        comparisonRuns: comparison[index]?.runs ?? null,
      })),
    [trend?.current, comparison],
  );

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Run trend</CardTitle>
          <CardDescription>No runs in this period.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const hasComparison = comparison.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Run trend</CardTitle>
        <CardDescription>
          Live runs (run grain) and test-case pass rate (test-case grain).
          {hasComparison ? " Dashed line shows prior equal-length period." : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ChartContainer config={trendConfig} className="h-[280px] w-full min-h-[280px]">
          <AreaChart
            data={data}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            accessibilityLayer
          >
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="date" tickLine={false} axisLine={false} minTickGap={24} />
            <YAxis
              yAxisId="runs"
              tickLine={false}
              axisLine={false}
              width={40}
              allowDecimals={false}
            />
            <YAxis
              yAxisId="rate"
              orientation="right"
              tickLine={false}
              axisLine={false}
              width={48}
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name) => {
                    if (name === "testCasePassRate" || name === "comparisonPassRate") {
                      return formatQaRate(Number(value));
                    }
                    return String(value);
                  }}
                />
              }
            />
            <Area
              yAxisId="runs"
              type="monotone"
              dataKey="runs"
              stroke={QA_CHART_COLORS.runs}
              fill={QA_CHART_COLORS.runs}
              fillOpacity={0.2}
              strokeWidth={2}
            />
            <Line
              yAxisId="rate"
              type="monotone"
              dataKey="testCasePassRate"
              stroke={QA_CHART_COLORS.passRate}
              strokeWidth={2}
              dot={false}
            />
            {hasComparison ? (
              <Line
                yAxisId="rate"
                type="monotone"
                dataKey="comparisonPassRate"
                stroke={QA_CHART_COLORS.comparison}
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
              />
            ) : null}
          </AreaChart>
        </ChartContainer>
        <QaAnalyticsChartDataTable
          caption="Run trend"
          columns={[
            { key: "date", label: "Date" },
            { key: "runs", label: "Runs", className: "text-right tabular-nums" },
            {
              key: "testCasePassRate",
              label: "Pass rate",
              className: "text-right tabular-nums",
              render: (row) => formatQaRate(row.testCasePassRate),
            },
            ...(hasComparison
              ? [
                  {
                    key: "comparisonPassRate",
                    label: "Prior pass rate",
                    className: "text-right tabular-nums",
                    render: (row) => formatQaRate(row.comparisonPassRate),
                  },
                ]
              : []),
          ]}
          rows={data}
        />
      </CardContent>
    </Card>
  );
}

/**
 * @param {{ breakdowns?: { testCaseStatusMix?: Record<string, number> } }} props
 */
export function QaAnalyticsDistributionChart({ breakdowns }) {
  const data = buildOutcomeDistributionData(breakdowns?.testCaseStatusMix);
  const total = data.reduce((sum, row) => sum + row.count, 0);

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Outcome distribution</CardTitle>
          <CardDescription>No status data.</CardDescription>
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
        <CardTitle className="text-base">Test-case outcome distribution</CardTitle>
        <CardDescription>Test-case grain status mix in period.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-center">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square h-[260px] w-full max-w-[320px] min-h-[260px]"
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
        <ul className="space-y-2 text-sm">
          {data.map((row) => (
            <li key={row.status} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 capitalize">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: row.fill }} />
                {row.status}
              </span>
              <span className="tabular-nums text-muted-foreground">
                {row.count} ({total > 0 ? ((row.count / total) * 100).toFixed(1) : 0}%)
              </span>
            </li>
          ))}
        </ul>
        <div className="lg:col-span-2">
          <QaAnalyticsChartDataTable
            caption="Outcome distribution"
            columns={[
              { key: "status", label: "Outcome" },
              { key: "count", label: "Count", className: "text-right tabular-nums" },
            ]}
            rows={data}
          />
        </div>
      </CardContent>
    </Card>
  );
}
