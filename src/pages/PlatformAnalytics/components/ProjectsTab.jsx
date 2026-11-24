import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { listAdminPlatformProjects } from "@/api";
import {
  formatCount,
  formatPlatformUsd,
  formatRelativeTime,
  formatShortDate,
  PLATFORM_CHART_COLORS,
} from "../platformAnalyticsDisplay";
import { PaginationBar } from "./PaginationBar";
import { nextColumnSort, SortableTableHead } from "./SortableTableHead";
import { TimeSeriesAreaChart } from "./TimeSeriesAreaChart";

const PROJECT_COLUMNS = [
  { key: "name", label: "Project", defaultOrder: "asc" },
  { key: "creator", label: "Creator", defaultOrder: "asc" },
  { key: "createdAt", label: "Created", defaultOrder: "desc" },
  { key: "members", label: "Members", defaultOrder: "desc", align: "right" },
  { key: "releases", label: "Releases", defaultOrder: "desc", align: "right" },
  { key: "deployments", label: "Deployments", defaultOrder: "desc", align: "right" },
  { key: "activity", label: "Activity", defaultOrder: "desc", align: "right" },
  { key: "spend", label: "Spend", defaultOrder: "desc", align: "right" },
  { key: "lastActivity", label: "Last activity", defaultOrder: "desc" },
];

const PAGE_SIZE = 25;

export function ProjectsTab({ rangeParams, granularity }) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("lastActivity");
  const [order, setOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => setPage(1), [debouncedSearch, status, sort, order, rangeParams]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(
        await listAdminPlatformProjects({
          ...rangeParams,
          search: debouncedSearch || undefined,
          status,
          sort,
          order,
          page,
          limit: PAGE_SIZE,
        }),
      );
    } catch (err) {
      setError(typeof err?.message === "string" ? err.message : "Could not load projects.");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, order, page, rangeParams, sort, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const items = data?.items ?? [];
  const split = data?.statusSplit ?? { active: 0, archived: 0 };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Projects created</CardTitle>
            <CardDescription>New projects per period.</CardDescription>
          </CardHeader>
          <CardContent>
            {!data ? (
              <Skeleton
                className="h-[220px] rounded-xl"
                role="status"
                aria-busy="true"
                aria-label="Loading projects chart"
              />
            ) : (
              <TimeSeriesAreaChart
                series={data.projectsCreated}
                granularity={granularity}
                label="Projects"
                color={PLATFORM_CHART_COLORS.tertiary}
                valueFormatter={formatCount}
              />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Status</CardTitle>
            <CardDescription>All projects, active vs archived.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Active", value: split.active, color: PLATFORM_CHART_COLORS.primary },
              { label: "Archived", value: split.archived, color: PLATFORM_CHART_COLORS.other },
            ].map((row) => {
              const total = split.active + split.archived || 1;
              const pct = Math.round((row.value / total) * 100);
              return (
                <div key={row.label} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{row.label}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {formatCount(row.value)} · {pct}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, background: row.color }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search projects"
          className="max-w-md"
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        {loading && !data ? (
          <div
            className="space-y-3 p-4"
            role="status"
            aria-busy="true"
            aria-label="Loading projects"
          >
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-md" />
            ))}
          </div>
        ) : error ? (
          <div className="px-4 py-6 text-sm text-destructive">{error}</div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  {PROJECT_COLUMNS.map((column) => (
                    <SortableTableHead
                      key={column.key}
                      label={column.label}
                      sortKey={column.key}
                      sort={sort}
                      order={order}
                      defaultOrder={column.defaultOrder}
                      align={column.align}
                      onSort={(key, defaultOrder) => {
                        const next = nextColumnSort(sort, order, key, defaultOrder);
                        setSort(next.sort);
                        setOrder(next.order);
                      }}
                    />
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="py-8 text-center text-sm text-muted-foreground"
                    >
                      No projects match these filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            to={`/projects/details/${p.id}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {p.name}
                          </Link>
                          {p.isActive ? null : (
                            <Badge variant="outline" className="text-muted-foreground">
                              Archived
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{p.creator?.name ?? "—"}</TableCell>
                      <TableCell>{formatShortDate(p.createdAt)}</TableCell>
                      <TableCell className="text-right tabular-nums">{p.memberCount}</TableCell>
                      <TableCell className="text-right tabular-nums">{p.releases}</TableCell>
                      <TableCell className="text-right tabular-nums">{p.deployments}</TableCell>
                      <TableCell className="text-right tabular-nums">{p.activityEvents}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatPlatformUsd(p.spendUsd)}
                      </TableCell>
                      <TableCell>{formatRelativeTime(p.lastActivityAt)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <PaginationBar
              page={data?.page ?? page}
              limit={data?.limit ?? PAGE_SIZE}
              total={data?.total ?? 0}
              onPageChange={setPage}
            />
          </>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Deployments, activity, and spend are counted within the selected range; releases are
        all-time.
      </p>
    </div>
  );
}
