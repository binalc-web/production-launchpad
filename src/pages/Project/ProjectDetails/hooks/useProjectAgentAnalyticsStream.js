import { useCallback, useEffect, useReducer, useRef } from "react";
import { consumeProjectAgentAnalyticsStream } from "@/api";
import {
  isAgentRunActive,
  mergeAgentAnalyticsRun,
  readAgentAnalyticsEventRun,
} from "@/pages/AgentAnalytics/agentAnalyticsDisplay";

const RECONNECT_BASE_MS = 1_000;
const RECONNECT_MAX_MS = 15_000;

/** @returns {{ streamText: string, streamPhase: string, streamTimeline: object[] }} */
function emptyStreamState() {
  return { streamText: "", streamPhase: "", streamTimeline: [] };
}

/**
 * @param {object[]} runs
 */
function countActiveRuns(runs) {
  return runs.filter((run) => isAgentRunActive(run)).length;
}

/**
 * Roll up token totals from completed runs only.
 * @param {object[]} runs
 */
function rollupTotalsFromRuns(runs) {
  const totals = {
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    totalTokens: 0,
  };
  for (const run of runs) {
    const usage = run?.usageTotals;
    if (!usage || typeof usage !== "object") continue;
    totals.inputTokens += Number(usage.inputTokens ?? usage.input_tokens ?? 0) || 0;
    totals.outputTokens += Number(usage.outputTokens ?? usage.output_tokens ?? 0) || 0;
    totals.cacheReadTokens += Number(usage.cacheReadTokens ?? usage.cache_read_tokens ?? 0) || 0;
    totals.cacheWriteTokens += Number(usage.cacheWriteTokens ?? usage.cache_write_tokens ?? 0) || 0;
    const rowTotal = Number(usage.totalTokens ?? usage.total_tokens ?? 0);
    if (rowTotal > 0) {
      totals.totalTokens += rowTotal;
    } else {
      totals.totalTokens +=
        (Number(usage.inputTokens ?? usage.input_tokens ?? 0) || 0) +
        (Number(usage.outputTokens ?? usage.output_tokens ?? 0) || 0);
    }
  }
  return totals;
}

/**
 * @param {object|null|undefined} run
 */
function normalizeRunRow(run) {
  if (!run || typeof run !== "object") return null;
  const cursorAgentId = typeof run.cursorAgentId === "string" ? run.cursorAgentId.trim() : "";
  if (!cursorAgentId) return null;
  /** @type {Record<string, unknown>} */
  const next = {
    ...run,
    cursorAgentId,
    streamText: typeof run.streamText === "string" ? run.streamText : "",
    streamPhase: typeof run.streamPhase === "string" ? run.streamPhase : "",
    streamTimeline: Array.isArray(run.streamTimeline) ? run.streamTimeline : [],
    usageTotals: run.usageTotals ?? null,
    cliDurationMs: run.cliDurationMs ?? null,
  };
  // Empty status strings must not clobber a prior terminal / live status on merge.
  if (!String(next.agentStatus ?? "").trim()) delete next.agentStatus;
  if (!String(next.statusHint ?? "").trim()) delete next.statusHint;
  return next;
}

/**
 * @param {object} state
 * @param {object} run
 */
function upsertRun(state, run) {
  const normalized = normalizeRunRow(run);
  if (!normalized) return state;
  const runs = [...state.runs];
  const idx = runs.findIndex((r) => r.cursorAgentId === normalized.cursorAgentId);
  if (idx >= 0) {
    runs[idx] = mergeAgentAnalyticsRun(runs[idx], normalized);
  } else {
    runs.unshift(normalized);
  }
  return {
    ...state,
    runs,
    activeCount: countActiveRuns(runs),
    totals: rollupTotalsFromRuns(runs),
  };
}

