/**
 * Pure helpers for the website QA Chat (live project browser). No React / DOM so they are unit-testable.
 */

import {
  formatActivityDuration,
  resolveActivityDurationMs,
} from "../pages/ClientLink/chat/clientLinkTurnActivity.util.js";

/** Keys the runner understands as named keys (Playwright `keyboard.press`). */
export const VIEWER_NAMED_KEYS = new Set([
  "Enter",
  "Backspace",
  "Delete",
  "Tab",
  "Escape",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Home",
  "End",
  "PageUp",
  "PageDown",
]);

/**
 * Map a DOM keyboard event shape to a viewer protocol message (or null to ignore it).
 * Printable characters are sent as `text` (insertText) so IME/layout differences do not matter;
 * modifier chords are sent as Playwright combos (e.g. `Control+a`) so select-all/copy/paste work.
 * @param {{ key: string, ctrlKey?: boolean, metaKey?: boolean, altKey?: boolean, shiftKey?: boolean }} e
 * @returns {{ type: "key", key: string } | { type: "text", text: string } | null}
 */
export function keyEventToViewerInput(e) {
  const key = e?.key;
  if (!key || key === "Dead" || key === "Unidentified") return null;
  const mod = Boolean(e.ctrlKey || e.metaKey || e.altKey);
  if (mod) {
    if (key.length !== 1) return null;
    const parts = [];
    // Remote browser runs on Linux: Cmd on the user's Mac means Ctrl there.
    if (e.ctrlKey || e.metaKey) parts.push("Control");
    if (e.altKey) parts.push("Alt");
    if (e.shiftKey) parts.push("Shift");
    parts.push(key.toLowerCase());
    return { type: "key", key: parts.join("+") };
  }
  if (key.length === 1) return { type: "text", text: key };
  if (VIEWER_NAMED_KEYS.has(key)) return { type: "key", key };
  return null;
}

/**
 * Scale pointer coordinates from the rendered canvas to the remote viewport.
 * @param {{ clientX: number, clientY: number }} pt
 * @param {{ left: number, top: number, width: number, height: number }} rect
 * @param {{ width: number, height: number }} remote
 */
export function mapPointerToRemote(pt, rect, remote) {
  if (!rect?.width || !rect?.height || !remote?.width || !remote?.height) return { x: 0, y: 0 };
  const x = ((pt.clientX - rect.left) / rect.width) * remote.width;
  const y = ((pt.clientY - rect.top) / rect.height) * remote.height;
  return {
    x: Math.max(0, Math.min(remote.width - 1, Math.round(x))),
    y: Math.max(0, Math.min(remote.height - 1, Math.round(y))),
  };
}

export const VIEWER_ZOOM_MIN = 0.25;
export const VIEWER_ZOOM_MAX = 3;
/** Browser-like zoom stops used by the +/- buttons and shortcuts. */
export const VIEWER_ZOOM_STEPS = [
  0.25, 0.33, 0.5, 0.67, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3,
];

/** Zoom factor (1 = 100%) limited to the supported range and rounded to 2 decimals. */
export function clampViewerZoom(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 1;
  return Math.round(Math.min(VIEWER_ZOOM_MAX, Math.max(VIEWER_ZOOM_MIN, n)) * 100) / 100;
}

/** Next zoom stop above (`direction` > 0) or below (`direction` < 0) the current zoom. */
export function stepViewerZoom(current, direction) {
  const z = clampViewerZoom(current);
  if (direction > 0) return VIEWER_ZOOM_STEPS.find((s) => s > z + 0.001) ?? VIEWER_ZOOM_MAX;
  if (direction < 0) {
    const lower = VIEWER_ZOOM_STEPS.filter((s) => s < z - 0.001);
    return lower.length ? lower[lower.length - 1] : VIEWER_ZOOM_MIN;
  }
  return z;
}

