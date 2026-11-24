import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { formatBudgetUsd } from "@/pages/CostAnalytics/costAnalyticsDisplay";
import {
  buildTopProjectsChartData,
  COST_CHART_COLORS,
} from "@/pages/CostAnalytics/costAnalyticsChartData";

const topProjectsChartConfig = {
  spent: {
    label: "Spent",
    color: COST_CHART_COLORS.spend,
  },
  budget: {
    label: "Budget",
    color: COST_CHART_COLORS.budget,
  },
};

/**
 * Horizontal grouped bars comparing spend vs budget for top projects.
 */
export function TopProjectsSpendChart({
  projects = [],
  limit = 8,
  className = "h-[320px] w-full",
}) {
  const data = buildTopProjectsChartData(projects, limit);

  if (data.length === 0) {
    return (
      <div className="flex h-[320px] items-center justify-center rounded-lg border border-dashed border-border/70 bg-muted/20 text-sm text-muted-foreground">
        No project spend recorded yet.
      </div>
    );
  }

  return (
    <ChartContainer config={topProjectsChartConfig} className={className}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
        <CartesianGrid horizontal={false} strokeDasharray="3 3" />
        <XAxis
          type="number"
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => formatBudgetUsd(value)}
        />
        <YAxis
          type="category"
          dataKey="name"
          tickLine={false}
          axisLine={false}
          width={96}
          tickMargin={8}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ""}
              formatter={(value) => formatBudgetUsd(value)}
            />
          }
        />
        <Bar dataKey="budget" fill={COST_CHART_COLORS.budget} radius={[0, 4, 4, 0]} barSize={10} />
        <Bar dataKey="spent" fill={COST_CHART_COLORS.spend} radius={[0, 4, 4, 0]} barSize={10} />
      </BarChart>
    </ChartContainer>
  );
}
