import { writeLastProjectId } from "./lastProject.js";

export const ASSISTANT_STREAMING_ID = "assistant-streaming";

/** SSE events that tell the user what happened to their prompt. */
export function isAssistantReplyEvent(evt) {
  return (
    evt?.type === "assistant_message" ||
    evt?.type === "confirmation_required" ||
    evt?.type === "error"
  );
}

/** True when the transcript ends on a user prompt with no assistant answer after it. */
export function isAssistantReplyMissing(messages) {
  const last = Array.isArray(messages) ? messages[messages.length - 1] : null;
  return !last || last.role === "user";
}

/**
 * Apply one /chat SSE event to AiHome state setters.
 */
export function applyAssistantEvent(evt, { setMessages, setPending, setThread, setLiveTools }) {
  if (!evt || typeof evt !== "object") return;
  if (evt.type === "user_message" && evt.message) {
    setMessages((prev) => [
      ...prev.filter((m) => !m.optimistic && m.id !== evt.message.id),
      evt.message,
    ]);
  }
  if (evt.type === "assistant_delta" && typeof evt.content === "string" && evt.content) {
    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.id === ASSISTANT_STREAMING_ID);
      if (idx < 0) {
        return [
          ...prev,
          {
            id: ASSISTANT_STREAMING_ID,
            role: "assistant",
            content: evt.content,
            streaming: true,
          },
        ];
      }
      const next = [...prev];
      next[idx] = {
        ...next[idx],
        content: `${next[idx].content || ""}${evt.content}`,
      };
      return next;
    });
  }
  if (evt.type === "assistant_message" && evt.message) {
    setMessages((prev) => [
      ...prev.filter((m) => m.id !== evt.message.id && m.id !== ASSISTANT_STREAMING_ID),
      evt.message,
    ]);
    setLiveTools([]);
  }
  if (evt.type === "tool_call") {
    setLiveTools((prev) => [
      ...prev.filter((t) => t.name !== evt.name || t.status !== "running"),
      { name: evt.name, arguments: evt.arguments, status: "running" },
    ]);
  }
  if (evt.type === "tool_result") {
    setLiveTools((prev) =>
      prev.map((t) =>
        t.name === evt.name && t.status === "running"
          ? { ...t, status: evt.isError ? "failed" : "done", preview: evt.preview }
          : t,
      ),
    );
  }
  if (evt.type === "confirmation_required") {
    setPending(evt.pending || []);
  }
  if (evt.type === "project_bound" && evt.projectId) {
    writeLastProjectId(evt.projectId);
  }
  if (evt.type === "goal_updated" && evt.thread) {
    setThread(evt.thread);
  }
  if (evt.type === "done" && evt.thread) {
    setThread(evt.thread);
    setPending(evt.thread.pendingConfirmation?.pendingTools || null);
  }
  if (evt.type === "error") {
    setMessages((prev) => [
      ...prev.filter((m) => m.id !== ASSISTANT_STREAMING_ID),
      {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: evt.error || "Something went wrong.",
      },
    ]);
  }
}
