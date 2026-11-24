import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useClientInfoContext } from "@/pages/Project/ClientInfo/hooks/useClientInfoContext";
import {
  isLegacyQuestionnaireArea,
  normalizeDiscoveryArea,
  normalizeTimelineFilter,
} from "./constants";
// import { DiscoveryProgressStrip } from "./components/DiscoveryProgressStrip";
import { TimelinePanel } from "./panels/TimelinePanel";
import { PersonasPanel } from "./panels/PersonasPanel";
import { DocumentsPanel } from "./panels/DocumentsPanel";
import { BriefPanel } from "./panels/BriefPanel";

/** Minimum height for bordered journey workspace shells (accounts for taller top nav). */
export const JOURNEY_WORKSPACE_MIN_H = "min-h-[max(50vh,calc(100vh-360px))]";

function WorkspaceSkeleton({ chromeless }) {
  return (
    <div className="space-y-4" role="status" aria-busy="true" aria-label="Loading workspace">
      <div className={cn("space-y-4", !chromeless && JOURNEY_WORKSPACE_MIN_H)}>
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-9 w-28" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

function WorkspaceBody({ chromeless = false }) {
  const { projectId, loading, discoveryData, clientDetails, refresh } = useClientInfoContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawArea = searchParams.get("area");
  const area = normalizeDiscoveryArea(rawArea);
  const activeProfile = searchParams.get("profile") || "company";
  const urlFilter = searchParams.get("filter");
  const [timelineFilter, setTimelineFilter] = useState(() =>
    normalizeTimelineFilter(urlFilter, rawArea),
  );

  useEffect(() => {
    void refresh({ silent: true });
  }, [refresh]);

  useEffect(() => {
    setTimelineFilter(normalizeTimelineFilter(urlFilter, rawArea));
  }, [urlFilter, rawArea]);

  useEffect(() => {
    if (!isLegacyQuestionnaireArea(rawArea)) return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("section", "discovery");
        next.set("area", "capture");
        next.set("filter", "questionnaires");
        next.delete("qstep");
        return next;
      },
      { replace: true },
    );
  }, [rawArea, setSearchParams]);

  const setArea = useCallback(
    (nextArea, options = {}) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("section", "discovery");
          next.set("area", nextArea);
          if (options.profile) next.set("profile", options.profile);
          else if (nextArea !== "profiles") next.delete("profile");
          if (options.filter) next.set("filter", options.filter);
          else if (nextArea !== "capture") next.delete("filter");
          next.delete("qstep");
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const handleFilterChange = useCallback(
    (filter) => {
      setTimelineFilter(filter);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("section", "discovery");
          next.set("area", "capture");
          if (filter && filter !== "all") next.set("filter", filter);
          else next.delete("filter");
          next.delete("qstep");
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const handleNavigate = useCallback(
    (nextArea, options = {}) => {
      if (options.filter) {
        setTimelineFilter(options.filter);
      }
      setArea(nextArea, options);
    },
    [setArea],
  );

  // Only block the shell on the first load. Later refreshes must stay silent so
  // in-place edits (e.g. questionnaire type/options) do not unmount and blink.
  if (loading && !discoveryData) {
    return <WorkspaceSkeleton chromeless={chromeless} />;
  }

  const phase = discoveryData?.engagementPhase || "prospect_known";

  const renderPanel = () => {
    switch (area) {
      case "capture":
        return <TimelinePanel filter={timelineFilter} onFilterChange={handleFilterChange} />;
      case "profiles":
        return <PersonasPanel activeProfile={activeProfile} />;
      case "documents":
        return <DocumentsPanel />;
      case "brief":
        return <BriefPanel onNavigate={handleNavigate} />;
      default:
        return <TimelinePanel filter={timelineFilter} onFilterChange={handleFilterChange} />;
    }
  };

  return (
    <div className="space-y-4">
      {/* DiscoveryProgressStrip lives on ProjectJourneyTopNav phase row. */}
      <div className={cn(!chromeless && `${JOURNEY_WORKSPACE_MIN_H} overflow-y-auto`)}>
        {renderPanel()}
      </div>
    </div>
  );
}

export function ProductManagementWorkspace({ chromeless = false }) {
  return <WorkspaceBody chromeless={chromeless} />;
}
