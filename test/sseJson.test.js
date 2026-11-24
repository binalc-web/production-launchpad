import assert from "node:assert/strict";
import test from "node:test";
import { extractSseDataPayload, pullSseJsonEvents, sseJsonLooksIncomplete } from "../src/lib/sseJson.js";

test("extractSseDataPayload joins every data: line and continuation wraps", () => {
  const wrapped = [
    'data: {"type":"run_update","run":{"cursorAgentId":"bc_1","streamText":"ok"',
    ',"streamPhase":"Agent is working…"}}',
  ].join("\n");
  assert.equal(
    extractSseDataPayload(wrapped),
    '{"type":"run_update","run":{"cursorAgentId":"bc_1","streamText":"ok","streamPhase":"Agent is working…"}}',
  );

  const chunked = [
    'data: {"type":"run_update","run":{',
    'data: "cursorAgentId":"bc_1"}}',
  ].join("\n");
  assert.equal(
    extractSseDataPayload(chunked),
    '{"type":"run_update","run":{"cursorAgentId":"bc_1"}}',
  );

  const timestampWrap = [
    'data: {"updatedAt":"2026-08-18T13:58',
    ':24.906Z","id":"tl_001"}',
  ].join("\n");
  assert.equal(
    extractSseDataPayload(timestampWrap),
    '{"updatedAt":"2026-08-18T13:58:24.906Z","id":"tl_001"}',
  );
});

test("pullSseJsonEvents keeps last data: line from a normal compact frame", () => {
  const { events, rest } = pullSseJsonEvents(
    'data: {"type":"run_update","run":{"cursorAgentId":"bc_1"}}\n\n',
  );
  assert.equal(events.length, 1);
  assert.equal(events[0].type, "run_update");
  assert.equal(events[0].run.cursorAgentId, "bc_1");
  assert.equal(rest, "");
});

test("pullSseJsonEvents does not split on escaped newlines inside thinking text", () => {
  const evt = {
    type: "run_update",
    run: {
      cursorAgentId: "bc_d8a9e260-c88c-4dbd-a9f9-2f192aece012",
      streamPhase: "Agent is working…",
      streamText: "Preparing workspace…",
      streamTimeline: [
        {
          id: "tl_001",
          type: "thinking",
          status: "completed",
          text: "Starting implementation.\n\nChecking workspace rules.",
        },
      ],
    },
  };
  const frame = `data: ${JSON.stringify(evt)}\n\n`;
  const { events, rest } = pullSseJsonEvents(frame);
  assert.equal(rest, "");
  assert.equal(events.length, 1);
  assert.equal(events[0].run.streamTimeline[0].text.includes("\n\n"), true);
});

test("pullSseJsonEvents reconstructs proxy-wrapped large run_update frames", () => {
  const evt = {
    type: "run_update",
    run: {
      cursorAgentId: "bc_1",
      updatedAt: "2026-08-18T13:58:24.906Z",
      streamPhase: "Agent is working…",
      streamTimeline: Array.from({ length: 40 }, (_, i) => ({
        id: `tl_${String(i + 1).padStart(3, "0")}`,
        type: "thinking",
        text: "paragraph one.\n\nparagraph two.",
      })),
    },
  };
  const json = JSON.stringify(evt);
  const wrapped = `data: ${json.replace(/(.{80})/g, "$1\n")}\n\n`;
  const { events, rest } = pullSseJsonEvents(wrapped);
  assert.equal(rest, "");
  assert.equal(events.length, 1);
  assert.equal(events[0].run.streamTimeline.length, 40);
  assert.equal(events[0].run.updatedAt, "2026-08-18T13:58:24.906Z");
});

test("pullSseJsonEvents waits when JSON is still unclosed", () => {
  const { events, rest } = pullSseJsonEvents('data: {"type":"run_update","run":{"cursorAgentId":"bc_1"\n\n');
  assert.equal(events.length, 0);
  assert.equal(sseJsonLooksIncomplete('{"type":"run_update","run":{"cursorAgentId":"bc_1"'), true);
  assert.match(rest, /bc_1/);
});

test("pullSseJsonEvents skips heartbeats and leaves a trailing partial frame", () => {
  const buf =
    'data: {"type":"heartbeat","ts":1}\n\n' +
    'data: {"type":"run_update","run":{"cursorAgentId":"bc_1"}}\n\n' +
    'data: {"type":"run_update"';
  const { events, rest } = pullSseJsonEvents(buf);
  assert.equal(events.length, 1);
  assert.equal(events[0].type, "run_update");
  assert.equal(rest.startsWith("data:"), true);
});
