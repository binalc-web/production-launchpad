import test from "node:test";
import assert from "node:assert/strict";
import {
  applyQaAgentEvent,
  qaChatToThread,
  buildViewerWsUrl,
  resolveWorkspaceSelection,
  selectEnvironment,
  selectPersona,
  selectionNeedsRestart,
  describeBrowserStopReason,
  formatIdleCountdown,
  isBrowserCapError,
  isBrowserLive,
  isMessageInFlight,
  qaTurnDurationLabel,
  qaTurnStartedAtMs,
  serverClockOffsetMs,
  keyEventToViewerInput,
  mapPointerToRemote,
  clampViewerZoom,
  formatViewerZoom,
  stepViewerZoom,
  viewerZoomShortcut,
  zoomFromWheel,
} from "../src/lib/qaChat.util.js";

test("viewer zoom is clamped and formatted", () => {
  assert.equal(clampViewerZoom(1), 1);
  assert.equal(clampViewerZoom(0.01), 0.25);
  assert.equal(clampViewerZoom(99), 3);
  assert.equal(clampViewerZoom("x"), 1);
  assert.equal(formatViewerZoom(1.25), "125%");
  assert.equal(formatViewerZoom(0.33), "33%");
});

test("viewer zoom steps move between browser-like stops", () => {
  assert.equal(stepViewerZoom(1, 1), 1.1);
  assert.equal(stepViewerZoom(1, -1), 0.9);
  assert.equal(stepViewerZoom(3, 1), 3);
  assert.equal(stepViewerZoom(0.25, -1), 0.25);
  assert.equal(stepViewerZoom(1.2, 1), 1.25);
  assert.equal(stepViewerZoom(1.2, -1), 1.1);
});

test("viewer zoom follows the wheel direction and stays in range", () => {
  assert.ok(zoomFromWheel(1, -100) > 1);
  assert.ok(zoomFromWheel(1, 100) < 1);
  assert.equal(zoomFromWheel(1, 0), 1);
  assert.equal(zoomFromWheel(3, -120), 3);
  assert.equal(zoomFromWheel(0.25, 120), 0.25);
});

test("viewer zoom shortcuts need Ctrl or Cmd", () => {
  assert.equal(viewerZoomShortcut({ key: "+", ctrlKey: true }), "in");
  assert.equal(viewerZoomShortcut({ key: "=", metaKey: true }), "in");
  assert.equal(viewerZoomShortcut({ key: "-", ctrlKey: true }), "out");
  assert.equal(viewerZoomShortcut({ key: "0", metaKey: true }), "reset");
  assert.equal(viewerZoomShortcut({ key: "-" }), null);
  assert.equal(viewerZoomShortcut({ key: "a", ctrlKey: true }), null);
  assert.equal(viewerZoomShortcut({ key: "0", ctrlKey: true, altKey: true }), null);
});

test("printable keys go as text, named keys as keys, junk is dropped", () => {
  assert.deepEqual(keyEventToViewerInput({ key: "a" }), { type: "text", text: "a" });
  assert.deepEqual(keyEventToViewerInput({ key: "A", shiftKey: true }), {
    type: "text",
    text: "A",
  });
  assert.deepEqual(keyEventToViewerInput({ key: "Enter" }), { type: "key", key: "Enter" });
  assert.equal(keyEventToViewerInput({ key: "Shift" }), null);
  assert.equal(keyEventToViewerInput({ key: "Dead" }), null);
  assert.equal(keyEventToViewerInput({ key: "Unidentified" }), null);
});

test("modifier chords map Cmd to Control for the remote Linux browser", () => {
  assert.deepEqual(keyEventToViewerInput({ key: "a", metaKey: true }), {
    type: "key",
    key: "Control+a",
  });
  assert.deepEqual(keyEventToViewerInput({ key: "Z", ctrlKey: true, shiftKey: true }), {
    type: "key",
    key: "Control+Shift+z",
  });
  assert.equal(keyEventToViewerInput({ key: "ArrowLeft", ctrlKey: true }), null);
});

test("pointer coordinates scale to the remote viewport and clamp", () => {
  const rect = { left: 100, top: 50, width: 640, height: 360 };
  const remote = { width: 1280, height: 720 };
  assert.deepEqual(mapPointerToRemote({ clientX: 420, clientY: 230 }, rect, remote), {
    x: 640,
    y: 360,
  });
  assert.deepEqual(mapPointerToRemote({ clientX: 0, clientY: 0 }, rect, remote), { x: 0, y: 0 });
  assert.deepEqual(mapPointerToRemote({ clientX: 5000, clientY: 5000 }, rect, remote), {
    x: 1279,
    y: 719,
  });
  assert.deepEqual(
    mapPointerToRemote({ clientX: 1, clientY: 1 }, { width: 0, height: 0 }, remote),
    {
      x: 0,
      y: 0,
    },
  );
});

