import test from "node:test";
import assert from "node:assert/strict";
import {
  ARCHITECTURE_DIAGRAM_PIPELINE_STEPS,
  isArchitectureDiagramRunning,
  mapArchitectureStatusForLivePanel,
  resolveArchitectureDiagramActiveStepIndex,
  resolveArchitectureDiagramStepState,
} from "../src/pages/Project/ProjectDetails/components/architectureDiagram/architectureDiagramSteps.js";

test("resolveArchitectureDiagramActiveStepIndex maps phases and terminal statuses", () => {
  assert.equal(resolveArchitectureDiagramActiveStepIndex("launch", "generating"), 0);
  assert.equal(resolveArchitectureDiagramActiveStepIndex("sync", "generating"), 5);
  assert.equal(
    resolveArchitectureDiagramActiveStepIndex("sync", "ready"),
    ARCHITECTURE_DIAGRAM_PIPELINE_STEPS.length,
  );
  assert.equal(resolveArchitectureDiagramActiveStepIndex("commit", "failed"), 4);
});

test("resolveArchitectureDiagramStepState returns done, active, pending, failed", () => {
  assert.equal(resolveArchitectureDiagramStepState(0, 2, {}), "done");
  assert.equal(resolveArchitectureDiagramStepState(2, 2, {}), "active");
  assert.equal(resolveArchitectureDiagramStepState(4, 2, {}), "pending");
  assert.equal(resolveArchitectureDiagramStepState(3, 3, { failed: true }), "failed");
  assert.equal(resolveArchitectureDiagramStepState(5, 2, { completed: true }), "done");
});

test("isArchitectureDiagramRunning and mapArchitectureStatusForLivePanel", () => {
  assert.equal(isArchitectureDiagramRunning("generating"), true);
  assert.equal(isArchitectureDiagramRunning({ status: "generating" }), true);
  assert.equal(isArchitectureDiagramRunning({ status: "ready" }), false);
  assert.equal(isArchitectureDiagramRunning("ready"), false);
  assert.equal(mapArchitectureStatusForLivePanel("ready"), "SUCCEEDED");
  assert.equal(mapArchitectureStatusForLivePanel("failed"), "FAILED");
  assert.equal(mapArchitectureStatusForLivePanel("generating"), "RUNNING");
});
