import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { PageShell } from "@/components/common/PageShell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/context/AuthContext";
import { fetchAdminCostAnalytics } from "@/api";
import { isLaunchpadAdmin } from "@/utils/launchpadRole";
import {
  formatBudgetUsd,
  formatUsageDateLabel,
  sortCostAnalyticsProjects,
} from "./costAnalyticsDisplay";
import { BudgetUtilizationDonutChart } from "./components/BudgetUtilizationDonutChart";
import { DailySpendComboChart } from "./components/DailySpendComboChart";
import { DailyTokenUsageByProjectChart } from "./components/DailyTokenUsageByProjectChart";
import { SpendBySourceBarChart } from "./components/SpendBySourceBarChart";
import { SpendByModelBarChart } from "./components/SpendByModelBarChart";
import { TopProjectsSpendChart } from "./components/TopProjectsSpendChart";
import { usePageUiPreferences } from "@/hooks/usePageUiPreferences";

const COST_ANALYTICS_UI_SCHEMA = {
  search: { defaultValue: "", type: "string" },
  overBudgetOnly: { defaultValue: false, type: "boolean" },
  tableSortKey: { defaultValue: null, type: "string" },
  tableSortDirection: { defaultValue: "desc", type: "string" },
};

/** Sortable cost analytics table column definitions. */
const COST_ANALYTICS_TABLE_COLUMNS = [
  { label: "Budget", sortKey: "budgetUsd" },
  { label: "Spent", sortKey: "totalSpendUsd" },
  { label: "Remaining", sortKey: "remainingUsd" },
  { label: "Last spend", sortKey: "lastSpendAt" },
];

