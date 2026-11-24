import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { RELEASE_AREAS } from "../constants";
import { useReleasesSnapshot } from "../ReleasesSnapshotContext";
import { getReleaseAreaIndicators } from "../utils/releaseWorkflowStatus";

export function ReleaseSubmenu({ activeArea, releases: releasesProp }) {
  const [, setSearchParams] = useSearchParams();
  const snapshot = useReleasesSnapshot();
  const releases = releasesProp ?? snapshot.releases ?? [];
  const indicators = getReleaseAreaIndicators(releases);

  const setArea = useCallback(
    (nextArea) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("section", "releases");
          next.set("area", nextArea);
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
      aria-label="Release areas"
      className="ml-5 space-y-0.5 border-l border-border pl-2"
    >
      {RELEASE_AREAS.map(({ id, label }) => {
        const active = activeArea === id;
        const badge = indicators[id];

        return (
          <li key={id}>
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
                <span className="shrink-0 max-w-[5rem] truncate text-[10px] font-semibold tabular-nums text-foreground/70">
                  {badge}
                </span>
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
