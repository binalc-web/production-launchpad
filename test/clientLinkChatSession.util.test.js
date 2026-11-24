import test from "node:test";
import assert from "node:assert/strict";
import {
  chatSessionReducer as reduce,
  initialChatSessionState,
  mergeTurn,
  normalizeTurn,
  normalizeScratchRun,
  selectScratchRunStartedAt,
  ACTIVITY_LOG_CAP,
  normalizeStream,
  selectActiveTurn,
  selectActivityForKey,
  selectActivityForMessage,
  selectLiveStream,
  selectScratchRunKey,
  dropDuplicateAgentOutputs,
  selectThread,
  selectTurnActivityView,
  selectTurnStatusLabel,
  upsertActivity,
} from "../src/pages/ClientLink/chatSession/clientLinkChatSession.util.js";

const turn = (messageId, phase, version, extra = {}) => ({ messageId, phase, version, ...extra });

test("mergeTurn keeps the higher version and ignores stale events", () => {
  const running = normalizeTurn(turn(1, "running", 20));
  const staleStarting = normalizeTurn(turn(1, "starting", 10));
  const done = normalizeTurn(turn(1, "done", 30));
  assert.equal(mergeTurn(running, staleStarting), running);
  assert.equal(mergeTurn(running, done), done);
  assert.equal(mergeTurn(done, running), done);
  const retry = normalizeTurn(turn(1, "starting", 40));
  assert.equal(mergeTurn(done, retry), retry);
});

test("out-of-order turn events never move status backwards", () => {
  let s = reduce(initialChatSessionState, { type: "turn", turn: turn(5, "finishing", 300) });
  s = reduce(s, { type: "turn", turn: turn(5, "running", 200) });
  assert.equal(s.turns[5].phase, "finishing");
  s = reduce(s, { type: "turn", turn: turn(5, "done", 400) });
  assert.equal(selectActiveTurn(s), null);
});

test("transcript is sorted by createdAt then id and hides queued rows", () => {
  const s = reduce(initialChatSessionState, {
    type: "transcript",
    messages: [
      { id: 3, role: "system", text: "reply", createdAt: "2026-01-01T00:00:02Z" },
      {
        id: 1,
        role: "user",
        text: "a",
        createdAt: "2026-01-01T00:00:01Z",
        turn: turn(1, "done", 5),
      },
      { id: 2, role: "user", text: "q", createdAt: "2026-01-01T00:00:01Z", queueStatus: "queued" },
    ],
  });
  assert.deepEqual(
    s.messages.map((m) => m.id),
    [1, 3],
  );
  assert.equal(s.turns[1].phase, "done");
});

test("stream for a finished turn is dropped; live stream stays until the reply is persisted", () => {
  let s = reduce(initialChatSessionState, { type: "turn", turn: turn(7, "running", 1) });
  s = reduce(s, {
    type: "stream",
    stream: { messageId: 7, text: "hello", timeline: [] },
    receivedAt: 10,
  });
  assert.equal(selectLiveStream(s)?.text, "hello");
  s = reduce(s, {
    type: "stream",
    stream: { messageId: 7, text: "old", timeline: [] },
    receivedAt: 5,
  });
  assert.equal(s.stream.text, "hello");
  s = reduce(s, { type: "turn", turn: turn(7, "done", 2) });
  s = reduce(s, {
    type: "transcript",
    messages: [{ id: 7, role: "user", text: "x", createdAt: "2026-01-01T00:00:01Z" }],
  });
  assert.equal(selectLiveStream(s)?.text, "hello", "kept until reply lands");
  s = reduce(s, {
    type: "transcript",
    messages: [
      { id: 7, role: "user", text: "x", createdAt: "2026-01-01T00:00:01Z" },
      { id: 8, role: "system", text: "answer", createdAt: "2026-01-01T00:00:02Z" },
    ],
  });
  assert.equal(selectLiveStream(s), null);
  s = reduce(s, {
    type: "stream",
    stream: { messageId: 7, text: "late", timeline: [] },
    receivedAt: 99,
  });
  assert.equal(s.stream.text, "hello", "late stream after done is ignored");
});

