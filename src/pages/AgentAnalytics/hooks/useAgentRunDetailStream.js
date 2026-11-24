import { useCallback, useEffect, useReducer, useRef } from "react";
import { consumeProjectAgentAnalyticsRunStream } from "@/api";
import { mergeAgentAnalyticsRun, readAgentAnalyticsEventRun } from "../agentAnalyticsDisplay";

const RECONNECT_BASE_MS = 1_000;
const RECONNECT_MAX_MS = 15_000;

/** @returns {{ streamText: string, streamPhase: string, streamTimeline: object[], connected: boolean }} */
function emptyStreamState() {
  return { streamText: "", streamPhase: "", streamTimeline: [], connected: false };
}

/**
 * @param {object|null|undefined} run
 */
function streamFromRun(run, prev = emptyStreamState()) {
  if (!run || typeof run !== "object") return prev;
  const merged = mergeAgentAnalyticsRun(
    {
      streamText: prev.streamText,
      streamPhase: prev.streamPhase,
      streamTimeline: prev.streamTimeline,
    },
    run,
  );
  return {
    streamText: typeof merged?.streamText === "string" ? merged.streamText : prev.streamText,
    streamPhase: typeof merged?.streamPhase === "string" ? merged.streamPhase : prev.streamPhase,
    streamTimeline: Array.isArray(merged?.streamTimeline)
      ? merged.streamTimeline
      : prev.streamTimeline,
    connected: true,
  };
}

function reducer(state, action) {
  switch (action.type) {
    case "reset":
      return emptyStreamState();
    case "connected":
      return streamFromRun(action.run, state);
    case "run_event":
      return streamFromRun(action.run, state);
    default:
      return state;
  }
}

/**
 * Live SSE for one agent analytics run drawer.
 * @param {number|null|undefined} projectId
 * @param {string|null|undefined} agentId
 * @param {{ enabled?: boolean }} [opts]
 */
export function useAgentRunDetailStream(projectId, agentId, opts = {}) {
  const resolvedAgentId = String(agentId ?? "").trim();
  const enabled = opts.enabled !== false && Number(projectId) > 0 && resolvedAgentId.length > 0;
  const [state, dispatch] = useReducer(reducer, undefined, emptyStreamState);
  const abortRef = useRef(null);
  const attemptRef = useRef(0);
  const reconnectTimerRef = useRef(null);
  const prevAgentIdRef = useRef("");

  useEffect(() => {
    if (!enabled) {
      dispatch({ type: "reset" });
      return undefined;
    }

    let cancelled = false;
    const agentChanged = prevAgentIdRef.current !== resolvedAgentId;
    prevAgentIdRef.current = resolvedAgentId;
    if (agentChanged) dispatch({ type: "reset" });

    const clearReconnectTimer = () => {
      if (reconnectTimerRef.current != null) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    const scheduleReconnect = () => {
      if (cancelled) return;
      clearReconnectTimer();
      const attempt = attemptRef.current;
      const delay = Math.min(RECONNECT_MAX_MS, RECONNECT_BASE_MS * 2 ** attempt);
      attemptRef.current = attempt + 1;
      reconnectTimerRef.current = setTimeout(() => {
        if (!cancelled) connect();
      }, delay);
    };

    const connect = () => {
      if (cancelled) return;
      clearReconnectTimer();
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      void consumeProjectAgentAnalyticsRunStream(projectId, resolvedAgentId, {
        signal: controller.signal,
        onEvent: (evt) => {
          if (cancelled || !evt?.type) return;
          const run = readAgentAnalyticsEventRun(evt);
          const runId = String(run?.cursorAgentId ?? "").trim();
          if (runId && runId !== resolvedAgentId) return;
          if (evt.type === "connected" || evt.type === "run_snapshot") {
            attemptRef.current = 0;
            dispatch({ type: "connected", run });
            return;
          }
          if (
            evt.type === "run_registered" ||
            evt.type === "run_update" ||
            evt.type === "run_terminal"
          ) {
            dispatch({ type: "run_event", run });
          }
        },
      })
        .then(() => {
          if (cancelled || controller.signal.aborted) return;
          scheduleReconnect();
        })
        .catch((err) => {
          if (cancelled || controller.signal.aborted || err?.name === "AbortError") return;
          if (err?.status === 404 || err?.status === 403) return;
          scheduleReconnect();
        });
    };

    attemptRef.current = 0;
    connect();

    return () => {
      cancelled = true;
      clearReconnectTimer();
      abortRef.current?.abort();
    };
  }, [enabled, projectId, resolvedAgentId]);

  const hasLiveStream = useCallback(() => {
    return (
      Boolean(state.streamText.trim()) ||
      Boolean(state.streamPhase.trim()) ||
      state.streamTimeline.length > 0
    );
  }, [state.streamPhase, state.streamText, state.streamTimeline.length]);

  return {
    ...state,
    hasLiveStream: hasLiveStream(),
  };
}
