import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { formatTokens } from "@/pages/AgentAnalytics/agentAnalyticsDisplay";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { buildDailyTokenUsageByProjectChartData } from "@/pages/CostAnalytics/costAnalyticsChartData";

/**
 * Stacked area chart for daily token usage split by project.
 */
export function DailyTokenUsageByProjectChart({
  dailyTokensByProject = [],
  limitProjects = 6,
  limitDays = 30,
  className = "h-[300px] w-full",
}) {
  const { data, series, chartConfig } = useMemo(
    () =>
      buildDailyTokenUsageByProjectChartData(dailyTokensByProject, {
        limitProjects,
        limitDays,
      }),
    [dailyTokensByProject, limitDays, limitProjects],
  );

  if (data.length === 0 || series.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-lg border border-dashed border-border/70 bg-muted/20 text-sm text-muted-foreground">
        No token usage recorded yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <ChartContainer config={chartConfig} className={className}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} tickMargin={8} />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={52}
            tickFormatter={(value) => formatTokens(value)}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(_, payload) => payload?.[0]?.payload?.label ?? ""}
                formatter={(value, name) => {
                  const seriesMeta = series.find((item) => item.key === name);
                  return [formatTokens(value), seriesMeta?.fullName ?? name];
                }}
              />
            }
          />
          {series.map((item) => (
            <Area
              key={item.key}
              type="monotone"
              dataKey={item.key}
              stackId="tokens"
              stroke={item.color}
              fill={item.color}
              fillOpacity={0.55}
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3, strokeWidth: 0 }}
            />
          ))}
        </AreaChart>
      </ChartContainer>

      <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        {series.map((item) => (
          <span key={item.key} className="flex items-center gap-2">
            <span className="size-2 rounded-full" style={{ backgroundColor: item.color }} />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
