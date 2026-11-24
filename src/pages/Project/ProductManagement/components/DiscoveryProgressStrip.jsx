import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { personaCompleteness } from "../utils/personaCompleteness";
import { PERSONA_TABS } from "../constants";
import { getQuestionnaireStatus, isNextActionSatisfied } from "../utils/workflowStatus";
import { EngagementPhaseStepper } from "./EngagementPhaseStepper";

const ACTIONS = {
  prospect_known: { text: "Add company website and enrich Company profile", area: "profiles", profile: "company" },
  first_call: { text: "Write notes from your first call", area: "capture" },
  discovery_calls: {
    text: "Build a questionnaire from discovery gaps",
    area: "capture",
    filter: "questionnaires",
  },
  signed: {
    text: "Publish a questionnaire and share the link",
    area: "capture",
    filter: "questionnaires",
  },
  pre_kickoff: {
    text: "Review questionnaire answers",
    area: "capture",
    filter: "questionnaires",
  },
  kickoff: { text: "Create kickoff documents and confirm product scope", area: "documents" },
  post_kickoff: { text: "Continue capturing learnings on Capture", area: "capture" },
};

export function DiscoveryProgressStrip({
  projectId,
  phase,
  discoveryData,
  clientDetails,
  onUpdated,
  onNavigate,
}) {
  const [dismissed, setDismissed] = useState(false);
  const [readinessOpen, setReadinessOpen] = useState(false);
  const action = ACTIONS[phase] || ACTIONS.prospect_known;
  const satisfied = isNextActionSatisfied(phase, discoveryData, clientDetails);
  const showReadiness = ["pre_kickoff", "kickoff"].includes(phase);

  const questionnaireStatus = getQuestionnaireStatus(discoveryData);
  const openQs = (discoveryData?.openQuestionsRegister || []).filter((q) => q.status === "open").length;

  const goToAction = () => {
    onNavigate?.(action.area, {
      profile: action.profile,
      filter: action.filter,
    });
  };

  return (
    <div className="relative flex flex-col gap-2.5 rounded-xl border bg-card px-3 py-2.5 shadow-sm flex-1 min-w-0">
      <EngagementPhaseStepper
        projectId={projectId}
        phase={phase}
        discoveryData={discoveryData}
        clientDetails={clientDetails}
        onUpdated={onUpdated}
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        {satisfied || !dismissed ? (
          <div
            className={cn(
              "flex flex-1 items-center justify-between gap-2 min-w-0 rounded-lg border px-3 py-1.5",
              satisfied
                ? "bg-muted/30 border-border"
                : "bg-primary/5 border-primary/15",
            )}
          >
            <p className="text-xs sm:text-sm truncate">
              {!satisfied ? (
                <span className="font-medium text-primary">Next: </span>
              ) : (
                <span className="font-medium text-muted-foreground">Done · </span>
              )}
              {action.text}
            </p>
            <div className="flex items-center gap-1 shrink-0">
              <Button type="button" size="sm" variant="secondary" className="h-7 text-xs" onClick={goToAction}>
                Go
              </Button>
              {!satisfied ? (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-7"
                  onClick={() => setDismissed(true)}
                  aria-label="Dismiss suggestion"
                >
                  <X className="size-3.5" />
                </Button>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="flex-1 hidden sm:block" />
        )}

        {showReadiness ? (
          <Collapsible open={readinessOpen} onOpenChange={setReadinessOpen} className="shrink-0">
            <CollapsibleTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="h-8 text-xs gap-1">
                {questionnaireStatus.responseCount} responses · {openQs} open Qs
                <ChevronDown
                  className={cn("size-3.5 transition-transform", readinessOpen && "rotate-180")}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 sm:pt-0 sm:absolute sm:right-4 sm:top-full sm:z-20 sm:mt-1 sm:w-72 sm:rounded-lg sm:border sm:bg-popover sm:p-3 sm:shadow-md">
              <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                {PERSONA_TABS.map(({ id, label }) => (
                  <div key={id} className="rounded-md bg-muted/40 px-2 py-1.5">
                    <span className="text-muted-foreground">{label}</span>
                    <p className="font-semibold">{personaCompleteness(clientDetails?.personas, id)}%</p>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        ) : null}
      </div>
    </div>
  );
}
