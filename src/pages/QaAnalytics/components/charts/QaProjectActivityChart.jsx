import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  buildActivityTrendChartData,
  QA_CHART_COLORS,
} from "@/pages/QaAnalytics/qaAnalyticsChartData.js";

const chartConfig = {
  runs: { label: "Test runs", color: QA_CHART_COLORS.runs },
};

/**
 * @param {{ trend?: object, totalRuns?: number|null, activeUsers?: number|null, granularity?: string }} props
 */
export function QaProjectActivityChart({ trend, totalRuns, activeUsers, granularity = "day" }) {
  const data = buildActivityTrendChartData(trend);
  const grainLabel = granularity === "week" ? "week" : "day";

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">QA activity over time</CardTitle>
          <CardDescription>No live test runs in this period.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">QA activity over time</CardTitle>
        <CardDescription>
          Live test runs per {grainLabel}. Backfilled runs are excluded.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <dl className="flex flex-wrap gap-6 text-sm">
          <div>
            <dt className="text-muted-foreground">Total runs</dt>
            <dd className="text-2xl font-semibold tabular-nums">{totalRuns ?? 0}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Active users</dt>
            <dd className="text-2xl font-semibold tabular-nums">{activeUsers ?? 0}</dd>
          </div>
        </dl>

        <ChartContainer config={chartConfig} className="h-[280px] w-full min-h-[280px]">
          <AreaChart
            data={data}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            accessibilityLayer
          >
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="date" tickLine={false} axisLine={false} minTickGap={24} />
            <YAxis tickLine={false} axisLine={false} width={40} allowDecimals={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area
              type="monotone"
              dataKey="runs"
              stroke={QA_CHART_COLORS.runs}
              fill={QA_CHART_COLORS.runs}
              fillOpacity={0.2}
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