test("viewer ws url follows the API scheme and keeps the token path", () => {
  assert.equal(
    buildViewerWsUrl("https://api.example.com/", "/api/v2/qa-chat/browser/ws?sessionId=s&token=t"),
    "wss://api.example.com/api/v2/qa-chat/browser/ws?sessionId=s&token=t",
  );
  assert.equal(buildViewerWsUrl("http://localhost:5000", "x"), "ws://localhost:5000/x");
});

test("idle countdown", () => {
  const now = Date.parse("2026-01-01T00:00:00Z");
  assert.equal(formatIdleCountdown(null, now), null);
  assert.equal(formatIdleCountdown("2026-01-01T00:00:30Z", now), "30s");
  assert.equal(formatIdleCountdown("2026-01-01T00:12:00Z", now), "12m");
  assert.equal(formatIdleCountdown("2025-12-31T23:00:00Z", now), "0s");
});

test("status helpers", () => {
  assert.equal(isBrowserCapError({ code: "BROWSER_CAP_REACHED" }), true);
  assert.equal(isBrowserCapError({ code: "X" }), false);
  assert.equal(isBrowserLive({ live: true }), true);
  assert.equal(isBrowserLive({ status: "stopped" }), false);
  assert.equal(isBrowserLive(null), false);
  assert.equal(isMessageInFlight({ role: "assistant", status: "generating" }), true);
  assert.equal(isMessageInFlight({ role: "assistant", status: "completed" }), false);
  assert.equal(isMessageInFlight({ role: "user", status: "pending" }), false);
  assert.match(describeBrowserStopReason("idle"), /30 minutes/);
  assert.equal(describeBrowserStopReason(null), null);
});

test("agent SSE events fold into live output and say when to reload the transcript", () => {
  const busy = {
    busy: true,
    assistantMessageId: "m1",
    streamText: "Opening the page",
    streamPhase: "Working",
    streamTimeline: [{ id: "t1", type: "tool_call" }],
  };
  const update = applyQaAgentEvent(null, { type: "update", status: busy });
  assert.equal(update.refresh, false);
  assert.equal(update.live.streamText, "Opening the page");
  assert.equal(update.live.streamTimeline.length, 1);

  const hb = applyQaAgentEvent(update.live, { type: "heartbeat", ts: 1 });
  assert.equal(hb.live, update.live);
  assert.equal(hb.refresh, false);

  assert.equal(applyQaAgentEvent(null, { type: "generation_started", status: busy }).refresh, true);
  assert.equal(
    applyQaAgentEvent(null, { type: "connected", status: { busy: false } }).refresh,
    true,
  );
  const done = applyQaAgentEvent(update.live, { type: "terminal", status: { busy: false } });
  assert.equal(done.live, null);
  assert.equal(done.refresh, true);
  assert.equal(applyQaAgentEvent(update.live, { type: "update" }).live, update.live);
});

test("chats map to the shared thread dropdown shape", () => {
  assert.deepEqual(
    qaChatToThread({
      id: "c1",
      title: "Checkout flow",
      updatedAt: "2026-01-01T00:00:00Z",
      messageCount: 3,
    }),
    { id: "c1", archivedAt: "2026-01-01T00:00:00Z", previewText: "Checkout flow", messageCount: 3 },
  );
  assert.equal(qaChatToThread({ id: "c2", title: "" }).previewText, "Untitled chat");
});

const WORKSPACE = {
  environments: [
    {
      id: "staging",
      personas: [
        {
          id: "admin",
          urls: [
            { name: "App", value: "https://staging.example.com" },
            { name: "Admin", value: "https://staging.example.com/admin" },
          ],
        },
        { id: "viewer", urls: [{ name: "App", value: "https://staging.example.com/v" }] },
      ],
    },
    {
      id: "prod",
      personas: [{ id: "ops", urls: [{ name: "App", value: "https://app.example.com" }] }],
    },
  ],
};

test("workspace selection defaults to the first environment, persona and URL", () => {
  assert.deepEqual(resolveWorkspaceSelection(WORKSPACE), {
    environmentId: "staging",
    personaId: "admin",
    urlName: "App",
    url: "https://staging.example.com",
  });
  assert.deepEqual(resolveWorkspaceSelection(null), {
    environmentId: "",
    personaId: "",
    urlName: "",
    url: "",
  });
  assert.equal(
    resolveWorkspaceSelection(WORKSPACE, {
      environmentId: "staging",
      personaId: "admin",
      urlName: "Admin",
    }).url,
    "https://staging.example.com/admin",
  );
});

