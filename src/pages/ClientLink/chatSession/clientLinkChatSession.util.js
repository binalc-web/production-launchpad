/**
 * Client-link chat session state (pure). The server owns each turn's phase (keyed by the user
 * message id) and versions every change; the client only orders, merges, and renders.
 */

export const TURN_PHASE = Object.freeze({
  QUEUED: "queued",
  STARTING: "starting",
  RUNNING: "running",
  FINISHING: "finishing",
  DONE: "done",
  FAILED: "failed",
  STOPPED: "stopped",
});

const PHASE_RANK = {
  queued: 0,
  starting: 1,
  running: 2,
  finishing: 3,
  done: 4,
  failed: 4,
  stopped: 4,
};

/** Activity/stream key prefix for a scratch (first-revision) run that has no user message. */
export const RUN_KEY_PREFIX = "run:";

const IN_FLIGHT = new Set([TURN_PHASE.STARTING, TURN_PHASE.RUNNING, TURN_PHASE.FINISHING]);

/** @param {unknown} phase */
export function isTurnInFlight(phase) {
  return IN_FLIGHT.has(phase);
}

/** @param {unknown} phase */
export function isTurnTerminal(phase) {
  return phase === TURN_PHASE.DONE || phase === TURN_PHASE.FAILED || phase === TURN_PHASE.STOPPED;
}

function rank(phase) {
  return Object.prototype.hasOwnProperty.call(PHASE_RANK, phase) ? PHASE_RANK[phase] : -1;
}

/**
 * @param {unknown} raw
 * @returns {null | { messageId: number, phase: string|null, step: string|null, failureReason: string|null, mode: string|null, startedAt: string|null, endedAt: string|null, version: number }}
 */
export function normalizeTurn(raw) {
  if (!raw || typeof raw !== "object") return null;
  const messageId = Number(raw.messageId);
  if (!Number.isInteger(messageId) || messageId < 1) return null;
  const phase = typeof raw.phase === "string" && rank(raw.phase) >= 0 ? raw.phase : null;
  return {
    messageId,
    phase,
    step: typeof raw.step === "string" && raw.step.trim() ? raw.step.trim() : null,
    failureReason:
      typeof raw.failureReason === "string" && raw.failureReason.trim()
        ? raw.failureReason.trim()
        : null,
    mode: typeof raw.mode === "string" ? raw.mode : null,
    startedAt: typeof raw.startedAt === "string" ? raw.startedAt : null,
    endedAt: typeof raw.endedAt === "string" ? raw.endedAt : null,
    version: Number.isFinite(Number(raw.version)) ? Number(raw.version) : 0,
  };
}

/**
 * Server versions are monotonic per turn, so the higher version is always the truth (that also
 * covers legitimate resets like retry or re-queue). Equal versions prefer the further phase.
 */
export function mergeTurn(prev, next) {
  if (!next) return prev ?? null;
  if (!prev) return next;
  if (next.version > prev.version) return next;
  if (next.version === prev.version && rank(next.phase) >= rank(prev.phase)) return next;
  return prev;
}

function toMs(value) {
  const t = Date.parse(value);
  return Number.isFinite(t) ? t : 0;
}

/** Stable transcript order: server createdAt, then id. */
export function compareMessages(a, b) {
  const d = toMs(a?.createdAt) - toMs(b?.createdAt);
  if (d !== 0) return d;
  return (Number(a?.id) || 0) - (Number(b?.id) || 0);
}

/** Optimistic send timestamps come from a (offset-corrected) client clock; allow this much skew. */
export const PENDING_SEND_MATCH_SKEW_MS = 5000;
/** An id-less send the transcript never matched is dropped this long after it was created. */
export const PENDING_SEND_STALE_MS = 60_000;

function parseMsOrNull(value) {
  if (value == null || value === "") return null;
  const t = Date.parse(value);
  return Number.isFinite(t) ? t : null;
}

