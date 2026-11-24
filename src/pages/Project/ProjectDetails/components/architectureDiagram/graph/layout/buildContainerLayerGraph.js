import { MarkerType } from "@xyflow/react";
import {
  CONTAINER_INNER_PADDING_BOTTOM,
  CONTAINER_INNER_PADDING_TOP,
  CONTAINER_INNER_PADDING_X,
  ELK_DEFAULT_LAYOUT_OPTIONS,
  getLayerColor,
  graphEdgeRouting,
  isGraphUiNode,
  NODE_HEIGHT,
  NODE_WIDTH,
} from "../constants.js";
import { layerNodeIds, normalizeEdges } from "./graphIndexes.js";
import { deriveContainers } from "./deriveContainers.js";
import {
  aggregateContainerEdges,
  aggregateLayerEdgesDetailed,
  computePortals,
  findCrossLayerFileNodes,
} from "./buildCompoundGraph.js";
import { expandLayerNodeIds, filterLayerStructuralNodes } from "./applyGraphFilters.js";
import { applyElkLayout, repairElkInput } from "./applyElkLayout.js";
import { buildGraphEdgeLabels, buildGraphEdgeStyle } from "./edgeAggregation.js";

const STAGE1_MAX_CONTAINER_WIDTH = 800;
const STAGE1_MAX_CONTAINER_HEIGHT = 600;
const PORTAL_NODE_WIDTH = 220;
const PORTAL_NODE_HEIGHT = 72;

function estimateContainerSize(container, sizeMemory) {
  const memo = sizeMemory.get(container.id);
  if (memo) return memo;
  const estimateW = Math.sqrt(container.nodeIds.length) * NODE_WIDTH * 1.2;
  const estimateH = Math.sqrt(container.nodeIds.length) * NODE_HEIGHT * 1.2;
  return {
    width: Math.min(STAGE1_MAX_CONTAINER_WIDTH, Math.max(NODE_WIDTH, estimateW)),
    height: Math.min(STAGE1_MAX_CONTAINER_HEIGHT, Math.max(NODE_HEIGHT, estimateH)),
  };
}

/** True when measured container size differs from Stage 1 estimate by more than 20%. */
function didContainerSizeDeviate(actualSize, stage1Estimate) {
  if (!actualSize || !stage1Estimate?.width || !stage1Estimate?.height) return false;
  const widthDelta = Math.abs(actualSize.width - stage1Estimate.width) / stage1Estimate.width;
  const heightDelta = Math.abs(actualSize.height - stage1Estimate.height) / stage1Estimate.height;
  return widthDelta > 0.2 || heightDelta > 0.2;
}

/** Apply Stage 2 measured dimensions to expanded container atoms. */
function patchContainerNodes(stage1Nodes, expandedContainers, sizeUpdates) {
  return stage1Nodes.map((node) => {
    if (node.type !== "container" || !expandedContainers.has(node.id)) return node;
    const actual = sizeUpdates.get(node.id);
    if (!actual) {
      return { ...node, data: { ...node.data, isExpanded: true } };
    }
    return {
      ...node,
      width: actual.width,
      height: actual.height,
      style: { ...(node.style || {}), width: actual.width, height: actual.height },
      data: { ...node.data, isExpanded: true },
    };
  });
}

/** Build Stage 1 dimension map — prefers measured sizes from sizeMemory. */
function buildStage1Dims(containerFlowNodes, ungroupedFlowNodes, portalFlowNodes, sizeMemory) {
  return new Map([
    ...containerFlowNodes.map((node) => {
      const memo = sizeMemory.get(node.id);
      return [
        node.id,
        {
          width: memo?.width ?? node.width ?? NODE_WIDTH,
          height: memo?.height ?? node.height ?? NODE_HEIGHT,
        },
      ];
    }),
    ...ungroupedFlowNodes.map((node) => [node.id, { width: NODE_WIDTH, height: NODE_HEIGHT }]),
    ...portalFlowNodes.map((node) => [
      node.id,
      { width: PORTAL_NODE_WIDTH, height: PORTAL_NODE_HEIGHT },
    ]),
  ]);
}