test("optimistic send is replaced once the transcript contains it", () => {
  let s = reduce(initialChatSessionState, {
    type: "sendStarted",
    send: { clientId: "c1", text: "hi", createdAt: "2026-01-01T00:00:05Z" },
  });
  assert.equal(selectThread(s).at(-1).pending, true);
  s = reduce(s, { type: "sendAccepted", clientId: "c1", messageId: 11, queued: false });
  s = reduce(s, {
    type: "transcript",
    messages: [{ id: 11, role: "user", text: "hi", createdAt: "2026-01-01T00:00:05Z" }],
  });
  assert.equal(s.pendingSends.length, 0);
  assert.equal(selectThread(s).length, 1);
});

const userRows = (thread, text) => thread.filter((m) => m.role === "user" && m.text === text);

test("transcript landing before sendAccepted shows exactly one user row", () => {
  let s = reduce(initialChatSessionState, {
    type: "sendStarted",
    send: { clientId: "a1", text: "hello", createdAt: "2026-01-01T00:00:05Z" },
  });
  s = reduce(s, {
    type: "transcript",
    messages: [{ id: 21, role: "user", text: "hello", createdAt: "2026-01-01T00:00:06Z" }],
  });
  assert.equal(userRows(selectThread(s), "hello").length, 1);
  s = reduce(s, { type: "sendAccepted", clientId: "a1", messageId: 21, queued: false });
  assert.equal(userRows(selectThread(s), "hello").length, 1);
  assert.equal(s.pendingSends.length, 0);
});

test("id-less sendAccepted keeps the pending row until the transcript row lands", () => {
  let s = reduce(initialChatSessionState, {
    type: "sendStarted",
    send: { clientId: "b1", text: "hello", createdAt: "2026-01-01T00:00:05Z" },
  });
  s = reduce(s, { type: "sendAccepted", clientId: "b1", messageId: null, queued: false });
  assert.equal(s.pendingSends.length, 1);
  assert.equal(s.pendingSends[0].status, "sent");
  assert.equal(userRows(selectThread(s), "hello").length, 1);
  s = reduce(s, {
    type: "transcript",
    messages: [{ id: 31, role: "user", text: " hello ", createdAt: "2026-01-01T00:00:06Z" }],
  });
  assert.equal(s.pendingSends.length, 0);
  assert.equal(selectThread(s).filter((m) => m.role === "user").length, 1);
});

test("a row created well before the send does not match; small clock skew does", () => {
  let s = reduce(initialChatSessionState, {
    type: "sendStarted",
    send: { clientId: "k1", text: "again", createdAt: "2026-01-01T00:01:00Z" },
  });
  s = reduce(s, {
    type: "transcript",
    messages: [{ id: 1, role: "user", text: "again", createdAt: "2026-01-01T00:00:00Z" }],
  });
  assert.equal(userRows(selectThread(s), "again").length, 2);
  s = reduce(s, {
    type: "transcript",
    messages: [
      { id: 1, role: "user", text: "again", createdAt: "2026-01-01T00:00:00Z" },
      { id: 2, role: "user", text: "again", createdAt: "2026-01-01T00:00:58Z" },
    ],
  });
  assert.equal(s.pendingSends.length, 0, "row 2 is within the 5s skew allowance");
  assert.equal(userRows(selectThread(s), "again").length, 2);
});

test("two identical texts sent back to back render as two rows", () => {
  let s = reduce(initialChatSessionState, {
    type: "sendStarted",
    send: { clientId: "d1", text: "same", createdAt: "2026-01-01T00:00:05Z" },
  });
  s = reduce(s, {
    type: "sendStarted",
    send: { clientId: "d2", text: "same", createdAt: "2026-01-01T00:00:06Z" },
  });
  assert.equal(userRows(selectThread(s), "same").length, 2);
  s = reduce(s, {
    type: "transcript",
    messages: [{ id: 41, role: "user", text: "same", createdAt: "2026-01-01T00:00:05Z" }],
  });
  assert.equal(userRows(selectThread(s), "same").length, 2, "one landed + one pending");
  assert.equal(s.pendingSends.length, 1);
  assert.equal(s.pendingSends[0].clientId, "d2");
  s = reduce(s, {
    type: "transcript",
    messages: [
      { id: 41, role: "user", text: "same", createdAt: "2026-01-01T00:00:05Z" },
      { id: 42, role: "user", text: "same", createdAt: "2026-01-01T00:00:06Z" },
    ],
  });
  assert.equal(s.pendingSends.length, 0);
  assert.equal(userRows(selectThread(s), "same").length, 2);
});

