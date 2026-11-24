import test from "node:test";
import assert from "node:assert/strict";
import {
  migrateFrontendStreamDedupeKey,
  persistMigrateOnboardingStreamHandoff,
  readMigrateOnboardingStreamHandoff,
  consumeMigrateOnboardingStreamHandoff,
  clearMigrateOnboardingStreamHandoff,
  resumeOngoingMigrateFromReleases,
  startMigrateStreamFromHandoff,
  isMigrateFrontendStreamStopEvent,
  isMigrateFrontendTerminalPipelinePhase,
  migrateFrontendTerminalStatusFromEvent,
  shouldCloseMigrateLiveFromReleases,
} from "../src/lib/migrateFrontendStream.util.js";

/** Minimal sessionStorage mock for handoff tests. */
function withSessionStorage(run) {
  const store = new Map();
  const previous = globalThis.window;
  globalThis.window = {
    sessionStorage: {
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, value) => {
        store.set(key, String(value));
      },
      removeItem: (key) => {
        store.delete(key);
      },
    },
  };
  try {
    run(store);
  } finally {
    if (previous === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = previous;
    }
  }
}

test("migrateFrontendStreamDedupeKey normalizes release and agent ids", () => {
  assert.equal(migrateFrontendStreamDedupeKey(59, "agent-abc"), "59:agent-abc");
  assert.equal(migrateFrontendStreamDedupeKey("59", " agent-abc "), "59:agent-abc");
});

test("migrateFrontendStreamDedupeKey treats missing agent as empty suffix", () => {
  assert.equal(migrateFrontendStreamDedupeKey(1, null), "1:");
  assert.equal(migrateFrontendStreamDedupeKey(1, undefined), "1:");
});

test("resume dedupe set skips duplicate release+agent keys", () => {
  const resumeSet = new Set();
  const ongoing = [
    { id: 59, ongoingMigrateFrontend: { agentId: "a1" } },
    { id: 59, ongoingMigrateFrontend: { agentId: "a1" } },
    { id: 60, ongoingMigrateFrontend: { agentId: "a2" } },
  ];
  const started = [];
  for (const rel of ongoing) {
    const o = rel?.ongoingMigrateFrontend;
    if (!o?.agentId) continue;
    const dedupeKey = migrateFrontendStreamDedupeKey(rel.id, o.agentId);
    if (resumeSet.has(dedupeKey)) continue;
    resumeSet.add(dedupeKey);
    started.push(dedupeKey);
  }
  assert.deepEqual(started, ["59:a1", "60:a2"]);
});

test("persist and consume migrate onboarding stream handoff round-trip", () => {
  withSessionStorage(() => {
    persistMigrateOnboardingStreamHandoff(64, { releaseId: 22, agentId: "agent-xyz" });
    assert.deepEqual(readMigrateOnboardingStreamHandoff(64), {
      releaseId: 22,
      agentId: "agent-xyz",
    });
    assert.deepEqual(consumeMigrateOnboardingStreamHandoff(64), {
      releaseId: 22,
      agentId: "agent-xyz",
    });
    assert.equal(readMigrateOnboardingStreamHandoff(64), null);
  });
});

test("consume clears stored handoff and ignores stale entries", () => {
  withSessionStorage((store) => {
    store.set(
      "mf_onboarding_stream_10",
      JSON.stringify({
        releaseId: 5,
        agentId: "old-agent",
        ts: Date.now() - 11 * 60 * 1000,
      }),
    );
    assert.equal(consumeMigrateOnboardingStreamHandoff(10), null);
    assert.equal(store.has("mf_onboarding_stream_10"), false);
  });
});

test("clearMigrateOnboardingStreamHandoff removes key without reading", () => {
  withSessionStorage((store) => {
    persistMigrateOnboardingStreamHandoff(7, { releaseId: 1, agentId: "a" });
    clearMigrateOnboardingStreamHandoff(7);
    assert.equal(store.has("mf_onboarding_stream_7"), false);
  });
});

