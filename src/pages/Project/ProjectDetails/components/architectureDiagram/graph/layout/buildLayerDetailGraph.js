import {
  GRAPH_UI_SUB_FILE_NODE_TYPES,
  isGraphUiNode,
  NODE_HEIGHT,
  NODE_WIDTH,
  SUB_FILE_NODE_HEIGHT,
} from "../constants.js";
import { isSubFileNode } from "./deriveFileScopeContainers.js";
import { expandLayerMembership, layerNodeIds, normalizeEdges } from "./graphIndexes.js";
import { applyElkLayout } from "./applyElkLayout.js";
import { buildVisibleLayerEdges } from "./edgeAggregation.js";

/**
 * Build layer-detail graph — flat file nodes with all edges always visible.
 * @param {object} params
 */
export async function buildLayerDetailGraph({
  graph,
  layer,
  nodesById,
  selectedNodeId,
  changedNodeIds,
  affectedNodeIds,
  onNodeClick,
  tourActive = false,
  tourResolvedNodeIds = [],
}) {
  const layerIds = expandLayerMembership(graph, layer, nodesById);
  const layerNodes = (graph?.nodes ?? []).filter(
    (node) => layerIds.has(node.id) && !isSubFileNode(node) && isGraphUiNode(node),
  );

  const neighborIds = new Set();
  if (selectedNodeId) {
    for (const edge of normalizeEdges(graph?.edges)) {
      if (edge.source === selectedNodeId) neighborIds.add(edge.target);
      if (edge.target === selectedNodeId) neighborIds.add(edge.source);
    }
  }

  const flowNodes = [];
  const dims = new Map();

  const tourHighlightSet = new Set(tourResolvedNodeIds);
  const hasTourHighlights = tourActive && tourHighlightSet.size > 0;

  for (const node of layerNodes) {
    const nodeHeight = getNodeHeight(node);
    flowNodes.push({
      id: node.id,
      type: "architecture-file",
      position: { x: 0, y: 0 },
      data: buildFileNodeData(node, {
        selectedNodeId,
        neighborIds,
        changedNodeIds,
        affectedNodeIds,
        onNodeClick,
        tourActive,
        hasTourHighlights,
        isTourHighlighted: tourHighlightSet.has(node.id),
      }),
    });
    dims.set(node.id, { width: NODE_WIDTH, height: nodeHeight });
  }

  const visibleIds = new Set(flowNodes.map((node) => node.id));
  const layerEdges = normalizeEdges(graph?.edges).filter(
    (edge) => layerIds.has(edge.source) && layerIds.has(edge.target),
  );
  const edges = buildVisibleLayerEdges({
    layerEdges,
    visibleIds,
    selectedNodeId,
  });

  return applyElkLayout(flowNodes, edges, dims);
}

function getNodeHeight(node) {
  if (node && GRAPH_UI_SUB_FILE_NODE_TYPES.has(node.type)) return SUB_FILE_NODE_HEIGHT;
  return NODE_HEIGHT;
}

function buildFileNodeData(node, ctx) {
  const isSelected = ctx.selectedNodeId === node.id;
  const isNeighbor = ctx.neighborIds.has(node.id);
  const hasSelection = Boolean(ctx.selectedNodeId) && !ctx.tourActive;
  const isTourHighlighted = Boolean(ctx.isTourHighlighted);
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
    isDiffChanged: ctx.changedNodeIds.has(node.id),
    isDiffAffected: ctx.affectedNodeIds.has(node.id),
    onNodeClick: ctx.onNodeClick,
  };
}