test("picking an environment selects its first persona; a persona outside it is replaced", () => {
  const prod = selectEnvironment(WORKSPACE, "prod");
  assert.equal(prod.environmentId, "prod");
  assert.equal(prod.personaId, "ops");
  assert.equal(selectPersona(WORKSPACE, "staging", "viewer").url, "https://staging.example.com/v");
  assert.equal(selectPersona(WORKSPACE, "prod", "admin").personaId, "ops");
});

test("only an environment or persona change needs a browser restart", () => {
  const a = { environmentId: "staging", personaId: "admin", urlName: "App" };
  assert.equal(selectionNeedsRestart(a, { ...a, urlName: "Admin" }), false);
  assert.equal(selectionNeedsRestart(a, { ...a, personaId: "viewer" }), true);
  assert.equal(selectionNeedsRestart(a, { ...a, environmentId: "prod" }), true);
  assert.equal(selectionNeedsRestart(null, a), true);
});

test("getCreatedTests reads specs and inventory only from completed assistant turns", async () => {
  const { getCreatedTests } = await import("../src/lib/qaChat.util.js");
  const done = {
    role: "assistant",
    status: "completed",
    generatedSpecPaths: ["a/login.spec.ts"],
    generatedTestCases: {
      testCases: [
        { id: "TC-1", title: "logs in", suite: "smoke", priority: "P1" },
        { title: "no id" },
        null,
      ],
    },
  };
  const out = getCreatedTests(done);
  assert.equal(out.specCount, 1);
  assert.deepEqual(
    out.cases.map((c) => [c.id, c.title, c.suite]),
    [
      ["TC-1", "logs in", "smoke"],
      ["", "no id", null],
    ],
  );
  assert.equal(getCreatedTests({ ...done, status: "generating" }), null);
  assert.equal(getCreatedTests({ ...done, role: "user" }), null);
  assert.equal(getCreatedTests({ ...done, generatedSpecPaths: [] }), null);
  assert.equal(getCreatedTests({ ...done, generatedSpecPaths: null }), null);
  // Specs without an inventory still count (the run uses the specs).
  assert.deepEqual(getCreatedTests({ ...done, generatedTestCases: null }).cases, []);
});

test("describeRunTotals / describeRunStatus summarise a headless run", async () => {
  const { describeRunTotals, describeRunStatus, toggleCaseId } =
    await import("../src/lib/qaChat.util.js");
  assert.equal(
    describeRunTotals({
      totals: { total: 3, passed: 2, failed: 1, skipped: 0, flaky: 0 },
      executionTimeMs: 4200,
    }),
    "2 passed, 1 failed · 4.2s",
  );
  assert.equal(describeRunTotals({ totals: { total: 0, passed: 0 } }), "0 passed");
  assert.equal(describeRunTotals({ totals: null }), "");
  assert.match(describeRunStatus({ done: false, queued: true }), /Queued/);
  assert.match(describeRunStatus({ done: false }), /Running/);
  assert.equal(describeRunStatus({ done: true, status: "passed" }), "All tests passed");
  assert.equal(describeRunStatus({ done: true, status: "failed" }), "Some tests failed");
  assert.equal(
    describeRunStatus({ done: true, status: "error", errors: [{ message: "No auth" }] }),
    "No auth",
  );
  assert.deepEqual(toggleCaseId(["a"], "b"), ["a", "b"]);
  assert.deepEqual(toggleCaseId(["a", "b"], "a"), ["b"]);
});

test("serverClockOffsetMs is server minus device time and ignores bad input", () => {
  assert.equal(serverClockOffsetMs(10_500, 10_000), 500);
  assert.equal(serverClockOffsetMs(9_000, 10_000), -1000);
  for (const bad of [undefined, null, "x", 0, -5, NaN])
    assert.equal(serverClockOffsetMs(bad, 10_000), 0);
});

test("qaTurnStartedAtMs anchors the timer to the server start, corrected for clock skew", () => {
  const message = {
    generationStartedAt: "2026-11-01T16:00:00.000Z",
    createdAt: "2026-11-01T15:59:00.000Z",
  };
  const serverStart = Date.parse("2026-11-01T16:00:00.000Z");
  assert.equal(qaTurnStartedAtMs(message), serverStart);
  // Server clock 5s ahead of this device: the start is 5s earlier on the device clock.
  assert.equal(qaTurnStartedAtMs(message, 5000), serverStart - 5000);
  // Rows from before start times were recorded fall back to creation time.
  assert.equal(
    qaTurnStartedAtMs({ createdAt: "2026-11-01T15:59:00.000Z" }),
    Date.parse("2026-11-01T15:59:00.000Z"),
  );
  assert.equal(qaTurnStartedAtMs({}), null);
  assert.equal(qaTurnStartedAtMs(null), null);
  assert.equal(qaTurnStartedAtMs({ generationStartedAt: "nope" }), null);
});

