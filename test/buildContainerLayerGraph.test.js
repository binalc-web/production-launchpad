import test from "node:test";
import assert from "node:assert/strict";
import { buildContainerLayerGraph } from "../src/pages/Project/ProjectDetails/components/architectureDiagram/graph/layout/buildContainerLayerGraph.js";
import {
  buildGraphIndexes,
  ensureLayers,
} from "../src/pages/Project/ProjectDetails/components/architectureDiagram/graph/layout/graphIndexes.js";
import { buildLayerDetailGraph } from "../src/pages/Project/ProjectDetails/components/architectureDiagram/graph/layout/buildLayerDetailGraph.js";
import {
  CONTAINER_INNER_PADDING_TOP,
  NODE_HEIGHT,
  NODE_WIDTH,
} from "../src/pages/Project/ProjectDetails/components/architectureDiagram/graph/constants.js";

const fixtureGraph = {
  layers: [
    {
      id: "layer-services",
      name: "Services",
      nodeIds: ["file-a", "file-b", "file-c", "file-d"],
    },
  ],
  nodes: [
    {
      id: "file-a",
      name: "UserService",
      type: "file",
      filePath: "src/services/UserService.js",
      complexity: "simple",
    },
    {
      id: "file-b",
      name: "AuthService",
      type: "file",
      filePath: "src/services/AuthService.js",
      complexity: "simple",
    },
    {
      id: "file-c",
      name: "helpers",
      type: "file",
      filePath: "src/utils/helpers.js",
      complexity: "simple",
    },
    {
      id: "file-d",
      name: "format",
      type: "file",
      filePath: "src/utils/format.js",
      complexity: "simple",
    },
  ],
  edges: [
    { source: "file-a", target: "file-c", type: "imports" },
    { source: "file-b", target: "file-d", type: "imports" },
    { source: "file-a", target: "file-b", type: "calls" },
  ],
};

test("buildContainerLayerGraph returns container nodes with layout positions when collapsed", async () => {
  const layers = ensureLayers(fixtureGraph);
  const layer = layers[0];
  const { nodesById, nodeIdToLayerIds } = buildGraphIndexes({ ...fixtureGraph, layers });

  const result = await buildContainerLayerGraph({
    graph: fixtureGraph,
    layer,
    layers,
    nodesById,
    nodeIdToLayerIds,
    selectedNodeId: null,
    changedNodeIds: new Set(),
    affectedNodeIds: new Set(),
    onNodeClick: () => {},
    onContainerToggle: () => {},
    onPortalNavigate: () => {},
    expandedContainers: new Set(),
  });

  const containerNodes = result.nodes.filter((node) => node.type === "container");
  assert.ok(containerNodes.length >= 2, "expected folder containers for services and utils");

  for (const node of containerNodes) {
    assert.ok(Number.isFinite(node.position.x), `container ${node.id} missing x`);
    assert.ok(Number.isFinite(node.position.y), `container ${node.id} missing y`);
    assert.equal(node.data.isExpanded, false);
  }

  assert.ok(
    result.edges.length < fixtureGraph.edges.length,
    "collapsed view should aggregate edges",
  );
});

test("buildContainerLayerGraph emits fewer top-level nodes than flat layer detail layout", async () => {
  const layers = ensureLayers(fixtureGraph);
  const layer = layers[0];
  const { nodesById, nodeIdToLayerIds } = buildGraphIndexes({ ...fixtureGraph, layers });

  const containerResult = await buildContainerLayerGraph({
    graph: fixtureGraph,
    layer,
    layers,
    nodesById,
    nodeIdToLayerIds,
    selectedNodeId: null,
    changedNodeIds: new Set(),
    affectedNodeIds: new Set(),
    onNodeClick: () => {},
    onContainerToggle: () => {},
    onPortalNavigate: () => {},
    expandedContainers: new Set(),
  });

  const flatResult = await buildLayerDetailGraph({
    graph: fixtureGraph,
    layer,
    nodesById,
    selectedNodeId: null,
    changedNodeIds: new Set(),
    affectedNodeIds: new Set(),
    onNodeClick: () => {},
  });

  assert.ok(
    containerResult.nodes.length < flatResult.nodes.length,
    "container layout should expose fewer top-level nodes than flat file layout",
  );
});

