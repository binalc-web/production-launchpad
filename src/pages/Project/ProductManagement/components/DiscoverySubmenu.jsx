import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useClientInfoContext } from "@/pages/Project/ClientInfo/hooks/useClientInfoContext";
import { DISCOVERY_AREAS, PERSONA_TABS } from "../constants";
import { CompletenessRing } from "./CompletenessRing";
import { personaCompleteness } from "../utils/personaCompleteness";
import { getDiscoveryAreaIndicators } from "../utils/workflowStatus";

export function DiscoverySubmenu({ activeArea, activeProfile }) {
  const { clientDetails, discoveryData } = useClientInfoContext();
  const [, setSearchParams] = useSearchParams();

  const indicators = useMemo(
    () => getDiscoveryAreaIndicators(clientDetails, discoveryData),
    [clientDetails, discoveryData],
  );

  const setArea = useCallback(
    (nextArea) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("section", "discovery");
          next.set("area", nextArea);
          if (nextArea !== "profiles") next.delete("profile");
          if (nextArea !== "capture") next.delete("filter");
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const setProfile = useCallback(
    (profileId) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("section", "discovery");
          next.set("area", "profiles");
          next.set("profile", profileId);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  return (
    <ul
      role="group"
      aria-label="Discovery areas"
      className="ml-5 space-y-0.5 border-l border-border pl-2"
    >
      {DISCOVERY_AREAS.map(({ id, label }) => {
        const active = activeArea === id;
        const badge = indicators[id];

        return (
          <li key={id} className="space-y-0.5">
            <button
              type="button"
              onClick={() => setArea(id)}
              className={cn(
                "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-xs font-medium transition-colors duration-200",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-foreground hover:bg-muted/60",
              )}
            >
              <span className="truncate">{label}</span>
              {badge ? (
                <span className="shrink-0 text-[10px] font-semibold tabular-nums text-foreground/70">
                  {badge}
                </span>
              ) : null}
            </button>

            {id === "profiles" && active ? (
              <ul className="ml-2 space-y-0.5 border-l border-border pl-2">
                {PERSONA_TABS.map(({ id: profileId, label: profileLabel }) => {
                  const pct = personaCompleteness(clientDetails?.personas, profileId);
                  const profileActive = activeProfile === profileId;
                  return (
                    <li key={profileId}>
                      <button
                        type="button"
                        onClick={() => setProfile(profileId)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-md px-2 py-1 text-xs transition-colors",
                          profileActive
                            ? "bg-muted text-foreground font-medium"
                            : "text-foreground hover:bg-muted/50",
                        )}
                      >
                        <CompletenessRing value={pct} size={24} />
                        <span className="truncate">{profileLabel}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
