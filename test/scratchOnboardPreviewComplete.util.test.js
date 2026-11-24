import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyScratchAwaitFailure,
  resolvePreviewHandlesFromStatus,
  shouldCompleteScratchAwait,
} from "../src/lib/scratchOnboardPreviewComplete.util.js";
import { clearScratchAwaitPreviewSearch } from "../src/lib/onboardPreviewUrl.js";

test("shouldCompleteScratchAwait completes when FINISHED and previewReady", () => {
  const decision = shouldCompleteScratchAwait({
    status: "FINISHED",
    previewReady: true,
    previewPort: 8015,
  });
  assert.equal(decision.complete, true);
  assert.equal(decision.coldBoot, false);
});

test("shouldCompleteScratchAwait completes on cold preview when agent FINISHED with port", () => {
  const decision = shouldCompleteScratchAwait({
    status: "FINISHED",
    previewReady: false,
    previewPort: 8015,
  });
  assert.equal(decision.complete, true);
  assert.equal(decision.coldBoot, true);
});

test("shouldCompleteScratchAwait completes on cold preview via fallbackPort", () => {
  const decision = shouldCompleteScratchAwait(
    { status: "FINISHED", previewReady: false },
    { fallbackPort: 8020 },
  );
  assert.equal(decision.complete, true);
  assert.equal(decision.coldBoot, true);
});

test("shouldCompleteScratchAwait waits when FINISHED without boot target", () => {
  const decision = shouldCompleteScratchAwait({
    status: "FINISHED",
    previewReady: false,
  });
  assert.equal(decision.complete, false);
  assert.equal(decision.waitingForPreview, true);
});

test("shouldCompleteScratchAwait waits when RUNNING even if previewReady", () => {
  const decision = shouldCompleteScratchAwait({
    status: "RUNNING",
    previewReady: true,
    previewPort: 8015,
  });
  assert.equal(decision.complete, false);
  assert.equal(decision.waitingForAgent, true);
});

test("shouldCompleteScratchAwait waits while scratchPreviewBuilding and agent still running", () => {
  const decision = shouldCompleteScratchAwait({
    status: "RUNNING",
    previewReady: false,
    previewPort: 8015,
    scratchPreviewBuilding: true,
  });
  assert.equal(decision.complete, false);
  assert.equal(decision.building, true);
});

test("shouldCompleteScratchAwait completes when FINISHED with scratchPreviewBuilding and port", () => {
  const decision = shouldCompleteScratchAwait({
    status: "FINISHED",
    previewReady: false,
    previewPort: 8010,
    previewUrl: "http://launchpad.yorkdevs.link:8010/",
    scratchPreviewBuilding: true,
    workflowId: "b8a961d4-04fc-4ba9-a312-8cdb5e3b3e34",
  });
  assert.equal(decision.complete, true);
  assert.equal(decision.coldBoot, true);
});

test("classifyScratchAwaitFailure detects agent failure", () => {
  assert.equal(classifyScratchAwaitFailure({ status: "FAILED" }).failed, true);
  assert.equal(classifyScratchAwaitFailure({ scratchPreviewFailed: true }).failed, true);
  assert.equal(classifyScratchAwaitFailure({ status: "FINISHED" }).failed, false);
});

test("resolvePreviewHandlesFromStatus builds localhost url from port", () => {
  const handles = resolvePreviewHandlesFromStatus(
    { previewPort: 8015, workflowId: "wf-1" },
    { fallbackPort: null },
  );
  assert.equal(handles.previewPort, 8015);
  assert.equal(handles.previewUrl, "http://localhost:8015/");
  assert.equal(handles.workflowId, "wf-1");
});

test("clearScratchAwaitPreviewSearch removes await params", () => {
  assert.equal(
    clearScratchAwaitPreviewSearch("?awaitScratchPreview=1&releaseId=66&c=false"),
    "?c=false",
  );
});
