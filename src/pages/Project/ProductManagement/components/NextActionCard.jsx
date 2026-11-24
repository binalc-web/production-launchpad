import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useState } from "react";
import { isNextActionSatisfied } from "../utils/workflowStatus";

const ACTIONS = {
  prospect_known: { text: "Add company website and enrich Company profile", area: "profiles", profile: "company" },
  first_call: { text: "Write notes from your first call on Capture", area: "capture" },
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

export function NextActionCard({ phase, discoveryData, clientDetails, onNavigate, onDismiss }) {
  const [dismissed, setDismissed] = useState(false);
  const action = ACTIONS[phase] || ACTIONS.prospect_known;

  if (dismissed) return null;
  if (isNextActionSatisfied(phase, discoveryData, clientDetails)) return null;

  const go = () => {
    onNavigate?.(action.area, {
      profile: action.profile,
      filter: action.filter,
    });
  };

  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border bg-primary/5 border-primary/20 px-4 py-3">
      <div className="min-w-0">
        <p className="text-xs font-medium text-primary">Suggested next step</p>
        <p className="text-sm mt-0.5">{action.text}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button type="button" size="sm" variant="secondary" className="h-8 text-xs" onClick={go}>
          Go
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-8"
          onClick={() => {
            setDismissed(true);
            onDismiss?.();
          }}
        >
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}