/**
 * Match optimistic sends to transcript user rows one-to-one. Sends that already know their
 * message id match by id; id-less sends match the earliest unclaimed user row with the same
 * trimmed text that was created no earlier than the send (minus a clock-skew allowance), so two
 * identical texts sent back to back still render as two rows.
 * @param {Array<{ clientId: string, messageId?: number | null, text?: string, createdAt?: string }>} pendingSends
 * @param {Array<{ id?: number, role?: string, text?: string, createdAt?: string }>} messages transcript rows
 * @param {number[]} [claimedIds] transcript row ids already consumed by sends that were dropped
 * @returns {Map<string, number>} clientId -> transcript row id for sends already in `messages`
 */
export function matchPendingSendsToTranscript(pendingSends, messages, claimedIds = []) {
  const matched = new Map();
  if (!Array.isArray(pendingSends) || pendingSends.length === 0) return matched;
  const rows = Array.isArray(messages) ? messages : [];
  const rowIds = new Set(rows.map((m) => Number(m?.id)).filter(Number.isInteger));
  const linkedIds = new Set(claimedIds.map(Number));
  for (const p of pendingSends) {
    if (p.messageId == null) continue;
    linkedIds.add(Number(p.messageId));
    if (rowIds.has(Number(p.messageId))) matched.set(p.clientId, Number(p.messageId));
  }
  const claimed = new Set();
  for (const p of pendingSends) {
    if (p.messageId != null) continue;
    const text = typeof p.text === "string" ? p.text.trim() : "";
    const sentAt = parseMsOrNull(p.createdAt);
    for (let i = 0; i < rows.length; i += 1) {
      const m = rows[i];
      if (claimed.has(i) || !m || m.role !== "user" || m.pending) continue;
      if (linkedIds.has(Number(m.id))) continue;
      if ((typeof m.text === "string" ? m.text.trim() : "") !== text) continue;
      const rowAt = parseMsOrNull(m.createdAt);
      if (sentAt != null && rowAt != null && rowAt < sentAt - PENDING_SEND_MATCH_SKEW_MS) continue;
      claimed.add(i);
      matched.set(p.clientId, Number(m.id));
      break;
    }
  }
  return matched;
}

/** Max entries kept per activity log (the backend caps at the same number). */
export const ACTIVITY_LOG_CAP = 200;

const ACTIVITY_KINDS = new Set(["step", "thinking", "tool_call", "assistant", "background"]);
const ACTIVITY_STATUSES = new Set(["running", "done", "failed"]);

/** Turn key for a chat turn (the user message id) or a scratch run (`run:<conversionId>`). */
export function turnKeyForMessage(messageId) {
  return messageId == null ? "" : String(messageId);
}

function normalizeActivityEntry(raw) {
  if (!raw || typeof raw !== "object") return null;
  const id = typeof raw.id === "string" ? raw.id : raw.id != null ? String(raw.id) : "";
  if (!id) return null;
  const seq = Number(raw.seq);
  const ts = Number(raw.ts);
  return {
    id,
    seq: Number.isFinite(seq) ? seq : 0,
    ts: Number.isFinite(ts) ? ts : 0,
    kind: ACTIVITY_KINDS.has(raw.kind) ? raw.kind : "step",
    label: typeof raw.label === "string" ? raw.label.slice(0, 200) : "",
    status: ACTIVITY_STATUSES.has(raw.status) ? raw.status : "done",
  };
}

