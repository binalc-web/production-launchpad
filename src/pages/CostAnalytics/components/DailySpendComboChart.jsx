import { Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { formatBudgetUsd } from "@/pages/CostAnalytics/costAnalyticsDisplay";
import {
  buildDailySpendChartData,
  COST_CHART_COLORS,
} from "@/pages/CostAnalytics/costAnalyticsChartData";

const dailyChartConfig = {
  cost: {
    label: "Spend",
    color: COST_CHART_COLORS.spend,
  },
  runs: {
    label: "Runs",
    color: COST_CHART_COLORS.runs,
  },
};

/**
 * Bar + line chart for daily estimated spend (USD) and agent runs.
 */
export function DailySpendComboChart({
  daily = [],
  limitDays = 30,
  className = "h-[260px] w-full",
}) {
  const data = buildDailySpendChartData(daily, limitDays);

  if (data.length === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center rounded-lg border border-dashed border-border/70 bg-muted/20 text-sm text-muted-foreground">
        No daily spend recorded yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <ChartContainer config={dailyChartConfig} className={className}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} tickMargin={8} />
          <YAxis
            yAxisId="spend"
            tickLine={false}
            axisLine={false}
            width={48}
            tickFormatter={(value) => formatBudgetUsd(value)}
          />
          <YAxis
            yAxisId="runs"
            orientation="right"
            tickLine={false}
            axisLine={false}
            width={40}
            allowDecimals={false}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(_, payload) => payload?.[0]?.payload?.label ?? ""}
                formatter={(value, name) => {
                  if (name === "cost") return formatBudgetUsd(value);
                  return String(value);
                }}
              />
            }
          />
          <Bar
            yAxisId="spend"
            dataKey="cost"
            fill={COST_CHART_COLORS.spend}
            radius={[4, 4, 0, 0]}
            maxBarSize={32}
          />
          <Line
            yAxisId="runs"
            type="monotone"
            dataKey="runs"
            stroke={COST_CHART_COLORS.runs}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        </ComposedChart>
      </ChartContainer>

      <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          <span
            className="size-2 rounded-sm"
            style={{ backgroundColor: COST_CHART_COLORS.spend }}
          />
          Spend
        </span>
        <span className="flex items-center gap-2">
          <span
            className="size-2 rounded-full"
            style={{ backgroundColor: COST_CHART_COLORS.runs }}
          />
          Runs
        </span>
      </div>
    </div>
  );
}
