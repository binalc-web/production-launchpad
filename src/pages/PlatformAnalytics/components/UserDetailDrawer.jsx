import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { getAdminPlatformUser } from "@/api";
import {
  formatCount,
  formatPlatformUsd,
  formatRelativeTime,
  formatShortDate,
  PLATFORM_CHART_COLORS,
  sortRowsByKey,
} from "../platformAnalyticsDisplay";
import { nextColumnSort, SortableTableHead } from "./SortableTableHead";
import { TimeSeriesAreaChart } from "./TimeSeriesAreaChart";

function Stat({ label, value }) {
  return (
    <div className="rounded-lg border border-border px-3 py-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-base font-semibold tabular-nums">{value}</p>
    </div>
  );
}

const PROJECT_ACCESSORS = {
  name: { kind: "text", read: (p) => p.name },
  createdAt: { kind: "date", read: (p) => p.createdAt },
};

const EVENT_ACCESSORS = {
  kind: { kind: "text", read: (e) => e.kind },
  summary: { kind: "text", read: (e) => e.summary },
  project: { kind: "text", read: (e) => e.project?.name },
  createdAt: { kind: "date", read: (e) => e.createdAt },
};

function DrawerSortHead({ columns, sort, order, onChange }) {
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

/** @param {{ userId: number|null, rangeParams: object, onClose: () => void }} props */
export function UserDetailDrawer({ userId, rangeParams, onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [projectSort, setProjectSort] = useState({ sort: "createdAt", order: "desc" });
  const [eventSort, setEventSort] = useState({ sort: "createdAt", order: "desc" });

  useEffect(() => {
    if (!userId) return undefined;
    let cancelled = false;
    setData(null);
    setError(null);
    getAdminPlatformUser(userId, { from: rangeParams.from, to: rangeParams.to })
      .then((d) => !cancelled && setData(d))
      .catch((err) => !cancelled && setError(err?.message || "Could not load user."));
    return () => {
      cancelled = true;
    };
  }, [rangeParams.from, rangeParams.to, userId]);

  const projects = useMemo(
    () =>
      sortRowsByKey(data?.projects ?? [], projectSort.sort, projectSort.order, PROJECT_ACCESSORS),
    [data?.projects, projectSort.order, projectSort.sort],
  );
  const recentEvents = useMemo(
    () => sortRowsByKey(data?.recentEvents ?? [], eventSort.sort, eventSort.order, EVENT_ACCESSORS),
    [data?.recentEvents, eventSort.order, eventSort.sort],
  );

  return (
    <Sheet open={Boolean(userId)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{data?.user?.name ?? "User"}</SheetTitle>
          <SheetDescription>{data?.user?.email ?? ""}</SheetDescription>
        </SheetHeader>

        {error ? (
          <div className="px-4 py-6 text-sm text-destructive">{error}</div>
        ) : !data ? (
          <div className="space-y-3 px-4" role="status" aria-busy="true" aria-label="Loading user">
            <Skeleton className="h-20 rounded-lg" />
            <Skeleton className="h-[220px] rounded-lg" />
            <Skeleton className="h-40 rounded-lg" />
          </div>
        ) : (
          <div className="space-y-5 px-4 pb-6">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="capitalize">
                {data.user.role}
              </Badge>
              <span>Joined {formatShortDate(data.user.createdAt)}</span>
              <span>· Last login {formatRelativeTime(data.user.lastLoginAt)}</span>
              <span>· Last active {formatRelativeTime(data.user.lastActiveAt)}</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Stat label="Active days (range)" value={formatCount(data.stats.activeDays)} />
              <Stat
                label="Activity events (range)"
                value={formatCount(data.stats.activityEvents)}
              />
              <Stat label="Projects created" value={formatCount(data.stats.projectsCreated)} />
              <Stat
                label="Owned project spend"
                value={formatPlatformUsd(data.stats.ownedProjectSpendUsd)}
              />
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">Daily activity</p>
              <TimeSeriesAreaChart
                series={data.activitySeries}
                granularity="day"
                label="Tracked activity"
                color={PLATFORM_CHART_COLORS.primary}
                valueFormatter={formatCount}
                emptyText="No tracked activity in this range."
              />
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">Projects</p>
              {projects.length === 0 ? (
                <p className="text-sm text-muted-foreground">No projects created.</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <Table>
                    <TableHeader>
                      <DrawerSortHead
                        columns={[
                          { key: "name", label: "Project", defaultOrder: "asc" },
                          { key: "createdAt", label: "Created", defaultOrder: "desc" },
                        ]}
                        sort={projectSort.sort}
                        order={projectSort.order}
                        onChange={setProjectSort}
                      />
                    </TableHeader>
                    <TableBody>
                      {projects.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell>
                            <Link
                              to={`/projects/details/${p.id}`}
                              className="font-medium text-primary hover:underline"
                            >
                              {p.name}
                            </Link>
                            {p.isActive ? null : (
                              <Badge variant="outline" className="ml-2">
                                Archived
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatShortDate(p.createdAt)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">Recent activity</p>
              {recentEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recorded project activity.</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <Table>
                    <TableHeader>
                      <DrawerSortHead
                        columns={[
                          { key: "kind", label: "Kind", defaultOrder: "asc" },
                          { key: "summary", label: "Summary", defaultOrder: "asc" },
                          { key: "project", label: "Project", defaultOrder: "asc" },
                          { key: "createdAt", label: "When", defaultOrder: "desc" },
                        ]}
                        sort={eventSort.sort}
                        order={eventSort.order}
                        onChange={setEventSort}
                      />
                    </TableHeader>
                    <TableBody>
                      {recentEvents.map((e) => (
                        <TableRow key={e.id}>
                          <TableCell className="font-mono text-xs">{e.kind}</TableCell>
                          <TableCell className="max-w-[220px]">
                            <p className="line-clamp-2">{e.summary}</p>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {e.project?.name ?? "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatRelativeTime(e.createdAt)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
