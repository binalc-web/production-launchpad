import { Activity, Bot, Check, ChevronRight, MessageSquare, X, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PROJECT_STAGES, STAGE_PHASES } from "../constants/projectStages";
import { getDefaultStageForPhase } from "../utils/journeySuggestions";
import { AGENT_ANALYTICS_SECTION } from "../constants/projectAgentAnalyticsSection";
import { PROJECT_AUTOMATIONS_SECTION } from "../constants/projectAutomationsSection";
import { ProjectJourneySubNav } from "./ProjectJourneySubNav";
import { NavRowParentLabel, JOURNEY_NAV_ROW_LEVEL } from "./NavRowParentLabel";
import { buildProjectChatPath } from "../lib/consoleQuickNavCatalog";

/** Compact next-step hint — sits on the right of the phase row to save vertical space. */
function JourneyNextSuggestion({ suggestion, onSuggestionNavigate, onDismiss }) {
  if (!suggestion?.text || !onSuggestionNavigate) return null;

  return (
    <div
      className={cn(
        "flex max-w-[min(100%,14rem)] shrink-0 items-center gap-1 border-l border-border/50 pl-2 sm:max-w-[18rem] md:max-w-[22rem]",
        suggestion.satisfied ? "text-muted-foreground" : "text-foreground",
      )}
    >
      <p className="min-w-0 flex-1 truncate text-[11px] leading-tight">
        {!suggestion.satisfied ? (
          <span className="font-medium text-primary">Next: </span>
        ) : (
          <span className="font-medium text-muted-foreground">Done · </span>
        )}
        <span className={suggestion.satisfied ? "text-muted-foreground" : undefined}>
          {suggestion.text}
        </span>
      </p>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="h-6 shrink-0 px-2 text-[11px]"
        onClick={() => onSuggestionNavigate(suggestion.stageId, { area: suggestion.area })}
      >
        Go
      </Button>
      {!suggestion.satisfied ? (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-6 shrink-0"
          onClick={onDismiss}
          aria-label="Dismiss suggestion"
        >
          <X className="size-3" />
        </Button>
      ) : null}
    </div>
  );
}

function StepDot({ status, active }) {
  if (status === "done") {
    return (
      <span
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full",
          active ? "bg-primary text-primary-foreground" : "bg-primary/15 text-primary",
        )}
      >
        <Check className="size-3" strokeWidth={3} aria-hidden />
      </span>
    );
  }
  return (
    <span
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-full border-2",
        active
          ? "border-primary"
          : status === "partial"
            ? "border-primary/40"
            : "border-muted-foreground/30",
      )}
    >
      {status === "partial" ? (
        <span className={cn("size-1.5 rounded-full", active ? "bg-primary" : "bg-primary/50")} />
      ) : null}
    </span>
  );
}

/**
 * Three-tier nested journey nav: phases → stages → sub-areas in one connected block.
 */
