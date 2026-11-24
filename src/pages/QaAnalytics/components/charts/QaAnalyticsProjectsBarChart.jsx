import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatQaRate } from "@/pages/QaAnalytics/qaAnalyticsDisplay.js";
import {
  buildProjectsPassRateChartData,
  QA_CHART_COLORS,
} from "@/pages/QaAnalytics/qaAnalyticsChartData.js";
import { QaAnalyticsTruncatedText } from "@/pages/QaAnalytics/components/QaAnalyticsTruncatedText.jsx";

const projectsChartConfig = {
  passRate: { label: "Test-case pass rate", color: QA_CHART_COLORS.passRate },
};

/**
 * Horizontal bar chart for top projects by test-case pass rate.
 */
export function QaAnalyticsProjectsBarChart({
  projects = [],
  onSelect,
  className = "h-[320px] w-full",
}) {
  const data = buildProjectsPassRateChartData(projects);

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Project pass rates</CardTitle>
          <CardDescription>
            <QaAnalyticsTruncatedText
              lineClamp={2}
              text="No projects with sufficient test-case data."
            />
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Project pass rates</CardTitle>
        <CardDescription>
          <QaAnalyticsTruncatedText
            lineClamp={2}
            text="Top projects by test-case pass rate (n ≥ 5)."
          />
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={projectsChartConfig} className={className}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
          >
            <CartesianGrid horizontal={false} strokeDasharray="3 3" />
            <XAxis
              type="number"
              domain={[0, 100]}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}%`}
            />
            <YAxis
              type="category"
              dataKey="name"
              tickLine={false}
              axisLine={false}
              width={112}
              tickMargin={8}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ""}
                  formatter={(value, name, item) => {
                    if (name === "passRate") return formatQaRate(Number(value));
                    return `${item?.payload?.runs ?? 0} runs`;
                  }}
                />
              }
            />
            <Bar
              dataKey="passRate"
              radius={[0, 4, 4, 0]}
              barSize={14}
              onClick={(entry) => onSelect?.(entry?.payload ?? entry)}
              className={onSelect ? "cursor-pointer" : undefined}
            >
              {data.map((row) => (
                <Cell key={row.projectId} fill={row.fill} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
