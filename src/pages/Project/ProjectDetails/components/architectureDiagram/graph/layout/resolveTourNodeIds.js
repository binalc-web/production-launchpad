import { isGraphUiNode, SUB_FILE_NODE_TYPES } from "../constants.js";
import { normalizeEdges } from "./graphIndexes.js";

/**
 * Walk "contains" edges upward to find the parent file node for a child symbol.
 * @param {string} nodeId
 * @param {Map<string, object>} nodesById
 * @param {object[]} edges
 * @returns {string|null}
 */
function resolveParentFileNodeId(nodeId, nodesById, edges) {
  const visited = new Set();
  let currentId = nodeId;

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const node = nodesById.get(currentId);
    if (!node) return null;

    if (isGraphUiNode(node) && !SUB_FILE_NODE_TYPES.has(node.type)) {
      return currentId;
    }

    let parentId = null;
    for (const edge of normalizeEdges(edges)) {
      if (edge.type !== "contains" || edge.target !== currentId) continue;
      parentId = edge.source;
      break;
    }

    if (!parentId) return null;
    currentId = parentId;
  }

  return null;
}

/**
 * Map tour step nodeIds to file-level nodes visible on the layer canvas.
 * Function/class references resolve to their parent file node.
 * @param {string[]} nodeIds
 * @param {object|null} graph
 * @param {Map<string, object>} nodesById
 * @returns {string[]}
 */
export function resolveTourNodeIds(nodeIds, graph, nodesById) {
  if (!Array.isArray(nodeIds) || nodeIds.length === 0) return [];

  const edges = graph?.edges ?? [];
  const resolved = new Set();

  for (const nodeId of nodeIds) {
    if (!nodeId) continue;
    const node = nodesById.get(nodeId);

    if (node && isGraphUiNode(node) && !SUB_FILE_NODE_TYPES.has(node.type)) {
      resolved.add(nodeId);
      continue;
    }

    const parentFileId = resolveParentFileNodeId(nodeId, nodesById, edges);
    if (parentFileId) resolved.add(parentFileId);
  }

  return Array.from(resolved);
}

/**
 * Sort tour steps by order field.
 * @param {object|null} graph
 * @returns {object[]}
 */
export function getSortedTourSteps(graph) {
  const tour = graph?.tour;
  if (!Array.isArray(tour) || tour.length === 0) return [];
  return [...tour].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}
