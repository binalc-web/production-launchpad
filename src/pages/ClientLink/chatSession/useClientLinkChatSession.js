import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import {
  clientLinkFetchChatMessages,
  clientLinkFetchChatState,
  openClientLinkChatEventStream,
} from "@/api";
import { mapClientLinkChatRow } from "@/pages/ClientLink/chat/clientLinkChatMessages.util";
import { isWaitingQueuedChatStatus, isQueuedChatSendResult } from "@/lib/chatMessageQueue.util";
import {
  TURN_PHASE,
  chatSessionReducer,
  initialChatSessionState,
  isTurnInFlight,
  isTurnTerminal,
  selectActiveTurn,
  selectActivityForMessage,
  selectLiveStream,
  selectScratchRunKey,
  selectThread,
  selectTurnActivityView,
  selectTurnStatusLabel,
  selectScratchRunStartedAt,
} from "./clientLinkChatSession.util.js";

const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 15_000;
const FALLBACK_POLL_MS = 5000;

function reconnectDelay(attempt) {
  return Math.min(RECONNECT_MAX_MS, RECONNECT_BASE_MS * 2 ** Math.max(0, attempt - 1));
}

function sleep(ms, signal) {
  return new Promise((resolve) => {
    const id = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(id);
        resolve();
      },
      { once: true },
    );
  });
}

function mapTranscriptRows(rows) {
  return (Array.isArray(rows) ? rows : [])
    .filter((row) => !isWaitingQueuedChatStatus(row?.queueStatus))
    .map((row) => ({ ...mapClientLinkChatRow(row), turn: row.turn ?? null }));
}

/**
 * Single source of truth for the client-link chat: transcript + per-turn server state over one
 * SSE connection.
 * @param {{
 *   projectSlug: string,
 *   releaseId: number | null,
 *   clientEmail: string | null,
 *   enabled: boolean,
 *   onTranscriptMeta?: (data: object) => void,
 *   onTurnFinishing?: (turn: object) => void,
 *   onTurnEnded?: (turn: object) => void,
 * }} params
 */