function compareActivity(a, b) {
  if (a.seq !== b.seq) return a.seq - b.seq;
  if (a.ts !== b.ts) return a.ts - b.ts;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

function sameActivityEntry(a, b) {
  return (
    a.id === b.id &&
    a.seq === b.seq &&
    a.ts === b.ts &&
    a.kind === b.kind &&
    a.label === b.label &&
    a.status === b.status
  );
}

/**
 * Upsert activity entries by `id` into an existing log. Updates keep the entry's original `seq`
 * (order is stable), a finished entry never goes back to running, nothing is ever deleted except
 * the oldest non-running entries once the log passes {@link ACTIVITY_LOG_CAP}. Returns `existing`
 * (same reference) when nothing changed.
 * @param {Array<object> | null | undefined} existing
 * @param {Array<object> | null | undefined} incoming
 */
export function upsertActivity(existing, incoming) {
  const base = Array.isArray(existing) ? existing : [];
  if (!Array.isArray(incoming) || incoming.length === 0) return base;
  const byId = new Map(base.map((e) => [e.id, e]));
  let changed = false;
  for (const raw of incoming) {
    const entry = normalizeActivityEntry(raw);
    if (!entry) continue;
    const prev = byId.get(entry.id);
    if (!prev) {
      byId.set(entry.id, entry);
      changed = true;
      continue;
    }
    // A finished log never turns an entry back into running (stale/out-of-order delta).
    if (prev.status !== "running" && entry.status === "running") continue;
    const merged = { ...entry, seq: prev.seq };
    if (sameActivityEntry(prev, merged)) continue;
    byId.set(entry.id, merged);
    changed = true;
  }
  if (!changed) return base;
  let list = [...byId.values()].sort(compareActivity);
  if (list.length > ACTIVITY_LOG_CAP) {
    let drop = list.length - ACTIVITY_LOG_CAP;
    list = list.filter((e) => {
      if (drop > 0 && e.status !== "running") {
        drop -= 1;
        return false;
      }
      return true;
    });
  }
  return list;
}

function sameActivityLog(a, b) {
  if (a === b) return true;
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  return a.every((e, i) => sameActivityEntry(e, b[i]));
}

/** Step entries that mark an attempt as over (a restarted turn must not keep them). */
const TERMINAL_STEP_ENTRY_IDS = new Set(["step:failed", "step:stopped", "step:done"]);

/**
 * True when `incoming` (an accepted `starting` turn) restarts a turn whose log still holds the
 * previous attempt's terminal step. Conservative: a log without a terminal step (a turn that is
 * simply still running) is never dropped.
 */
function restartsFinishedLog(log, prevTurn, incoming) {
  if (!incoming || incoming.phase !== TURN_PHASE.STARTING) return false;
  if (!Array.isArray(log) || !log.some((e) => TERMINAL_STEP_ENTRY_IDS.has(e.id))) return false;
  if (prevTurn && isTurnTerminal(prevTurn.phase)) return true;
  const startedAt = parseMsOrNull(incoming.startedAt);
  return startedAt != null && startedAt > Math.max(...log.map((e) => e.ts));
}

/** Merge `{ [key]: entries }` into the activity map; same reference when unchanged. */
function mergeActivityMap(map, incoming) {
  if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) return map;
  let next = map;
  for (const [rawKey, entries] of Object.entries(incoming)) {
    const key = String(rawKey);
    if (!key) continue;
    const merged = upsertActivity(next[key], entries);
    if (merged === next[key] || (merged.length === 0 && !next[key])) continue;
    if (next === map) next = { ...map };
    next[key] = merged;
  }
  return next;
}

/**
 * @param {unknown} raw `{ key: "run:<id>", startedAt: ISO }` from chat-state / hello
 * @returns {null | { key: string, startedAt: string }}
 */
export function normalizeScratchRun(raw) {
  if (!raw || typeof raw !== "object") return null;
  const key = typeof raw.key === "string" ? raw.key.trim() : "";
  const startedAt = typeof raw.startedAt === "string" ? raw.startedAt : "";
  if (!key.startsWith(RUN_KEY_PREFIX) || !Number.isFinite(Date.parse(startedAt))) return null;
  return { key, startedAt };
}

/**
 * Server-clock start time (ms) of the scratch run behind `key`, or null when unknown.
 * @param {{ scratchRun?: { key: string, startedAt: string } | null }} state
 * @param {string | null | undefined} key
 */
export function selectScratchRunStartedAt(state, key) {
  const run = state?.scratchRun;
  if (!run || !key || run.key !== key) return null;
  const ms = Date.parse(run.startedAt);
  return Number.isFinite(ms) ? ms : null;
}

