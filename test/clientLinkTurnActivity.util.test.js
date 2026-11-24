import assert from "node:assert/strict";
import test from "node:test";
import {
  activityDisclosureLabel,
  buildTurnActivityModel,
  resolveActivityDurationMs,
  shouldShowScratchRow,
} from "../src/pages/ClientLink/chat/clientLinkTurnActivity.util.js";

const e = (id, kind, label, status = "done") => ({ id, seq: 1, ts: 1, kind, label, status });

test("activityDisclosureLabel pluralises", () => {
  assert.equal(activityDisclosureLabel(1), "Activity (1 step)");
  assert.equal(activityDisclosureLabel(12), "Activity (12 steps)");
  assert.equal(activityDisclosureLabel(undefined), "Activity (0 steps)");
});

test("phase-label stream text is not shown twice", () => {
  const entries = [e("s", "step", "Agent is working…", "running")];
  const m = buildTurnActivityModel({
    entries,
    stream: { text: "Agent is working…", timeline: [], label: "Agent is working…" },
    statusLine: "Agent is working…",
  });
  assert.equal(m.streamText, "");
  assert.equal(m.hasOutput, false);
  assert.equal(m.items.length, 1);
});

test("real assistant text is shown once: covering assistant entries are hidden from the list", () => {
  const text = "I updated the hero section and the button size.";
  const entries = [
    e("tl:a", "assistant", "I updated the hero section and the button size.", "running"),
    e("tl:t", "tool_call", "Edit Hero.jsx"),
  ];
  const m = buildTurnActivityModel({ entries, stream: { text, timeline: [] } });
  // text equals an assistant entry label -> keep the entry, drop the duplicate text block
  assert.equal(m.streamText, "");
  assert.deepEqual(
    m.items.map((i) => i.id),
    ["tl:a", "tl:t"],
  );
  const long = `${text} And then a lot more detail that no entry label can hold.`;
  const m2 = buildTurnActivityModel({ entries, stream: { text: long, timeline: [] } });
  assert.equal(m2.streamText, long);
  assert.deepEqual(
    m2.items.map((i) => i.id),
    ["tl:t"],
  );
});

test("timeline is only rendered when the entries do not already mirror it", () => {
  const timeline = [{ id: "x", type: "tool_call" }];
  const mirrored = buildTurnActivityModel({
    entries: [e("tl:x", "tool_call", "Edit")],
    stream: { text: "", timeline },
  });
  assert.deepEqual(mirrored.timeline, []);
  assert.equal(mirrored.hasOutput, false);
  const plain = buildTurnActivityModel({
    entries: [e("step:1", "step", "Starting agent…")],
    stream: { text: "", timeline },
  });
  assert.equal(plain.timeline, timeline);
  assert.equal(plain.hasOutput, true);
});

test("no entries and no output -> empty model (Lottie fallback case)", () => {
  const m = buildTurnActivityModel({ entries: [], stream: null, statusLine: "Queued" });
  assert.equal(m.hasEntries, false);
  assert.equal(m.hasOutput, false);
});

const scratchInput = (over = {}) => ({
  scratchTrim: "Build me a site",
  appliesToRelease: true,
  hasArchivedHistory: false,
  firstMessageText: "",
  scratchRunKey: null,
  hasScratchActivity: false,
  ...over,
});

test("shouldShowScratchRow: original prompt on the first release, deduped against the first message", () => {
  assert.equal(shouldShowScratchRow(scratchInput()), true);
  assert.equal(
    shouldShowScratchRow(scratchInput({ firstMessageText: " Build me a site " })),
    false,
  );
  assert.equal(shouldShowScratchRow(scratchInput({ firstMessageText: "Something else" })), true);
  assert.equal(shouldShowScratchRow(scratchInput({ scratchTrim: "" })), false);
});