test("an id-less accepted send is dropped after 60s without a transcript match", () => {
  let s = reduce(initialChatSessionState, {
    type: "sendStarted",
    send: { clientId: "e1", text: "ghost", createdAt: "2026-01-01T00:00:00Z" },
  });
  s = reduce(s, { type: "sendAccepted", clientId: "e1", messageId: null, queued: false });
  s = reduce(s, {
    type: "transcript",
    messages: [],
    now: Date.parse("2026-01-01T00:00:30Z"),
  });
  assert.equal(s.pendingSends.length, 1);
  s = reduce(s, {
    type: "transcript",
    messages: [],
    now: Date.parse("2026-01-01T00:01:05Z"),
  });
  assert.equal(s.pendingSends.length, 0);
});

test("transcript dispatching user rows are not rendered in the thread", () => {
  const s = reduce(initialChatSessionState, {
    type: "transcript",
    messages: [
      { id: 1, role: "user", text: "running", createdAt: "2026-01-01T00:00:01Z" },
      {
        id: 2,
        role: "user",
        text: "sending",
        createdAt: "2026-01-01T00:00:02Z",
        queueStatus: "dispatching",
      },
    ],
  });
  assert.deepEqual(
    selectThread(s).map((m) => m.id),
    [1],
  );
});

test("queued send leaves the transcript; status label prefers live stream label while running", () => {
  let s = reduce(initialChatSessionState, {
    type: "sendStarted",
    send: { clientId: "c2", text: "later", createdAt: "2026-01-01T00:00:05Z" },
  });
  s = reduce(s, { type: "sendAccepted", clientId: "c2", messageId: 12, queued: true });
  assert.equal(s.pendingSends.length, 0);
  const running = normalizeTurn(turn(4, "running", 1, { step: "Agent is working…" }));
  assert.equal(
    selectTurnStatusLabel(running, { messageId: 4, label: "Editing App.jsx" }),
    "Editing App.jsx",
  );
  assert.equal(selectTurnStatusLabel(running, null), "Agent is working…");
});

const entry = (id, seq, status = "running", extra = {}) => ({
  id,
  seq,
  ts: 1000 + seq,
  kind: "step",
  label: `label ${id}`,
  status,
  ...extra,
});

test("upsertActivity upserts by id, keeps original order and updates status", () => {
  let log = upsertActivity([], [entry("a", 1), entry("b", 2)]);
  assert.deepEqual(
    log.map((e) => e.id),
    ["a", "b"],
  );
  // Updates keep their original seq; even a delta that carries a newer seq keeps the order.
  log = upsertActivity(log, [entry("a", 9, "done", { label: "A done" })]);
  assert.deepEqual(
    log.map((e) => [e.id, e.seq, e.status, e.label]),
    [
      ["a", 1, "done", "A done"],
      ["b", 2, "running", "label b"],
    ],
  );
  // A re-delivered identical delta is a no-op (same reference).
  assert.equal(upsertActivity(log, [entry("b", 2)]), log);
});

test("upsertActivity orders by seq, then ts, then id and never reverts done to running", () => {
  const log = upsertActivity(
    [],
    [
      { ...entry("z", 5), ts: 10 },
      { ...entry("b", 5), ts: 20 },
      { ...entry("a", 5), ts: 20 },
      entry("first", 1),
    ],
  );
  assert.deepEqual(
    log.map((e) => e.id),
    ["first", "z", "a", "b"],
  );
  const finished = upsertActivity(log, [entry("a", 5, "done")]);
  const stale = upsertActivity(finished, [entry("a", 5, "running")]);
  assert.equal(stale, finished);
  assert.equal(stale.find((e) => e.id === "a").status, "done");
});

