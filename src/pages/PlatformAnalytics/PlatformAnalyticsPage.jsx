import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { PageShell } from "@/components/common/PageShell";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import { getAdminFeatureAdoption, getAdminPlatformOverview } from "@/api";
import { isLaunchpadAdmin } from "@/utils/launchpadRole";
import { usePageUiPreferences } from "@/hooks/usePageUiPreferences";
import { buildRangeParams, GRANULARITY_OPTIONS, RANGE_PRESETS } from "./platformAnalyticsDisplay";
import { ActivityTab } from "./components/ActivityTab";
import { FeatureAdoptionTab } from "./components/FeatureAdoptionTab";
import { OverviewTab } from "./components/OverviewTab";
import { ProjectsTab } from "./components/ProjectsTab";
import { UsersTab } from "./components/UsersTab";

const PLATFORM_ANALYTICS_UI_SCHEMA = {
  rangePreset: { defaultValue: "30", type: "string" },
  granularity: { defaultValue: "auto", type: "string" },
  tab: { defaultValue: "overview", type: "string" },
};

/** Fetch a range-scoped payload and expose loading/error state. */
function useRangeQuery(fetcher, rangeParams, enabled, refreshKey) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    fetcher(rangeParams)
      .then((data) => !cancelled && setState({ data, loading: false, error: null }))
      .catch(
        (err) =>
          !cancelled &&
          setState({
            data: null,
            loading: false,
            error: err?.message || "Could not load analytics.",
          }),
      );
    return () => {
      cancelled = true;
    };
  }, [enabled, fetcher, rangeParams, refreshKey]);
  return state;
}

export default function PlatformAnalyticsPage() {
  const { user, loading: authBootLoading, launchpadRoleLoading } = useAuth();
  const canAccess = isLaunchpadAdmin(user?.role);
  const [prefs, setPref] = usePageUiPreferences("global", PLATFORM_ANALYTICS_UI_SCHEMA);
  const [refreshKey, setRefreshKey] = useState(0);

  const rangeParams = useMemo(
    () => buildRangeParams(prefs.rangePreset, prefs.granularity),
    // refreshKey re-anchors "today" on manual refresh.
    [prefs.granularity, prefs.rangePreset, refreshKey],
  );

  const overview = useRangeQuery(getAdminPlatformOverview, rangeParams, canAccess, refreshKey);
  const adoption = useRangeQuery(
    getAdminFeatureAdoption,
    rangeParams,
    canAccess && prefs.tab === "features",
    refreshKey,
  );
  const granularity = overview.data?.range?.granularity ?? "day";

  const setTab = useCallback((value) => setPref("tab", value), [setPref]);

  if (authBootLoading || launchpadRoleLoading) {
    return (
      <PageShell width="full">
        <div role="status" aria-busy="true" aria-label="Loading platform analytics">
          <Skeleton className="h-[400px] w-full rounded-xl" />
        </div>
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
        title="Platform Analytics"
        description="Platform usage, users, projects, and feature adoption across LaunchPad."
      />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Select value={prefs.rangePreset} onValueChange={(v) => setPref("rangePreset", v)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RANGE_PRESETS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={prefs.granularity} onValueChange={(v) => setPref("granularity", v)}>
          <SelectTrigger className="w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {GRANULARITY_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setRefreshKey((k) => k + 1)}
          className="gap-1.5"
        >
          <RefreshCw className="size-3.5" aria-hidden />
          Refresh
        </Button>
      </div>

      <Tabs value={prefs.tab} onValueChange={setTab} className="mt-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="features">Feature adoption</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab data={overview.data} loading={overview.loading} error={overview.error} />
        </TabsContent>
        <TabsContent value="users" className="mt-4">
          <UsersTab key={refreshKey} rangeParams={rangeParams} granularity={granularity} />
        </TabsContent>
        <TabsContent value="projects" className="mt-4">
          <ProjectsTab key={refreshKey} rangeParams={rangeParams} granularity={granularity} />
        </TabsContent>
        <TabsContent value="features" className="mt-4">
          <FeatureAdoptionTab
            data={adoption.data}
            loading={adoption.loading}
            error={adoption.error}
          />
        </TabsContent>
        <TabsContent value="activity" className="mt-4">
          <ActivityTab key={refreshKey} rangeParams={rangeParams} />
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
