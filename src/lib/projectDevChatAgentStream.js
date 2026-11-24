import {
  consumeBackendCodeChatAgentStream,
  consumeCloudDebugChatAgentStream,
  consumeInfraAnalysisChatAgentStream,
} from "@/api";
import { statusFromDevChatStreamEvent } from "@/pages/Project/ProjectDetails/chat/projectDevChatStream.util";
import { isAbortError } from "@/lib/abortError.util";

function reconnectDelayMs(attempt) {
  return Math.min(30_000, 1000 * Math.min(attempt, 6));
}

function abortableSleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const id = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(id);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

function shouldIgnoreStreamEvent(evt) {
  return evt?.type === "heartbeat";
}

/** @typedef {"backend-code"|"infra-analysis"|"cloud-debug"} ProjectDevChatKind */

/**
 * @param {ProjectDevChatKind} chatKind
 * @param {number} projectId
 */
function consumeStreamForKind(chatKind, projectId) {
  if (chatKind === "infra-analysis") {
    return (handlers) => consumeInfraAnalysisChatAgentStream(projectId, handlers);
  }
  if (chatKind === "cloud-debug") {
    return (handlers) => consumeCloudDebugChatAgentStream(projectId, handlers);
  }
  return (handlers) => consumeBackendCodeChatAgentStream(projectId, handlers);
}

/**
 * Watch SSE agent-events for backend code or infra analysis chat.
 * @param {{
 *   projectId: number,
 *   chatKind: ProjectDevChatKind,
 *   sessionId?: string|null,
 *   onStatus?: (status: object, evt: object) => void | Promise<void>,
 *   signal?: AbortSignal,
 * }} opts
 */
export async function watchProjectDevChatAgentStream({
  projectId,
  chatKind,
  sessionId = null,
  onStatus,
  signal,
}) {
  const pid = Number(projectId);
  if (!Number.isInteger(pid) || pid < 1) return;

  const connect = consumeStreamForKind(chatKind, pid);
  let reconnectAttempt = 0;
  const sid = typeof sessionId === "string" && sessionId.trim() ? sessionId.trim() : undefined;

  while (!signal?.aborted) {
    try {
      const terminalEvt = await connect({
        signal,
        sessionId: sid,
        onEvent: async (evt) => {
          if (signal?.aborted) return true;
          if (shouldIgnoreStreamEvent(evt)) return false;
          // Ignore status events for other parallel sessions when we scoped the stream.
          const st = statusFromDevChatStreamEvent(evt);
          if (st && sid && st.sessionId && String(st.sessionId) !== sid) {
            return false;
          }
          if (st) {
            await onStatus?.(st, evt);
          }
          return evt?.type === "terminal";
        },
      });
      if (signal?.aborted) return;
      // A terminal event ends this SSE connection. Reconnect so the next turn still gets live updates
      // (Plan MCQ → draft plan is two turns; exiting here left the UI stuck on Planning until reload).
      if (terminalEvt?.type === "terminal") {
        reconnectAttempt = 0;
        continue;
      }
      // Stream ended without terminal (proxy drop) — reconnect with backoff.
      reconnectAttempt += 1;
      await abortableSleep(reconnectDelayMs(reconnectAttempt), signal);
    } catch (err) {
      if (isAbortError(err) || signal?.aborted) return;
      reconnectAttempt += 1;
      try {
        await abortableSleep(reconnectDelayMs(reconnectAttempt), signal);
      } catch (sleepErr) {
        if (isAbortError(sleepErr) || signal?.aborted) return;
        return;
      }
    }
  }
}

export { statusFromDevChatStreamEvent };
