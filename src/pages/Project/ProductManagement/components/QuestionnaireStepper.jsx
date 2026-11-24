import { WorkflowStepIndicator } from "./WorkflowStepIndicator";
import {
  QUESTIONNAIRE_STEPS,
  getQuestionnaireLifecycleStatus,
} from "../utils/questionnaireLifecycle";

export function QuestionnaireStepper({ questionnaire }) {
  const status = getQuestionnaireLifecycleStatus(questionnaire);
  const statusIndex = QUESTIONNAIRE_STEPS.findIndex((step) => step.id === status);
  const completedIds = QUESTIONNAIRE_STEPS.slice(0, statusIndex).map((step) => step.id);

  return (
    <div className="overflow-x-auto scroll-smooth pb-1">
      <WorkflowStepIndicator
        steps={QUESTIONNAIRE_STEPS}
        currentId={status}
        completedIds={completedIds}
      />
    </div>
  );
}