export const initialChatSessionState = Object.freeze({
  releaseId: null,
  messages: [],
  transcriptLoaded: false,
  turns: {},
  stream: null,
  activity: {},
  /** Server-owned start of the scratch run (`{ key, startedAt }`), so its timer survives reloads. */
  scratchRun: null,
  release: null,
  pendingSends: [],
  claimedMessageIds: [],
  notes: [],
  connection: "idle",
  transcriptRev: 0,
  /** Messages at or below this id belong to a chat that was archived (Start new chat). */
  supersededThroughMessageId: 0,
  /** Scratch run keys (`run:<id>`) cleared with that archive. */
  supersededRunKeys: [],
});

function supersededMessage(state, messageId) {
  const cutoff = Number(state?.supersededThroughMessageId) || 0;
  const id = Number(messageId);
  return cutoff > 0 && Number.isInteger(id) && id > 0 && id <= cutoff;
}

function supersededKey(state, key) {
  const k = key == null ? "" : String(key);
  if (!k) return false;
  if (Array.isArray(state?.supersededRunKeys) && state.supersededRunKeys.includes(k)) return true;
  if (/^[1-9]\d*$/.test(k)) return supersededMessage(state, Number(k));
  return false;
}

function mergeTurnList(turns, list) {
  let changed = false;
  const nextTurns = { ...turns };
  for (const raw of list) {
    const t = normalizeTurn(raw);
    if (!t) continue;
    const merged = mergeTurn(nextTurns[t.messageId], t);
    if (merged !== nextTurns[t.messageId]) {
      nextTurns[t.messageId] = merged;
      changed = true;
    }
  }
  return changed ? nextTurns : turns;
}

/** Stream for a chat turn is keyed by its user message id; a scratch run uses `run:<id>` (no message). */
export function normalizeStream(raw, receivedAt) {
  if (!raw || typeof raw !== "object") return null;
  const num = raw.messageId == null ? NaN : Number(raw.messageId);
  let messageId = Number.isInteger(num) && num >= 1 ? num : null;
  let key = typeof raw.key === "string" && raw.key.trim() ? raw.key.trim() : "";
  if (!key && messageId != null) key = String(messageId);
  if (!key) return null;
  if (messageId == null && /^[1-9]\d*$/.test(key)) messageId = Number(key);
  if (messageId == null && !key.startsWith(RUN_KEY_PREFIX)) return null;
  return {
    key,
    messageId,
    text: typeof raw.text === "string" ? raw.text : "",
    timeline: Array.isArray(raw.timeline) ? raw.timeline : [],
    label: typeof raw.label === "string" && raw.label.trim() ? raw.label.trim() : null,
    model: typeof raw.model === "string" && raw.model.trim() ? raw.model.trim() : null,
    ts: Number.isFinite(Number(raw.ts)) ? Number(raw.ts) : receivedAt,
  };
}

/** Stream for a turn that already ended (or a different, older turn) is ignored. */
function acceptStream(state, stream) {
  if (!stream) return state.stream;
  const turn = stream.messageId != null ? state.turns[stream.messageId] : null;
  if (turn && isTurnTerminal(turn.phase)) return state.stream;
  const cur = state.stream;
  if (cur && cur.key === stream.key && stream.ts < cur.ts) return cur;
  if (
    cur &&
    cur.key !== stream.key &&
    cur.messageId != null &&
    isTurnInFlight(state.turns[cur.messageId]?.phase)
  ) {
    return cur;
  }
  return stream;
}

/**
 * @param {typeof initialChatSessionState} state
 * @param {{ type: string } & Record<string, any>} action
 */
