import test from "node:test";
import assert from "node:assert/strict";
import {
  createRequestId,
  isCurrent,
  startGeneration,
  stopGeneration,
  syncGenerationRequestId,
} from "../src/lib/generationManager.js";

test("syncGenerationRequestId registers server id for isCurrent polling", () => {
  const local = createRequestId();
  const server = createRequestId();
  startGeneration({
    requestId: local,
    releaseId: 1,
    slug: "demo",
  });
  assert.equal(isCurrent(local), true);
  assert.equal(isCurrent(server), false);

  const synced = syncGenerationRequestId({
    localRequestId: local,
    serverRequestId: server,
    releaseId: 1,
    slug: "demo",
  });

  assert.equal(synced.requestId, server);
  assert.equal(isCurrent(server), true);
  assert.equal(isCurrent(local), false);
  stopGeneration(server);
});
