import { useCallback, useMemo } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchQaAnalyticsDashboard } from "@/api";
import { useQaAnalyticsFilters } from "@/pages/QaAnalytics/hooks/useQaAnalyticsFilters.js";
import { useQaAnalyticsQuery } from "@/pages/QaAnalytics/hooks/useQaAnalyticsQuery.js";
import {
  detectQaAnalyticsEmptyVariant,
  formatQaDateTime,
  qaKpiValue,
  toQaProjectPanelApiParams,
} from "@/pages/QaAnalytics/qaAnalyticsDisplay.js";
import { QaAnalyticsHeader } from "@/pages/QaAnalytics/components/QaAnalyticsHeader.jsx";
import { QaAnalyticsProjectFilterRail } from "@/pages/QaAnalytics/components/QaAnalyticsProjectFilterRail.jsx";
import { QaAnalyticsEmptyState } from "@/pages/QaAnalytics/components/QaAnalyticsEmptyState.jsx";
import { QaProjectActivityChart } from "@/pages/QaAnalytics/components/charts/QaProjectActivityChart.jsx";
import { QaProjectMemberUsageChart } from "@/pages/QaAnalytics/components/charts/QaProjectMemberUsageChart.jsx";
import { QaProjectTestResultsDonut } from "@/pages/QaAnalytics/components/charts/QaProjectTestResultsDonut.jsx";
import { QaProjectFeatureAdoptionChart } from "@/pages/QaAnalytics/components/charts/QaProjectFeatureAdoptionChart.jsx";
import { QaProjectChartsSkeleton } from "@/pages/QaAnalytics/components/QaProjectChartsSkeleton.jsx";
import QaAiTestAgentSummary from "@/pages/QaAnalytics/components/QaAiTestAgentSummary.jsx";

/**
 * @param {{ projectId: number|string, embedded?: boolean }} props
 */
export function ProjectQaAnalyticsPanel({ projectId, embedded = true }) {
  const { state, patch, clearDrill } = useQaAnalyticsFilters({ embedded, projectId });

  const apiParams = useMemo(
    () => toQaProjectPanelApiParams(state, { projectId }),
    [state, projectId],
  );

  const fetcher = useCallback(
    (opts) => fetchQaAnalyticsDashboard({ ...apiParams, signal: opts?.signal }),
    [apiParams],
  );

  const { data, loading, refreshing, error, reload, lastSuccessAt } = useQaAnalyticsQuery(fetcher, [
    projectId,
    JSON.stringify(apiParams),
  ]);

  const handleFilterChange = useCallback(
    (patchObj) => patch(patchObj, { resetDrill: true }),
    [patch],
  );

  const emptyVariant = detectQaAnalyticsEmptyVariant(data, state);
  const kpis = data?.data?.kpis ?? [];
  const testCasesExecuted = qaKpiValue(kpis, "testCasesExecuted") ?? 0;
  const minSample = data?.meta?.thresholds?.minCellN ?? 5;
  const passRateKpi = kpis.find((k) => k.id === "testCasePassRate");
  const insufficient =
    testCasesExecuted < minSample ||
    (passRateKpi?.denominator != null && passRateKpi.denominator < minSample);

  const chartsLoading = loading || refreshing;

  if (loading && !data) {
    return (
      <div
        className="mx-auto flex w-full max-w-[1600px] flex-col gap-6"
        role="status"
        aria-busy="true"
        aria-label="Loading QA analytics"
      >
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[72px] w-full" />
        <QaProjectChartsSkeleton />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
      <QaAnalyticsHeader title="QA Analytics" generatedAt={data?.meta?.generatedAt} />

      <QaAnalyticsProjectFilterRail
        state={state}
        projectId={projectId}
        onChange={handleFilterChange}
      />

      {error ? (
        <Alert variant="destructive">
          <AlertDescription className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <span>
              {error?.message || "Failed to load QA analytics"}
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

      {chartsLoading ? (
        <div role="status" aria-busy="true" aria-label="Loading QA analytics charts">
          <QaProjectChartsSkeleton />
        </div>
      ) : emptyVariant ? (
        <QaAnalyticsEmptyState
          variant={emptyVariant}
          onClearFilters={state.environment ? clearDrill : undefined}
          onWidenRange={() => handleFilterChange({ range: "30d" })}
        />
      ) : (
        <div className="flex flex-col gap-6">
          <QaAiTestAgentSummary aiTest={data?.data?.aiTest} />
          <QaProjectActivityChart
            trend={data?.data?.trend}
            totalRuns={qaKpiValue(kpis, "totalRuns")}
            activeUsers={qaKpiValue(kpis, "activeUsers")}
            granularity={apiParams.granularity}
          />

          <div className="grid gap-6 xl:grid-cols-2">
            <QaProjectMemberUsageChart members={data?.data?.memberActivity} />
            <QaProjectTestResultsDonut
              breakdowns={data?.data?.breakdowns}
              passRate={passRateKpi?.value}
              insufficient={insufficient}
              minSample={minSample}
            />
          </div>

          <QaProjectFeatureAdoptionChart stages={data?.data?.adoption?.stages} />
        </div>
      )}
    </div>
  );
}

export default ProjectQaAnalyticsPanel;
