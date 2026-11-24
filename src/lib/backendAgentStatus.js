export const CLOUD_AGENT_USER_STOP_SUMMARY = "Stopped by API";

/** Aligns with backend Cursor agent status strings (uppercase, underscores). */
export function normalizeBackendAgentStatus(status) {
  if (status == null || status === "") return "";
  return String(status).trim().toUpperCase().replace(/\s+/g, "_");
}

export function isBackendAgentSuccessTerminal(status) {
  const u = normalizeBackendAgentStatus(status);
  if (!u) return false;
  return (
    u === "FINISHED" ||
    u === "COMPLETED" ||
    u === "COMPLETE" ||
    u === "SUCCEEDED" ||
    u === "SUCCESS" ||
    u === "DONE"
  );
}

export function isBackendAgentFailureTerminal(status) {
  const u = normalizeBackendAgentStatus(status);
  if (!u) return false;
  if (u === "FAILED" || u === "ERROR" || u === "CANCELLED" || u === "CANCELED") return true;
  return u.includes("FAIL");
}

/**
 * True when release lock UX should apply (status is locked).
 */
export function isReleaseEffectivelyLocked(release) {
  const status = String(release?.status ?? "").toLowerCase();
  return status === "locked";
}

/** Shown when release / client-link controls are disabled during a deferred lock. */
export const BACKEND_PLAN_AGENT_CONTROLS_DISABLED_HINT =
  "Unavailable while the backend plan agent is running. Wait for it to finish.";

/** Shown when AI chat is paused for any release-level background agent. */
export const RELEASE_BACKGROUND_AGENT_CHAT_DISABLED_HINT =
  "AI chat is paused while a background agent runs on this release.";

/**
 * Public/authenticated release payload may include `releaseBackgroundAgent`.
 * @param {object | null | undefined} release
 * @returns {{ kind: string, message: string, runId?: number | null } | null}
 */
export function getReleaseBackgroundAgentBlock(release) {
  const block = release?.releaseBackgroundAgent;
  if (!block || typeof block !== "object") return null;
  const message = typeof block.message === "string" ? block.message.trim() : "";
  if (!message) return null;
  return {
    kind: typeof block.kind === "string" ? block.kind : "unknown",
    message,
    runId: block.runId ?? null,
  };
}

/**
 * Lock was requested but release stays active until the backend plan agent finishes.
 */
export function isReleaseLockPending(release) {
  const status = String(release?.status ?? "").toLowerCase();
  if (status === "locked") return false;
  const phase = String(release?.backendAgentLockPhase ?? "")
    .trim()
    .toLowerCase();
  if (phase === "awaiting_questions") return true;
  return isBackendAgentPollActive(release?.backendAgentStatus);
}

/**
 * Release lock is deferred: submodule may be synced but plan agent has not finished locking.
 */
export function isReleaseBackendAgentOutstanding(release) {
  if (isReleaseEffectivelyLocked(release)) return false;
  return Boolean(release?.backendAgentId?.trim());
}

/** Deferred lock: plan agent failed; release stays active until lock is retried. */
export function isReleaseBackendAgentFailed(release) {
  if (!isReleaseBackendAgentOutstanding(release)) return false;
  return isBackendAgentFailureTerminal(release?.backendAgentStatus);
}

/** Deferred lock: plan agent still running (non-terminal status). */
export function isReleaseBackendAgentRunning(release) {
  if (!isReleaseBackendAgentOutstanding(release)) return false;
  return isBackendAgentPollActive(release?.backendAgentStatus);
}

/**
 * Keep polling until deferred lock is finalized (release locked) or agent failed.
 * Covers FINISHED-but-not-locked-yet (backend may persist terminal status before finalize).
 * @param {Array<object>|null|undefined} releases
 */
export function shouldPollReleaseBackendLockCompletion(releases) {
  return (releases || []).some((release) => {
    if (!isReleaseBackendAgentOutstanding(release)) return false;
    if (isReleaseBackendAgentFailed(release)) return false;
    return true;
  });
}

/**
 * True while LaunchPad is still orchestrating lock (including FINISHED turns mid host-verify/fix).
 * Unlike isReleaseLockPending, this stays true after Cursor reports FINISHED until the release is locked or permanently failed.
 * @param {object | null | undefined} release
 */
export function isReleaseLockOrchestrationActive(release) {
  if (!release || isReleaseEffectivelyLocked(release)) return false;
  if (isReleaseBackendAgentFailed(release)) return false;
  const phase = String(release?.backendAgentLockPhase ?? "")
    .trim()
    .toLowerCase();
  if (phase === "awaiting_questions") return true;
  return isReleaseBackendAgentOutstanding(release);
}

