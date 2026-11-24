import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buildFeatureAdoptionChartData } from "@/pages/QaAnalytics/qaAnalyticsChartData.js";

const chartConfig = {
  uniqueUsers: { label: "Unique users", color: "var(--chart-3)" },
};

/**
 * @param {{ stages?: object[] }} props
 */
export function QaProjectFeatureAdoptionChart({ stages = [] }) {
  const data = buildFeatureAdoptionChartData(stages);
  const chartHeight = Math.max(220, Math.min(400, Math.max(data.length, 3) * 36 + 48));

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Feature adoption</CardTitle>
          <CardDescription>No adoption events in this period.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Feature adoption</CardTitle>
        <CardDescription>
          Unique users who performed each QA App action. Counts are independent — not a conversion
          funnel.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="w-full" style={{ height: chartHeight }}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
            accessibilityLayer
          >
            <CartesianGrid horizontal={false} strokeDasharray="3 3" />
            <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="stage"
              tickLine={false}
              axisLine={false}
              width={160}
              tickMargin={8}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="uniqueUsers" radius={[0, 4, 4, 0]} barSize={18}>
              {data.map((row) => (
                <Cell key={row.stage} fill={row.fill} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