test("qaTurnDurationLabel is persisted-timestamp based and outcome aware", () => {
  const timing = {
    role: "assistant",
    generationStartedAt: "2026-11-01T15:57:46.000Z",
    generationEndedAt: "2026-11-01T16:00:00.000Z",
  };
  assert.equal(
    qaTurnDurationLabel({ ...timing, status: "completed" }),
    "Completed in 2 min 14 sec",
  );
  assert.equal(
    qaTurnDurationLabel({ ...timing, status: "failed", agentStatus: "FAILED" }),
    "Failed after 2 min 14 sec",
  );
  assert.equal(
    qaTurnDurationLabel({ ...timing, status: "failed", agentStatus: "STOPPED" }),
    "Stopped after 2 min 14 sec",
  );
  assert.equal(
    qaTurnDurationLabel({
      role: "assistant",
      status: "completed",
      generationStartedAt: "2026-11-01T16:00:00.000Z",
      generationEndedAt: "2026-11-01T16:00:45.000Z",
    }),
    "Completed in 45 sec",
  );
});

test("qaTurnDurationLabel is null while running, for user rows, and without an end time", () => {
  const timing = {
    generationStartedAt: "2026-11-01T15:57:46.000Z",
    generationEndedAt: "2026-11-01T16:00:00.000Z",
  };
  assert.equal(qaTurnDurationLabel({ ...timing, role: "assistant", status: "generating" }), null);
  assert.equal(qaTurnDurationLabel({ ...timing, role: "user", status: "completed" }), null);
  assert.equal(
    qaTurnDurationLabel({
      role: "assistant",
      status: "completed",
      generationStartedAt: timing.generationStartedAt,
    }),
    null,
  );
  assert.equal(qaTurnDurationLabel({ role: "assistant", status: "completed" }), null);
  // End before start (bad data) is never shown as a negative duration.
  assert.equal(
    qaTurnDurationLabel({
      role: "assistant",
      status: "completed",
      generationStartedAt: "2026-11-01T16:00:00.000Z",
      generationEndedAt: "2026-11-01T15:00:00.000Z",
    }),
    null,
  );
  assert.equal(qaTurnDurationLabel(null), null);
});

test("applyQaAgentEvent hands a test_run event to the caller without touching the live turn", async () => {
  const { applyQaAgentEvent } = await import("../src/lib/qaChat.util.js");
  const live = { assistantMessageId: "m1", streamText: "hi", streamPhase: "", streamTimeline: [] };
  const run = { runId: "r1", messageId: "m2", done: false };
  const out = applyQaAgentEvent(live, { type: "test_run", run });
  assert.equal(out.live, live);
  assert.equal(out.refresh, false);
  assert.equal(out.testRun, run);
  assert.equal(
    applyQaAgentEvent(null, { type: "test_run", run: { messageId: "m2" } }).testRun,
    null,
  );
  assert.equal(applyQaAgentEvent(null, { type: "test_run" }).testRun, null);
});

test("describeRunProgress and describeRunStatus show exact live progress", async () => {
  const { describeRunProgress, describeRunStatus } = await import("../src/lib/qaChat.util.js");
  const running = {
    done: false,
    step: "playwright",
    progress: {
      total: 8,
      finished: 3,
      failed: 1,
      current: { id: "TC-A-0004", title: "shows filters", index: 4 },
    },
  };
  assert.deepEqual(describeRunProgress(running), {
    total: 8,
    finished: 3,
    failed: 1,
    percent: 38,
    current: "TC-A-0004: shows filters",
  });
  assert.equal(describeRunStatus(running), "Running tests · 3 of 8 done");

  assert.equal(describeRunProgress({ done: true, progress: { total: 8, finished: 8 } }), null);
  assert.equal(describeRunProgress({ done: false, progress: { total: 0 } }), null);
  assert.equal(describeRunProgress({ done: false }), null);
  // Finished count never exceeds the total.
  assert.equal(
    describeRunProgress({ done: false, progress: { total: 2, finished: 5 } }).percent,
    100,
  );

  // Before the first test starts, the step says what is happening.
  assert.equal(
    describeRunStatus({ done: false, step: "npm_install" }),
    "Installing test dependencies…",
  );
  assert.equal(
    describeRunStatus({ done: false, step: "test_run_started" }),
    "Starting the browser…",
  );
  assert.equal(describeRunStatus({ done: false, step: "mystery" }), "Running headless…");
  assert.match(describeRunStatus({ done: false, queued: true, step: "queued" }), /Queued/);
});

