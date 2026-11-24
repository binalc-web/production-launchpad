import { useCallback, useMemo } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { PageShell } from "@/components/common/PageShell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { fetchAdminQaAnalyticsPortfolio } from "@/api";
import { isLaunchpadAdmin } from "@/utils/launchpadRole";
import { useQaAnalyticsFilters } from "@/pages/QaAnalytics/hooks/useQaAnalyticsFilters.js";
import { useQaAnalyticsQuery } from "@/pages/QaAnalytics/hooks/useQaAnalyticsQuery.js";
import {
  toQaAnalyticsApiParams,
  formatQaDateTime,
  formatQaRate,
  detectQaAnalyticsEmptyVariant,
  buildActiveDrillFilters,
} from "@/pages/QaAnalytics/qaAnalyticsDisplay.js";
import { QaAnalyticsHeader } from "@/pages/QaAnalytics/components/QaAnalyticsHeader.jsx";
import { QaAnalyticsFilterRail } from "@/pages/QaAnalytics/components/QaAnalyticsFilterRail.jsx";
import { QaAnalyticsFilterBanner } from "@/pages/QaAnalytics/components/QaAnalyticsFilterBanner.jsx";
import { QaAnalyticsEmptyState } from "@/pages/QaAnalytics/components/QaAnalyticsEmptyState.jsx";
import {
  QaAnalyticsKpiBand,
  QaAnalyticsNarrative,
} from "@/pages/QaAnalytics/components/QaAnalyticsKpiBand.jsx";
import { QaAnalyticsActionMatrix } from "@/pages/QaAnalytics/components/QaAnalyticsMatrix.jsx";
import { QaAnalyticsProjectsBarChart } from "@/pages/QaAnalytics/components/charts/QaAnalyticsProjectsBarChart.jsx";
import { QaAnalyticsProjectAdoptionChart } from "@/pages/QaAnalytics/components/charts/QaAnalyticsProjectAdoptionChart.jsx";
import {
  QaAnalyticsAdoptionFunnel,
  QaAnalyticsFeatureUsageChart,
} from "@/pages/QaAnalytics/components/QaAnalyticsAdoptionFunnel.jsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function PortfolioContentSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-12 w-full" />
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border/60 bg-border md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-none" />
        ))}
      </div>
      <Skeleton className="h-[320px] w-full rounded-xl" />
      <div className="grid gap-4 xl:grid-cols-2">
        <Skeleton className="h-[280px] w-full rounded-xl" />
        <Skeleton className="h-[280px] w-full rounded-xl" />
      </div>
    </div>
  );
}

export default function QaAnalyticsPortfolioPage() {
  const { user, loading: authLoading } = useAuth();
  const canAccess = isLaunchpadAdmin(user?.role);
  const navigate = useNavigate();
  const { state, patch, clearDrill } = useQaAnalyticsFilters({ embedded: false });

  const apiParams = useMemo(() => toQaAnalyticsApiParams(state), [state]);

  const fetcher = useCallback(
    (opts) => fetchAdminQaAnalyticsPortfolio({ ...apiParams, signal: opts?.signal }),
    [apiParams],
  );

  const { data, loading, error, reload, lastSuccessAt } = useQaAnalyticsQuery(fetcher, [
    JSON.stringify(apiParams),
  ]);

  const handleFilterChange = useCallback(
    (patchObj) => patch(patchObj, { resetDrill: true }),
    [patch],
  );

  const handleRemoveDrill = useCallback(
    (key) => {
      const clears = {
        environment: { environment: "" },
        userId: { userId: "" },
        status: { status: "" },
        testCaseStatus: { testCaseStatus: "" },
        testCaseKey: { testCaseKey: "" },
        project: { project: "" },
      };
      patch(clears[key] ?? {}, { replace: true });
    },
    [patch],
  );

  const openProjectAnalytics = useCallback(
    (projectId) => {
      navigate(`/projects/details/${projectId}?section=qa-analytics`);
    },
    [navigate],
  );

  const projects = data?.data?.breakdowns?.projects ?? [];
  const emptyVariant = detectQaAnalyticsEmptyVariant(data, state);
  const hasUrlDrill = buildActiveDrillFilters(state).length > 0;

  if (authLoading) {
    return (
      <PageShell>
        <div
          className="mx-auto flex w-full max-w-[1600px] flex-col gap-6"
          role="status"
          aria-busy="true"
          aria-label="Loading QA analytics portfolio"
        >
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-[72px] w-full" />
          <PortfolioContentSkeleton />
        </div>
      </PageShell>
    );
  }
  if (!canAccess) return <Navigate to="/projects" replace />;

  return (
    <PageShell>
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <QaAnalyticsHeader title="QA Analytics Portfolio" generatedAt={data?.meta?.generatedAt} />

        <QaAnalyticsFilterRail state={state} onChange={handleFilterChange} showPortfolioFilters />

        <QaAnalyticsFilterBanner state={state} onClear={clearDrill} onRemove={handleRemoveDrill} />

        {error ? (
          <Alert variant="destructive">
            <AlertDescription className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <span>
                {error?.message || "Failed to load portfolio analytics"}
                {lastSuccessAt ? (
                  <span className="mt-1 block text-xs opacity-80">
                    Last successful refresh: {formatQaDateTime(lastSuccessAt)}
                  </span>
                ) : null}
              </span>
              <button type="button" className="underline" onClick={() => reload()}>
                Retry
              </button>
            </AlertDescription>
          </Alert>
        ) : null}

        {loading && !data ? (
          <div role="status" aria-busy="true" aria-label="Loading portfolio analytics">
            <PortfolioContentSkeleton />
          </div>
        ) : emptyVariant ? (
          <QaAnalyticsEmptyState
            variant={emptyVariant}
            onClearFilters={hasUrlDrill ? clearDrill : undefined}
            onWidenRange={() => handleFilterChange({ range: "30d" })}
          />
        ) : (
          <>
            <QaAnalyticsNarrative narrative={data?.data?.narrative} />
            <QaAnalyticsKpiBand kpis={data?.data?.kpis} />

            <QaAnalyticsProjectAdoptionChart
              projects={projects}
              onSelect={(row) => openProjectAnalytics(row.projectId)}
            />

            <QaAnalyticsActionMatrix
              points={data?.data?.actionMatrix}
              formula={data?.data?.actionMatrixFormula}
              onSelect={(p) => openProjectAnalytics(p.projectId)}
            />

            <QaAnalyticsProjectsBarChart
              projects={projects}
              onSelect={(row) => openProjectAnalytics(row.projectId)}
            />

            <div className="grid gap-4 xl:grid-cols-2">
              <QaAnalyticsAdoptionFunnel funnel={data?.data?.adoption?.funnel} />
              <QaAnalyticsFeatureUsageChart featureUsage={data?.data?.adoption?.featureUsage} />
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Projects</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead className="text-right">Users</TableHead>
                      <TableHead className="text-right">Runs</TableHead>
                      <TableHead className="text-right">Test-case pass rate</TableHead>
                      <TableHead className="text-right">Last run</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projects.map((row) => (
                      <TableRow key={row.projectId}>
                        <TableCell>
                          <Link
                            className="font-medium text-primary hover:underline"
                            to={`/projects/details/${row.projectId}?section=qa-analytics`}
                          >
                            {row.name}
                          </Link>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{row.activeUsers}</TableCell>
                        <TableCell className="text-right tabular-nums">{row.runs}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.insufficient ? "Insufficient" : formatQaRate(row.testCasePassRate)}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {formatQaDateTime(row.lastRunAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </PageShell>
  );
}