test("resumeOngoingMigrateFromReleases starts stream once per release+agent", async () => {
  const resumeRef = { current: new Set() };
  const started = [];
  const stream = async (releaseId, agentId) => {
    started.push([releaseId, agentId]);
    return true;
  };
  const releases = [{ id: 59, ongoingMigrateFrontend: { agentId: "a1" } }];
  assert.equal(await resumeOngoingMigrateFromReleases(releases, stream, resumeRef), true);
  assert.deepEqual(started, [[59, "a1"]]);
  assert.equal(await resumeOngoingMigrateFromReleases(releases, stream, resumeRef), true);
  assert.deepEqual(started, [[59, "a1"]]);
});

test("startMigrateStreamFromHandoff validates payload and waits for connect", async () => {
  const resumeRef = { current: new Set() };
  const started = [];
  const stream = async (releaseId, agentId) => {
    started.push([releaseId, agentId]);
    return true;
  };
  assert.equal(await startMigrateStreamFromHandoff(null, stream, resumeRef), false);
  assert.equal(
    await startMigrateStreamFromHandoff({ releaseId: 3, agentId: "x" }, stream, resumeRef),
    true,
  );
  assert.deepEqual(started, [[3, "x"]]);
  assert.equal(resumeRef.current.has("3:x"), true);
});

test("isMigrateFrontendStreamStopEvent treats DONE/FAILED and terminal pipeline as stop", () => {
  assert.equal(isMigrateFrontendStreamStopEvent({ type: "phase", phase: "DONE" }), true);
  assert.equal(isMigrateFrontendStreamStopEvent({ type: "phase", phase: "FAILED" }), true);
  assert.equal(isMigrateFrontendStreamStopEvent({ type: "phase", phase: "PLATFORM_SYNC" }), false);
  assert.equal(
    isMigrateFrontendStreamStopEvent({
      type: "pipeline_update",
      migrateFrontendPipeline: { phase: "completed" },
    }),
    true,
  );
  assert.equal(
    isMigrateFrontendStreamStopEvent({
      type: "pipeline_update",
      migrateFrontendPipeline: { phase: "platform_working" },
    }),
    false,
  );
  assert.equal(
    isMigrateFrontendStreamStopEvent({
      type: "connected",
      migrateFrontendPipeline: { phase: "completed" },
    }),
    false,
  );
});

test("migrateFrontendTerminalStatusFromEvent maps failure phases", () => {
  assert.equal(
    migrateFrontendTerminalStatusFromEvent({ type: "phase", phase: "DONE" }),
    "SUCCEEDED",
  );
  assert.equal(
    migrateFrontendTerminalStatusFromEvent({ type: "phase", phase: "FAILED" }),
    "FAILED",
  );
  assert.equal(
    migrateFrontendTerminalStatusFromEvent({
      type: "pipeline_update",
      migrateFrontendPipeline: { phase: "agent_failed" },
    }),
    "FAILED",
  );
  assert.equal(isMigrateFrontendTerminalPipelinePhase("completed"), true);
  assert.equal(isMigrateFrontendTerminalPipelinePhase("agent_running"), false);
});

test("shouldCloseMigrateLiveFromReleases closes only when the live release is no longer ongoing", () => {
  assert.equal(shouldCloseMigrateLiveFromReleases([], 9), false);
  assert.equal(shouldCloseMigrateLiveFromReleases(null, 9), false);
  assert.equal(
    shouldCloseMigrateLiveFromReleases([{ id: 9, ongoingMigrateFrontend: { agentId: "a1" } }], 9),
    false,
  );
  assert.equal(
    shouldCloseMigrateLiveFromReleases([{ id: 9, ongoingMigrateFrontend: null }], 9),
    true,
  );
  assert.equal(
    shouldCloseMigrateLiveFromReleases([{ id: 8, ongoingMigrateFrontend: null }], 9),
    true,
  );
});

test("startMigrateStreamFromHandoff retries when stream connect fails", async () => {
  const resumeRef = { current: new Set() };
  let attempts = 0;
  const stream = async () => {
    attempts += 1;
    return attempts >= 2;
  };
  assert.equal(
    await startMigrateStreamFromHandoff({ releaseId: 1, agentId: "a" }, stream, resumeRef),
    false,
  );
  assert.equal(resumeRef.current.has("1:a"), false);
  assert.equal(
    await startMigrateStreamFromHandoff({ releaseId: 1, agentId: "a" }, stream, resumeRef),
    true,
  );
  assert.equal(attempts, 2);
  assert.equal(resumeRef.current.has("1:a"), true);
});