function buildFileNodeData(node, ctx) {
  const isSelected = ctx.selectedNodeId === node.id;
  const isNeighbor = ctx.neighborIds.has(node.id);
  const hasSelection = Boolean(ctx.selectedNodeId) && !ctx.tourActive;
  const isTourHighlighted = ctx.tourHighlightSet.has(node.id);
  const isSearchHighlighted = ctx.searchHitSet.has(node.id);
  const diffEnabled = ctx.diffEnabled;

  return {
    label: node.name || node.id,
    nodeType: node.type || "file",
    summary: node.summary || "",
    complexity: node.complexity || "simple",
    tags: node.tags || [],
    isSelected,
    isNeighbor,
    isSelectionFaded: hasSelection && !isSelected && !isNeighbor,
    isTourHighlighted,
    isTourFaded: ctx.tourActive && ctx.hasTourHighlights && !isTourHighlighted,
    isSearchHighlighted,
    isDiffChanged: diffEnabled && ctx.changedNodeIds.has(node.id),
    isDiffAffected: diffEnabled && ctx.affectedNodeIds.has(node.id),
    isDiffFaded:
      diffEnabled && !ctx.changedNodeIds.has(node.id) && !ctx.affectedNodeIds.has(node.id),
    onNodeClick: ctx.onNodeClick,
  };
}

async function layoutStage2Container(container, intraContainer, elk) {
  const childIds = new Set(container.nodeIds);
  const childEdges = intraContainer.filter(
    (edge) => childIds.has(edge.source) && childIds.has(edge.target),
  );

  const elkInput = {
    id: container.id,
    layoutOptions: ELK_DEFAULT_LAYOUT_OPTIONS,
    children: container.nodeIds.map((id) => ({
      id,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    })),
    edges: childEdges.map((edge, index) => ({
      id: `${container.id}-e${index}`,
      sources: [edge.source],
      targets: [edge.target],
    })),
  };

  const { input } = repairElkInput(elkInput);
  const layouted = await elk.layout(input);
  const childPositions = new Map();
  let maxX = 0;
  let maxY = 0;

  for (const child of layouted.children ?? []) {
    const x = child.x ?? 0;
    const y = child.y ?? 0;
    const width = child.width ?? NODE_WIDTH;
    const height = child.height ?? NODE_HEIGHT;
    childPositions.set(child.id, { x, y });
    maxX = Math.max(maxX, x + width);
    maxY = Math.max(maxY, y + height);
  }

  return {
    childPositions,
    actualSize: {
      width: maxX + CONTAINER_INNER_PADDING_X * 2,
      height: maxY + CONTAINER_INNER_PADDING_TOP + CONTAINER_INNER_PADDING_BOTTOM,
    },
  };
}

