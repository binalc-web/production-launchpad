import {
  isBackendAgentFailureTerminal,
  isBackendAgentSuccessTerminal,
  normalizeBackendAgentStatus,
} from "./backendAgentStatus.js";

/**
 * @param {object | null | undefined} st — client-link agent-status payload
 * @returns {{ failed: boolean, reason?: string }}
 */
export function classifyScratchAwaitFailure(st) {
  if (st?.scratchPreviewFailed) {
    return { failed: true, reason: "preview_failed" };
  }
  const raw = normalizeBackendAgentStatus(st?.status);
  if (isBackendAgentFailureTerminal(raw)) {
    return { failed: true, reason: raw || "failed" };
  }
  return { failed: false };
}

/**
 * Whether scratch-await should swap URL to preview params.
 * @param {object | null | undefined} st
 * @param {{ fallbackPort?: number | null }} [opts] — e.g. publicProject.port after load
 * @returns {{ complete: boolean, coldBoot?: boolean, failed?: boolean, reason?: string, waitingForAgent?: boolean, waitingForPreview?: boolean, building?: boolean }}
 */
export function shouldCompleteScratchAwait(st, { fallbackPort = null } = {}) {
  const failure = classifyScratchAwaitFailure(st);
  if (failure.failed) {
    return { complete: false, failed: true, reason: failure.reason };
  }

  if (Boolean(st?.mergeConfirmationPending) || Boolean(st?.awaitingLaunchpadConfirmation)) {
    return { complete: false };
  }

  const raw = normalizeBackendAgentStatus(st?.status);
  const agentTerminal = isBackendAgentSuccessTerminal(raw);

  // Server may keep scratchPreviewBuilding true while dev is cold; once agent succeeds, boot locally.
  if (st?.scratchPreviewBuilding && !agentTerminal) {
    return { complete: false, building: true };
  }

  if (st?.previewReady) {
    if (!agentTerminal) {
      return { complete: false, waitingForAgent: true };
    }
    return { complete: true, coldBoot: false };
  }

  if (!agentTerminal) {
    return { complete: false };
  }

  const handles = resolvePreviewHandlesFromStatus(st, { fallbackPort });
  if (handles.previewPort || handles.previewUrl || handles.workflowId) {
    return { complete: true, coldBoot: true };
  }

  return { complete: false, waitingForPreview: true };
}

/**
 * @param {object | null | undefined} st
 * @param {{ fallbackPort?: number | null }} [opts]
 * @returns {{ previewPort: number | null, previewUrl: string, workflowId: string }}
 */
export function resolvePreviewHandlesFromStatus(st, { fallbackPort = null } = {}) {
  let previewPort =
    st?.previewPort != null && Number(st.previewPort) > 0 ? Number(st.previewPort) : null;
  let previewUrl = String(st?.previewUrl || "").trim();
  const workflowId = st?.workflowId ? String(st.workflowId).trim() : "";

  const fp = fallbackPort != null ? Number(fallbackPort) : 0;
  if (!previewPort && Number.isInteger(fp) && fp > 0) {
    previewPort = fp;
  }

  if (!previewUrl && previewPort > 0) {
    previewUrl = `http://localhost:${previewPort}/`;
  }

  return { previewPort, previewUrl, workflowId };
}

/**
 * Loader status copy while `awaitScratchPreview=1`.
 * @param {object | null | undefined} st
 */
export function resolveScratchAwaitStatusMessage(st) {
  const raw = normalizeBackendAgentStatus(st?.status);
  const agentTerminal = isBackendAgentSuccessTerminal(raw);

  if (st?.scratchPreviewBuilding && !agentTerminal) {
    return "Installing dependencies and starting the dev server…";
  }

  if (st?.previewReady && !agentTerminal) {
    return raw ? "Agent is finishing up…" : "Waiting for the agent to finish…";
  }

  if (agentTerminal && !st?.previewReady) {
    return "Starting preview…";
  }

  if (st?.previewPort != null && !st?.previewReady) {
    return "Installing dependencies and starting the dev server…";
  }

  if (!st?.previewReady) {
    if (raw === "CREATING") {
      return "Building your project from scratch…";
    }
    if (raw) {
      return "Agent is running…";
    }
    return "Waiting for the agent to finish…";
  }

  return "";
}