export function ProjectJourneyTopNav({
  activeStage,
  activePhase,
  indicators,
  onNavigate,
  suggestion,
  onSuggestionNavigate,
  isAdmin = false,
  agentAnalyticsActive = false,
  agentAnalyticsActiveCount = 0,
  onNavigateAgentAnalytics,
  automationsActive = false,
  automationsCount = 0,
  onNavigateAutomations,
  collaborationActive = false,
  onNavigateCollaboration,
  project,
  activeArea,
  activeProfile,
  className,
}) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(false);
  }, [activePhase, suggestion?.text]);

  const phaseStages = useMemo(
    () => PROJECT_STAGES.filter((stage) => stage.phase === activePhase),
    [activePhase],
  );

  const overlayViewActive = agentAnalyticsActive || automationsActive || collaborationActive;

  const showSuggestion =
    suggestion?.text && onSuggestionNavigate && (!dismissed || suggestion.satisfied);

  const activePhaseLabel =
    STAGE_PHASES.find((phase) => phase.id === activePhase)?.label ?? "Discover";

  const handlePhaseClick = (phaseId) => {
    const stageId = getDefaultStageForPhase(phaseId, indicators);
    if (stageId) onNavigate(stageId);
  };

  return (
    <nav
      aria-label="Project journey"
      data-tour="journey-top-nav"
      className={cn(
        "sticky top-0 z-20 -mx-4 border-b border-border/60 bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:-mx-5 md:px-5",
        className,
      )}
    >
      <div className="py-3">
        <div className="overflow-hidden rounded-xl border border-border/50 bg-background shadow-sm">
          <div className={cn("flex min-w-0 items-center gap-2", JOURNEY_NAV_ROW_LEVEL[1])}>
            <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto scroll-smooth">
              {STAGE_PHASES.map((phase, index) => {
                const active = !overlayViewActive && activePhase === phase.id;
                const stagesInPhase = PROJECT_STAGES.filter((stage) => stage.phase === phase.id);
                const phaseDone = stagesInPhase.every(
                  (stage) => indicators[stage.id]?.status === "done",
                );
                return (
                  <div key={phase.id} className="flex shrink-0 items-center">
                    {index > 0 ? (
                      <ChevronRight
                        className="mx-0.5 size-3.5 shrink-0 text-muted-foreground/40"
                        aria-hidden
                      />
                    ) : null}
                    <button
                      type="button"
                      onClick={() => handlePhaseClick(phase.id)}
                      aria-current={active ? "step" : undefined}
                      className={cn(
                        "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-200",
                        active
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                      )}
                    >
                      <span className="text-[11px] font-semibold tabular-nums text-muted-foreground/70">
                        {index + 1}
                      </span>
                      <span>{phase.label}</span>
                      {phaseDone ? (
                        <Check className="size-3.5 shrink-0 text-primary" aria-hidden />
                      ) : null}
                    </button>
                  </div>
                );
              })}
            </div>

            {!overlayViewActive && showSuggestion ? (
              <JourneyNextSuggestion
                suggestion={suggestion}
                onSuggestionNavigate={onSuggestionNavigate}
                onDismiss={() => setDismissed(true)}
              />
            ) : null}

            {!overlayViewActive && project?.id ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                asChild
                className="h-8 shrink-0 gap-1.5 text-xs"
              >
                <Link to={buildProjectChatPath(project.id)} aria-label="Open project chat">
                  <MessageSquare className="size-3.5 shrink-0" aria-hidden />
                  <span className="hidden sm:inline">Chat</span>
                </Link>
              </Button>
            ) : null}

            {isAdmin ? (
              <div className="flex shrink-0 items-center">
                <Button
                  type="button"
                  variant={agentAnalyticsActive ? "secondary" : "ghost"}
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                  onClick={() => onNavigateAgentAnalytics?.()}
                  aria-current={agentAnalyticsActive ? "page" : undefined}
                >
                  <Bot className="size-3.5 shrink-0" aria-hidden />
                  <span className="hidden sm:inline">{AGENT_ANALYTICS_SECTION.label}</span>
                  <span className="sm:hidden">Agents</span>
                  {agentAnalyticsActiveCount > 0 ? (
                    <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-primary-foreground">
                      {agentAnalyticsActiveCount}
                    </span>
                  ) : null}
                </Button>
              </div>
            ) : null}
          </div>

          <div data-tour="journey-overview" className={JOURNEY_NAV_ROW_LEVEL[2]}>
            <div className="flex min-w-0 items-center gap-3">
              {!overlayViewActive && phaseStages.length > 0 ? (
                <>
                  <div className="flex min-w-0 flex-1 items-center gap-3 overflow-x-auto scroll-smooth">
                    <NavRowParentLabel label={activePhaseLabel} depth={2} />
                    <div className="flex min-w-0 items-center gap-1">
                      {phaseStages.map((stage, index) => {
                        const indicator = indicators[stage.id] ?? { status: "todo" };
                        const active = activeStage === stage.id;
                        const Icon = stage.icon;
                        return (
                          <div key={stage.id} className="flex shrink-0 items-center">
                            {index > 0 ? (
                              <ChevronRight
                                className="mx-0.5 size-3.5 shrink-0 text-muted-foreground/40"
                                aria-hidden
                              />
                            ) : null}
                            <button
                              type="button"
                              onClick={() => onNavigate(stage.id)}
                              aria-current={active ? "step" : undefined}
                              data-tour-stage={stage.id}
                              className={cn(
                                "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors duration-200",
                                active
                                  ? "bg-primary/10 text-primary"
                                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                              )}
                            >
                              <StepDot status={indicator.status} active={active} />
                              <Icon className="size-3.5 shrink-0" aria-hidden />
                              <span className="truncate">{stage.label}</span>
                              {indicator.badge ? (
                                <span className="max-w-[4rem] shrink-0 truncate text-[10px] font-semibold tabular-nums text-muted-foreground">
                                  {indicator.badge}
                                </span>
                              ) : null}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <div className="min-w-0 flex-1" aria-hidden />
              )}

              <div className="flex shrink-0 items-center gap-1 border-l border-border/50 pl-3">
                <Button
                  type="button"
                  variant={collaborationActive ? "secondary" : "ghost"}
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                  onClick={() => onNavigateCollaboration?.()}
                  aria-current={collaborationActive ? "page" : undefined}
                >
                  <Activity className="size-3.5 shrink-0" aria-hidden />
                  <span className="hidden sm:inline">Team Activity</span>
                  <span className="sm:hidden">Activity</span>
                </Button>
                <Button
                  type="button"
                  variant={automationsActive ? "secondary" : "ghost"}
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                  onClick={() => onNavigateAutomations?.()}
                  aria-current={automationsActive ? "page" : undefined}
                >
                  <Zap className="size-3.5 shrink-0" aria-hidden />
                  <span className="hidden sm:inline">{PROJECT_AUTOMATIONS_SECTION.label}</span>
                  <span className="sm:hidden">Auto</span>
                  {automationsCount > 0 ? (
                    <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-primary-foreground">
                      {automationsCount}
                    </span>
                  ) : null}
                </Button>
              </div>
            </div>
          </div>

          {!overlayViewActive && project ? (
            <ProjectJourneySubNav
              nested
              project={project}
              activeStage={activeStage}
              activeArea={activeArea}
              activeProfile={activeProfile}
              onNavigate={onNavigate}
            />
          ) : null}
        </div>
      </div>
    </nav>
  );
}