function CostAnalyticsSortableTableHead({ label, sortKey, activeSortKey, sortDirection, onSort }) {
  const isActive = activeSortKey === sortKey;
  const SortIcon = isActive ? (sortDirection === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;

  return (
    <TableHead>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center gap-1 text-left font-medium transition-colors hover:text-foreground"
      >
        {label}
        <SortIcon
          className={isActive ? "size-3.5 text-foreground" : "size-3.5 text-muted-foreground/70"}
          aria-hidden
        />
        <span className="sr-only">
          {isActive
            ? `Sorted ${sortDirection === "asc" ? "ascending" : "descending"}`
            : "Sort column"}
        </span>
      </button>
    </TableHead>
  );
}

function CostAnalyticsTableSkeleton() {
  return (
    <div
      className="space-y-3 p-4"
      role="status"
      aria-busy="true"
      aria-label="Loading cost analytics"
    >
      {Array.from({ length: 5 }).map((_, index) => (
        <Skeleton key={index} className="h-10 w-full rounded-md" />
      ))}
    </div>
  );
}

function ChartPanelSkeleton({ height = "h-[260px]" }) {
  return (
    <Skeleton
      className={`${height} w-full rounded-xl`}
      role="status"
      aria-busy="true"
      aria-label="Loading chart"
    />
  );
}

export default function CostAnalyticsPage() {
  const { user, loading: authBootLoading, launchpadRoleLoading, checkAuth } = useAuth();
  const canAccess = isLaunchpadAdmin(user?.role);
  const [prefs, setPref] = usePageUiPreferences("global", COST_ANALYTICS_UI_SCHEMA, {
    debouncedKeys: ["search"],
  });
  const search = prefs.search;
  const overBudgetOnly = prefs.overBudgetOnly;
  const tableSortKey = prefs.tableSortKey;
  const tableSortDirection = prefs.tableSortDirection;
  const setSearch = useCallback((value) => setPref("search", value), [setPref]);
  const setOverBudgetOnly = useCallback((value) => setPref("overBudgetOnly", value), [setPref]);

  const handleTableSort = useCallback(
    (nextSortKey) => {
      if (tableSortKey === nextSortKey) {
        setPref("tableSortDirection", tableSortDirection === "desc" ? "asc" : "desc");
        return;
      }
      setPref("tableSortKey", nextSortKey);
      setPref("tableSortDirection", "desc");
    },
    [setPref, tableSortDirection, tableSortKey],
  );
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!canAccess) return;
    setLoading(true);
    setError(null);
    try {
      const payload = await fetchAdminCostAnalytics({
        search: search.trim() || undefined,
        overBudgetOnly,
      });
      setData(payload);
    } catch (err) {
      setError(typeof err?.message === "string" ? err.message : "Could not load cost analytics.");
    } finally {
      setLoading(false);
    }
  }, [canAccess, overBudgetOnly, search]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!user || user.role || authBootLoading || launchpadRoleLoading) return;
    void checkAuth();
  }, [user, authBootLoading, launchpadRoleLoading, checkAuth]);

  const totals = data?.totals ?? {};
  const projects = useMemo(
    () => (Array.isArray(data?.projects) ? data.projects : []),
    [data?.projects],
  );
  const sortedProjects = useMemo(
    () => sortCostAnalyticsProjects(projects, tableSortKey, tableSortDirection),
    [projects, tableSortDirection, tableSortKey],
  );
  const dailyPlatform = useMemo(
    () => (Array.isArray(data?.dailyPlatform) ? data.dailyPlatform : []),
    [data?.dailyPlatform],
  );
  const bySource = useMemo(
    () => (Array.isArray(data?.bySource) ? data.bySource : []),
    [data?.bySource],
  );
  const byModel = useMemo(
    () => (Array.isArray(data?.byModel) ? data.byModel : []),
    [data?.byModel],
  );
  const dailyTokensByProject = useMemo(
    () => (Array.isArray(data?.dailyTokensByProject) ? data.dailyTokensByProject : []),
    [data?.dailyTokensByProject],
  );

  if (authBootLoading || launchpadRoleLoading) {
    return (
      <PageShell width="full">
        <CostAnalyticsTableSkeleton />
      </PageShell>
    );
  }

  if (!canAccess) {
    return <Navigate to="/projects" replace />;
  }

  return (
    <PageShell width="full" className="space-y-0 pb-8">
      <PageHeader
        compact
        title="Cost Analytics"
        description="Estimated Cursor agent spend and budgets across all projects."
      />

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="px-4 py-3">
            <p className="text-xs text-muted-foreground">Total spent</p>
            <p className="text-xl font-semibold tabular-nums">
              {formatBudgetUsd(totals.totalSpendUsd ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="px-4 py-3">
            <p className="text-xs text-muted-foreground">Total budget</p>
            <p className="text-xl font-semibold tabular-nums">
              {formatBudgetUsd(totals.totalBudgetUsd ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="px-4 py-3">
            <p className="text-xs text-muted-foreground">Remaining</p>
            <p className="text-xl font-semibold tabular-nums">
              {formatBudgetUsd(totals.totalRemainingUsd ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="px-4 py-3">
            <p className="text-xs text-muted-foreground">Over budget</p>
            <p className="text-xl font-semibold tabular-nums">{totals.projectsOverBudget ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Daily platform spend</CardTitle>
            <CardDescription>Last 30 days of estimated Cursor agent cost.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <ChartPanelSkeleton />
            ) : (
              <DailySpendComboChart daily={dailyPlatform} limitDays={30} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Budget utilization</CardTitle>
            <CardDescription>Spent vs remaining across filtered projects.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            {loading ? (
              <ChartPanelSkeleton height="h-[220px]" />
            ) : (
              <>
                <BudgetUtilizationDonutChart totals={totals} />
                <div className="flex w-full justify-center gap-6 text-xs text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-[var(--chart-1)]" />
                    Spent {formatBudgetUsd(totals.totalSpendUsd ?? 0)}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-[var(--chart-3)]" />
                    Left {formatBudgetUsd(totals.totalRemainingUsd ?? 0)}
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Daily token usage by project</CardTitle>
          <CardDescription>
            Last 30 days of Cursor agent tokens for the busiest projects.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <ChartPanelSkeleton height="h-[300px]" />
          ) : (
            <DailyTokenUsageByProjectChart dailyTokensByProject={dailyTokensByProject} />
          )}
        </CardContent>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top projects by spend</CardTitle>
            <CardDescription>Budget vs spent for the highest-cost projects.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <ChartPanelSkeleton height="h-[320px]" />
            ) : (
              <TopProjectsSpendChart projects={projects} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Spend by source</CardTitle>
            <CardDescription>Where Cursor agent cost is coming from platform-wide.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <ChartPanelSkeleton height="h-[280px]" />
            ) : (
              <SpendBySourceBarChart bySource={bySource} />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Spend by model</CardTitle>
          <CardDescription>
            Estimated cost attributed to each Cursor model (spawn model on each run).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <ChartPanelSkeleton height="h-[280px]" />
          ) : (
            <SpendByModelBarChart byModel={byModel} />
          )}
        </CardContent>
      </Card>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search projects"
          className="max-w-md"
        />
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={overBudgetOnly}
            onChange={(event) => setOverBudgetOnly(event.target.checked)}
          />
          Over budget only
        </label>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        {loading ? (
          <CostAnalyticsTableSkeleton />
        ) : error ? (
          <div className="px-4 py-6 text-sm text-destructive">{error}</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                {COST_ANALYTICS_TABLE_COLUMNS.map((column) => (
                  <CostAnalyticsSortableTableHead
                    key={column.sortKey}
                    label={column.label}
                    sortKey={column.sortKey}
                    activeSortKey={tableSortKey}
                    sortDirection={tableSortDirection}
                    onSort={handleTableSort}
                  />
                ))}
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedProjects.map((row) => (
                <TableRow key={row.projectId}>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/projects/details/${row.projectId}?section=agent-analytics`}
                        className="font-medium text-primary hover:underline"
                      >
                        {row.name}
                      </Link>
                      {row.isActive === false ? (
                        <Badge variant="outline" className="text-muted-foreground">
                          Inactive
                        </Badge>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="tabular-nums">{formatBudgetUsd(row.budgetUsd)}</TableCell>
                  <TableCell className="tabular-nums">
                    {formatBudgetUsd(row.totalSpendUsd)}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {formatBudgetUsd(row.remainingUsd)}
                  </TableCell>
                  <TableCell>{formatUsageDateLabel(row.lastSpendAt)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {row.isActive === false ? (
                        <Badge variant="outline" className="text-muted-foreground">
                          Inactive
                        </Badge>
                      ) : null}
                      {row.isOverBudget ? (
                        <Badge variant="outline" className="border-amber-500/40 text-amber-800">
                          Over budget
                        </Badge>
                      ) : row.isActive === false ? null : (
                        <Badge variant="outline">Within budget</Badge>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </PageShell>
  );
}