/**
 * Whether the release can own a live lock panel (for auto-show / eligibility).
 * Includes deferred FAILED so the FAILED panel may re-open; excludes locked (panel stays open via local state until dismiss).
 * @param {object | null | undefined} release
 */
export function isReleaseLockPanelEligible(release) {
  if (!release || isReleaseEffectivelyLocked(release)) return false;
  if (isReleaseLockOrchestrationActive(release)) return true;
  return isReleaseBackendAgentFailed(release);
}

/** User-initiated stop (Cursor stop API or persisted STOPPED). */
export function isBackendAgentStopped(status, userStopped = false) {
  if (userStopped) return true;
  const u = normalizeBackendAgentStatus(status);
  return u === "STOPPED";
}

/**
 * GET /api/cursor/agents/:id payload: user stop via API (FINISHED + marker summary).
 * @param {{ summary?: string | null } | null | undefined} agentPayload
 */
export function isCloudAgentUserStopFromPayload(agentPayload) {
  if (!agentPayload || typeof agentPayload !== "object") return false;
  const s = typeof agentPayload.summary === "string" ? agentPayload.summary.trim() : "";
  return s === CLOUD_AGENT_USER_STOP_SUMMARY;
}

/**
 * Terminal outcome for project-detail Cursor agent polling.
 * @param {{ status?: string | null, summary?: string | null } | null | undefined} data
 * @returns {"stopped" | "failed" | "success" | null}
 */
export function classifyCursorAgentPollTerminal(data) {
  if (!data || typeof data !== "object") return null;
  const st = data.status;
  if (isCloudAgentUserStopFromPayload(data) || isBackendAgentStopped(st, false)) {
    return "stopped";
  }
  if (isBackendAgentFailureTerminal(st)) return "failed";
  if (isBackendAgentSuccessTerminal(st)) return "success";
  return null;
}

/**
 * Client-link agent-status payload: stop marker or API generationState.
 * Ignores stale "Stopped by API" while status is still RUNNING/CREATING.
 * @param {{ status?: string | null, activity?: string | null, userStopped?: boolean, generationState?: string | null } | null | undefined} st
 */
export function isClientLinkAgentUserStopped(st) {
  if (!st) return false;
  const gen = typeof st.generationState === "string" ? st.generationState.trim() : "";
  if (gen === "running" || gen === "completed") return false;
  if (st.userStopped) return true;
  if (gen === "stopped") return true;
  const raw = normalizeBackendAgentStatus(st.status);
  if (raw === "RUNNING" || raw === "CREATING") return false;
  const activity = typeof st.activity === "string" ? st.activity.trim() : "";
  if (activity === CLOUD_AGENT_USER_STOP_SUMMARY) return true;
  return isBackendAgentStopped(raw, false);
}

/** @param {{ generationState?: string | null } | null | undefined} st */
export function isClientLinkAgentGenerationCompleted(st) {
  return st?.generationState === "completed";
}

/** @param {{ generationState?: string | null } | null | undefined} st */
export function isClientLinkAgentGenerationFailed(st) {
  return st?.generationState === "failed";
}

/** True when agent-status payload indicates a terminal failure (status or generationState). */
export function isClientLinkAgentTurnFailed(st) {
  if (!st) return false;
  if (isClientLinkAgentGenerationFailed(st)) return true;
  return isBackendAgentFailureTerminal(st?.status);
}

/**
 * Cursor agent work for the latest user turn is persisted (merge / applied SHA).
 * Preview boot may still be in progress (`scratchPreviewBuilding`).
 * @param {object | null | undefined} st
 */
export function isClientLinkAgentWorkComplete(st) {
  if (!st || isClientLinkAgentUserStopped(st) || isClientLinkAgentTurnFailed(st)) {
    return false;
  }
  if (Boolean(st.awaitingLaunchpadConfirmation)) {
    return false;
  }
  if (!isBackendAgentSuccessTerminal(st?.status)) return false;
  if (st.lastUserTurnMergedAt) return true;
  const sha =
    typeof st.lastUserTurnAppliedCommitSha === "string"
      ? st.lastUserTurnAppliedCommitSha.trim()
      : "";
  return sha.length >= 7;
}

/**
 * Agent turn is done — exit live stream / progress UI even if generationState still "running".
 * @param {object | null | undefined} st
 */