export function chatSessionReducer(state, action) {
  switch (action.type) {
    case "reset":
      return { ...initialChatSessionState, releaseId: action.releaseId ?? null };

    case "freshChat": {
      const requested = Number(action.throughMessageId);
      const cutoff =
        Number.isInteger(requested) && requested > state.supersededThroughMessageId
          ? requested
          : state.supersededThroughMessageId;
      const runKeys = new Set(state.supersededRunKeys);
      for (const key of Object.keys(state.activity)) {
        if (key.startsWith(RUN_KEY_PREFIX)) runKeys.add(key);
      }
      if (state.stream?.key?.startsWith(RUN_KEY_PREFIX)) runKeys.add(state.stream.key);
      if (state.scratchRun?.key) runKeys.add(state.scratchRun.key);
      return {
        ...initialChatSessionState,
        releaseId: state.releaseId,
        transcriptLoaded: true,
        connection: state.connection,
        transcriptRev: state.transcriptRev,
        release: state.release
          ? {
              ...state.release,
              busy: false,
              pendingMessageId: null,
              retryEligible: false,
              figmaConversionId: null,
            }
          : null,
        supersededThroughMessageId: cutoff,
        supersededRunKeys: [...runKeys],
      };
    }

    case "abandonFreshChat":
      return state.supersededThroughMessageId === 0 && state.supersededRunKeys.length === 0
        ? state
        : { ...state, supersededThroughMessageId: 0, supersededRunKeys: [] };

    case "transcript": {
      const messages = (Array.isArray(action.messages) ? action.messages : [])
        .filter((m) => !supersededMessage(state, m?.id))
        .filter(
          (m) =>
            m &&
            !(m.role === "user" && (m.queueStatus === "queued" || m.queueStatus === "dispatching")),
        )
        .slice()
        .sort(compareMessages);
      const ids = new Set(messages.map((m) => Number(m.id)).filter(Number.isInteger));
      let turns = mergeTurnList(state.turns, messages.map((m) => m?.turn).filter(Boolean));
      const matched = matchPendingSendsToTranscript(
        state.pendingSends,
        messages,
        state.claimedMessageIds,
      );
      // The reducer stays pure: without a caller-provided clock nothing expires (0 is never stale).
      const now = Number.isFinite(Number(action.now)) ? Number(action.now) : 0;
      const pendingSends = state.pendingSends.filter((p) => {
        if (matched.has(p.clientId)) return false;
        if (p.messageId != null && ids.has(Number(p.messageId))) return false;
        // An accepted id-less send the transcript never matched must not live forever.
        const sentAt = parseMsOrNull(p.createdAt);
        return !(
          p.status === "sent" &&
          p.messageId == null &&
          sentAt != null &&
          now - sentAt > PENDING_SEND_STALE_MS
        );
      });
      // Remember consumed rows so a later identical send cannot re-match the same transcript row.
      const claimed = [...matched.values()].filter(Number.isInteger);
      const claimedMessageIds = claimed.length
        ? [...new Set([...state.claimedMessageIds, ...claimed])]
        : state.claimedMessageIds;
      // Persisted logs (a reload after completion still has them): on a user row for a chat turn,
      // on the summary row for a scratch run (no user row; keyed `run:<conversionId>`).
      let activity = state.activity;
      for (const m of messages) {
        if (!Array.isArray(m.activity) || m.activity.length === 0) continue;
        const key =
          m.role === "user"
            ? turnKeyForMessage(m.id)
            : m.role === "system" && m.figmaConversionId != null
              ? `${RUN_KEY_PREFIX}${Number(m.figmaConversionId)}`
              : "";
        if (!key || supersededKey(state, key)) continue;
        activity = mergeActivityMap(activity, { [key]: m.activity });
      }
      let stream = state.stream;
      if (state.supersededThroughMessageId > 0) {
        const liveIds = new Set(ids);
        for (const p of pendingSends) {
          const id = Number(p?.messageId);
          if (Number.isInteger(id) && id > 0) liveIds.add(id);
        }
        const pruned = {};
        for (const [key, t] of Object.entries(turns)) {
          if (liveIds.has(Number(key))) pruned[key] = t;
        }
        turns = pruned;
        if (stream?.messageId != null && !liveIds.has(Number(stream.messageId))) stream = null;
        if (stream?.key && supersededKey(state, stream.key)) stream = null;
      }
      return {
        ...state,
        messages,
        transcriptLoaded: true,
        turns,
        stream,
        pendingSends,
        claimedMessageIds,
        activity,
      };
    }

    case "hello": {
      const turnList = (Array.isArray(action.turns) ? action.turns : []).filter(
        (t) => !supersededMessage(state, t?.messageId),
      );
      const turns = mergeTurnList(state.turns, turnList);
      const incomingActivity =
        action.activity && typeof action.activity === "object"
          ? Object.fromEntries(
              Object.entries(action.activity).filter(([key]) => !supersededKey(state, key)),
            )
          : action.activity;
      const incomingScratch = normalizeScratchRun(action.scratchRun);
      const next = {
        ...state,
        turns,
        release: action.release ?? state.release,
        connection: "live",
        activity: mergeActivityMap(state.activity, incomingActivity),
        scratchRun:
          incomingScratch && !supersededKey(state, incomingScratch.key)
            ? incomingScratch
            : state.scratchRun,
      };
      const rawStream = normalizeStream(action.stream, action.receivedAt ?? Date.now());
      const stream =
        rawStream &&
        !supersededMessage(state, rawStream.messageId) &&
        !supersededKey(state, rawStream.key)
          ? rawStream
          : null;
      return { ...next, stream: stream ? acceptStream(next, stream) : next.stream };
    }

    case "turn": {
      if (supersededMessage(state, action.turn?.messageId)) return state;
      const turns = mergeTurnList(state.turns, [action.turn]);
      if (turns === state.turns) return state;
      const t = normalizeTurn(action.turn);
      // A restarted turn (retry) must not show the previous attempt's output.
      const stream =
        state.stream &&
        t &&
        state.stream.messageId === t.messageId &&
        t.phase === TURN_PHASE.STARTING
          ? null
          : state.stream;
      // Defense in depth for a retry whose `reset` activity event was missed: drop the old log.
      const logKey = t ? turnKeyForMessage(t.messageId) : "";
      if (logKey && restartsFinishedLog(state.activity[logKey], state.turns[t.messageId], t)) {
        const activity = { ...state.activity };
        delete activity[logKey];
        return { ...state, turns, stream, activity };
      }
      return { ...state, turns, stream };
    }

    case "stream": {
      const normalized = normalizeStream(action.stream, action.receivedAt ?? Date.now());
      if (
        normalized &&
        (supersededMessage(state, normalized.messageId) || supersededKey(state, normalized.key))
      ) {
        return state;
      }
      const stream = acceptStream(state, normalized);
      return stream === state.stream ? state : { ...state, stream };
    }

    case "activity": {
      const key = action.key == null ? "" : String(action.key);
      if (!key || supersededKey(state, key)) return state;
      if (action.reset === true) {
        // Retry/restart: the server says the old log is void; replace it (no done->running guard).
        const replaced = upsertActivity([], action.entries);
        if (sameActivityLog(state.activity[key], replaced.length ? replaced : undefined)) {
          return state;
        }
        const activity = { ...state.activity };
        if (replaced.length) activity[key] = replaced;
        else delete activity[key];
        return { ...state, activity };
      }
      const activity = mergeActivityMap(state.activity, { [key]: action.entries });
      return activity === state.activity ? state : { ...state, activity };
    }

    case "release":
      return { ...state, release: action.release ?? null };

    case "transcriptChanged":
      return { ...state, transcriptRev: state.transcriptRev + 1 };

    case "connection":
      return state.connection === action.connection
        ? state
        : { ...state, connection: action.connection };

    case "sendStarted":
      return {
        ...state,
        notes: [],
        pendingSends: [...state.pendingSends, { ...action.send, status: "sending" }],
      };

    case "sendAccepted":
      // Queued sends live in the queue panel. Id-less accepted sends stay visible until the
      // transcript row they correspond to lands (matched in `transcript` / `selectThread`).
      if (action.queued) {
        return {
          ...state,
          pendingSends: state.pendingSends.filter((p) => p.clientId !== action.clientId),
        };
      }
      return {
        ...state,
        pendingSends: state.pendingSends.map((p) =>
          p.clientId === action.clientId
            ? { ...p, status: "sent", messageId: action.messageId ?? null }
            : p,
        ),
      };

    case "sendFailed":
      return {
        ...state,
        pendingSends: state.pendingSends.filter((p) => p.clientId !== action.clientId),
      };

    case "note": {
      const notes = state.notes.filter((n) => n.key !== action.note.key);
      return { ...state, notes: [...notes, action.note] };
    }

    case "clearNotes":
      return state.notes.length ? { ...state, notes: [] } : state;

    default:
      return state;
  }
}

