import { CartesianGrid, Scatter, ScatterChart, XAxis, YAxis, ZAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { formatQaRate } from "@/pages/QaAnalytics/qaAnalyticsDisplay.js";
import {
  buildActionMatrixChartData,
  QA_CHART_COLORS,
} from "@/pages/QaAnalytics/qaAnalyticsChartData.js";

const matrixChartConfig = {
  y: { label: "Test-case pass rate", color: QA_CHART_COLORS.passRate },
  x: { label: "Active QA users", color: QA_CHART_COLORS.runs },
};

/**
 * Bubble scatter for portfolio action matrix (users × pass rate × runs).
 */
export function QaAnalyticsActionMatrixChart({
  points = [],
  onSelect,
  className = "h-[320px] w-full",
}) {
  const data = buildActionMatrixChartData(points);

  if (data.length === 0) {
    return (
      <div className="flex h-[320px] items-center justify-center rounded-lg border border-dashed border-border/70 bg-muted/20 text-sm text-muted-foreground">
        No projects with enough data for the matrix chart.
      </div>
    );
  }

  return (
    <ChartContainer config={matrixChartConfig} className={className}>
      <ScatterChart margin={{ top: 12, right: 12, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          type="number"
          dataKey="x"
          name="Active users"
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
          label={{ value: "Active QA users", position: "insideBottom", offset: -4 }}
        />
        <YAxis
          type="number"
          dataKey="y"
          name="Pass rate"
          domain={[0, 100]}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${value}%`}
          label={{ value: "Test-case pass rate", angle: -90, position: "insideLeft" }}
        />
        <ZAxis type="number" dataKey="z" range={[80, 520]} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) => payload?.[0]?.payload?.name ?? ""}
              formatter={(value, name, item) => {
                if (name === "y") return formatQaRate(Number(value));
                if (name === "x") return `${value} users`;
                if (name === "z") return `${item?.payload?.bubbleSize ?? value} runs`;
                return String(value);
              }}
            />
          }
        />
        <Scatter
          data={data}
          shape={(props) => {
            const { cx, cy, payload } = props;
            const radius = Math.max(6, Math.min(18, Math.sqrt(payload.z) * 1.4));
            return (
              <circle
                cx={cx}
                cy={cy}
                r={radius}
                fill={payload.fill}
                fillOpacity={0.85}
                stroke={QA_CHART_COLORS.background}
                strokeWidth={1}
              />
            );
          }}
          onClick={(entry) => onSelect?.(entry?.payload ?? entry)}
          className={onSelect ? "cursor-pointer" : undefined}
        />
      </ScatterChart>
    </ChartContainer>
  );
}
