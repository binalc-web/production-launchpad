import test from "node:test";
import assert from "node:assert/strict";
import {
  shouldIgnoreClientLinkStreamEvent,
  statusFromClientLinkStreamEvent,
} from "../src/lib/clientLinkAgentStreamEvent.util.js";

test("statusFromClientLinkStreamEvent synthesizes running status from generation_started", () => {
  assert.deepEqual(
    statusFromClientLinkStreamEvent({
      type: "generation_started",
      requestId: "req-queued",
    }),
    {
      generationRequestId: "req-queued",
      generationState: "running",
      busy: true,
    },
  );
  assert.deepEqual(
    statusFromClientLinkStreamEvent({
      type: "generation_started",
      requestId: "req-queued",
      status: { generationRequestId: "req-queued", busy: true, queuedCount: 0 },
    }),
    { generationRequestId: "req-queued", busy: true, queuedCount: 0 },
  );
});

test("shouldIgnoreClientLinkStreamEvent drops heartbeats only", () => {
  assert.equal(shouldIgnoreClientLinkStreamEvent({ type: "heartbeat" }), true);
  assert.equal(shouldIgnoreClientLinkStreamEvent({ type: "generation_started" }), false);
  assert.equal(shouldIgnoreClientLinkStreamEvent({ type: "snapshot" }), false);
});
