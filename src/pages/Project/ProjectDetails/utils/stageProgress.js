import {
  getDiscoveryAreaIndicators,
  getQuestionnaireStatus,
} from "@/pages/Project/ProductManagement/utils/workflowStatus";
import {
  getActiveRelease,
  getReleaseStatusCounts,
} from "@/pages/Project/ProductManagement/utils/releaseWorkflowStatus";
import { isProjectJiraBacklogReady } from "@/lib/jiraBacklogReady";
import {
  formatBackendInfraLabel,
  formatBackendLockAgentModeLabel,
} from "@/lib/projectStatusPresentation";

/**
 * Per-stage status used by the journey rail and progress overview.
 * status is one of: "done" | "partial" | "todo".
 * @typedef {{ status: "done" | "partial" | "todo", badge: string | null }} StageIndicator
 */

const STATUS = { done: "done", partial: "partial", todo: "todo" };

/** Capture stage status from the discovery capture summary string. */
function resolveCaptureIndicator(captureSummary, discoveryData) {
  const badge = captureSummary ?? null;
  if (!badge) {
    return { status: STATUS.todo, badge: null };
  }

  const q = getQuestionnaireStatus(discoveryData ?? {});
  if (q.hasCaptured) {
    return { status: STATUS.done, badge };
  }

  const lower = badge.toLowerCase();
  if (lower.includes("draft") || lower.includes("live")) {
    return { status: STATUS.partial, badge };
  }

  return { status: STATUS.partial, badge };
}

function parsePercent(value) {
  if (typeof value !== "string") return null;
  const match = value.match(/(\d+)%/);
  return match ? Number(match[1]) : null;
}

/**
 * Compute indicators for every journey stage from the data already loaded for
 * the project. Defensive: missing data degrades to a "todo" state.
 * @param {{ clientDetails?: object, discoveryData?: object, project?: object, releases?: Array<object> }} input
 * @returns {Record<string, StageIndicator>}
 */
export function getStageIndicators({ clientDetails, discoveryData, project, releases } = {}) {
  const discovery = getDiscoveryAreaIndicators(clientDetails ?? {}, discoveryData ?? {});
  const releaseList = releases ?? project?.releases ?? [];
  const activeRelease = getActiveRelease(releaseList);
  const releaseCounts = getReleaseStatusCounts(releaseList);

  const profilesPct = parsePercent(discovery.profiles);
  const versions = Array.isArray(project?.versions) ? project.versions : [];
  const hasLiveVersion = versions.some((v) => v?.isActive);
  const hasDevRepo = Boolean(String(project?.developmentRepoUrl ?? "").trim());
  const infraStack = String(project?.backendInfraStack ?? "")
    .trim()
    .toLowerCase();
  const hasInfra = Boolean(infraStack) && infraStack !== "none";
  const jiraReady = isProjectJiraBacklogReady(project);

  return {
    capture: resolveCaptureIndicator(discovery.capture, discoveryData),
    profiles: {
      status:
        profilesPct == null || profilesPct === 0
          ? STATUS.todo
          : profilesPct >= 80
            ? STATUS.done
            : STATUS.partial,
      badge: discovery.profiles ?? null,
    },
    documents: {
      status: discovery.documents ? STATUS.done : STATUS.todo,
      badge: discovery.documents ?? null,
    },
    brief: {
      status: discovery.brief ? STATUS.done : STATUS.todo,
      badge: discovery.brief ?? null,
    },
    backlog: {
      status: jiraReady ? STATUS.done : STATUS.todo,
      badge: jiraReady ? "Jira" : null,
    },
    releases: {
      status:
        releaseCounts.locked > 0
          ? STATUS.done
          : activeRelease || releaseList.length > 0
            ? STATUS.partial
            : STATUS.todo,
      badge: releaseList.length > 0 ? String(releaseList.length) : null,
    },
    frontend: {
      status: hasLiveVersion ? STATUS.done : hasDevRepo ? STATUS.partial : STATUS.todo,
      badge: hasLiveVersion ? "Live" : null,
    },
    backend: {
      status: hasDevRepo ? STATUS.partial : STATUS.todo,
      badge: project?.backendLockAgentMode
        ? formatBackendLockAgentModeLabel(project.backendLockAgentMode)
        : null,
    },
    cloud: {
      status: hasInfra ? STATUS.partial : STATUS.todo,
      badge: hasInfra
        ? formatBackendInfraLabel(project?.backendInfraStack, project?.backendDeployMode)
        : null,
    },
    qa: {
      status: STATUS.todo,
      badge: null,
    },
  };
}