/** Latest in-flight turn (one agent per release, so at most one should exist). */
export function selectActiveTurn(state) {
  let best = null;
  for (const t of Object.values(state.turns)) {
    if (!isTurnInFlight(t.phase)) continue;
    if (!best || t.messageId > best.messageId) best = t;
  }
  return best;
}

/** True when the transcript already holds the reply for this user message. */
export function hasReplyAfter(messages, messageId) {
  const idx = messages.findIndex((m) => Number(m.id) === Number(messageId));
  if (idx === -1) return false;
  for (let i = idx + 1; i < messages.length; i += 1) {
    const m = messages[i];
    if (m.role === "user") return false;
    if (m.role === "system" || m.role === "assistant") return true;
  }
  return false;
}

/**
 * Live output to render under a user message: shown while the turn is in flight and kept until
 * the persisted reply lands in the transcript, so the answer never blinks out in between.
 */
export function selectLiveStream(state) {
  const s = state.stream;
  if (!s || (!s.text.trim() && s.timeline.length === 0)) return null;
  if (s.messageId == null) {
    // Scratch run: no turn or user message. Live until its log reports nothing running.
    const entries = state.activity[s.key];
    if (entries?.length && !entries.some((e) => e.status === "running")) return null;
    return s;
  }
  const turn = state.turns[s.messageId];
  if (turn && (turn.phase === TURN_PHASE.FAILED || turn.phase === TURN_PHASE.STOPPED)) return null;
  if (hasReplyAfter(state.messages, s.messageId)) return null;
  return s;
}