test("getCreatedTests keeps the card while a run is healing the message", async () => {
  const { getCreatedTests } = await import("../src/lib/qaChat.util.js");
  const msg = (status) => ({
    role: "assistant",
    status,
    generatedSpecPaths: ["a.spec.ts"],
    generatedTestCases: { testCases: [{ id: "TC-A-0001", title: "A" }] },
  });
  assert.ok(getCreatedTests(msg("completed")));
  assert.equal(getCreatedTests(msg("generating")), null);
  assert.ok(getCreatedTests(msg("generating"), { keepWhileBusy: true }));
  assert.equal(getCreatedTests(msg("failed"), { keepWhileBusy: true }), null);
  assert.equal(
    getCreatedTests({ ...msg("completed"), generatedSpecPaths: [] }, { keepWhileBusy: true }),
    null,
  );
});

test("auto-heal wording follows the heal phase and outcome", async () => {
  const {
    describeAutoHealActive,
    describeAutoHealOutcome,
    describeRunStatus,
    describeRunProgress,
  } = await import("../src/lib/qaChat.util.js");
  const heal = (over) => ({ phase: "healing", round: 1, maxRounds: 3, failing: 2, ...over });

  assert.equal(describeAutoHealActive({}), "");
  assert.equal(describeAutoHealActive({ autoHeal: heal({ phase: "done" }) }), "");
  assert.equal(
    describeAutoHealActive({ autoHeal: heal() }),
    "Auto-heal round 1/3: fixing 2 failing tests…",
  );
  assert.equal(
    describeAutoHealActive({ autoHeal: heal({ failing: 1 }) }),
    "Auto-heal round 1/3: fixing 1 failing test…",
  );
  assert.match(
    describeAutoHealActive({ autoHeal: heal({ phase: "rerunning" }) }),
    /re-running the fixed/,
  );
  assert.match(describeAutoHealActive({ autoHeal: heal({ phase: "verifying" }) }), /all tests/);
  assert.match(describeAutoHealActive({ autoHeal: { phase: "starting" } }), /starting/);

  // The headline shows the heal step, with the re-run's counter once its tests start.
  assert.equal(
    describeRunStatus({ done: false, step: "auto_heal", autoHeal: heal() }),
    "Auto-heal round 1/3: fixing 2 failing tests…",
  );
  assert.equal(
    describeRunStatus({
      done: false,
      autoHeal: heal({ phase: "rerunning" }),
      progress: { total: 2, finished: 1, failed: 0, done: false },
    }),
    "Auto-heal round 1/3: re-running the fixed tests · 1 of 2 done",
  );
  // Last round's finished suite is not progress of the heal.
  assert.equal(
    describeRunProgress({ done: false, progress: { total: 3, finished: 3, done: true } }),
    null,
  );

  const done = (over) => ({
    done: true,
    status: "failed",
    autoHeal: heal({ phase: "done", ...over }),
  });
  assert.equal(describeAutoHealOutcome({}), "");
  assert.equal(describeAutoHealOutcome({ autoHeal: heal() }), "");
  assert.match(describeAutoHealOutcome(done({ outcome: "passed", round: 2 })), /fixed .* 2 rounds/);
  assert.equal(describeAutoHealOutcome(done({ outcome: "passed", round: 0 })), "");
  assert.match(describeAutoHealOutcome(done({ outcome: "app_bugs" })), /app bugs/);
  assert.match(
    describeAutoHealOutcome(done({ outcome: "max_rounds", round: 3, failing: 1 })),
    /3 rounds; 1 test still failing/,
  );
  assert.equal(
    describeAutoHealOutcome(done({ outcome: "stopped", reason: "the agent needs an answer." })),
    "Auto-heal stopped: the agent needs an answer.",
  );
  assert.match(describeAutoHealOutcome(done({ outcome: "error", reason: "boom" })), /error: boom/);

  assert.equal(
    describeRunStatus({
      done: true,
      status: "passed",
      autoHeal: heal({ phase: "done", round: 2, outcome: "passed" }),
    }),
    "All tests passed after auto-heal",
  );
  assert.equal(describeRunStatus({ done: true, status: "passed" }), "All tests passed");
});