test("upsertActivity cap keeps the newest entries and never drops running ones", () => {
  const many = Array.from({ length: ACTIVITY_LOG_CAP + 20 }, (_, i) =>
    entry(`e${i}`, i, i === 0 ? "running" : "done"),
  );
  const log = upsertActivity([], many);
  assert.equal(log.length, ACTIVITY_LOG_CAP);
  assert.equal(log[0].id, "e0", "oldest running entry is kept");
  assert.equal(log.at(-1).id, `e${ACTIVITY_LOG_CAP + 19}`);
  assert.equal(
    log.some((e) => e.id === "e1"),
    false,
  );
});

test("a stream event does not erase accumulated activity", () => {
  let s = reduce(initialChatSessionState, { type: "turn", turn: turn(7, "running", 1) });
  s = reduce(s, { type: "activity", key: "7", entries: [entry("s1", 1, "done"), entry("s2", 2)] });
  s = reduce(s, {
    type: "stream",
    stream: { key: "7", messageId: 7, text: "hello", timeline: [], label: "Agent is working…" },
  });
  s = reduce(s, { type: "activity", key: "7", entries: [entry("s2", 2, "done"), entry("s3", 3)] });
  s = reduce(s, {
    type: "stream",
    stream: { key: "7", messageId: 7, text: "hello world", timeline: [] },
    receivedAt: Date.now() + 10,
  });
  assert.deepEqual(
    selectActivityForMessage(s, 7).map((e) => [e.id, e.status]),
    [
      ["s1", "done"],
      ["s2", "done"],
      ["s3", "running"],
    ],
  );
  assert.equal(selectLiveStream(s).text, "hello world");
});

test("hello activity merge on reconnect never deletes existing entries", () => {
  let s = reduce(initialChatSessionState, {
    type: "activity",
    key: "7",
    entries: [entry("a", 1, "done"), entry("b", 2), entry("c", 3)],
  });
  s = reduce(s, {
    type: "hello",
    turns: [turn(7, "running", 2)],
    activity: { 7: [entry("b", 2, "done")], 8: [entry("x", 1)] },
  });
  assert.deepEqual(
    selectActivityForKey(s, "7").map((e) => [e.id, e.status]),
    [
      ["a", "done"],
      ["b", "done"],
      ["c", "running"],
    ],
  );
  assert.equal(selectActivityForKey(s, "8").length, 1);
  // hello without activity (older server) keeps everything.
  const s2 = reduce(s, { type: "hello", turns: [] });
  assert.equal(s2.activity, s.activity);
  assert.deepEqual(reduce(s, { type: "reset", releaseId: 1 }).activity, {});
});

test("transcript merges persisted activity from user rows only", () => {
  const rows = [
    {
      id: 4,
      role: "user",
      text: "do it",
      createdAt: "2026-01-01T00:00:01Z",
      activity: [entry("a", 1, "done"), entry("b", 2, "failed")],
    },
    {
      id: 5,
      role: "system",
      text: "reply",
      createdAt: "2026-01-01T00:00:02Z",
      activity: [entry("n", 1)],
    },
  ];
  let s = reduce(initialChatSessionState, { type: "transcript", messages: rows });
  assert.deepEqual(
    selectActivityForMessage(s, 4).map((e) => e.status),
    ["done", "failed"],
  );
  assert.equal(selectActivityForMessage(s, 5).length, 0);
  // live entries the client already has are kept and upserted, not replaced
  s = reduce(s, { type: "activity", key: "4", entries: [entry("c", 3)] });
  s = reduce(s, { type: "transcript", messages: rows });
  assert.deepEqual(
    selectActivityForMessage(s, 4).map((e) => e.id),
    ["a", "b", "c"],
  );
});