const EMPTY_ACTIVITY = Object.freeze([]);

/** Accumulated activity log for a turn key (`String(messageId)` or `run:<conversionId>`). */
export function selectActivityForKey(state, key) {
  if (key == null) return EMPTY_ACTIVITY;
  return state.activity?.[String(key)] ?? EMPTY_ACTIVITY;
}

export function selectActivityForMessage(state, messageId) {
  return selectActivityForKey(state, turnKeyForMessage(messageId));
}

function lastRunning(entries) {
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    if (entries[i].status === "running") return entries[i];
  }
  return null;
}

/**
 * Key of the scratch run (`run:*`, no user message): the in-flight run stream, else the run log
 * with a running entry, else the most recent run log.
 */
export function selectScratchRunKey(state) {
  const streamKey = state.stream?.key;
  if (typeof streamKey === "string" && streamKey.startsWith(RUN_KEY_PREFIX)) return streamKey;
  let best = null;
  let bestRunning = false;
  let bestStamp = -Infinity;
  for (const [key, entries] of Object.entries(state.activity ?? {})) {
    if (!key.startsWith(RUN_KEY_PREFIX) || !entries.length) continue;
    const running = entries.some((e) => e.status === "running");
    const stamp = Math.max(...entries.map((e) => e.ts));
    if (
      best == null ||
      (running && !bestRunning) ||
      (running === bestRunning && stamp >= bestStamp)
    ) {
      best = key;
      bestRunning = running;
      bestStamp = stamp;
    }
  }
  return best;
}

/**
 * Render model for one turn's activity: ordered entries, the entry to highlight (latest running,
 * else the last one) and whether the turn is still running.
 * @param {object} state
 * @param {string | null} key turn key
 * @param {object | null} [turn] turn object for chat turns (absent for scratch runs)
 */
export function selectTurnActivityView(state, key, turn = null) {
  const entries = selectActivityForKey(state, key);
  const current = lastRunning(entries) ?? entries[entries.length - 1] ?? null;
  const running = turn ? isTurnInFlight(turn.phase) : entries.some((e) => e.status === "running");
  return { entries, current, running };
}