export function isClientLinkAgentTurnComplete(st) {
  if (!st || isClientLinkAgentUserStopped(st) || isClientLinkAgentGenerationFailed(st)) {
    return false;
  }
  const raw = normalizeBackendAgentStatus(st?.status);
  const apiGenState = typeof st?.generationState === "string" ? st.generationState.trim() : "";
  const busy = Boolean(st?.busy) && !st?.error;

  if (isBackendAgentFailureTerminal(raw)) return true;

  if (isClientLinkAgentWorkComplete(st)) return true;

  // Stale Cursor FINISHED from a prior turn must not hide in-flight work.
  if (busy || apiGenState === "running" || apiGenState === "retrying") {
    return false;
  }

  if (isBackendAgentSuccessTerminal(raw)) return true;
  if (isClientLinkAgentGenerationCompleted(st)) return true;
  if (apiGenState === "completed" || apiGenState === "idle") return true;

  const previewReady =
    Boolean(st?.previewReady) &&
    !st?.busy &&
    !Boolean(st?.awaitingLaunchpadConfirmation) &&
    !Boolean(st?.scratchPreviewBuilding) &&
    !st?.scratchPreviewFailed;
  if (previewReady) {
    if (apiGenState === "completed" || apiGenState === "idle") return true;
    if (isBackendAgentSuccessTerminal(raw)) return true;
  }

  return false;
}

/**
 * When the server reports not busy, clear stale local "running" UI (generationState can lag).
 * @param {object | null | undefined} st — client-link agent-status payload
 * @param {{ setReleaseAgentBusy: (v: boolean) => void, setPipelineLabel?: (v: string) => void, setAgentModelId?: (v: string | null) => void, applyApiGenerationTerminal: (gen: string) => void, markCompleted?: () => void }} actions
 */
export function syncClientLinkAgentUiFromStatus(st, actions) {
  const busy = Boolean(st?.busy) && !st?.error;
  actions.setReleaseAgentBusy(busy);
  const gen = typeof st?.generationState === "string" ? st.generationState.trim() : "";
  const raw = normalizeBackendAgentStatus(st?.status);
  const modelId = typeof st?.model === "string" ? st.model.trim() : "";
  if (modelId) {
    actions.setAgentModelId?.(modelId);
  }

  if (isClientLinkAgentTurnComplete(st)) {
    actions.setPipelineLabel?.("");
    if (isClientLinkAgentUserStopped(st) || gen === "stopped") {
      actions.applyApiGenerationTerminal("stopped");
      return;
    }
    if (isClientLinkAgentTurnFailed(st)) {
      actions.applyApiGenerationTerminal("failed");
      return;
    }
    actions.applyApiGenerationTerminal("completed");
    return;
  }

  if (isClientLinkAgentTurnFailed(st)) {
    actions.setPipelineLabel?.("");
    actions.applyApiGenerationTerminal("failed");
    return;
  }

  // Live stream text is owned by applyAgentLiveStreamFromStatus; never clear it here.
  if (busy || gen === "running") return;

  actions.setPipelineLabel?.("");

  if (isClientLinkAgentUserStopped(st) || gen === "stopped") {
    actions.applyApiGenerationTerminal("stopped");
    return;
  }
  if (isClientLinkAgentGenerationFailed(st) || isBackendAgentFailureTerminal(raw)) {
    actions.applyApiGenerationTerminal("failed");
    return;
  }
  if (isClientLinkAgentGenerationCompleted(st) || gen === "idle") {
    actions.applyApiGenerationTerminal(gen === "idle" ? "idle" : "completed");
    return;
  }
  if (isBackendAgentSuccessTerminal(raw) && gen !== "running" && gen !== "retrying") {
    actions.applyApiGenerationTerminal("completed");
  }
}

/** True while we should poll the API for backend agent updates. */
export function isBackendAgentPollActive(status, userStopped = false) {
  if (isBackendAgentStopped(status, userStopped)) return false;
  if (!status || String(status).trim() === "") return false;
  if (isBackendAgentSuccessTerminal(status) || isBackendAgentFailureTerminal(status)) {
    return false;
  }
  return true;
}

/** Migrate Frontend pipeline failure phases (live panel closes on phase FAILED SSE, not these alone). */
export function isMigrateFrontendPipelineFailure(phase) {
  if (!phase || typeof phase !== "string") return false;
  return phase === "platform_failed" || phase === "agent_failed";
}

/** Matches backend `isLikelyGitHubPushAccessError` — git remote / OAuth mismatch. */
export function isMigrateFrontendGitHubAccessDeniedMessage(text) {
  if (typeof text !== "string" || !text.trim()) return false;
  const t = text.toLowerCase();
  if (/\b403\b/.test(t)) return true;
  if (t.includes("permission to ") && t.includes("denied")) return true;
  if (t.includes("denied to ")) return true;
  if (t.includes("git push") && (t.includes("denied") || t.includes("403"))) return true;
  if (t.includes("write access") && t.includes("denied")) return true;
  return false;
}
