import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { formatBucketLabel, PLATFORM_CHART_COLORS } from "../platformAnalyticsDisplay";

/**
 * Single-series area chart over time buckets.
 * @param {{ series: { date: string, value: number }[], granularity: string, label: string, color?: string, valueFormatter?: (v: number) => string, className?: string, emptyText?: string }} props
 */
export function TimeSeriesAreaChart({
  series = [],
  granularity = "day",
  label,
  color = PLATFORM_CHART_COLORS.primary,
  valueFormatter = (v) => String(v),
  className = "h-[220px] w-full",
  emptyText = "No data in this range.",
}) {
  const data = series.map((p) => ({ ...p, label: formatBucketLabel(p.date, granularity) }));
  const hasData = data.some((p) => Number(p.value) > 0);

  if (!hasData) {
    return (
      <div className="flex h-[220px] items-center justify-center rounded-lg border border-dashed border-border/70 bg-muted/20 text-sm text-muted-foreground">
        {emptyText}
      </div>
    );
  }

  const config = { value: { label, color } };
  const gradientId = `pa-grad-${label.replace(/\W+/g, "")}`;

  return (
    <ChartContainer config={config} className={className}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.35} />
            <stop offset="95%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} tickMargin={8} />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={44}
          allowDecimals={false}
          tickFormatter={valueFormatter}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) => payload?.[0]?.payload?.label ?? ""}
              formatter={(value) => valueFormatter(Number(value))}
            />
          }
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
        />
      </AreaChart>
    </ChartContainer>
  );
}
