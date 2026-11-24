import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { isProjectJiraBacklogReady } from "@/lib/jiraBacklogReady";
import { CompletenessRing } from "@/pages/Project/ProductManagement/components/CompletenessRing";
import { personaCompleteness } from "@/pages/Project/ProductManagement/utils/personaCompleteness";
import { PERSONA_TABS } from "@/pages/Project/ProductManagement/constants";
import { useClientInfoContext } from "@/pages/Project/ClientInfo/hooks/useClientInfoContext";
import { getStage } from "../constants/projectStages";
import { NavRowParentLabel, JOURNEY_NAV_ROW_LEVEL } from "./NavRowParentLabel";

const subNavButtonClass = (active) =>
  cn(
    "flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors duration-200",
    active
      ? "bg-primary/10 text-primary"
      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
  );

/**
 * Horizontal sub-area and profile tabs — nested as the third row inside ProjectJourneyTopNav.
 */
export function ProjectJourneySubNav({
  project,
  activeStage,
  activeArea,
  activeProfile,
  onNavigate,
  nested = false,
  className,
}) {
  const { clientDetails } = useClientInfoContext();
  const stage = getStage(activeStage);
  const jiraReady = isProjectJiraBacklogReady(project);

  if (!stage) return null;

  const visibleAreas = stage.areas
    ? activeStage === "backlog" && jiraReady
      ? stage.areas.filter((area) => area.id === "suggestions")
      : stage.areas
    : null;

  const showAreas = visibleAreas && visibleAreas.length > 0;
  const showProfiles = stage.hasProfiles;

  if (!showAreas && !showProfiles) return null;

  const items = showProfiles
    ? PERSONA_TABS.map(({ id, label }) => ({ id, label, type: "profile" }))
    : visibleAreas.map(({ id, label }) => ({ id, label, type: "area" }));

  const activeId = showProfiles ? activeProfile : activeArea;

  return (
    <nav
      aria-label={showProfiles ? "Profile sections" : `${stage.label} sections`}
      className={cn(
        nested
          ? JOURNEY_NAV_ROW_LEVEL[3]
          : "rounded-xl border border-border/50 bg-muted/20 px-3 py-2",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3 overflow-x-auto scroll-smooth">
        <NavRowParentLabel label={stage.label} depth={3} />
        <div className="flex min-w-0 items-center gap-1">
          {items.map((item, index) => {
            const active = activeId === item.id;
            return (
              <div key={item.id} className="flex shrink-0 items-center">
                {index > 0 ? (
                  <ChevronRight
                    className="mx-0.5 size-3.5 shrink-0 text-muted-foreground/40"
                    aria-hidden
                  />
                ) : null}
                <button
                  type="button"
                  onClick={() =>
                    item.type === "profile"
                      ? onNavigate(activeStage, { profile: item.id })
                      : onNavigate(activeStage, { area: item.id })
                  }
                  aria-current={active ? "step" : undefined}
                  className={subNavButtonClass(active)}
                >
                  {item.type === "profile" ? (
                    <CompletenessRing
                      value={personaCompleteness(clientDetails?.personas, item.id)}
                      size={16}
                    />
                  ) : null}
                  <span className="truncate">{item.label}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