test("shouldShowScratchRow: scratch activity still gets a row without releases/prompt/with archive", () => {
  const live = { scratchRunKey: "run:7", hasScratchActivity: true };
  assert.equal(shouldShowScratchRow(scratchInput({ appliesToRelease: false })), false);
  assert.equal(shouldShowScratchRow(scratchInput({ appliesToRelease: false, ...live })), true);
  assert.equal(shouldShowScratchRow(scratchInput({ scratchTrim: "", ...live })), true);
  assert.equal(shouldShowScratchRow(scratchInput({ hasArchivedHistory: true, ...live })), true);
  // activity key without entries/stream, or no key at all: nothing to anchor
  assert.equal(
    shouldShowScratchRow(scratchInput({ scratchTrim: "", scratchRunKey: "run:7" })),
    false,
  );
  assert.equal(
    shouldShowScratchRow(scratchInput({ scratchTrim: "", hasScratchActivity: true })),
    false,
  );
  // a real first user message wins: no synthetic row, no duplicate
  assert.equal(
    shouldShowScratchRow(
      scratchInput({ appliesToRelease: false, firstMessageText: "make it blue", ...live }),
    ),
    false,
  );
  assert.equal(
    shouldShowScratchRow(
      scratchInput({ scratchTrim: "", firstMessageText: "make it blue", ...live }),
    ),
    false,
  );
});

test("activityDisclosureLabel reads 'Completed in …' once the duration is known", () => {
  assert.equal(activityDisclosureLabel(107, 471_000), "Completed in 7 min 51 sec · 107 steps");
  assert.equal(activityDisclosureLabel(1, 0), "Completed in 0 sec · 1 step");
  assert.equal(activityDisclosureLabel(5, 45_000), "Completed in 45 sec · 5 steps");
  assert.equal(activityDisclosureLabel(5, 120_000), "Completed in 2 min · 5 steps");
  assert.equal(activityDisclosureLabel(5, 3_900_000), "Completed in 1 hr 5 min · 5 steps");
  assert.equal(activityDisclosureLabel(5, 3_600_000), "Completed in 1 hr · 5 steps");
  // no duration -> neutral label, never "Completed in NaN"
  assert.equal(activityDisclosureLabel(5, null), "Activity (5 steps)");
  assert.equal(activityDisclosureLabel(5, -1), "Activity (5 steps)");
  assert.equal(activityDisclosureLabel(5, Number.NaN), "Activity (5 steps)");
});

test("activityDisclosureLabel does not claim 'Completed' for failed or stopped runs", () => {
  assert.equal(activityDisclosureLabel(3, 90_000, "failed"), "Failed after 1 min 30 sec · 3 steps");
  assert.equal(
    activityDisclosureLabel(3, 90_000, "stopped"),
    "Stopped after 1 min 30 sec · 3 steps",
  );
  assert.equal(activityDisclosureLabel(3, 90_000, "done"), "Completed in 1 min 30 sec · 3 steps");
  assert.equal(
    activityDisclosureLabel(3, 90_000, undefined),
    "Completed in 1 min 30 sec · 3 steps",
  );
  assert.equal(activityDisclosureLabel(3, null, "failed"), "Activity (3 steps)");
});

test("resolveActivityDurationMs: server timestamps only, same result after a reload", () => {
  // Chat turn: startedAt / endedAt from the server row.
  assert.equal(
    resolveActivityDurationMs({
      startedAt: "2026-10-19T11:44:56.782Z",
      endedAt: "2026-10-19T11:46:03.203Z",
    }),
    66_421,
  );
  // Scratch run: no endedAt, so the newest entry once nothing is running.
  const start = Date.parse("2026-10-19T12:00:00.000Z");
  const done = [
    { ts: start + 5_000, status: "done" },
    { ts: start + 95_000, status: "done" },
    { ts: start + 40_000, status: "done" },
  ];
  assert.equal(resolveActivityDurationMs({ startedAt: start, entries: done }), 95_000);
  // Still running (or nothing logged) -> no total yet.
  assert.equal(
    resolveActivityDurationMs({
      startedAt: start,
      entries: [...done, { ts: start + 99_000, status: "running" }],
    }),
    null,
  );
  assert.equal(resolveActivityDurationMs({ startedAt: start, entries: [] }), null);
  // Unknown start / end before start / garbage never produce a number.
  assert.equal(resolveActivityDurationMs({ endedAt: "2026-10-19T11:46:03.203Z" }), null);
  assert.equal(resolveActivityDurationMs({ startedAt: "nope", endedAt: "x" }), null);
  assert.equal(
    resolveActivityDurationMs({
      startedAt: "2026-10-19T11:46:03.203Z",
      endedAt: "2026-10-19T11:44:56.782Z",
    }),
    null,
  );
});