test("transcript restores a scratch run's activity from its summary row (survives a restart)", () => {
  const rows = [
    {
      id: 9,
      role: "system",
      mode: "agent",
      figmaConversionId: 193,
      text: "Agent output\n\nDone.",
      createdAt: "2026-01-01T00:00:05Z",
      activity: [entry("r1", 1, "done"), entry("r2", 2, "done")],
    },
  ];
  const s = reduce(initialChatSessionState, { type: "transcript", messages: rows });
  assert.deepEqual(
    selectActivityForKey(s, "run:193").map((e) => e.id),
    ["r1", "r2"],
  );
  assert.equal(selectScratchRunKey(s), "run:193");
});

test("starting turn: the status line shows the current pre-agent dispatch step", () => {
  const starting = normalizeTurn(turn(4, "starting", 1, { step: "Starting agent…" }));
  const entries = [
    entry("step:starting", 1, "running", { kind: "step", label: "Starting agent…" }),
    entry("dispatch:jira_context", 2, "done", { kind: "step", label: "Loading Jira context…" }),
    entry("dispatch:model_router", 3, "running", { kind: "step", label: "Selecting model…" }),
  ];
  assert.equal(selectTurnStatusLabel(starting, null, entries), "Selecting model…");
  // nothing dispatch-related running (between steps / not reported yet): the turn's own step
  assert.equal(selectTurnStatusLabel(starting, null, entries.slice(0, 2)), "Starting agent…");
  assert.equal(selectTurnStatusLabel(starting, null), "Starting agent…");
  // once the agent runs, a stale running dispatch entry no longer overrides the status
  const running = normalizeTurn(turn(4, "running", 2, { step: "Agent is working…" }));
  assert.equal(selectTurnStatusLabel(running, null, entries), "Agent is working…");
});

test("normalizeStream accepts key + null messageId for scratch runs and rejects keyless junk", () => {
  const scratch = normalizeStream({ key: "run:7", messageId: null, text: "x" }, 5);
  assert.equal(scratch.key, "run:7");
  assert.equal(scratch.messageId, null);
  assert.equal(normalizeStream({ key: "12", messageId: 12 }, 5).key, "12");
  assert.equal(normalizeStream({ messageId: 12 }, 5).key, "12");
  assert.equal(normalizeStream({ messageId: null }, 5), null);
  assert.equal(normalizeStream({ key: "bogus", messageId: null }, 5), null);
});

test("scratch run: hello with run stream + activity is live and selectable", () => {
  const s = reduce(initialChatSessionState, {
    type: "hello",
    turns: [],
    stream: {
      key: "run:7",
      messageId: null,
      text: "Creating the app",
      timeline: [],
      label: "Agent is working…",
    },
    activity: { "run:7": [entry("s1", 1, "done"), entry("s2", 2)] },
  });
  assert.equal(selectScratchRunKey(s), "run:7");
  assert.equal(selectLiveStream(s).key, "run:7");
  const view = selectTurnActivityView(s, "run:7", null);
  assert.equal(view.running, true);
  assert.equal(view.current.id, "s2");
  assert.equal(selectTurnStatusLabel(null, s.stream, view.entries), "label s2");
});

test("scratch run: a finished log stays selectable but the stream is no longer live", () => {
  let s = reduce(initialChatSessionState, {
    type: "hello",
    turns: [],
    stream: { key: "run:7", messageId: null, text: "done text", timeline: [] },
    activity: { "run:7": [entry("s1", 1)] },
  });
  s = reduce(s, {
    type: "activity",
    key: "run:7",
    entries: [entry("s1", 1, "done"), entry("s2", 2, "done")],
  });
  assert.equal(selectLiveStream(s), null);
  assert.equal(selectScratchRunKey(s), "run:7");
  const view = selectTurnActivityView(s, "run:7", null);
  assert.equal(view.running, false);
  assert.equal(view.entries.length, 2);
  assert.equal(view.current.id, "s2");
  assert.equal(selectTurnStatusLabel(null, s.stream, view.entries), "label s2");
});

