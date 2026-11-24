import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { BACKLOG_AREAS } from "../constants";

export function BacklogSubmenu({ activeArea, jiraReady = false }) {
  const [, setSearchParams] = useSearchParams();
  const areas = jiraReady
    ? BACKLOG_AREAS.filter((a) => a.id === "suggestions")
    : BACKLOG_AREAS;

  const setArea = useCallback(
    (nextArea) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("section", "backlog");
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
      aria-label="Backlog areas"
      className="ml-5 space-y-0.5 border-l border-border pl-2"
    >
      {areas.map(({ id, label }) => {
        const active = activeArea === id;
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
            </button>
          </li>
        );
      })}
    </ul>
  );
}
