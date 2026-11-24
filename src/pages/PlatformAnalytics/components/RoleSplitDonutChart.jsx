import { Cell, Pie, PieChart } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PLATFORM_CHART_COLORS } from "../platformAnalyticsDisplay";

const COLORS = Object.values(PLATFORM_CHART_COLORS);

/** @param {{ roleSplit: { role: string, count: number }[] }} props */
export function RoleSplitDonutChart({ roleSplit = [] }) {
  const data = roleSplit.filter((r) => r.count > 0).map((r) => ({ name: r.role, value: r.count }));
  if (data.length === 0) {
    return <div className="py-10 text-center text-sm text-muted-foreground">No users yet.</div>;
  }
  const config = Object.fromEntries(
    data.map((d, i) => [d.name, { label: d.name, color: COLORS[i % COLORS.length] }]),
  );
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <ChartContainer
          config={config}
          className="mx-auto aspect-square h-[180px] w-full max-w-[180px]"
        >
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={52}
              outerRadius={78}
              strokeWidth={2}
            >
              {data.map((d, i) => (
                <Cell key={d.name} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-semibold tabular-nums">{total}</span>
          <span className="text-[11px] text-muted-foreground">users</span>
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
        {data.map((d, i) => (
          <span key={d.name} className="flex items-center gap-1.5 capitalize">
            <span
              className="size-2 rounded-full"
              style={{ background: COLORS[i % COLORS.length] }}
            />
            {d.name} {d.value}
          </span>
        ))}
      </div>
    </div>
  );
}
