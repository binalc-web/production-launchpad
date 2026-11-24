import { ALL_NODE_TYPES, getEdgeCategory, NODE_TYPE_TO_CATEGORY } from "../graphConstants.js";

/**
 * Filter nodes by type, complexity, and layer membership.
 * @param {object[]} nodes
 * @param {Map<string, Set<string>>} nodeIdToLayerIds
 * @param {object} filters
 */
export function filterGraphNodes(nodes, nodeIdToLayerIds, filters) {
  const hasLayerFilter = filters.layerIds.size > 0;
  return nodes.filter((node) => {
    if (!filters.nodeTypes.has(node.type)) return false;
    if (node.complexity && !filters.complexities.has(node.complexity)) return false;
    if (hasLayerFilter) {
      const layerIds = nodeIdToLayerIds.get(node.id);
      if (!layerIds) return false;
      let inSelected = false;
      for (const layerId of layerIds) {
        if (filters.layerIds.has(layerId)) {
          inSelected = true;
          break;
        }
      }
      if (!inSelected) return false;
    }
    return true;
  });
}

/**
 * Filter edges to visible nodes and edge categories.
 * @param {object[]} edges
 * @param {Set<string>} visibleNodeIds
 * @param {object} filters
 */
export function filterGraphEdges(edges, visibleNodeIds, filters) {
  return edges.filter((edge) => {
    if (!visibleNodeIds.has(edge.source) || !visibleNodeIds.has(edge.target)) return false;
    const category = getEdgeCategory(edge.type);
    if (category && !filters.edgeCategories.has(category)) return false;
    return true;
  });
}

/**
 * Apply node-type category pill filters used in the UA header.
 * @param {object[]} nodes
 * @param {Record<string, boolean>} nodeTypeFilters
 */
export function applyNodeTypeCategoryFilters(nodes, nodeTypeFilters) {
  return nodes.filter((node) => {
    const category = NODE_TYPE_TO_CATEGORY[node.type] ?? "code";
    return nodeTypeFilters[category] !== false;
  });
}

/**
 * Expand layer membership for class/function detail levels.
 * @param {object} graph
 * @param {Set<string>} layerNodeIdSet
 * @param {Map<string, object>} nodesById
 * @param {"file"|"class"} detailLevel
 * @param {boolean} showFunctionsInClassView
 */
export function expandLayerNodeIds(
  graph,
  layerNodeIdSet,
  nodesById,
  detailLevel,
  showFunctionsInClassView,
) {
  const expanded = new Set(layerNodeIdSet);
  if (detailLevel === "file") return expanded;

  for (const edge of graph?.edges ?? []) {
    if (edge.type !== "contains" || !layerNodeIdSet.has(edge.source)) continue;
    const child = nodesById.get(edge.target);
    if (!child) continue;
    if (child.type === "class") expanded.add(edge.target);
    if (child.type === "function" && showFunctionsInClassView) expanded.add(edge.target);
  }

  return expanded;
}

/** Visible node types for structural graph rendering. */
export const STRUCTURAL_VISIBLE_TYPES = new Set([
  "file",
  "module",
  "concept",
  "config",
  "document",
  "service",
  "table",
  "endpoint",
  "pipeline",
  "schema",
  "resource",
  "domain",
  "flow",
  "step",
  "function",
  "class",
]);

/**
 * Filter layer nodes for structural graph display.
 */
export function filterLayerStructuralNodes(nodes, options) {
  const {
    expandedLayerNodeIds,
    nodeTypeFilters,
    persona = "technical",
    detailLevel = "file",
  } = options;

  const subFileTypes = new Set(["function", "class"]);

  return nodes.filter((node) => {
    if (!expandedLayerNodeIds.has(node.id)) return false;
    if (!STRUCTURAL_VISIBLE_TYPES.has(node.type)) return false;
    if (persona === "non-technical" && subFileTypes.has(node.type)) return false;
    if (detailLevel === "file" && subFileTypes.has(node.type)) return false;
    const category = NODE_TYPE_TO_CATEGORY[node.type] ?? "code";
    if (nodeTypeFilters?.[category] === false) return false;
    return true;
  });
}

/** Default filter state factory for store reset. */
export { ALL_NODE_TYPES };

/**
 * Build a filtered subgraph snapshot for export.
 * @param {object} graph
 * @param {object} graphIndexes
 * @param {object} storeState
 */
export function buildFilteredGraphSnapshot(graph, graphIndexes, storeState) {
  if (!graph) return graph;

  const { nodesById, nodeIdToLayerIds } = graphIndexes;
  let nodes = filterGraphNodes(graph.nodes ?? [], nodeIdToLayerIds, storeState.filters);
  nodes = applyNodeTypeCategoryFilters(nodes, storeState.nodeTypeFilters);

  const visibleNodeIds = new Set(nodes.map((node) => node.id));
  const edges = filterGraphEdges(graph.edges ?? [], visibleNodeIds, storeState.filters);

  return {
    ...graph,
    nodes,
    edges,
    exportedAt: new Date().toISOString(),
    exportFilters: {
      detailLevel: storeState.detailLevel,
      nodeTypeFilters: storeState.nodeTypeFilters,
    },
  };
}
