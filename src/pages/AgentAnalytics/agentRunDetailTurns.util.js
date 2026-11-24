/**
 * Multi-turn Agent Analytics detail: conversation + usage invocations + stream archives.
 * Mirrors backend/src/utils/projectAgentAnalyticsTurns.util.js for client fallback.
 */

/**
 * @param {object|null|undefined} usageTotals
 */
function readUsageTokenFields(usageTotals) {
  if (!usageTotals || typeof usageTotals !== "object") {
    return {
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    };
  }
  return {
    inputTokens: Number(usageTotals.inputTokens ?? usageTotals.input_tokens ?? 0) || 0,
    outputTokens: Number(usageTotals.outputTokens ?? usageTotals.output_tokens ?? 0) || 0,
    cacheReadTokens: Number(usageTotals.cacheReadTokens ?? usageTotals.cache_read_tokens ?? 0) || 0,
    cacheWriteTokens:
      Number(usageTotals.cacheWriteTokens ?? usageTotals.cache_write_tokens ?? 0) || 0,
  };
}

/**
 * @param {object[]|null|undefined} invocations
 */
function sumDurationMs(invocations) {
  if (!Array.isArray(invocations) || invocations.length === 0) return null;
  let total = 0;
  let has = false;
  for (const row of invocations) {
    const ms = Number(row?.durationMs ?? row?.duration_ms ?? 0);
    if (Number.isFinite(ms) && ms > 0) {
      total += ms;
      has = true;
    }
  }
  return has ? total : null;
}

/**
 * @param {unknown} conversation
 */
export function splitConversationIntoTurns(conversation) {
  const messages = Array.isArray(conversation?.messages)
    ? conversation.messages
    : Array.isArray(conversation)
      ? conversation
      : [];

  const turns = [];
  let current = null;

  messages.forEach((m) => {
    const type = String(m?.type ?? "").trim();
    const text = typeof m?.text === "string" ? m.text.trim() : "";
    if (!text) return;

    if (type === "user_message" || type === "user") {
      if (current) {
        turns.push({
          prompt: current.prompt,
          assistantText: current.assistantParts.join("\n\n").trim(),
        });
      }
      current = { prompt: text, assistantParts: [] };
      return;
    }

    if (type === "assistant_message" || type === "assistant") {
      if (!current) current = { prompt: "", assistantParts: [text] };
      else current.assistantParts.push(text);
    }
  });

  if (current) {
    turns.push({
      prompt: current.prompt,
      assistantText: current.assistantParts.join("\n\n").trim(),
    });
  }
  return turns;
}

/**
 * @param {object[]|null|undefined} invocations
 */
export function groupInvocationsByTurn(invocations) {
  const list = Array.isArray(invocations) ? invocations : [];
  if (list.length === 0) return [];

  const groups = [];
  let current = [];
  const phaseOf = (inv) =>
    String(inv?.runPhase ?? inv?.run_phase ?? "")
      .trim()
      .toLowerCase();
  const currentIsFollowup = () => current.length > 0 && phaseOf(current[0]) === "followup";

  for (const inv of list) {
    const phase = phaseOf(inv);
    if (phase === "followup") {
      if (current.length > 0) {
        groups.push(current);
        current = [];
      }
      current.push(inv);
      continue;
    }
    if (currentIsFollowup()) {
      groups.push(current);
      current = [];
    }
    current.push(inv);
  }
  if (current.length > 0) groups.push(current);
  return groups;
}

function normalizeTimeline(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item) => {
    if (!item || typeof item !== "object") return false;
    const type = item.type;
    return type === "thinking" || type === "tool_call" || type === "assistant" || type === "result";
  });
}

function assistantFromTimeline(items) {
  const texts = [];
  for (const item of normalizeTimeline(items)) {
    if (item.type === "assistant" && typeof item.text === "string" && item.text.trim()) {
      texts.push(item.text.trim());
    }
  }
  return texts.join("\n\n");
}

