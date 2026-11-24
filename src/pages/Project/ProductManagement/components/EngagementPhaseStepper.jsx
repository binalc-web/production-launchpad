import { patchEngagementPhase } from "@/api";
import { toast } from "sonner";
import { ENGAGEMENT_PHASES } from "../constants";
import { WorkflowStepIndicator } from "./WorkflowStepIndicator";
import { getSatisfiedEngagementPhases } from "../utils/workflowStatus";

export function EngagementPhaseStepper({ projectId, phase, discoveryData, clientDetails, onUpdated }) {
  const completed = getSatisfiedEngagementPhases(discoveryData, clientDetails);

  const handleSelect = async (id) => {
    if (id === phase) return;
    try {
      await patchEngagementPhase(projectId, { engagementPhase: id });
      await onUpdated?.();
    } catch (err) {
      toast.error(err?.error || "Failed to update phase");
    }
  };

  return (
    <div className="overflow-x-auto scroll-smooth pb-1">
      <WorkflowStepIndicator
        steps={ENGAGEMENT_PHASES}
        currentId={phase}
        completedIds={completed}
        onSelect={handleSelect}
      />
    </div>
  );
}