function projectAgentAnalyticsReducer(state, action) {
  switch (action.type) {
    case "bootstrap_status":
      return {
        ...state,
        bootstrapStatus: {
          phase: action.phase ?? "",
          message: action.message ?? "",
          progress: action.progress ?? null,
        },
        streamError: null,
      };
    case "connected": {
      const incoming = Array.isArray(action.runs)
        ? action.runs.map(normalizeRunRow).filter(Boolean)
        : [];
      if (incoming.length === 0 && state.runs.length > 0) {
        return {
          ...state,
          connected: true,
          bootstrapStatus: null,
          streamError: null,
        };
      }
      const existingById = new Map(state.runs.map((row) => [row.cursorAgentId, row]));
      const runs = incoming.map((row) =>
        mergeAgentAnalyticsRun(existingById.get(row.cursorAgentId), row),
      );
      return {
        connected: true,
        bootstrapStatus: null,
        streamError: null,
        activeCount: countActiveRuns(runs),
        totals: action.totals ?? rollupTotalsFromRuns(runs),
        runs,
      };
    }
    case "stream_error":
      return {
        ...state,
        connected: false,
        streamError: action.message || "Live updates disconnected. Reconnecting…",
      };
    case "run_snapshot":
    case "run_registered":
    case "run_update":
    case "run_terminal":
      return upsertRun(state, action.run);
    case "totals_update":
      return {
        ...state,
        activeCount: Number(action.activeCount) || countActiveRuns(state.runs),
        totals: action.totals ?? state.totals,
      };
    default:
      return state;
  }
}

const initialState = {
  connected: false,
  bootstrapStatus: null,
  streamError: null,
  activeCount: 0,
  totals: {
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    totalTokens: 0,
  },
  runs: [],
};

/**
 * Admin-only SSE hook for project-wide agent analytics.
 * @param {number|null|undefined} projectId
 * @param {{ enabled?: boolean }} [opts]
 */
export function useProjectAgentAnalyticsStream(projectId, opts = {}) {
  const enabled = opts.enabled === true && Number(projectId) > 0;
  const [state, dispatch] = useReducer(projectAgentAnalyticsReducer, initialState);
  const abortRef = useRef(null);
  const attemptRef = useRef(0);
  const reconnectTimerRef = useRef(null);

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;

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

      void consumeProjectAgentAnalyticsStream(projectId, {
        signal: controller.signal,
        onEvent: (evt) => {
          if (cancelled || !evt?.type) return;
          if (evt.type === "bootstrap_status") {
            dispatch({
              type: "bootstrap_status",
              phase: evt.phase,
              message: evt.message,
              progress: evt.progress,
            });
            return;
          }
          if (evt.type === "connected") {
            attemptRef.current = 0;
            dispatch({
              type: "connected",
              runs: evt.runs,
              activeCount: evt.activeCount,
              totals: evt.totals,
            });
            return;
          }
          if (
            evt.type === "run_snapshot" ||
            evt.type === "run_registered" ||
            evt.type === "run_update" ||
            evt.type === "run_terminal"
          ) {
            dispatch({ type: evt.type, run: readAgentAnalyticsEventRun(evt) });
            return;
          }
          if (evt.type === "totals_update") {
            dispatch({
              type: "totals_update",
              totals: evt.totals,
              activeCount: evt.activeCount,
            });
          }
        },
      })
        .then(() => {
          if (cancelled || controller.signal.aborted) return;
          dispatch({
            type: "stream_error",
            message: "Live updates disconnected. Reconnecting…",
          });
          scheduleReconnect();
        })
        .catch((err) => {
          if (cancelled || controller.signal.aborted || err?.name === "AbortError") return;
          dispatch({
            type: "stream_error",
            message: err?.message || "Live updates disconnected. Reconnecting…",
          });
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
  }, [enabled, projectId]);

  const getRunStream = useCallback(
    (agentId) => {
      const id = String(agentId ?? "").trim();
      const run = state.runs.find((r) => r.cursorAgentId === id);
      if (!run) return emptyStreamState();
      return {
        streamText: run.streamText ?? "",
        streamPhase: run.streamPhase ?? "",
        streamTimeline: run.streamTimeline ?? [],
      };
    },
    [state.runs],
  );

  return {
    ...state,
    getRunStream,
  };
}