/**
 * Hide a persisted agent summary that repeats the previous one with no user message in between.
 * Older server builds could insert the same summary twice when two pollers finished a turn at
 * once; the rows are identical, so render only the first.
 * @param {Array<{ role?: string, text?: string, isPersistedAgentOutput?: boolean }>} messages
 */
export function dropDuplicateAgentOutputs(messages) {
  const list = Array.isArray(messages) ? messages : [];
  let prevText = null;
  let dropped = false;
  const out = [];
  for (const m of list) {
    if (m?.role === "user") prevText = null;
    if (m?.isPersistedAgentOutput && typeof m.text === "string") {
      const text = m.text.trim();
      if (text && prevText === text) {
        dropped = true;
        continue;
      }
      prevText = text;
    }
    out.push(m);
  }
  return dropped ? out : list;
}

/**
 * Ordered render list: transcript + optimistic sends + local notes, with the turn attached to
 * every user message.
 */
export function selectThread(state) {
  const items = dropDuplicateAgentOutputs(state.messages).map((m) =>
    m.role === "user" ? { ...m, turn: state.turns[Number(m.id)] ?? null } : m,
  );
  const matched = matchPendingSendsToTranscript(
    state.pendingSends,
    state.messages,
    state.claimedMessageIds,
  );
  for (const p of state.pendingSends) {
    if (matched.has(p.clientId)) continue;
    if (p.messageId != null && items.some((m) => Number(m.id) === Number(p.messageId))) continue;
    items.push({
      key: `pending:${p.clientId}`,
      messageId: p.messageId ?? null,
      role: "user",
      text: p.text,
      createdAt: p.createdAt,
      pending: true,
      attachmentPreviewUrls: p.attachmentPreviewUrls ?? [],
      jiraTicketLinks: p.jiraTicketLinks ?? [],
      turn: p.messageId != null ? (state.turns[Number(p.messageId)] ?? null) : null,
    });
  }
  for (const n of state.notes) {
    items.push({ key: `note:${n.key}`, role: "note", text: n.text, tone: n.tone ?? "info" });
  }
  return items;
}

const DEFAULT_STEP = {
  queued: "Queued",
  starting: "Starting agent…",
  running: "Agent is working…",
  finishing: "Finishing up…",
};

/**
 * One-line status for the active turn (live stream label wins while running). Without a turn
 * (scratch run) the status comes from the activity log: latest running entry, else the last one.
 * @param {object | null} turn
 * @param {object | null} stream
 * @param {Array<{ label: string, status: string }>} [entries]
 */
export function selectTurnStatusLabel(turn, stream, entries = EMPTY_ACTIVITY) {
  if (!turn) {
    const current = lastRunning(entries) ?? entries[entries.length - 1] ?? null;
    return current?.label || "";
  }
  if (turn.phase === TURN_PHASE.RUNNING && stream?.messageId === turn.messageId && stream.label) {
    return stream.label;
  }
  if (turn.phase === TURN_PHASE.STARTING) {
    // Before the agent runs the server reports each pre-agent step it is waiting on (Jira
    // context, reviewing / rewriting the request, picking a model, …); show the current one
    // instead of a generic "Starting agent…".
    const dispatch = lastRunningDispatchStep(entries);
    if (dispatch?.label) return dispatch.label;
  }
  return turn.step || DEFAULT_STEP[turn.phase] || "";
}

/** Id prefix of the server's pre-agent dispatch steps. */
export const DISPATCH_STEP_ID_PREFIX = "dispatch:";

/** Newest dispatch step that is still running, or null. */
function lastRunningDispatchStep(entries) {
  if (!Array.isArray(entries)) return null;
  for (let i = entries.length - 1; i >= 0; i--) {
    const e = entries[i];
    if (
      e?.status === "running" &&
      typeof e.id === "string" &&
      e.id.startsWith(DISPATCH_STEP_ID_PREFIX)
    ) {
      return e;
    }
  }
  return null;
}
