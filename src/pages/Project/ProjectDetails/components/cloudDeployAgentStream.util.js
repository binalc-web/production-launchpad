import { normalizeAgentStreamTimeline } from "../../../ClientLink/chat/clientLinkStreamTimeline.util.js";

/**
 * Apply deploy SSE agent_update payload to agent stream state.
 * @param {{
 *   streamText: string,
 *   streamPhase: string,
 *   streamTimeline: Array<object>,
 *   publishStep?: { phase?: string, label?: string } | null,
 * }} prev
 * @param {object} evt
 */
export function applyDeployAgentStreamUpdate(prev, evt) {
  if (!evt || typeof evt !== "object") return prev;
  const streamText = typeof evt.streamText === "string" ? evt.streamText : prev.streamText;
  const rawPhase = typeof evt.streamPhase === "string" ? evt.streamPhase : prev.streamPhase;
  const streamTimeline = Array.isArray(evt.streamTimeline)
    ? normalizeAgentStreamTimeline(evt.streamTimeline)
    : prev.streamTimeline;
  const publishStep =
    evt.publishStep && typeof evt.publishStep === "object"
      ? evt.publishStep
      : (prev.publishStep ?? null);
  const publishLabel = typeof publishStep?.label === "string" ? publishStep.label.trim() : "";
  const streamPhase = publishLabel || rawPhase;
  return { streamText, streamPhase, streamTimeline, publishStep };
}

/** @returns {{ streamText: string, streamPhase: string, streamTimeline: Array<object>, publishStep: object | null }} */
export function emptyDeployAgentStreamState() {
  return { streamText: "", streamPhase: "", streamTimeline: [], publishStep: null };
}

/**
 * Live pipeline label for deploy agent stream (prefers publish step during PUBLISHING).
 * @param {{ streamPhase?: string, publishStep?: { label?: string } | null }} agentStream
 * @param {string} runPhase
 */
export function resolveDeployAgentPipelineLabel(agentStream, runPhase) {
  const publishLabel =
    typeof agentStream?.publishStep?.label === "string" ? agentStream.publishStep.label.trim() : "";
  if (publishLabel) return publishLabel;
  const fromStream =
    typeof agentStream?.streamPhase === "string" ? agentStream.streamPhase.trim() : "";
  if (fromStream) return fromStream;
  if (runPhase === "PUBLISHING") return "Publishing to GitHub…";
  return "";
}

/**
 * Map legacy agent_summary SSE events to agent_update shape for backward compat.
 * @param {object} evt
 */
export function legacyAgentSummaryToUpdate(evt) {
  if (!evt || evt.type !== "agent_summary" || !evt.summary) return null;
  return {
    type: "agent_update",
    streamText: String(evt.summary),
    streamPhase: "",
    streamTimeline: [],
  };
}