function usageFromInvocations(invocations) {
  const list = Array.isArray(invocations) ? invocations : [];
  let inputTokens = 0;
  let outputTokens = 0;
  let cacheReadTokens = 0;
  let cacheWriteTokens = 0;
  for (const inv of list) {
    const fields = readUsageTokenFields(inv);
    inputTokens += fields.inputTokens;
    outputTokens += fields.outputTokens;
    cacheReadTokens += fields.cacheReadTokens;
    cacheWriteTokens += fields.cacheWriteTokens;
  }
  return {
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheWriteTokens,
    durationMs: sumDurationMs(list),
  };
}

/**
 * Prefer server `detail.turns`; otherwise build from conversation + invocations + archives.
 *
 * @param {object|null|undefined} detail
 * @param {{ streamText?: string, streamPhase?: string, streamTimeline?: object[] }|null|undefined} selectedStream
 * @param {boolean} isActive
 * @returns {object[]}
 */
export function resolveAgentRunDetailTurns(detail, selectedStream, isActive) {
  const serverTurns = Array.isArray(detail?.turns) ? detail.turns : [];
  if (serverTurns.length > 0) {
    const liveTimeline = Array.isArray(selectedStream?.streamTimeline)
      ? selectedStream.streamTimeline
      : [];
    if (!isActive || liveTimeline.length === 0) return serverTurns;
    return serverTurns.map((turn, i) => {
      if (i !== serverTurns.length - 1) return turn;
      return {
        ...turn,
        streamTimeline: liveTimeline,
        assistantText:
          assistantFromTimeline(liveTimeline) ||
          (typeof selectedStream?.streamText === "string" ? selectedStream.streamText : "") ||
          turn.assistantText,
      };
    });
  }

  const convTurns = splitConversationIntoTurns(detail?.conversation);
  const invocationGroups = groupInvocationsByTurn(
    detail?.usage?.invocations ?? detail?.run?.usageInvocations,
  );
  const archives = Array.isArray(detail?.streamArchives) ? detail.streamArchives : [];
  const liveTimeline = Array.isArray(selectedStream?.streamTimeline)
    ? selectedStream.streamTimeline
    : [];
  const detailTimeline = Array.isArray(detail?.streamTimeline) ? detail.streamTimeline : [];
  const currentTimeline = liveTimeline.length > 0 ? liveTimeline : detailTimeline;

  const turnCount = Math.max(
    convTurns.length,
    invocationGroups.length,
    archives.length + (currentTimeline.length > 0 ? 1 : 0),
  );
  if (turnCount === 0) return [];

  const turns = [];
  for (let i = 0; i < turnCount; i += 1) {
    const conv = convTurns[i] || { prompt: "", assistantText: "" };
    const invGroup = invocationGroups[i] || [];
    const archive = archives.find((a) => a.turnIndex === i) || archives[i] || null;
    const isLatest = i === turnCount - 1;
    let streamTimeline = [];
    if (isLatest && currentTimeline.length > 0) streamTimeline = normalizeTimeline(currentTimeline);
    else if (archive?.items?.length) streamTimeline = normalizeTimeline(archive.items);

    const fromTimeline = assistantFromTimeline(streamTimeline);
    const assistantText =
      fromTimeline ||
      (isLatest && typeof selectedStream?.streamText === "string"
        ? selectedStream.streamText.trim()
        : "") ||
      conv.assistantText ||
      "";
    const usage = usageFromInvocations(invGroup);
    if (
      !conv.prompt &&
      !assistantText &&
      streamTimeline.length === 0 &&
      !usage.inputTokens &&
      !usage.outputTokens
    ) {
      continue;
    }
    turns.push({
      index: i,
      kind: i === 0 ? "original" : "followup",
      prompt: conv.prompt,
      assistantText,
      streamTimeline,
      usage,
      runPhase: i === 0 ? "launch" : "followup",
    });
  }
  return turns.map((t, index) => ({
    ...t,
    index,
    kind: index === 0 ? "original" : "followup",
  }));
}

/**
 * @param {object} turn
 * @returns {string}
 */
export function agentRunTurnLabel(turn) {
  if (turn?.kind === "original" || turn?.index === 0) return "Original";
  const n = Number(turn?.index) || 1;
  return `Follow-up ${n}`;
}
