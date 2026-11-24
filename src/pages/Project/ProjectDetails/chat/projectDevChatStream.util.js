/**
 * Parse SSE status payload from backend-code / infra-analysis chat agent-events.
 * @param {Record<string, unknown> | null | undefined} evt
 */
export function statusFromDevChatStreamEvent(evt) {
  if (!evt || typeof evt !== "object") return null;
  if (
    evt.type === "connected" ||
    evt.type === "terminal" ||
    evt.type === "update" ||
    evt.type === "generation_started"
  ) {
    const st = evt.status;
    return st && typeof st === "object" ? st : null;
  }
  return null;
}

const IN_FLIGHT_ASSISTANT_STATUSES = new Set(["pending", "generating"]);

/** @param {object | null | undefined} message */
export function isInFlightDevChatAssistantMessage(message) {
  return IN_FLIGHT_ASSISTANT_STATUSES.has(String(message?.status ?? "").toLowerCase());
}

/**
 * True when `candidate` looks like a truncated prefix of a longer stored reply
 * (SSE `aiSummary` is often capped at ~2000 chars — never clobber a full plan).
 * @param {unknown} existing
 * @param {unknown} candidate
 */
export function isTruncatedDevChatReplyOverlay(existing, candidate) {
  const prev = typeof existing === "string" ? existing.trim() : "";
  const next = typeof candidate === "string" ? candidate.trim() : "";
  if (!prev || !next) return false;
  if (next.length >= prev.length) return false;
  if (prev.startsWith(next)) return true;
  // Plan fences: keep the full reply whenever the overlay is shorter.
  if (/```launchpad[-_]?plan\b/i.test(prev) && next.length < prev.length) return true;
  return false;
}

/**
 * Merge live SSE overlay fields onto a chat message row.
 * @param {object | null | undefined} message
 * @param {object | null | undefined} liveStatus
 */
export function mergeDevChatLiveStatusIntoMessage(message, liveStatus) {
  if (!message || !liveStatus || typeof liveStatus !== "object") return message;
  const assistantMessageId = liveStatus.assistantMessageId;
  if (assistantMessageId && message.id !== assistantMessageId) return message;

  const inFlight = isInFlightDevChatAssistantMessage(message);
  const next = { ...message };
  if (!inFlight && typeof liveStatus.aiSummary === "string" && liveStatus.aiSummary.trim()) {
    const summary = liveStatus.aiSummary.trim();
    // Prefer the stored/full reply over a truncated live aiSummary (long plans).
    if (!isTruncatedDevChatReplyOverlay(next.reply, summary)) {
      next.reply = summary;
    }
  }
  if (typeof liveStatus.messageStatus === "string" && liveStatus.messageStatus.trim()) {
    next.status = liveStatus.messageStatus.trim();
  }
  if (liveStatus.agentStatus != null) {
    next.agentStatus = liveStatus.agentStatus;
  }

  const prevStreamText = typeof next.streamText === "string" ? next.streamText : "";
  const prevStreamPhase = typeof next.streamPhase === "string" ? next.streamPhase.trim() : "";
  const prevTimeline = Array.isArray(next.streamTimeline) ? next.streamTimeline : [];

  if (typeof liveStatus.streamText === "string") {
    const incoming = liveStatus.streamText;
    if (!inFlight || incoming.trim() || !prevStreamText.trim()) {
      next.streamText = incoming;
    }
  }
  if (typeof liveStatus.streamPhase === "string") {
    const incomingPhase = liveStatus.streamPhase.trim();
    if (!inFlight || incomingPhase || !prevStreamPhase) {
      if (!inFlight || incomingPhase) {
        next.streamPhase = liveStatus.streamPhase;
      }
    }
  }
  if (Array.isArray(liveStatus.streamTimeline)) {
    const incomingTimeline = liveStatus.streamTimeline;
    if (!inFlight || incomingTimeline.length > 0 || prevTimeline.length === 0) {
      next.streamTimeline = incomingTimeline;
    }
  }

  if (liveStatus.assistantMessage && typeof liveStatus.assistantMessage === "object") {
    const overlay = {
      streamText: next.streamText,
      streamPhase: next.streamPhase,
      streamTimeline: next.streamTimeline,
    };
    Object.assign(next, liveStatus.assistantMessage, overlay);
    const incomingTerminal =
      String(liveStatus.messageStatus ?? "").toLowerCase() === "completed" ||
      String(liveStatus.messageStatus ?? "").toLowerCase() === "failed" ||
      liveStatus.busy === false;
    // While still generating, keep ephemeral stream overlays and hide stub replies.
    // Once the turn terminalizes, keep the assistant reply (e.g. launchpad-plan fence).
    if (inFlight && !incomingTerminal) {
      delete next.reply;
      if (typeof next.streamText === "string" && !next.streamText.trim() && prevStreamText.trim()) {
        next.streamText = prevStreamText;
      }
      if (typeof next.streamPhase === "string" && !next.streamPhase.trim() && prevStreamPhase) {
        next.streamPhase = prevStreamPhase;
      }
      if (
        Array.isArray(next.streamTimeline) &&
        next.streamTimeline.length === 0 &&
        prevTimeline.length > 0
      ) {
        next.streamTimeline = prevTimeline;
      }
    }
  }
  return next;
}

/**
 * Apply live SSE status across message list.
 * @param {Array<object>} messages
 * @param {object | null | undefined} liveStatus
 */
export function applyDevChatLiveStatusToMessages(messages, liveStatus) {
  if (!Array.isArray(messages) || !liveStatus?.assistantMessageId) return messages;
  const mid = liveStatus.assistantMessageId;
  return messages.map((m) =>
    m?.id === mid ? mergeDevChatLiveStatusIntoMessage(m, liveStatus) : m,
  );
}

/** Remove ephemeral SSE overlay fields from a chat message clone. */
export function stripDevChatLiveOverlayFromMessage(message) {
  if (!message || typeof message !== "object") return message;
  const next = { ...message };
  delete next.streamText;
  delete next.streamPhase;
  delete next.streamTimeline;
  return next;
}

/**
 * Strip live stream overlay from one assistant message in a list.
 * @param {Array<object>} messages
 * @param {string | null | undefined} assistantMessageId
 */
export function stripDevChatLiveOverlayFromMessages(messages, assistantMessageId) {
  if (!Array.isArray(messages)) return messages;
  const mid = typeof assistantMessageId === "string" ? assistantMessageId.trim() : "";
  if (!mid) return messages;
  return messages.map((m) => (m?.id === mid ? stripDevChatLiveOverlayFromMessage(m) : m));
}

/** Strip stream overlay fields from every message (e.g. before a new turn starts). */
export function stripDevChatLiveOverlayFromAllMessages(messages) {
  if (!Array.isArray(messages)) return messages;
  return messages.map((m) => stripDevChatLiveOverlayFromMessage(m));
}

/** @param {number} ms */
export function sleepMs(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Empty live overlay for a newly started assistant turn (no prior stream cache).
 * @param {string | null | undefined} assistantMessageId
 */
export function buildFreshDevChatTurnLiveStatus(assistantMessageId) {
  const mid = typeof assistantMessageId === "string" ? assistantMessageId.trim() : "";
  if (!mid) return null;
  return {
    assistantMessageId: mid,
    busy: true,
    messageStatus: "pending",
    streamText: "",
    streamPhase: "",
    streamTimeline: [],
    aiSummary: null,
  };
}

/**
 * Drop cached stream fields from SSE status until the cloud agent is actively running.
 * Also strips a prior turn's terminal publish label even while RUNNING (follow-ups reuse
 * the same Cursor agent with stale target.publishStatus=succeeded).
 * Preserves Selecting-model / preparing progress while PENDING + busy.
 * @param {object | null | undefined} status
 */
export function sanitizeDevChatLiveStatusForTurnStart(status) {
  if (!status || typeof status !== "object") return status;
  const agentStatus = String(status.agentStatus ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
  const publishPhase = String(status.publishStep?.phase ?? "")
    .trim()
    .toLowerCase();
  const streamPhase = typeof status.streamPhase === "string" ? status.streamPhase.trim() : "";
  const aiSummary = typeof status.aiSummary === "string" ? status.aiSummary.trim() : "";
  const staleTerminalPublish =
    publishPhase === "succeeded" ||
    publishPhase === "skipped" ||
    /^published to github$/i.test(streamPhase);
  const isProgressPhase =
    /^selecting model/i.test(streamPhase) ||
    /^preparing cursor agent/i.test(streamPhase) ||
    /^planning/i.test(streamPhase) ||
    /^drafting a plan/i.test(streamPhase) ||
    (streamPhase.length > 0 && streamPhase.length <= 80 && streamPhase.endsWith("…"));

  if (agentStatus === "RUNNING") {
    if (!staleTerminalPublish) return status;
    return {
      ...status,
      streamPhase: /^published to github$/i.test(streamPhase) ? "" : status.streamPhase,
      publishStep:
        publishPhase === "succeeded" || publishPhase === "skipped" ? null : status.publishStep,
    };
  }

  // PENDING (or missing agentStatus while busy): keep a short progress phase so the UI does not
  // fall through to the default "Updating backend code…" for minutes without a model/label.
  if ((agentStatus === "PENDING" || !agentStatus) && (status.busy === true || isProgressPhase)) {
    const keptPhase = isProgressPhase
      ? status.streamPhase
      : /^planning/i.test(aiSummary) || /^drafting a plan/i.test(aiSummary)
        ? status.aiSummary
        : "Preparing Cursor agent…";
    const keptSummary =
      isProgressPhase ||
      /^selecting model/i.test(aiSummary) ||
      /^preparing cursor agent/i.test(aiSummary) ||
      /^planning/i.test(aiSummary) ||
      /^drafting a plan/i.test(aiSummary)
        ? status.aiSummary
        : keptPhase;
    return {
      ...status,
      agentStatus: agentStatus || "PENDING",
      streamText: "",
      streamTimeline: [],
      publishStep: staleTerminalPublish ? null : (status.publishStep ?? null),
      streamPhase: keptPhase,
      aiSummary: keptSummary,
    };
  }

  return {
    ...status,
    streamText: "",
    streamTimeline: [],
    streamPhase: "",
    publishStep: null,
    aiSummary: null,
  };
}