const expandableFixture = {
  layers: [
    {
      id: "layer-frontend",
      name: "Frontend",
      nodeIds: ["f1", "f2", "f3", "f4"],
    },
  ],
  nodes: [
    {
      id: "f1",
      name: "App",
      type: "file",
      filePath: "src/pages/App.tsx",
      complexity: "simple",
    },
    {
      id: "f2",
      name: "Home",
      type: "file",
      filePath: "src/pages/Home.tsx",
      complexity: "simple",
    },
    {
      id: "f3",
      name: "About",
      type: "file",
      filePath: "src/pages/About.tsx",
      complexity: "simple",
    },
    {
      id: "f4",
      name: "Button",
      type: "file",
      filePath: "src/components/Button.tsx",
      complexity: "simple",
    },
  ],
  edges: [
    { source: "f1", target: "f2", type: "imports" },
    { source: "f1", target: "f3", type: "imports" },
    { source: "f1", target: "f4", type: "imports" },
    { source: "f2", target: "f4", type: "imports" },
  ],
};

function boxesOverlap(first, second, tolerance = 4) {
  return !(
    first.x + NODE_WIDTH - tolerance <= second.x ||
    second.x + NODE_WIDTH - tolerance <= first.x ||
    first.y + NODE_HEIGHT - tolerance <= second.y ||
    second.y + NODE_HEIGHT - tolerance <= first.y
  );
}

async function buildExpandedGraph(graph, expandedIds) {
  const layers = ensureLayers(graph);
  const layer = layers[0];
  const { nodesById, nodeIdToLayerIds } = buildGraphIndexes({ ...graph, layers });
  return buildContainerLayerGraph({
    graph,
    layer,
    layers,
    nodesById,
    nodeIdToLayerIds,
    selectedNodeId: null,
    changedNodeIds: new Set(),
    affectedNodeIds: new Set(),
    onNodeClick: () => {},
    onContainerToggle: () => {},
    onPortalNavigate: () => {},
    expandedContainers: expandedIds,
  });
}

test("expanded container uses Stage 2 actualSize on the container node", async () => {
  const collapsed = await buildExpandedGraph(expandableFixture, new Set());
  const targetContainer = collapsed.containers.find((entry) => entry.nodeIds.length >= 2);
  assert.ok(targetContainer, "expected a multi-file container in fixture");

  const expanded = await buildExpandedGraph(expandableFixture, new Set([targetContainer.id]));

  const containerNode = expanded.nodes.find(
    (node) => node.type === "container" && node.id === targetContainer.id,
  );
  const measured = expanded.sizeUpdates.get(targetContainer.id);

  assert.ok(containerNode, "expanded container node should be present");
  assert.ok(measured, "size memory should store measured footprint");
  assert.equal(containerNode.width, measured.width);
  assert.equal(containerNode.height, measured.height);
  assert.equal(containerNode.data.isExpanded, true);

  const collapsedContainer = collapsed.nodes.find((node) => node.id === targetContainer.id);
  assert.ok(
    measured.width >= (collapsedContainer?.width ?? 0) ||
      measured.height >= (collapsedContainer?.height ?? 0),
    "measured footprint should be at least the Stage 1 estimate",
  );
});

test("expanded children are inset below the container header", async () => {
  const collapsed = await buildExpandedGraph(expandableFixture, new Set());
  const targetContainer = collapsed.containers.find((entry) => entry.nodeIds.length >= 2);
  assert.ok(targetContainer);

  const expanded = await buildExpandedGraph(expandableFixture, new Set([targetContainer.id]));

  const childNodes = expanded.nodes.filter(
    (node) => node.type === "architecture-file" && node.parentId === targetContainer.id,
  );
  assert.ok(childNodes.length >= 2, "expected expanded child file nodes");

  for (const child of childNodes) {
    assert.ok(
      child.position.y >= CONTAINER_INNER_PADDING_TOP,
      `child ${child.id} should clear container header`,
    );
  }
});

test("expanded container children do not overlap", async () => {
  const collapsed = await buildExpandedGraph(expandableFixture, new Set());
  const expandedIds = new Set(collapsed.containers.map((entry) => entry.id));
  const expanded = await buildExpandedGraph(expandableFixture, expandedIds);

  const childNodes = expanded.nodes.filter(
    (node) => node.type === "architecture-file" && node.parentId,
  );
  assert.ok(childNodes.length >= 2, "expected multiple expanded children");

  const siblingsByContainer = new Map();
  for (const child of childNodes) {
    const list = siblingsByContainer.get(child.parentId) ?? [];
    list.push(child);
    siblingsByContainer.set(child.parentId, list);
  }

  for (const [containerId, siblings] of siblingsByContainer) {
    for (let i = 0; i < siblings.length; i++) {
      for (let j = i + 1; j < siblings.length; j++) {
        assert.equal(
          boxesOverlap(siblings[i].position, siblings[j].position),
          false,
          `nodes ${siblings[i].id} and ${siblings[j].id} in ${containerId} should not overlap`,
        );
      }
    }
  }
});