export function useClientLinkChatSession({
  projectSlug,
  releaseId,
  clientEmail,
  enabled,
  onTranscriptMeta,
  onTurnFinishing,
  onTurnEnded,
}) {
  const slug = typeof projectSlug === "string" ? projectSlug.trim() : "";
  const rid = releaseId != null && Number.isInteger(Number(releaseId)) ? Number(releaseId) : null;
  const active = Boolean(enabled && slug && rid != null && clientEmail);

  const [state, dispatch] = useReducer(chatSessionReducer, initialChatSessionState);
  const callbacksRef = useRef({ onTranscriptMeta, onTurnFinishing, onTurnEnded });
  callbacksRef.current = { onTranscriptMeta, onTurnFinishing, onTurnEnded };
  const clockOffsetRef = useRef(0);

  useEffect(() => {
    dispatch({ type: "reset", releaseId: rid });
  }, [slug, rid]);

  const transcriptSeqRef = useRef(0);
  const transcriptInFlightRef = useRef(null);
  const transcriptDirtyRef = useRef(false);

  const refreshTranscript = useCallback(async () => {
    if (!slug || rid == null) return [];
    if (transcriptInFlightRef.current) {
      transcriptDirtyRef.current = true;
      return transcriptInFlightRef.current;
    }
    const run = async () => {
      let rows = [];
      do {
        transcriptDirtyRef.current = false;
        const seq = ++transcriptSeqRef.current;
        const data = await clientLinkFetchChatMessages(slug, rid, clientEmail);
        if (seq !== transcriptSeqRef.current) continue;
        rows = mapTranscriptRows(data?.messages);
        dispatch({
          type: "transcript",
          messages: rows,
          now: Date.now() + clockOffsetRef.current,
        });
        callbacksRef.current.onTranscriptMeta?.(data ?? {});
      } while (transcriptDirtyRef.current);
      return rows;
    };
    const promise = run().finally(() => {
      transcriptInFlightRef.current = null;
    });
    transcriptInFlightRef.current = promise;
    return promise;
  }, [slug, rid, clientEmail]);

  const refreshTranscriptRef = useRef(refreshTranscript);
  refreshTranscriptRef.current = refreshTranscript;

  // Initial transcript + refetch when the server says it changed.
  useEffect(() => {
    if (!active) return;
    void refreshTranscriptRef.current().catch(() => {});
  }, [active, slug, rid, state.transcriptRev]);

  // One SSE connection per release; HTTP snapshot fallback while it is down.
  useEffect(() => {
    if (!active) return undefined;
    const abort = new AbortController();
    const { signal } = abort;
    let attempt = 0;

    const applyEvent = (evt) => {
      if (!evt || typeof evt !== "object") return;
      const receivedAt = Number.isFinite(Number(evt.ts)) ? Number(evt.ts) : Date.now();
      switch (evt.type) {
        case "hello":
          attempt = 0;
          if (Number.isFinite(Number(evt.serverTime))) {
            clockOffsetRef.current = Number(evt.serverTime) - Date.now();
          }
          dispatch({
            type: "hello",
            turns: evt.turns,
            release: evt.release,
            stream: evt.stream,
            activity: evt.activity,
            scratchRun: evt.scratchRun,
            receivedAt,
          });
          void refreshTranscriptRef.current().catch(() => {});
          break;
        case "turn":
          dispatch({ type: "turn", turn: evt.turn });
          break;
        case "stream":
          dispatch({ type: "stream", stream: evt.stream, receivedAt });
          break;
        case "activity":
          dispatch({
            type: "activity",
            key: evt.key,
            entries: evt.entries,
            reset: evt.reset === true,
          });
          break;
        case "transcript":
          dispatch({ type: "transcriptChanged" });
          break;
        case "chatReset":
          dispatch({
            type: "freshChat",
            throughMessageId: Number(evt.throughMessageId) || 0,
          });
          break;
        case "release":
          dispatch({ type: "release", release: evt.release });
          break;
        default:
          break;
      }
    };

    const pollFallback = async () => {
      try {
        const snap = await clientLinkFetchChatState(slug, rid, clientEmail);
        if (signal.aborted) return;
        dispatch({
          type: "hello",
          turns: snap?.turns,
          release: snap?.release,
          stream: snap?.stream,
          activity: snap?.activity,
          scratchRun: snap?.scratchRun,
          receivedAt: Date.now(),
        });
        dispatch({ type: "connection", connection: "reconnecting" });
      } catch {
        /* keep last known state */
      }
    };

    (async () => {
      while (!signal.aborted) {
        dispatch({ type: "connection", connection: attempt === 0 ? "connecting" : "reconnecting" });
        try {
          await openClientLinkChatEventStream(slug, rid, {
            signal,
            clientEmail,
            onEvent: applyEvent,
          });
        } catch (err) {
          if (signal.aborted) return;
          if (err?.status === 401 || err?.status === 403 || err?.status === 404) {
            dispatch({ type: "connection", connection: "offline" });
            return;
          }
        }
        if (signal.aborted) return;
        attempt += 1;
        if (attempt >= 2) await pollFallback();
        await sleep(reconnectDelay(attempt), signal);
      }
    })();

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      void refreshTranscriptRef.current().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      abort.abort();
      document.removeEventListener("visibilitychange", onVisible);
      dispatch({ type: "connection", connection: "idle" });
    };
  }, [active, slug, rid, clientEmail]);

  // While disconnected for a while, keep the status honest with a slow snapshot poll.
  useEffect(() => {
    if (!active || state.connection !== "reconnecting") return undefined;
    const id = setInterval(async () => {
      try {
        const snap = await clientLinkFetchChatState(slug, rid, clientEmail);
        dispatch({
          type: "hello",
          turns: snap?.turns,
          release: snap?.release,
          stream: snap?.stream,
          activity: snap?.activity,
          scratchRun: snap?.scratchRun,
          receivedAt: Date.now(),
        });
        dispatch({ type: "connection", connection: "reconnecting" });
      } catch {
        /* ignore */
      }
    }, FALLBACK_POLL_MS);
    return () => clearInterval(id);
  }, [active, state.connection, slug, rid, clientEmail]);

  // Turn transitions observed live: refetch the transcript and notify the panel.
  const prevPhasesRef = useRef(new Map());
  useEffect(() => {
    const prev = prevPhasesRef.current;
    const next = new Map();
    let needsTranscript = false;
    for (const turn of Object.values(state.turns)) {
      next.set(turn.messageId, turn.phase);
      const before = prev.get(turn.messageId);
      if (before === undefined || before === turn.phase) continue;
      if (
        turn.phase === TURN_PHASE.FINISHING ||
        isTurnTerminal(turn.phase) ||
        before === TURN_PHASE.QUEUED
      ) {
        needsTranscript = true;
      }
      if (turn.phase === TURN_PHASE.FINISHING && isTurnInFlight(before)) {
        callbacksRef.current.onTurnFinishing?.(turn);
      }
      if (isTurnTerminal(turn.phase) && isTurnInFlight(before)) {
        callbacksRef.current.onTurnEnded?.(turn);
      }
    }
    prevPhasesRef.current = next;
    if (needsTranscript) void refreshTranscriptRef.current().catch(() => {});
  }, [state.turns]);

  const submit = useCallback(async ({ optimistic = null, request }) => {
    const clientId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    if (optimistic) {
      dispatch({
        type: "sendStarted",
        send: {
          clientId,
          createdAt: new Date(Date.now() + clockOffsetRef.current).toISOString(),
          ...optimistic,
        },
      });
    } else {
      dispatch({ type: "clearNotes" });
    }
    try {
      const result = await request();
      const messageId = Number(result?.userMessageId);
      dispatch({
        type: "sendAccepted",
        clientId,
        messageId: Number.isInteger(messageId) && messageId > 0 ? messageId : null,
        queued: isQueuedChatSendResult(result),
      });
      void refreshTranscriptRef.current().catch(() => {});
      return result;
    } catch (err) {
      dispatch({ type: "sendFailed", clientId });
      void refreshTranscriptRef.current().catch(() => {});
      throw err;
    }
  }, []);

  const addNote = useCallback((key, text, tone = "info") => {
    dispatch({ type: "note", note: { key, text, tone } });
  }, []);

  const clearNotes = useCallback(() => dispatch({ type: "clearNotes" }), []);

  const startFreshChat = useCallback((throughMessageId) => {
    dispatch({ type: "freshChat", throughMessageId: Number(throughMessageId) || 0 });
  }, []);

  const abandonFreshChat = useCallback(() => dispatch({ type: "abandonFreshChat" }), []);

  const activeTurn = useMemo(() => selectActiveTurn(state), [state]);
  const liveStream = useMemo(() => selectLiveStream(state), [state]);
  const thread = useMemo(() => selectThread(state), [state]);
  const scratchRunKey = useMemo(() => selectScratchRunKey(state), [state]);
  const statusLabel = useMemo(() => {
    if (activeTurn) {
      return selectTurnStatusLabel(
        activeTurn,
        state.stream,
        selectActivityForMessage(state, activeTurn.messageId),
      );
    }
    // Scratch run (no turn): the label comes from its log, only while that run is still going.
    const scratch = scratchRunKey ? selectTurnActivityView(state, scratchRunKey, null) : null;
    return selectTurnStatusLabel(
      null,
      state.stream,
      scratch?.running ? scratch.entries : undefined,
    );
  }, [activeTurn, scratchRunKey, state]);
  const activeTurnStartedAtMs = useMemo(() => {
    const t = activeTurn?.startedAt ? Date.parse(activeTurn.startedAt) : NaN;
    return Number.isFinite(t) ? t - clockOffsetRef.current : null;
  }, [activeTurn?.startedAt]);

  /** Scratch run start on this device's clock (the server owns the real start time). */
  const scratchRunStartedAtMs = useMemo(() => {
    const t = selectScratchRunStartedAt(state, scratchRunKey);
    return t != null ? t - clockOffsetRef.current : null;
  }, [state, scratchRunKey]);

  return {
    state,
    thread,
    messages: state.messages,
    transcriptLoaded: state.transcriptLoaded,
    activeTurn,
    activeTurnStartedAtMs,
    scratchRunStartedAtMs,
    liveStream,
    statusLabel,
    scratchRunKey,
    release: state.release,
    connection: state.connection,
    refreshTranscript,
    submit,
    addNote,
    clearNotes,
    startFreshChat,
    abandonFreshChat,
  };
}
