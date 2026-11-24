import { Cell, Pie, PieChart } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { formatBudgetUsd } from "@/pages/CostAnalytics/costAnalyticsDisplay";
import {
  buildBudgetUtilizationChartData,
  COST_CHART_COLORS,
} from "@/pages/CostAnalytics/costAnalyticsChartData";

const utilizationChartConfig = {
  spent: { label: "Spent", color: COST_CHART_COLORS.spend },
  remaining: { label: "Remaining", color: COST_CHART_COLORS.remaining },
};

/**
 * Donut chart for platform budget utilization (spent vs remaining).
 */
export function BudgetUtilizationDonutChart({
  totals,
  className = "mx-auto aspect-square h-[220px] w-full max-w-[220px]",
}) {
  const data = buildBudgetUtilizationChartData(totals);

  if (data.length === 0) {
    return (
      <div className="flex aspect-square max-h-[220px] items-center justify-center rounded-lg border border-dashed border-border/70 bg-muted/20 text-sm text-muted-foreground">
        No budget data yet.
      </div>
    );
  }

  const totalBudget = Number(totals?.totalBudgetUsd) || 0;
  const totalSpent = Number(totals?.totalSpendUsd) || 0;
  const utilizationPct =
    totalBudget > 0 ? Math.min(100, Math.round((totalSpent / totalBudget) * 100)) : 0;

  return (
    <div className="relative">
      <ChartContainer config={utilizationChartConfig} className={className}>
        <PieChart>
          <ChartTooltip
            content={
              <ChartTooltipContent
                hideLabel
                formatter={(value, name) => [
                  formatBudgetUsd(value),
                  utilizationChartConfig[name]?.label ?? name,
                ]}
              />
            }
          />
          <Pie
            data={data}
            dataKey="value"
            nameKey="key"
            innerRadius={62}
            outerRadius={88}
            paddingAngle={2}
            strokeWidth={2}
          >
            {data.map((entry) => (
              <Cell key={entry.key} fill={entry.fill} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold tabular-nums">{utilizationPct}%</span>
        <span className="text-xs text-muted-foreground">utilized</span>
      </div>
    </div>
  );
}
