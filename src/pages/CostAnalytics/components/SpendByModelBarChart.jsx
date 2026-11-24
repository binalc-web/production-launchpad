import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { formatBudgetUsd } from "@/pages/CostAnalytics/costAnalyticsDisplay";
import { buildModelSpendChartData } from "@/pages/CostAnalytics/costAnalyticsChartData";

/**
 * Horizontal bar chart for spend grouped by Cursor model.
 */
export function SpendByModelBarChart({ byModel = [], limit = 8, className = "h-[280px] w-full" }) {
  const data = buildModelSpendChartData(byModel, limit);
  const chartConfig = Object.fromEntries(
    data.map((row) => [row.modelId, { label: row.label, color: row.fill }]),
  );

  if (data.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center rounded-lg border border-dashed border-border/70 bg-muted/20 text-sm text-muted-foreground">
        No spend by model yet.
      </div>
    );
  }

  return (
    <ChartContainer config={chartConfig} className={className}>
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
          dataKey="label"
          tickLine={false}
          axisLine={false}
          width={128}
          tickMargin={8}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value, _name, item) => [
                `${formatBudgetUsd(value)} · ${item?.payload?.runs ?? 0} runs`,
                item?.payload?.label,
              ]}
            />
          }
        />
        <Bar dataKey="cost" radius={[0, 4, 4, 0]} barSize={14}>
          {data.map((row) => (
            <Cell key={row.modelId} fill={row.fill} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
