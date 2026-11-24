import test from "node:test";
import assert from "node:assert/strict";
import { architectureGraphReducer } from "../src/pages/Project/ProjectDetails/components/architectureDiagram/graph/architectureGraph.store.js";

const baseState = {
  navigationLevel: "layer-detail",
  activeLayerId: "layer-services",
  selectedNodeId: null,
  expandedContainers: new Set(["container:src"]),
  sidebarTab: "info",
  graphTheme: "light",
  tourActive: false,
  currentTourStep: 0,
  tourHighlightedNodeIds: [],
  tourResolvedNodeIds: [],
};

test("toggleContainer adds and removes container ids", () => {
  const expanded = architectureGraphReducer(baseState, {
    type: "toggleContainer",
    containerId: "container:utils",
  });
  assert.deepEqual([...expanded.expandedContainers].sort(), ["container:src", "container:utils"]);

  const collapsed = architectureGraphReducer(expanded, {
    type: "toggleContainer",
    containerId: "container:src",
  });
  assert.deepEqual([...collapsed.expandedContainers], ["container:utils"]);
});

test("expandContainer is idempotent", () => {
  const once = architectureGraphReducer(baseState, {
    type: "expandContainer",
    containerId: "container:utils",
  });
  assert.equal(once.expandedContainers.has("container:utils"), true);

  const twice = architectureGraphReducer(once, {
    type: "expandContainer",
    containerId: "container:utils",
  });
  assert.equal(twice, once);
});

test("collapseAllContainers clears expanded state", () => {
  const collapsed = architectureGraphReducer(baseState, { type: "collapseAllContainers" });
  assert.equal(collapsed.expandedContainers.size, 0);
});

test("drillIntoLayer and navigateToOverview reset expanded containers", () => {
  const drilled = architectureGraphReducer(baseState, {
    type: "drillIntoLayer",
    layerId: "layer-api",
  });
  assert.equal(drilled.expandedContainers.size, 0);
  assert.equal(drilled.activeLayerId, "layer-api");

  const overview = architectureGraphReducer(
    { ...baseState, navigationLevel: "layer-detail", activeLayerId: "layer-api" },
    { type: "navigateToOverview" },
  );
  assert.equal(overview.expandedContainers.size, 0);
  assert.equal(overview.navigationLevel, "overview");
});

test("navigateToNodeInLayer keeps expanded containers within the same layer", () => {
  const sameLayer = architectureGraphReducer(baseState, {
    type: "navigateToNodeInLayer",
    layerId: "layer-services",
    nodeId: "file-a",
  });
  assert.equal(sameLayer.expandedContainers.has("container:src"), true);

  const otherLayer = architectureGraphReducer(baseState, {
    type: "navigateToNodeInLayer",
    layerId: "layer-api",
    nodeId: "file-b",
  });
  assert.equal(otherLayer.expandedContainers.size, 0);
});
