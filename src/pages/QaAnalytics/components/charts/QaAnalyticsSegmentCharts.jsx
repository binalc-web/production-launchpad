import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatQaRate } from "@/pages/QaAnalytics/qaAnalyticsDisplay.js";
import { QA_CHART_COLORS, qaChartSeriesColor } from "@/pages/QaAnalytics/qaAnalyticsChartData.js";

/**
 * @param {{ rows?: object[], onSelect?: (row: object) => void, title?: string, description?: string }} props
 */
export function QaAnalyticsSegmentBarChart({
  rows = [],
  onSelect,
  title = "Segmentation",
  description = "Top segments by run volume.",
}) {
  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>No data.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const data = rows.map((row, index) => ({
    label: String(row.environmentId ?? row.userId ?? row.appVersion ?? "unknown"),
    runs: row.runs,
    passRate: row.passRate,
    fill: qaChartSeriesColor(index),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={{ runs: { label: "Runs", color: QA_CHART_COLORS.duration } }}
          className="h-[260px] w-full"
        >
          <BarChart data={data} layout="vertical" margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid horizontal={false} strokeDasharray="3 3" />
            <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
            <YAxis type="category" dataKey="label" tickLine={false} axisLine={false} width={100} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name, item) => {
                    if (name === "runs") return String(value);
                    return formatQaRate(item?.payload?.passRate);
                  }}
                />
              }
            />
            <Bar
              dataKey="runs"
              radius={[0, 4, 4, 0]}
              onClick={(data) => onSelect?.(data)}
              className={onSelect ? "cursor-pointer" : undefined}
            >
              {data.map((row) => (
                <Cell key={row.label} fill={row.fill} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

/**
 * @param {{ adoption?: { byFeature?: object[] } }} props
 */
export function QaAnalyticsAdoptionChart({ adoption }) {
  const data = (adoption?.byFeature ?? []).slice(0, 8).map((row) => ({
    feature: row.feature,
    count: row.count,
  }));

  return (
    <QaAnalyticsSegmentBarChart
      rows={data.map((d) => ({ environmentId: d.feature, runs: d.count, passRate: null }))}
      title="Adoption funnel"
      description="Product events by feature (not mixed into pass-rate denominators)."
    />
  );
}
