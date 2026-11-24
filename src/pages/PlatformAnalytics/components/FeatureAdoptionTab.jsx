import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  formatCount,
  formatDelta,
  PLATFORM_CHART_COLORS,
  sortRowsByKey,
} from "../platformAnalyticsDisplay";
import { nextColumnSort, SortableTableHead } from "./SortableTableHead";

const chartConfig = { events: { label: "Events", color: PLATFORM_CHART_COLORS.primary } };

function DeltaText({ deltaPct }) {
  const d = formatDelta(deltaPct);
  return (
    <span
      className={cn(
        "text-xs font-medium",
        d.tone === "up" && "text-emerald-600 dark:text-emerald-400",
        d.tone === "down" && "text-rose-600 dark:text-rose-400",
        d.tone === "new" && "text-sky-600 dark:text-sky-400",
        d.tone === "flat" && "text-muted-foreground",
      )}
    >
      {d.label}
    </span>
  );
}

const FEATURE_COLUMNS = [
  { key: "label", label: "Feature", defaultOrder: "asc" },
  { key: "events", label: "Events", defaultOrder: "desc", align: "right" },
  { key: "delta", label: "vs previous", defaultOrder: "desc", align: "right" },
  { key: "users", label: "Distinct users", defaultOrder: "desc", align: "right" },
  { key: "projects", label: "Distinct projects", defaultOrder: "desc", align: "right" },
  { key: "adoption", label: "Project adoption", defaultOrder: "desc", align: "right" },
];

const FEATURE_ACCESSORS = {
  label: { kind: "text", read: (f) => f.label },
  events: { kind: "number", read: (f) => f.events },
  delta: { kind: "number", read: (f) => (f.deltaPct == null ? -Infinity : f.deltaPct) },
  users: { kind: "number", read: (f) => (f.users == null ? -1 : f.users) },
  projects: { kind: "number", read: (f) => f.projects },
  adoption: { kind: "number", read: (f) => f.projectAdoptionPct },
};

const AREA_COLUMNS = [
  { key: "area", label: "Area", defaultOrder: "asc" },
  { key: "events", label: "Events", defaultOrder: "desc", align: "right" },
  { key: "users", label: "Users", defaultOrder: "desc", align: "right" },
  { key: "projects", label: "Projects", defaultOrder: "desc", align: "right" },
];

const AREA_ACCESSORS = {
  area: { kind: "text", read: (a) => a.area },
  events: { kind: "number", read: (a) => a.events },
  users: { kind: "number", read: (a) => a.users },
  projects: { kind: "number", read: (a) => a.projects },
};

function SortHeader({ columns, sort, order, onChange }) {
  return (
    <TableRow>
      {columns.map((column) => (
        <SortableTableHead
          key={column.key}
          label={column.label}
          sortKey={column.key}
          sort={sort}
          order={order}
          defaultOrder={column.defaultOrder}
          align={column.align}
          onSort={(key, defaultOrder) => onChange(nextColumnSort(sort, order, key, defaultOrder))}
        />
      ))}
    </TableRow>
  );
}

export function FeatureAdoptionTab({ data, loading, error }) {
  const [featureSort, setFeatureSort] = useState({ sort: "events", order: "desc" });
  const [areaSort, setAreaSort] = useState({ sort: "events", order: "desc" });
  const features = useMemo(
    () =>
      sortRowsByKey(data?.features ?? [], featureSort.sort, featureSort.order, FEATURE_ACCESSORS),
    [data?.features, featureSort.order, featureSort.sort],
  );
  const chartData = useMemo(
    () =>
      [...(data?.features ?? [])].filter((f) => f.events > 0).sort((a, b) => b.events - a.events),
    [data?.features],
  );
  const areas = useMemo(
    () => sortRowsByKey(data?.activityByArea ?? [], areaSort.sort, areaSort.order, AREA_ACCESSORS),
    [areaSort.order, areaSort.sort, data?.activityByArea],
  );
  if (error) return <div className="px-1 py-6 text-sm text-destructive">{error}</div>;
  if (loading || !data) {
    return (
      <div
        className="space-y-4"
        role="status"
        aria-busy="true"
        aria-label="Loading feature adoption"
      >
        <Skeleton className="h-[360px] rounded-xl" />
        <Skeleton className="h-[300px] rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Usage by feature</CardTitle>
          <CardDescription>
            Events in range across {formatCount(data.activeProjects)} active projects and{" "}
            {formatCount(data.activeUsers)} active users.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No feature usage in this range.
            </div>
          ) : (
            <ChartContainer
              config={chartConfig}
              className="w-full"
              style={{ height: Math.max(200, chartData.length * 34) }}
            >
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
              >
                <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  width={150}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="events"
                  fill={PLATFORM_CHART_COLORS.primary}
                  radius={[0, 4, 4, 0]}
                  maxBarSize={22}
                />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <SortHeader
              columns={FEATURE_COLUMNS}
              sort={featureSort.sort}
              order={featureSort.order}
              onChange={setFeatureSort}
            />
          </TableHeader>
          <TableBody>
            {features.map((f) => (
              <TableRow key={f.key}>
                <TableCell className="font-medium">{f.label}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCount(f.events)}</TableCell>
                <TableCell className="text-right">
                  <DeltaText deltaPct={f.deltaPct} />
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {f.users === null ? "—" : formatCount(f.users)}
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatCount(f.projects)}</TableCell>
                <TableCell className="text-right tabular-nums">{f.projectAdoptionPct}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {areas.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Project activity by area</CardTitle>
            <CardDescription>Activity-feed events grouped by kind prefix.</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <SortHeader
                  columns={AREA_COLUMNS}
                  sort={areaSort.sort}
                  order={areaSort.order}
                  onChange={setAreaSort}
                />
              </TableHeader>
              <TableBody>
                {areas.map((a) => (
                  <TableRow key={a.area}>
                    <TableCell className="font-mono">{a.area}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCount(a.events)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCount(a.users)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCount(a.projects)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
      <p className="text-xs text-muted-foreground">
        “—” means the feature does not record which user triggered it.
      </p>
    </div>
  );
}
