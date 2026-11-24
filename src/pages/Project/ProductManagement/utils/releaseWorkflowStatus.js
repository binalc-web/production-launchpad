import {
  isReleaseBackendAgentRunning,
  isReleaseLockPending,
} from "@/lib/backendAgentStatus";
import { normalizeReleaseStatus } from "@/lib/releasePresentation";

export function getReleaseStatusCounts(releases) {
  const counts = { draft: 0, active: 0, locked: 0, skip: 0 };
  for (const r of releases || []) {
    const s = normalizeReleaseStatus(r);
    if (counts[s] != null) counts[s] += 1;
  }
  return counts;
}

export function getActiveRelease(releases) {
  return (
    (releases || []).find((r) => normalizeReleaseStatus(r) === "active") ?? null
  );
}

export function getReleaseAreaIndicators(releases) {
  const list = releases || [];
  const active = getActiveRelease(list);
  const counts = getReleaseStatusCounts(list);
  return {
    overview: list.length > 0 ? String(list.length) : null,
    roadmap: counts.locked > 0 ? String(counts.locked) : null,
    active: active ? active.name : null,
  };
}

export function getReleaseNextAction(
  releases,
  revisionSeedProgressByRelease = {},
) {
  const list = releases || [];
  if (list.length === 0) {
    return {
      id: "create_first",
      text: "Create your first release to start shipping versions",
      action: "create",
      satisfied: false,
    };
  }

  const active = getActiveRelease(list);
  if (!active) {
    return {
      id: "activate",
      text: "Set a release to Active to enable revisions and the live client build",
      action: "overview",
      satisfied: false,
    };
  }

  const scopeCount = active.scopeItemCount;
  if (scopeCount === 0) {
    return {
      id: "add_scope",
      text: "Add stories to your active release scope",
      action: "active",
      satisfied: false,
    };
  }

  const versions = Array.isArray(active.versions) ? active.versions : [];
  if (versions.length === 0) {
    return {
      id: "add_revision",
      text: "Add the first revision on your active release",
      action: "active",
      satisfied: false,
    };
  }

  if (
    isReleaseLockPending(active) ||
    isReleaseBackendAgentRunning(active) ||
    revisionSeedProgressByRelease[active.id]
  ) {
    return {
      id: "agent_running",
      text: "A build or lock agent is running — preview updates when it finishes",
      action: null,
      satisfied: true,
    };
  }

  return {
    id: "ready",
    text: "Active release is live — add revisions or lock when ready to ship",
    action: "active",
    satisfied: true,
  };
}

export function isReleaseNextActionDismissible(
  releases,
  revisionSeedProgressByRelease = {},
) {
  const action = getReleaseNextAction(releases, revisionSeedProgressByRelease);
  return action.satisfied || action.id === "agent_running";
}
