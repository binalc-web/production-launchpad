import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  buildProjectAdoptionChartData,
  QA_CHART_COLORS,
} from "@/pages/QaAnalytics/qaAnalyticsChartData.js";
import { QaAnalyticsTruncatedText } from "@/pages/QaAnalytics/components/QaAnalyticsTruncatedText.jsx";

const chartConfig = {
  activeDays: { label: "Active days", color: QA_CHART_COLORS.runs },
};

/**
 * Horizontal bar chart — QA App usage continuity per project.
 * Uses the portfolio page date range (no chart-local filters).
 */
export function QaAnalyticsProjectAdoptionChart({ projects = [], onSelect, className }) {
  const data = buildProjectAdoptionChartData(projects);
  const chartHeight = Math.max(240, Math.min(560, Math.max(data.length, 3) * 32 + 48));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">QA App usage by project</CardTitle>
        <CardDescription>
          <QaAnalyticsTruncatedText
            lineClamp={2}
            text="Distinct days with QA runs or product events in the selected period. Taller bars mean more continuous adoption."
          />
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No QA App activity for projects in this period.
          </p>
        ) : (
          <>
            <ChartContainer
              config={chartConfig}
              className={className ?? "w-full"}
              style={{ height: chartHeight }}
            >
              <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
                accessibilityLayer
              >
                <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  label={{ value: "Active days", position: "insideBottom", offset: -2 }}
                />
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
                          {row.analyticsEvents} product events
                        </p>
                        <p className="text-muted-foreground">
                          {row.runs} runs · {row.activeUsers} user
                          {row.activeUsers === 1 ? "" : "s"}
                        </p>
                      </div>
                    );
                  }}
                />
                <Bar
                  dataKey="activeDays"
                  radius={[0, 4, 4, 0]}
                  barSize={16}
                  onClick={(entry) => onSelect?.(entry?.payload ?? entry)}
                  className={onSelect ? "cursor-pointer" : undefined}
                >
                  {data.map((row) => (
                    <Cell key={row.projectId} fill={row.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
            <p className="mt-3 text-xs text-muted-foreground">
              Hover a bar for project details. Based on{" "}
              {data.reduce((sum, row) => sum + row.analyticsEvents, 0)} product events across{" "}
              {data.length} active project{data.length === 1 ? "" : "s"}.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