test("selectScratchRunKey prefers a running run log and ignores chat-turn keys", () => {
  let s = reduce(initialChatSessionState, {
    type: "activity",
    key: "9",
    entries: [entry("a", 1)],
  });
  assert.equal(selectScratchRunKey(s), null);
  s = reduce(s, { type: "activity", key: "run:1", entries: [entry("a", 1, "done")] });
  s = reduce(s, { type: "activity", key: "run:2", entries: [entry("a", 1)] });
  assert.equal(selectScratchRunKey(s), "run:2");
});

test("a scratch stream does not clobber an in-flight chat turn stream", () => {
  let s = reduce(initialChatSessionState, { type: "turn", turn: turn(7, "running", 1) });
  s = reduce(s, { type: "stream", stream: { key: "7", messageId: 7, text: "chat", timeline: [] } });
  s = reduce(s, {
    type: "stream",
    stream: { key: "run:3", messageId: null, text: "scratch", timeline: [] },
  });
  assert.equal(s.stream.key, "7");
});

test("activity survives the turn finishing and the reply landing", () => {
  let s = reduce(initialChatSessionState, { type: "turn", turn: turn(7, "running", 1) });
  s = reduce(s, { type: "activity", key: "7", entries: [entry("a", 1, "done")] });
  s = reduce(s, { type: "turn", turn: turn(7, "done", 9) });
  s = reduce(s, {
    type: "transcript",
    messages: [
      { id: 7, role: "user", text: "q", createdAt: "2026-01-01T00:00:01Z" },
      { id: 8, role: "system", text: "reply", createdAt: "2026-01-01T00:00:02Z" },
    ],
  });
  assert.equal(selectActivityForMessage(s, 7).length, 1);
  assert.equal(selectTurnActivityView(s, "7", s.turns[7]).running, false);
});

test("activity reset replaces the log so a retried step can go live again", () => {
  let s = reduce(initialChatSessionState, {
    type: "activity",
    key: "7",
    entries: [
      entry("step:start", 1, "done"),
      entry("step:run", 2, "done"),
      entry("step:failed", 3, "failed"),
    ],
  });
  // Without reset the old attempt's done entry stays done (guard) and old entries linger.
  const merged = reduce(s, {
    type: "activity",
    key: "7",
    entries: [entry("step:run", 1, "running")],
  });
  assert.equal(selectActivityForKey(merged, "7").find((e) => e.id === "step:run").status, "done");
  s = reduce(s, {
    type: "activity",
    key: "7",
    reset: true,
    entries: [entry("step:run", 2, "running"), entry("step:start", 1, "done")],
  });
  assert.deepEqual(
    selectActivityForKey(s, "7").map((e) => [e.id, e.status]),
    [
      ["step:start", "done"],
      ["step:run", "running"],
    ],
  );
  // Later deltas for the new attempt upsert normally and can finish it.
  s = reduce(s, { type: "activity", key: "7", entries: [entry("step:run", 2, "done")] });
  assert.equal(selectActivityForKey(s, "7").find((e) => e.id === "step:run").status, "done");
  // An identical reset is a no-op; an empty reset clears the key.
  const again = reduce(s, {
    type: "activity",
    key: "7",
    reset: true,
    entries: selectActivityForKey(s, "7"),
  });
  assert.equal(again, s);
  assert.equal(
    "7" in reduce(s, { type: "activity", key: "7", reset: true, entries: [] }).activity,
    false,
  );
});

test("a stale transcript snapshot with empty activity never wipes a non-empty log", () => {
  let s = reduce(initialChatSessionState, {
    type: "activity",
    key: "4",
    entries: [entry("a", 1, "done"), entry("b", 2)],
  });
  s = reduce(s, {
    type: "transcript",
    messages: [
      {
        id: 4,
        role: "user",
        text: "old",
        createdAt: "2026-01-01T00:00:01Z",
        activity: [],
        activityCount: 2,
      },
    ],
  });
  assert.deepEqual(
    selectActivityForMessage(s, 4).map((e) => e.id),
    ["a", "b"],
  );
});

