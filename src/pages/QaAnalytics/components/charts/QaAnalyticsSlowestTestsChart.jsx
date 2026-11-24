import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchQaAnalyticsTestCases } from "@/api";
import { formatQaDuration } from "@/pages/QaAnalytics/qaAnalyticsDisplay.js";
import { QA_CHART_COLORS, qaChartSeriesColor } from "@/pages/QaAnalytics/qaAnalyticsChartData.js";
import { QaAnalyticsChartDataTable } from "@/pages/QaAnalytics/components/QaAnalyticsChartDataTable.jsx";

const chartConfig = {
  avgDurationMs: { label: "Avg duration", color: QA_CHART_COLORS.duration },
};

/**
 * @param {{ projectId: number|string, apiParams?: Record<string, string> }} props
 */
export function QaAnalyticsSlowestTestsChart({ projectId, apiParams = {} }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchQaAnalyticsTestCases({ ...apiParams, projectId, sort: "duration", limit: "10" })
      .then((res) => {
        if (!cancelled) setItems(res?.items ?? []);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, JSON.stringify(apiParams)]);

  const data = items.map((row, index) => ({
    name:
      (row.testCaseKey || row.title || "unknown").length > 20
        ? `${(row.testCaseKey || row.title).slice(0, 18)}…`
        : row.testCaseKey || row.title || "unknown",
    fullName: row.testCaseKey || row.title,
    avgDurationMs: row.avgDurationMs ?? 0,
    executions: row.executions,
    fill: qaChartSeriesColor(index),
  }));

  if (loading) {
    return (
      <Skeleton
        className="h-[280px] w-full"
        role="status"
        aria-busy="true"
        aria-label="Loading slowest tests"
      />
    );
  }

  if (error || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Slowest tests</CardTitle>
          <CardDescription>No duration data for test cases in this period.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Slowest tests</CardTitle>
        <CardDescription>Average test-case duration (test-case grain) — top 10.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ChartContainer config={chartConfig} className="h-[280px] w-full">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
          >
            <CartesianGrid horizontal={false} strokeDasharray="3 3" />
            <XAxis
              type="number"
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => formatQaDuration(v)}
            />
            <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={112} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ""}
                  formatter={(value) => formatQaDuration(Number(value))}
                />
              }
            />
            <Bar dataKey="avgDurationMs" radius={[0, 4, 4, 0]} barSize={14}>
              {data.map((row) => (
                <Cell key={row.fullName} fill={row.fill} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
        <QaAnalyticsChartDataTable
          caption="Slowest tests"
          columns={[
            { key: "fullName", label: "Test" },
            {
              key: "avgDurationMs",
              label: "Avg duration",
              render: (row) => formatQaDuration(row.avgDurationMs),
            },
            { key: "executions", label: "Executions", className: "text-right tabular-nums" },
          ]}
          rows={data}
        />
      </CardContent>
    </Card>
  );
}
