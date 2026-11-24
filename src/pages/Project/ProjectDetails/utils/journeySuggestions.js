import { PROJECT_STAGES } from "../constants/projectStages";
import { isProjectJiraBacklogReady } from "@/lib/jiraBacklogReady";

/**
 * @typedef {{ text: string, stageId: string, area?: string, satisfied?: boolean }} PhaseSuggestion
 */

const STAGE_SUGGESTIONS = {
  capture: {
    text: "Add notes or questionnaires on Capture",
    stageId: "capture",
  },
  profiles: {
    text: "Complete client and product profiles",
    stageId: "profiles",
  },
  documents: {
    text: "Create kickoff documents",
    stageId: "documents",
  },
  brief: {
    text: "Write the product brief",
    stageId: "brief",
  },
  backlog: {
    text: "Create backlog from Product Strategy Capture",
    stageId: "backlog",
    area: "suggestions",
  },
  releases: {
    text: "Plan and scope your first release",
    stageId: "releases",
  },
  frontend: {
    text: "Implement scoped stories in Preview or App repositories",
    stageId: "frontend",
  },
  backend: {
    text: "Set up app repositories and architecture",
    stageId: "backend",
  },
  cloud: {
    text: "Configure Infrastructure and deploy",
    stageId: "cloud",
  },
  qa: {
    text: "Run QA and review test reports",
    stageId: "qa",
  },
};

/** Cross-phase handoff when every stage in the current phase is complete. */
const PHASE_HANDOFF = {
  discover: STAGE_SUGGESTIONS.backlog,
  plan: STAGE_SUGGESTIONS.frontend,
  build: STAGE_SUGGESTIONS.qa,
};

function stagesInPhase(phaseId) {
  return PROJECT_STAGES.filter((stage) => stage.phase === phaseId);
}

function isPhaseComplete(phaseId, indicators) {
  return stagesInPhase(phaseId).every((stage) => indicators[stage.id]?.status === "done");
}

function firstIncompleteStage(phaseId, indicators) {
  return stagesInPhase(phaseId).find((stage) => indicators[stage.id]?.status !== "done") ?? null;
}

/** Default stage when switching phases — first incomplete, or first in phase. */
export function getDefaultStageForPhase(phaseId, indicators) {
  const stages = stagesInPhase(phaseId);
  const incomplete = firstIncompleteStage(phaseId, indicators);
  return incomplete?.id ?? stages[0]?.id ?? null;
}

function resolveBacklogSuggestion(project) {
  const jiraReady = isProjectJiraBacklogReady(project);
  if (jiraReady) {
    return {
      text: "Review backlog suggestions and epics",
      stageId: "backlog",
      area: "suggestions",
    };
  }
  return STAGE_SUGGESTIONS.backlog;
}

/**
 * Recommended next action for the active journey phase toolbar.
 * @param {{ phaseId: string, indicators: Record<string, { status: string }>, project?: object }} input
 * @returns {PhaseSuggestion | null}
 */
export function getPhaseSuggestion({ phaseId, indicators, project }) {
  if (!phaseId || !indicators) return null;

  if (isPhaseComplete(phaseId, indicators)) {
    const handoff = PHASE_HANDOFF[phaseId];
    if (!handoff) return null;
    const target = handoff.stageId === "backlog" ? resolveBacklogSuggestion(project) : handoff;
    return { ...target, satisfied: false };
  }

  const nextStage = firstIncompleteStage(phaseId, indicators);
  if (!nextStage) return null;

  const base =
    nextStage.id === "backlog"
      ? resolveBacklogSuggestion(project)
      : STAGE_SUGGESTIONS[nextStage.id];
  if (!base) return null;

  return {
    ...base,
    satisfied: indicators[nextStage.id]?.status === "done",
  };
}
