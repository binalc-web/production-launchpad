import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import {
  consumeProjectCollaborationStream,
  fetchProjectCollaborationTimeline,
  sendProjectPresenceHeartbeat,
} from "@/api";

const HEARTBEAT_MS = 25_000;
const MAX_EVENTS = 300;

const initialState = {
  connected: false,
  events: [],
  nextCursor: null,
  presence: { humans: [], agents: [], counts: { humans: 0, agents: 0, total: 0 } },
  conflicts: [],
};

function dedupePrepend(events, incoming) {
  if (events.some((e) => e.id === incoming.id)) return events;
  const next = [incoming, ...events];
  return next.length > MAX_EVENTS ? next.slice(0, MAX_EVENTS) : next;
}

function reducer(state, action) {
  switch (action.type) {
    case "connected":
      return {
        ...state,
        connected: true,
        events: Array.isArray(action.timeline?.events) ? action.timeline.events : [],
        nextCursor: action.timeline?.nextCursor ?? null,
        presence: action.presence ?? state.presence,
        conflicts: Array.isArray(action.conflicts) ? action.conflicts : [],
      };
    case "activity":
      return { ...state, events: dedupePrepend(state.events, action.event) };
    case "presence":
      return { ...state, presence: action.presence ?? state.presence };
    case "conflict":
      return { ...state, conflicts: Array.isArray(action.conflicts) ? action.conflicts : [] };
    case "append_page":
      return {
        ...state,
        events: [...state.events, ...action.events],
        nextCursor: action.nextCursor ?? null,
      };
    default:
      return state;
  }
}

/**
 * Live collaboration stream: activity timeline, presence, and conflicts.
 * Also emits a presence heartbeat while active so others can see this user.
 * @param {number|null|undefined} projectId
 * @param {{ enabled?: boolean, section?: string }} [opts]
 */
export function useProjectCollaborationStream(projectId, opts = {}) {
  const enabled = opts.enabled !== false && Number(projectId) > 0;
  const [state, dispatch] = useReducer(reducer, initialState);
  const [loadingMore, setLoadingMore] = useState(false);
  const sectionRef = useRef(opts.section ?? "collaboration");
  sectionRef.current = opts.section ?? "collaboration";

  useEffect(() => {
    if (!enabled) return undefined;
    const controller = new AbortController();
    let cancelled = false;

    void consumeProjectCollaborationStream(projectId, {
      signal: controller.signal,
      onEvent: (evt) => {
        if (cancelled || !evt?.type) return;
        if (evt.type === "connected") {
          dispatch({
            type: "connected",
            timeline: evt.timeline,
            presence: evt.presence,
            conflicts: evt.conflicts,
          });
        } else if (evt.type === "activity") {
          dispatch({ type: "activity", event: evt.event });
        } else if (evt.type === "presence") {
          dispatch({ type: "presence", presence: evt.presence });
        } else if (evt.type === "conflict") {
          dispatch({ type: "conflict", conflicts: evt.conflicts });
        }
      },
    }).catch(() => {
      /* stream ended or denied */
    });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [enabled, projectId]);

  useEffect(() => {
    if (!enabled) return undefined;
    let stopped = false;
    const ping = () => {
      if (stopped) return;
      sendProjectPresenceHeartbeat(projectId, sectionRef.current).catch(() => {});
    };
    ping();
    const id = setInterval(ping, HEARTBEAT_MS);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [enabled, projectId]);

  const loadMore = useCallback(async () => {
    if (!state.nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetchProjectCollaborationTimeline(projectId, {
        before: state.nextCursor,
        limit: 30,
      });
      dispatch({
        type: "append_page",
        events: res?.data?.events ?? [],
        nextCursor: res?.data?.nextCursor ?? null,
      });
    } catch {
      /* ignore */
    } finally {
      setLoadingMore(false);
    }
  }, [projectId, state.nextCursor, loadingMore]);

  return { ...state, loadMore, loadingMore, hasMore: Boolean(state.nextCursor) };
}
