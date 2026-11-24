import test from "node:test";
import assert from "node:assert/strict";
import {
  buildAgentProgressStatusLine,
  formatAgentTurnElapsed,
  parseTimestampMs,
  resolveAgentTurnStartedAtMs,
} from "../src/lib/clientLinkAgentTurnTimer.js";

test("formatAgentTurnElapsed renders mm:ss", () => {
  assert.equal(formatAgentTurnElapsed(0), "0:00");
  assert.equal(formatAgentTurnElapsed(8000), "0:08");
  assert.equal(formatAgentTurnElapsed(65000), "1:05");
});

test("parseTimestampMs accepts ISO strings and Date", () => {
  const iso = "2026-06-06T10:15:30.000Z";
  const fromString = parseTimestampMs(iso);
  const fromDate = parseTimestampMs(new Date(iso));
  assert.equal(fromString, fromDate);
  assert.equal(parseTimestampMs("not-a-date"), null);
});

test("resolveAgentTurnStartedAtMs keeps current anchor first", () => {
  assert.equal(
    resolveAgentTurnStartedAtMs({
      current: 1000,
      requestStartedAt: 2000,
      lastUserMessageCreatedAt: "2026-06-06T10:00:00.000Z",
    }),
    1000,
  );
});

test("resolveAgentTurnStartedAtMs falls back to requestStartedAt", () => {
  assert.equal(
    resolveAgentTurnStartedAtMs({
      current: null,
      requestStartedAt: 2500,
      lastUserMessageCreatedAt: "2026-06-06T10:00:00.000Z",
    }),
    2500,
  );
});

test("resolveAgentTurnStartedAtMs falls back to last user message time", () => {
  const iso = "2026-06-06T10:00:00.000Z";
  assert.equal(
    resolveAgentTurnStartedAtMs({
      current: null,
      requestStartedAt: null,
      lastUserMessageCreatedAt: iso,
    }),
    parseTimestampMs(iso),
  );
});

test("buildAgentProgressStatusLine joins label and elapsed", () => {
  assert.equal(
    buildAgentProgressStatusLine({
      label: "Agent is working…",
      elapsed: "1:05",
    }),
    "Agent is working… · 1:05",
  );
  assert.equal(
    buildAgentProgressStatusLine({ label: "Sending your request…", elapsed: "" }),
    "Sending your request…",
  );
});

test("buildAgentProgressStatusLine inserts model between label and elapsed", () => {
  assert.equal(
    buildAgentProgressStatusLine({
      label: "Agent is working…",
      model: "Composer 2.5",
      elapsed: "0:55",
    }),
    "Agent is working… · Composer 2.5 · 0:55",
  );
  assert.equal(
    buildAgentProgressStatusLine({
      label: "Agent is working…",
      model: "Auto",
      elapsed: "",
    }),
    "Agent is working… · Auto",
  );
});
