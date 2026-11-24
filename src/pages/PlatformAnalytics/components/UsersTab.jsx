import { useCallback, useEffect, useState } from "react";
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
import { listAdminPlatformUsers } from "@/api";
import {
  formatCount,
  formatPlatformUsd,
  formatRelativeTime,
  formatShortDate,
  PLATFORM_CHART_COLORS,
} from "../platformAnalyticsDisplay";
import { PaginationBar } from "./PaginationBar";
import { RoleSplitDonutChart } from "./RoleSplitDonutChart";
import { nextColumnSort, SortableTableHead } from "./SortableTableHead";
import { TimeSeriesAreaChart } from "./TimeSeriesAreaChart";
import { UserDetailDrawer } from "./UserDetailDrawer";

const USER_COLUMNS = [
  { key: "name", label: "User", defaultOrder: "asc" },
  { key: "role", label: "Role", defaultOrder: "asc" },
  { key: "createdAt", label: "Joined", defaultOrder: "desc" },
  { key: "lastLoginAt", label: "Last login", defaultOrder: "desc" },
  { key: "lastActiveAt", label: "Last active", defaultOrder: "desc" },
  { key: "activeDays", label: "Active days", defaultOrder: "desc", align: "right" },
  { key: "projects", label: "Projects", defaultOrder: "desc", align: "right" },
  { key: "activity", label: "Activity events", defaultOrder: "desc", align: "right" },
  { key: "spend", label: "Owned project spend", defaultOrder: "desc", align: "right" },
];

const PAGE_SIZE = 25;

export function UsersTab({ rangeParams, granularity }) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [role, setRole] = useState("all");
  const [sort, setSort] = useState("lastActiveAt");
  const [order, setOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => setPage(1), [debouncedSearch, role, sort, order, rangeParams]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(
        await listAdminPlatformUsers({
          ...rangeParams,
          search: debouncedSearch || undefined,
          role: role === "all" ? undefined : role,
          sort,
          order,
          page,
          limit: PAGE_SIZE,
        }),
      );
    } catch (err) {
      setError(typeof err?.message === "string" ? err.message : "Could not load users.");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, order, page, rangeParams, role, sort]);

  useEffect(() => {
    void load();
  }, [load]);

  const items = data?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Signups</CardTitle>
            <CardDescription>New user accounts per period.</CardDescription>
          </CardHeader>
          <CardContent>
            {!data ? (
              <Skeleton
                className="h-[220px] rounded-xl"
                role="status"
                aria-busy="true"
                aria-label="Loading signups chart"
              />
            ) : (
              <TimeSeriesAreaChart
                series={data.signups}
                granularity={granularity}
                label="Signups"
                color={PLATFORM_CHART_COLORS.secondary}
                valueFormatter={formatCount}
              />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Roles</CardTitle>
            <CardDescription>All platform users by role.</CardDescription>
          </CardHeader>
          <CardContent>
            {!data ? (
              <Skeleton
                className="h-[220px] rounded-xl"
                role="status"
                aria-busy="true"
                aria-label="Loading role split chart"
              />
            ) : (
              <RoleSplitDonutChart roleSplit={data.roleSplit} />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email"
          className="max-w-md"
        />
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        {loading && !data ? (
          <div className="space-y-3 p-4" role="status" aria-busy="true" aria-label="Loading users">
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
                  {USER_COLUMNS.map((column) => (
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
                      No users match these filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((u) => (
                    <TableRow
                      key={u.id}
                      className="cursor-pointer"
                      onClick={() => setSelectedUserId(u.id)}
                    >
                      <TableCell>
                        <div className="font-medium">{u.name}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {u.role}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatShortDate(u.createdAt)}</TableCell>
                      <TableCell>{formatRelativeTime(u.lastLoginAt)}</TableCell>
                      <TableCell>{formatRelativeTime(u.lastActiveAt)}</TableCell>
                      <TableCell className="text-right tabular-nums">{u.activeDays}</TableCell>
                      <TableCell className="text-right tabular-nums">{u.projectsCreated}</TableCell>
                      <TableCell className="text-right tabular-nums">{u.activityEvents}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatPlatformUsd(u.ownedProjectSpendUsd)}
                      </TableCell>
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

      <UserDetailDrawer
        userId={selectedUserId}
        rangeParams={rangeParams}
        onClose={() => setSelectedUserId(null)}
      />
    </div>
  );
}