/** Smooth zoom for Ctrl/Cmd + wheel and trackpad pinch (`deltaY` < 0 zooms in). */
export function zoomFromWheel(current, deltaY) {
  const dy = Number(deltaY);
  if (!Number.isFinite(dy) || dy === 0) return clampViewerZoom(current);
  const clamped = Math.max(-120, Math.min(120, dy));
  return clampViewerZoom(clampViewerZoom(current) * Math.exp(-clamped * 0.0025));
}

/** "125%" label for a zoom factor. */
export function formatViewerZoom(zoom) {
  return `${Math.round(clampViewerZoom(zoom) * 100)}%`;
}

/**
 * Ctrl/Cmd + `+` / `-` / `0` zoom shortcuts (null when the event is not one).
 * @param {{ key: string, ctrlKey?: boolean, metaKey?: boolean, altKey?: boolean }} e
 * @returns {"in" | "out" | "reset" | null}
 */
export function viewerZoomShortcut(e) {
  if (!e || !(e.ctrlKey || e.metaKey) || e.altKey) return null;
  if (e.key === "+" || e.key === "=") return "in";
  if (e.key === "-" || e.key === "_") return "out";
  if (e.key === "0") return "reset";
  return null;
}

/** Websocket URL from the API origin + the backend-provided `wsPath` (carries the single-use token). */
export function buildViewerWsUrl(apiUrl, wsPath) {
  const base = String(apiUrl || "").replace(/\/$/, "");
  const proto = base.startsWith("https") ? "wss" : "ws";
  const host = base.replace(/^https?:\/\//, "");
  const path = String(wsPath || "");
  return `${proto}://${host}${path.startsWith("/") ? path : `/${path}`}`;
}

/** "12m" / "45s" / null until the idle stop time. */
export function formatIdleCountdown(idleStopAt, now = Date.now()) {
  if (!idleStopAt) return null;
  const ms = new Date(idleStopAt).getTime() - now;
  if (!Number.isFinite(ms)) return null;
  if (ms <= 0) return "0s";
  const s = Math.ceil(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.ceil(s / 60)}m`;
}

export function isBrowserCapError(err) {
  return err?.code === "BROWSER_CAP_REACHED";
}

/** Human text for why a browser stopped. */
export function describeBrowserStopReason(reason) {
  switch (reason) {
    case "idle":
      return "Stopped after 30 minutes of inactivity. Start it again to continue where you left off.";
    case "user":
      return "Stopped. Start it again to continue where you left off.";
    case "selection_changed":
      return "Restarting with the selected environment and persona.";
    case "runner_restart":
      return "The browser host restarted. Start it again to continue.";
    case "error":
      return "The browser stopped unexpectedly. Start it again to continue.";
    default:
      return null;
  }
}

/**
 * Resolve a (possibly partial) selection against the project's workspace. Mirrors the backend:
 * unknown or blank values fall back to the first environment, its first persona and first URL.
 * @param {{ environments?: Array<{ id: string, personas?: Array<{ id: string, urls?: Array<{ name: string, value: string }> }> }> } | null} workspace
 * @param {{ environmentId?: string | null, personaId?: string | null, urlName?: string | null }} [wanted]
 * @returns {{ environmentId: string, personaId: string, urlName: string, url: string }}
 */
export function resolveWorkspaceSelection(workspace, wanted = {}) {
  const envs = Array.isArray(workspace?.environments) ? workspace.environments : [];
  const empty = { environmentId: "", personaId: "", urlName: "", url: "" };
  if (!envs.length) return empty;
  const env = envs.find((e) => e.id === wanted?.environmentId) ?? envs[0];
  const personas = Array.isArray(env.personas) ? env.personas : [];
  const persona = personas.find((p) => p.id === wanted?.personaId) ?? personas[0];
  if (!persona) return { ...empty, environmentId: env.id };
  const urls = Array.isArray(persona.urls) ? persona.urls : [];
  const url = urls.find((u) => u.name === wanted?.urlName) ?? urls[0];
  return {
    environmentId: env.id,
    personaId: persona.id,
    urlName: url?.name || "",
    url: url?.value || "",
  };
}

/** Selection after the user picks another environment: its first persona, first URL. */
export function selectEnvironment(workspace, environmentId) {
  return resolveWorkspaceSelection(workspace, { environmentId });
}

/** Selection after the user picks another persona within the current environment. */
export function selectPersona(workspace, environmentId, personaId) {
  return resolveWorkspaceSelection(workspace, { environmentId, personaId });
}

/**
 * Changing environment or persona (not the URL) restarts a running browser: it has to come back
 * with that pair's saved login.
 */
export function selectionNeedsRestart(prev, next) {
  return (
    (prev?.environmentId || "") !== (next?.environmentId || "") ||
    (prev?.personaId || "") !== (next?.personaId || "")
  );
}

/** True while the browser can be viewed. */
export function isBrowserLive(browser) {
  return Boolean(browser && (browser.live || browser.status === "running"));
}

/** True while an assistant message is still being produced. */
export function isMessageInFlight(message) {
  return (
    message?.role === "assistant" &&
    (message.status === "pending" || message.status === "generating")
  );
}

/**
 * Server clock minus this device's clock, from a server timestamp (the agent stream's `connected`
 * event carries one). Turn timers are anchored to server time, so they stay right when the device
 * clock is off and after a reload.
 * @param {unknown} serverTs epoch ms
 * @param {number} [clientNow]
 * @returns {number}
 */
export function serverClockOffsetMs(serverTs, clientNow = Date.now()) {
  const ts = Number(serverTs);
  return Number.isFinite(ts) && ts > 0 ? ts - clientNow : 0;
}

/**
 * When an assistant turn started, on this device's clock (for an elapsed timer). Falls back to the
 * row's creation time for rows from before start times were recorded.
 * @param {any} message serialized assistant message
 * @param {number} [offsetMs] see {@link serverClockOffsetMs}
 * @returns {number | null}
 */
export function qaTurnStartedAtMs(message, offsetMs = 0) {
  const raw = message?.generationStartedAt || message?.createdAt;
  const ms = raw ? Date.parse(raw) : NaN;
  return Number.isFinite(ms) ? ms - (Number.isFinite(offsetMs) ? offsetMs : 0) : null;
}

const TURN_DURATION_PREFIX = Object.freeze({
  done: "Completed in",
  failed: "Failed after",
  stopped: "Stopped after",
});

/**
 * "Completed in 2 min 14 sec" / "Failed after 45 sec" / "Stopped after 12 sec" for a finished
 * assistant turn, from the persisted start and end times (so it is the same after a refresh).
 * Null while the turn is running or when the end time was never recorded.
 * @param {any} message serialized assistant message
 * @returns {string | null}
 */
export function qaTurnDurationLabel(message) {
  if (message?.role !== "assistant") return null;
  let outcome = null;
  if (message.status === "completed") outcome = "done";
  else if (message.status === "failed") {
    outcome = String(message.agentStatus || "").toUpperCase() === "STOPPED" ? "stopped" : "failed";
  }
  if (!outcome) return null;
  const ms = resolveActivityDurationMs({
    startedAt: message.generationStartedAt,
    endedAt: message.generationEndedAt,
  });
  if (ms == null) return null;
  return `${TURN_DURATION_PREFIX[outcome]} ${formatActivityDuration(ms)}`;
}

/**
 * Fold one agent SSE event into the live-output state.
 * @param {object | null} prevLive
 * @param {{ type?: string, status?: object }} evt
 * @returns {{ live: object | null, refresh: boolean }} `refresh`: reload the transcript from the API.
 */
export function applyQaAgentEvent(prevLive, evt) {
  const type = evt?.type;
  if (!type || type === "heartbeat") return { live: prevLive ?? null, refresh: false };
  // A headless test run's live state (relayed from qa-runner); it does not touch the agent turn.
  if (type === "test_run") {
    const run = evt.run && typeof evt.run === "object" && evt.run.runId ? evt.run : null;
    return { live: prevLive ?? null, refresh: false, testRun: run };
  }
  const status = evt.status;
  if (!status || typeof status !== "object") return { live: prevLive ?? null, refresh: false };
  const busy = Boolean(status.busy);
  const live = busy
    ? {
        assistantMessageId: status.assistantMessageId ?? null,
        streamText: typeof status.streamText === "string" ? status.streamText : "",
        streamPhase: typeof status.streamPhase === "string" ? status.streamPhase : "",
        streamTimeline: Array.isArray(status.streamTimeline) ? status.streamTimeline : [],
      }
    : null;
  const refresh = type === "terminal" || type === "generation_started" || type === "connected";
  return { live, refresh };
}

/** Shape a QA Chat for the shared chat-thread dropdown (`OlderChatThreadsMenu`). */
export function qaChatToThread(chat) {
  return {
    id: chat.id,
    archivedAt: chat.updatedAt ?? chat.createdAt ?? null,
    previewText: chat.title || "Untitled chat",
    messageCount: chat.messageCount ?? null,
  };
}

/**
 * Tests a "create tests" turn left on an assistant message (specs + inventory), or null when it
 * produced none. Drives the generated-tests card; plain browser turns never have specs.
 * @param {any} message serialized assistant message
 * @returns {{ specCount: number, cases: Array<{ id: string, title: string, suite: string | null, priority: string | null }> } | null}
 */
export function getCreatedTests(message, { keepWhileBusy = false } = {}) {
  if (message?.role !== "assistant") return null;
  // Auto-heal puts the message back to "generating" while the agent fixes tests; the card (and its
  // run) must not vanish in the middle of a run.
  const busy = message.status === "pending" || message.status === "generating";
  if (message.status !== "completed" && !(keepWhileBusy && busy)) return null;
  const specs = Array.isArray(message.generatedSpecPaths)
    ? message.generatedSpecPaths.filter((p) => typeof p === "string" && p)
    : [];
  if (specs.length === 0) return null;
  const rows = Array.isArray(message.generatedTestCases?.testCases)
    ? message.generatedTestCases.testCases
    : [];
  const cases = rows
    .filter((c) => c && typeof c === "object" && (c.id || c.title))
    .map((c) => ({
      id: String(c.id || ""),
      title: String(c.title || c.id || "Untitled test"),
      suite: typeof c.suite === "string" && c.suite ? c.suite : null,
      priority: typeof c.priority === "string" && c.priority ? c.priority : null,
    }));
  return { specCount: specs.length, cases };
}

/** One line for a finished headless run: "2 passed, 1 failed · 4.2s". */
export function describeRunTotals(run) {
  const t = run?.totals;
  if (!t) return "";
  const parts = [];
  if (t.passed != null) parts.push(`${t.passed} passed`);
  if (t.failed) parts.push(`${t.failed} failed`);
  if (t.flaky) parts.push(`${t.flaky} flaky`);
  if (t.skipped) parts.push(`${t.skipped} skipped`);
  if (parts.length === 0 && t.total != null) parts.push(`${t.total} tests`);
  const secs = Number(run?.executionTimeMs);
  if (Number.isFinite(secs) && secs > 0) parts.push(`${(secs / 1000).toFixed(1)}s`);
  return parts.join(", ").replace(/, (\d+(\.\d)?s)$/, " · $1");
}

/** What the runner is doing before and between tests, from its pipeline step. */
const RUN_STEP_LABELS = {
  queued: "Queued, waiting for another run to finish…",
  load_project: "Loading the project…",
  sync_files: "Fetching your saved tests…",
  resolve_config: "Resolving the environment…",
  auth_session: "Restoring the saved login…",
  npm_install: "Installing test dependencies…",
  test_run_started: "Starting the browser…",
  playwright: "Running tests…",
  auto_heal: "Fixing failing tests…",
  summarize: "Collecting results…",
  upload: "Uploading the report…",
  record: "Saving results…",
};

/**
 * Live progress of an active run: how many tests finished and which one is running.
 * @returns {{ total: number, finished: number, failed: number, percent: number, current: string } | null}
 */
export function describeRunProgress(run) {
  const p = run?.progress;
  // A finished suite is last round's result, not progress of what is happening now.
  if (!run || run.done || !p || p.done) return null;
  const total = Number(p.total);
  if (!Number.isFinite(total) || total <= 0) return null;
  const finished = Math.min(Math.max(Number(p.finished) || 0, 0), total);
  const cur = p.current;
  return {
    total,
    finished,
    failed: Number(p.failed) || 0,
    percent: Math.round((finished / total) * 100),
    current: cur?.title ? `${cur.id ? `${cur.id}: ` : ""}${cur.title}` : "",
  };
}

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

/**
 * What auto-heal is doing right now ("" when it is not active).
 * @param {{ autoHeal?: { phase?: string, round?: number, maxRounds?: number | null, failing?: number } | null }} run
 */
export function describeAutoHealActive(run) {
  const heal = run?.autoHeal;
  if (!heal || heal.phase === "done") return "";
  const round = `Auto-heal round ${Math.max(1, heal.round || 1)}/${heal.maxRounds || 3}`;
  if (heal.phase === "healing")
    return `${round}: fixing ${plural(heal.failing || 0, "failing test")}…`;
  if (heal.phase === "rerunning") return `${round}: re-running the fixed tests…`;
  if (heal.phase === "verifying")
    return "Auto-heal: re-running all tests to check the fixes broke nothing…";
  return "Auto-heal: starting…";
}

/**
 * How auto-heal ended, for a finished run ("" when it was off or did nothing).
 * @param {{ autoHeal?: object | null }} run
 */
export function describeAutoHealOutcome(run) {
  const heal = run?.autoHeal;
  if (!heal || heal.phase !== "done") return "";
  const rounds = Number(heal.round) || 0;
  switch (heal.outcome) {
    case "passed":
      return rounds > 0 ? `Auto-heal fixed the failing tests in ${plural(rounds, "round")}.` : "";
    case "app_bugs":
      return "Auto-heal stopped: the remaining failures look like real app bugs, not test problems.";
    case "max_rounds":
      return `Auto-heal gave up after ${heal.maxRounds || rounds} rounds; ${plural(heal.failing || 0, "test")} still failing.`;
    case "stopped":
      return heal.reason ? `Auto-heal stopped: ${heal.reason}` : "Auto-heal stopped.";
    case "error":
      return heal.reason ? `Auto-heal hit an error: ${heal.reason}` : "Auto-heal hit an error.";
    default:
      return "";
  }
}

/** Headline for the run row. */
export function describeRunStatus(run) {
  if (!run) return "";
  if (!run.done) {
    if (run.queued) return RUN_STEP_LABELS.queued;
    const progress = describeRunProgress(run);
    const heal = describeAutoHealActive(run);
    if (heal)
      return progress
        ? `${heal.replace(/…$/, "")} · ${progress.finished} of ${progress.total} done`
        : heal;
    if (progress) return `Running tests · ${progress.finished} of ${progress.total} done`;
    return RUN_STEP_LABELS[run.step] || "Running headless…";
  }
  if (run.status === "passed")
    return run.autoHeal?.round > 0 ? "All tests passed after auto-heal" : "All tests passed";
  if (run.status === "failed") return "Some tests failed";
  if (run.status === "cancelled") return "Run cancelled";
  return run.errors?.[0]?.message || "The run could not finish";
}

/** Tests the user can select to run: ids that exist in the created inventory. */
export function toggleCaseId(selected, id) {
  const next = new Set(selected || []);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return [...next];
}
