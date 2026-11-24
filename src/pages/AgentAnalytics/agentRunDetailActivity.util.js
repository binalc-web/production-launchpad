/**
 * Activity for the Agent Analytics drawer: prefer live SSE, then GET detail,
 * then Cursor conversation (SSE bootstrap does not persist timelines).
 *
 * @param {boolean} _isActive
 * @param {object|null|undefined} detail
 * @param {{ streamText?: string, streamPhase?: string|null, streamTimeline?: object[] }|null|undefined} selectedStream
 * @returns {{ streamText: string, streamPhase: string, streamTimeline: object[] }}
 */

function activityFromConversation(conversation) {
  const messages = Array.isArray(conversation?.messages)
    ? conversation.messages
    : Array.isArray(conversation)
      ? conversation
      : [];
  const streamTimeline = [];
  const texts = [];
  messages.forEach((m, i) => {
    const type = String(m?.type ?? "").trim();
    const text = typeof m?.text === "string" ? m.text.trim() : "";
    if (!text) return;
    if (type !== "assistant_message" && type !== "assistant") return;
    streamTimeline.push({
      id: typeof m.id === "string" && m.id.trim() ? m.id : `asst-${i}`,
      type: "assistant",
      text,
    });
    texts.push(text);
  });
  return { streamText: texts.join("\n\n"), streamTimeline };
}

function hasActivityStream(text, timeline, phase) {
  return (
    (Array.isArray(timeline) && timeline.length > 0) ||
    Boolean(String(text ?? "").trim()) ||
    Boolean(String(phase ?? "").trim())
  );
}

export function resolveAgentRunDetailActivityStream(_isActive, detail, selectedStream) {
  const liveText = typeof selectedStream?.streamText === "string" ? selectedStream.streamText : "";
  const livePhase =
    typeof selectedStream?.streamPhase === "string" ? selectedStream.streamPhase : "";
  const liveTimeline = Array.isArray(selectedStream?.streamTimeline)
    ? selectedStream.streamTimeline
    : [];
  if (hasActivityStream(liveText, liveTimeline, livePhase)) {
    return {
      streamText: liveText,
      streamPhase: livePhase,
      streamTimeline: liveTimeline,
    };
  }

  const detailText = typeof detail?.streamText === "string" ? detail.streamText : "";
  const detailPhase = typeof detail?.streamPhase === "string" ? detail.streamPhase : "";
  const detailTimeline = Array.isArray(detail?.streamTimeline) ? detail.streamTimeline : [];
  if (hasActivityStream(detailText, detailTimeline, detailPhase)) {
    return {
      streamText: detailText,
      streamPhase: detailPhase,
      streamTimeline: detailTimeline,
    };
  }

  const fromConv = activityFromConversation(detail?.conversation);
  return {
    streamText: fromConv.streamText,
    streamPhase: "",
    streamTimeline: fromConv.streamTimeline,
  };
}