test("a restarted (starting) turn drops the previous attempt's finished log", () => {
  const log = [
    entry("step:run", 1, "done", { ts: 1000 }),
    entry("step:failed", 2, "failed", { ts: 2000 }),
  ];
  // previous known turn was terminal
  let s = reduce(initialChatSessionState, { type: "turn", turn: turn(7, "failed", 5) });
  s = reduce(s, { type: "activity", key: "7", entries: log });
  s = reduce(s, { type: "turn", turn: turn(7, "starting", 6) });
  assert.equal(selectActivityForMessage(s, 7).length, 0);
  // no previous turn known, but the new attempt started after the log's last entry
  s = reduce(initialChatSessionState, { type: "activity", key: "7", entries: log });
  s = reduce(s, {
    type: "turn",
    turn: turn(7, "starting", 6, { startedAt: new Date(5000).toISOString() }),
  });
  assert.equal(selectActivityForMessage(s, 7).length, 0);
  // other turns' logs are untouched
  s = reduce(initialChatSessionState, { type: "activity", key: "8", entries: log });
  s = reduce(s, {
    type: "turn",
    turn: turn(7, "starting", 6, { startedAt: new Date(5000).toISOString() }),
  });
  assert.equal(selectActivityForMessage(s, 8).length, 2);
});

test("a normal starting turn does not wipe the log", () => {
  const running = [
    entry("step:start", 1, "done", { ts: 1000 }),
    entry("step:run", 2, "running", { ts: 2000 }),
  ];
  // still-running log, newer startedAt: no terminal step -> kept
  let s = reduce(initialChatSessionState, { type: "activity", key: "7", entries: running });
  s = reduce(s, {
    type: "turn",
    turn: turn(7, "starting", 1, { startedAt: new Date(9000).toISOString() }),
  });
  assert.equal(selectActivityForMessage(s, 7).length, 2);
  // terminal step in the log but the turn's startedAt is not newer and nothing terminal before
  const finished = [...running.slice(0, 1), entry("step:done", 3, "done", { ts: 3000 })];
  s = reduce(initialChatSessionState, { type: "activity", key: "7", entries: finished });
  s = reduce(s, {
    type: "turn",
    turn: turn(7, "starting", 1, { startedAt: new Date(1500).toISOString() }),
  });
  assert.equal(selectActivityForMessage(s, 7).length, 2);
  // a later running event for an in-flight turn never wipes
  s = reduce(s, { type: "turn", turn: turn(7, "running", 2) });
  assert.equal(selectActivityForMessage(s, 7).length, 2);
});

test("transcript without a clock never expires id-less sends (reducer is pure)", () => {
  let s = reduce(initialChatSessionState, {
    type: "sendStarted",
    send: { clientId: "p1", text: "ghost", createdAt: "2000-01-01T00:00:00Z" },
  });
  s = reduce(s, { type: "sendAccepted", clientId: "p1", messageId: null, queued: false });
  s = reduce(s, { type: "transcript", messages: [] });
  assert.equal(s.pendingSends.length, 1);
});

test("an identical persisted agent summary repeated with no user message between is shown once", () => {
  const out = (id, text = "Plan: change the logo") => ({
    id,
    role: "system",
    isPersistedAgentOutput: true,
    text,
    createdAt: `2026-01-01T00:00:${String(10 + id).padStart(2, "0")}Z`,
  });
  const user = (id, text) => ({
    id,
    role: "user",
    text,
    createdAt: `2026-01-01T00:00:${String(10 + id).padStart(2, "0")}Z`,
  });
  const s = reduce(initialChatSessionState, {
    type: "transcript",
    messages: [user(1, "do it"), out(2), out(3), user(4, "again"), out(5)],
  });
  assert.deepEqual(
    selectThread(s).map((m) => m.id),
    [1, 2, 4, 5],
    "the duplicate (3) is hidden; the same text after a new user message stays",
  );
  // Different text is never merged, and an untouched list keeps its identity.
  const distinct = [out(1), out(2, "Something else")];
  assert.equal(dropDuplicateAgentOutputs(distinct), distinct);
});