function buildInflatedEdges({
  stage1Edges,
  filteredEdges,
  nodeToContainer,
  expandedContainers,
  selectedNodeId,
}) {
  if (expandedContainers.size === 0) return stage1Edges;

  const out = [];
  const seen = new Set();

  for (const edge of stage1Edges) {
    const sourceAtom = String(edge.source);
    const targetAtom = String(edge.target);
    const sourceExpanded = expandedContainers.has(sourceAtom);
    const targetExpanded = expandedContainers.has(targetAtom);

    if (!sourceExpanded && !targetExpanded) {
      out.push(edge);
      continue;
    }

    for (const rawEdge of filteredEdges) {
      const sourceContainer = nodeToContainer.get(rawEdge.source);
      const targetContainer = nodeToContainer.get(rawEdge.target);
      if (sourceContainer !== sourceAtom || targetContainer !== targetAtom) continue;

      const realSource = sourceExpanded ? rawEdge.source : sourceAtom;
      const realTarget = targetExpanded ? rawEdge.target : targetAtom;
      const key = `${realSource}|${realTarget}|${rawEdge.type}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const isSelectedEdge =
        selectedNodeId && (realSource === selectedNodeId || realTarget === selectedNodeId);
      const label = rawEdge.label || rawEdge.type || "link";

      out.push({
        id: `inflated-${key}`,
        source: realSource,
        target: realTarget,
        ...graphEdgeRouting(),
        animated: Boolean(isSelectedEdge),
        ...buildGraphEdgeLabels(label),
        style: buildGraphEdgeStyle({
          isIncident: !selectedNodeId || isSelectedEdge,
          strokeWidth: isSelectedEdge ? 2.5 : 2,
        }),
      });
    }
  }

  return out;
}

/**
 * Build container-based layer-detail React Flow graph (UA structural parity).
 * @param {object} params
 */
export async function buildContainerLayerGraph({
  graph,
  layer,
  nodesById,
  nodeIdToLayerIds,
  selectedNodeId,
  changedNodeIds,
  affectedNodeIds,
  onNodeClick,
  onContainerToggle,
  onPortalNavigate,
  tourActive = false,
  tourResolvedNodeIds = [],
  expandedContainers = new Set(),
  containerLayoutCache = new Map(),
  containerSizeMemory = new Map(),
  nodeTypeFilters,
  detailLevel = "file",
  showFunctionsInClassView = false,
  persona = "technical",
  diffEnabled = true,
  searchResults = [],
  layers,
}) {
  const layerNodeIdSet = new Set(layerNodeIds(layer));
  const expandedLayerNodeIds = expandLayerNodeIds(
    graph,
    layerNodeIdSet,
    nodesById,
    detailLevel,
    showFunctionsInClassView,
  );

  const filteredGraphNodes = filterLayerStructuralNodes(graph?.nodes ?? [], {
    expandedLayerNodeIds,
    nodeTypeFilters,
    persona,
    detailLevel,
  }).filter((node) => isGraphUiNode(node));

  const filteredNodeIds = new Set(filteredGraphNodes.map((node) => node.id));
  const filteredGraphEdges = normalizeEdges(graph?.edges).filter(
    (edge) => filteredNodeIds.has(edge.source) && filteredNodeIds.has(edge.target),
  );

  const { containers, ungrouped } = deriveContainers(filteredGraphNodes, filteredGraphEdges);
  const ungroupedSet = new Set(ungrouped);
  const nodeToContainer = new Map();

  for (const container of containers) {
    for (const nodeId of container.nodeIds) nodeToContainer.set(nodeId, container.id);
  }
  for (const nodeId of ungrouped) nodeToContainer.set(nodeId, nodeId);

  const { intraContainer, interContainerAggregated } = aggregateContainerEdges(
    filteredGraphEdges,
    nodeToContainer,
  );

  const neighborIds = new Set();
  if (selectedNodeId) {
    for (const edge of filteredGraphEdges) {
      if (edge.source === selectedNodeId) neighborIds.add(edge.target);
      if (edge.target === selectedNodeId) neighborIds.add(edge.source);
    }
  }

  const tourHighlightSet = new Set(tourResolvedNodeIds);
  const hasTourHighlights = tourActive && tourHighlightSet.size > 0;
  const searchHitSet = new Set(searchResults.map((result) => result.nodeId));

  const nodeCtx = {
    selectedNodeId,
    neighborIds,
    changedNodeIds,
    affectedNodeIds,
    onNodeClick,
    tourActive,
    tourHighlightSet,
    hasTourHighlights,
    searchHitSet,
    diffEnabled,
  };

  const layerAggregated = aggregateLayerEdgesDetailed(graph, layers);
  const portals = computePortals(graph, layer.id, layerAggregated);
  const layerIndexMap = new Map((graph?.layers ?? []).map((entry, index) => [entry.id, index]));

  const containerFlowNodes = containers.map((container, index) => {
    const size = estimateContainerSize(container, containerSizeMemory);
    const color = getLayerColor(index);
    return {
      id: container.id,
      type: "container",
      position: { x: 0, y: 0 },
      width: size.width,
      height: size.height,
      data: {
        containerId: container.id,
        name: container.name === "~" ? "(root)" : container.name,
        childCount: container.nodeIds.length,
        strategy: container.strategy,
        colorIndex: index,
        layerColor: color.label,
        isExpanded: expandedContainers.has(container.id),
        onToggle: onContainerToggle,
      },
    };
  });

  const ungroupedFlowNodes = filteredGraphNodes
    .filter((node) => ungroupedSet.has(node.id))
    .map((node) => ({
      id: node.id,
      type: "architecture-file",
      position: { x: 0, y: 0 },
      data: buildFileNodeData(node, nodeCtx),
    }));

  const portalFlowNodes = portals.map((portal) => ({
    id: `portal:${portal.layerId}`,
    type: "portal",
    position: { x: 0, y: 0 },
    data: {
      targetLayerId: portal.layerId,
      targetLayerName: portal.layerName,
      connectionCount: portal.connectionCount,
      layerColorIndex: layerIndexMap.get(portal.layerId) ?? 0,
      onNavigate: onPortalNavigate,
    },
  }));

  const aggEdges = interContainerAggregated.map((agg, index) => ({
    id: `agg-${index}`,
    source: agg.sourceContainerId,
    target: agg.targetContainerId,
    ...graphEdgeRouting(),
    label: String(agg.count),
    markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
    style: buildGraphEdgeStyle({
      isIncident: true,
      strokeWidth: Math.min(1 + Math.log2(agg.count + 1), 5),
    }),
    ...buildGraphEdgeLabels(String(agg.count)),
  }));

  const portalEdges = [];
  let portalEdgeIndex = aggEdges.length;
  for (const portal of portals) {
    const crossFiles = findCrossLayerFileNodes(graph, layer.id, portal.layerId);
    const seenAtoms = new Set();
    for (const fileId of crossFiles) {
      if (!filteredNodeIds.has(fileId)) continue;
      const atomId = nodeToContainer.get(fileId) ?? fileId;
      if (seenAtoms.has(atomId)) continue;
      seenAtoms.add(atomId);
      portalEdges.push({
        id: `portal-edge-${portalEdgeIndex++}`,
        source: atomId,
        target: `portal:${portal.layerId}`,
        ...graphEdgeRouting(),
        style: { stroke: "var(--arch-edge)", strokeWidth: 1, strokeDasharray: "4 4", opacity: 0.5 },
      });
    }
  }

  const stage1Estimates = new Map(
    containerFlowNodes.map((node) => [
      node.id,
      { width: node.width ?? NODE_WIDTH, height: node.height ?? NODE_HEIGHT },
    ]),
  );

  let stage1Dims = buildStage1Dims(
    containerFlowNodes,
    ungroupedFlowNodes,
    portalFlowNodes,
    containerSizeMemory,
  );

  let stage1Layout = await applyElkLayout(
    [...containerFlowNodes, ...ungroupedFlowNodes, ...portalFlowNodes],
    [...aggEdges, ...portalEdges],
    stage1Dims,
  );

  const cacheUpdates = new Map(containerLayoutCache);
  const sizeUpdates = new Map(containerSizeMemory);
  const expandedChildNodes = [];
  let needsStage1Reflow = false;

  const elkModule = await import("elkjs/lib/elk.bundled.js");
  const elk = new elkModule.default();

  for (const containerId of expandedContainers) {
    const container = containers.find((entry) => entry.id === containerId);
    if (!container) continue;

    let cacheEntry = cacheUpdates.get(containerId);
    if (!cacheEntry) {
      const stage2 = await layoutStage2Container(container, intraContainer, elk);
      cacheEntry = stage2;
      cacheUpdates.set(containerId, stage2);
      sizeUpdates.set(containerId, stage2.actualSize);

      const stage1Estimate = stage1Estimates.get(containerId);
      if (didContainerSizeDeviate(stage2.actualSize, stage1Estimate)) {
        needsStage1Reflow = true;
      }
    }

    for (const childId of container.nodeIds) {
      const node = nodesById.get(childId);
      const position = cacheEntry.childPositions.get(childId);
      if (!node || !position) continue;
      expandedChildNodes.push({
        id: childId,
        type: "architecture-file",
        parentId: containerId,
        extent: "parent",
        position: {
          x: position.x + CONTAINER_INNER_PADDING_X,
          y: position.y + CONTAINER_INNER_PADDING_TOP,
        },
        data: buildFileNodeData(node, nodeCtx),
      });
    }
  }

  if (needsStage1Reflow) {
    stage1Dims = buildStage1Dims(
      containerFlowNodes,
      ungroupedFlowNodes,
      portalFlowNodes,
      sizeUpdates,
    );
    stage1Layout = await applyElkLayout(
      [...containerFlowNodes, ...ungroupedFlowNodes, ...portalFlowNodes],
      [...aggEdges, ...portalEdges],
      stage1Dims,
    );
  }

  const patchedStage1Nodes = patchContainerNodes(
    stage1Layout.nodes,
    expandedContainers,
    sizeUpdates,
  );

  const inflatedEdges = buildInflatedEdges({
    stage1Edges: aggEdges,
    filteredEdges: filteredGraphEdges,
    nodeToContainer,
    expandedContainers,
    selectedNodeId,
  });

  const intraExpandedEdges = [];
  if (expandedContainers.size > 0) {
    const seen = new Set();
    for (const edge of intraContainer) {
      const containerId = nodeToContainer.get(edge.source);
      if (!containerId || !expandedContainers.has(containerId)) continue;
      const key = `intra|${edge.source}|${edge.target}|${edge.type}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const isSelectedEdge =
        selectedNodeId && (edge.source === selectedNodeId || edge.target === selectedNodeId);
      intraExpandedEdges.push({
        id: key,
        source: edge.source,
        target: edge.target,
        ...graphEdgeRouting(),
        animated: Boolean(isSelectedEdge),
        ...buildGraphEdgeLabels(edge.type || "link"),
        style: buildGraphEdgeStyle({
          isIncident: !selectedNodeId || isSelectedEdge,
          strokeWidth: isSelectedEdge ? 2.5 : 2,
        }),
      });
    }
  }

  return {
    nodes: [...patchedStage1Nodes, ...expandedChildNodes],
    edges: [...inflatedEdges, ...intraExpandedEdges, ...portalEdges],
    nodeToContainer,
    containers,
    cacheUpdates,
    sizeUpdates,
  };
}
