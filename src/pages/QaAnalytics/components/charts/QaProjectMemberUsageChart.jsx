import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buildMemberUsageChartData } from "@/pages/QaAnalytics/qaAnalyticsChartData.js";
import { formatQaDateTime } from "@/pages/QaAnalytics/qaAnalyticsDisplay.js";

const chartConfig = {
  activeDays: { label: "Active days", color: "var(--chart-2)" },
};

/**
 * @param {{ members?: object[] }} props
 */
export function QaProjectMemberUsageChart({ members = [] }) {
  const data = buildMemberUsageChartData(members);
  const chartHeight = Math.max(240, Math.min(560, Math.max(data.length, 3) * 32 + 48));

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Usage by team member</CardTitle>
          <CardDescription>No QA App activity from team members in this period.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Usage by team member</CardTitle>
        <CardDescription>
          Distinct days with QA events or live runs. Includes users who only generate tests or view
          reports.
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
              dataKey="name"
              tickLine={false}
              axisLine={false}
              width={140}
              tickMargin={8}
            />
            <ChartTooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0]?.payload;
                if (!row) return null;
                return (
                  <div className="rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
                    <p className="font-medium">{row.fullName}</p>
                    <p className="mt-1 text-muted-foreground">
                      {row.activeDays} active day{row.activeDays === 1 ? "" : "s"}
                    </p>
                    <p className="text-muted-foreground">
                      {row.runs} test run{row.runs === 1 ? "" : "s"}
                    </p>
                    <p className="text-muted-foreground">
                      Features: {row.features.length ? row.features.join(", ") : "—"}
                    </p>
                    <p className="text-muted-foreground">
                      Last activity: {formatQaDateTime(row.lastActiveAt)}
                    </p>
                  </div>
                );
              }}
            />
            <Bar dataKey="activeDays" radius={[0, 4, 4, 0]} barSize={16}>
              {data.map((row) => (
                <Cell key={row.userId} fill={row.fill} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