test("scratch run start comes from the server hello, so a reload restores the same timer", () => {
  const startedAt = "2026-10-19T12:00:00.000Z";
  const hello = { type: "hello", turns: [], scratchRun: { key: "run:191", startedAt } };
  // Fresh state (a hard reload) rebuilt purely from the hello payload.
  const s = reduce(initialChatSessionState, hello);
  assert.deepEqual(s.scratchRun, { key: "run:191", startedAt });
  assert.equal(selectScratchRunStartedAt(s, "run:191"), Date.parse(startedAt));
  // Another run's key never borrows this start time.
  assert.equal(selectScratchRunStartedAt(s, "run:192"), null);
  assert.equal(selectScratchRunStartedAt(s, null), null);
  // A later hello without it (a chat turn is running) keeps the known start; a bad one is ignored.
  const kept = reduce(s, { type: "hello", turns: [] });
  assert.deepEqual(kept.scratchRun, s.scratchRun);
  assert.equal(normalizeScratchRun({ key: "run:1", startedAt: "garbage" }), null);
  assert.equal(normalizeScratchRun({ key: "578", startedAt }), null, "only run:* keys");
  assert.equal(normalizeScratchRun(null), null);
  // Switching release resets it.
  assert.equal(reduce(s, { type: "reset", releaseId: 2 }).scratchRun, null);
});

test("start new chat drops the visible thread and ignores late events from it", () => {
  let s = reduce(initialChatSessionState, {
    type: "transcript",
    messages: [
      {
        id: 4,
        role: "user",
        text: "make the button blue",
        createdAt: "2026-01-01T00:00:01Z",
        turn: turn(4, "running", 2),
      },
    ],
  });
  s = reduce(s, { type: "turn", turn: turn(4, "running", 3) });
  s = reduce(s, {
    type: "stream",
    stream: { messageId: 4, text: "still writing", timeline: [] },
    receivedAt: 20,
  });
  s = reduce(s, {
    type: "activity",
    key: "run:9",
    entries: [entry("step:run", 1)],
  });
  assert.equal(selectThread(s).length, 1);
  assert.equal(selectLiveStream(s)?.text, "still writing");

  s = reduce(s, { type: "freshChat", throughMessageId: 5 });
  assert.deepEqual(selectThread(s), []);
  assert.equal(selectActiveTurn(s), null);
  assert.equal(selectLiveStream(s), null);
  assert.equal(selectScratchRunKey(s), null);

  s = reduce(s, { type: "turn", turn: turn(4, "running", 9) });
  s = reduce(s, {
    type: "stream",
    stream: { messageId: 4, text: "late", timeline: [] },
    receivedAt: 30,
  });
  s = reduce(s, {
    type: "hello",
    turns: [turn(4, "running", 10)],
    stream: { messageId: 4, text: "from snapshot", timeline: [] },
    activity: { 4: [{ id: "a", seq: 1, label: "x", status: "running", ts: 1 }] },
    scratchRun: { key: "run:9", startedAt: "2026-01-01T00:00:00.000Z" },
    receivedAt: 40,
  });
  s = reduce(s, {
    type: "transcript",
    messages: [
      {
        id: 4,
        role: "user",
        text: "make the button blue",
        createdAt: "2026-01-01T00:00:01Z",
        turn: turn(4, "done", 11),
      },
      {
        id: 5,
        role: "system",
        text: "Done",
        createdAt: "2026-01-01T00:00:02Z",
      },
    ],
  });
  assert.deepEqual(selectThread(s), []);
  assert.equal(selectLiveStream(s), null);
  assert.equal(selectActiveTurn(s), null);

  s = reduce(s, {
    type: "transcript",
    messages: [
      {
        id: 8,
        role: "user",
        text: "fresh request",
        createdAt: "2026-01-01T00:01:00Z",
        turn: turn(8, "running", 1),
      },
    ],
  });
  s = reduce(s, {
    type: "stream",
    stream: { messageId: 8, text: "new answer", timeline: [] },
    receivedAt: 50,
  });
  assert.deepEqual(
    selectThread(s).map((m) => m.id),
    [8],
  );
  assert.equal(selectLiveStream(s)?.text, "new answer");
});
