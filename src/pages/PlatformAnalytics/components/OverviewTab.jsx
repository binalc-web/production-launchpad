import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatCount,
  formatPlatformUsd,
  formatShortDate,
  PLATFORM_CHART_COLORS,
} from "../platformAnalyticsDisplay";
import { KpiCard } from "./KpiCard";
import { TimeSeriesAreaChart } from "./TimeSeriesAreaChart";

function ChartCard({ title, description, children }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-busy="true" aria-label="Loading overview">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-[76px] rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[300px] rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export function OverviewTab({ data, loading, error }) {
  if (error) return <div className="px-1 py-6 text-sm text-destructive">{error}</div>;
  if (loading || !data) {
    return <OverviewSkeleton />;
  }

  const { totals, engagement, kpis, series, range, trackingSince } = data;
  const g = range.granularity;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total users"
          value={formatCount(totals.users)}
          hint={`${formatCount(kpis.newUsers.value)} new in range`}
        />
        <KpiCard
          label="Total projects"
          value={formatCount(totals.projects)}
          hint={`${formatCount(totals.activeProjects)} active · ${formatCount(totals.archivedProjects)} archived`}
        />
        <KpiCard
          label="Active users (range)"
          value={formatCount(kpis.activeUsers.value)}
          deltaPct={kpis.activeUsers.deltaPct}
        />
        <KpiCard
          label="DAU / WAU / MAU"
          value={`${formatCount(engagement.dau)} / ${formatCount(engagement.wau)} / ${formatCount(engagement.mau)}`}
          hint={`Stickiness ${engagement.stickinessPct}%`}
        />
        <KpiCard
          label="New users"
          value={formatCount(kpis.newUsers.value)}
          deltaPct={kpis.newUsers.deltaPct}
        />
        <KpiCard
          label="New projects"
          value={formatCount(kpis.newProjects.value)}
          deltaPct={kpis.newProjects.deltaPct}
        />
        <KpiCard
          label="Releases created"
          value={formatCount(kpis.releases.value)}
          deltaPct={kpis.releases.deltaPct}
        />
        <KpiCard
          label="Deployments"
          value={formatCount(kpis.deployments.value)}
          deltaPct={kpis.deployments.deltaPct}
        />
        <KpiCard
          label="Agent runs"
          value={formatCount(kpis.agentRuns.value)}
          deltaPct={kpis.agentRuns.deltaPct}
        />
        <KpiCard
          label="Job runs"
          value={formatCount(kpis.jobRuns.value)}
          deltaPct={kpis.jobRuns.deltaPct}
        />
        <KpiCard
          label="AI spend"
          value={formatPlatformUsd(kpis.spendUsd.value)}
          deltaPct={kpis.spendUsd.deltaPct}
        />
      </div>

      {trackingSince ? (
        <p className="text-xs text-muted-foreground">
          User activity tracking since {formatShortDate(trackingSince)}. Active-user metrics before
          that date are not available.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          User activity tracking has just been enabled; active-user metrics will populate as users
          sign in.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Active users" description="Distinct signed-in users per period.">
          <TimeSeriesAreaChart
            series={series.activeUsers}
            granularity={g}
            label="Active users"
            color={PLATFORM_CHART_COLORS.primary}
            valueFormatter={formatCount}
          />
        </ChartCard>
        <ChartCard title="Signups" description="New user accounts per period.">
          <TimeSeriesAreaChart
            series={series.signups}
            granularity={g}
            label="Signups"
            color={PLATFORM_CHART_COLORS.secondary}
            valueFormatter={formatCount}
          />
        </ChartCard>
        <ChartCard title="Projects created" description="New projects per period.">
          <TimeSeriesAreaChart
            series={series.projectsCreated}
            granularity={g}
            label="Projects"
            color={PLATFORM_CHART_COLORS.tertiary}
            valueFormatter={formatCount}
          />
        </ChartCard>
        <ChartCard title="AI spend" description="Estimated Cursor agent cost per period.">
          <TimeSeriesAreaChart
            series={series.spendUsd}
            granularity={g}
            label="Spend"
            color={PLATFORM_CHART_COLORS.quaternary}
            valueFormatter={formatPlatformUsd}
          />
        </ChartCard>
      </div>
    </div>
  );
}
