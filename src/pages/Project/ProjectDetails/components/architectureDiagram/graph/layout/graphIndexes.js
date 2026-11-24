import { GRAPH_UI_SUB_FILE_NODE_TYPES } from "../constants.js";

/**
 * Build lookup maps for graph navigation.
 * @param {object|null} graph
 */
export function buildGraphIndexes(graph) {
  const nodesById = new Map();
  const nodeIdToLayerId = new Map();
  const nodeIdToLayerIds = new Map();

  for (const node of graph?.nodes ?? []) {
    if (node?.id) nodesById.set(node.id, node);
  }

  for (const layer of graph?.layers ?? []) {
    const ids = Array.isArray(layer.nodeIds)
      ? layer.nodeIds
      : Array.isArray(layer.nodes)
        ? layer.nodes.map((n) => (typeof n === "string" ? n : n?.id)).filter(Boolean)
        : [];

    for (const nodeId of ids) {
      if (!nodeIdToLayerId.has(nodeId)) nodeIdToLayerId.set(nodeId, layer.id);
      const list = nodeIdToLayerIds.get(nodeId) ?? [];
      list.push(layer.id);
      nodeIdToLayerIds.set(nodeId, list);
    }
  }

  // Inherit layer from parent file for class nodes linked via "contains" (functions are not on canvas).
  for (const edge of normalizeEdges(graph?.edges)) {
    if (edge.type !== "contains") continue;
    const parentLayerId = nodeIdToLayerId.get(edge.source);
    if (!parentLayerId || nodeIdToLayerId.has(edge.target)) continue;
    const child = nodesById.get(edge.target);
    if (!child || !GRAPH_UI_SUB_FILE_NODE_TYPES.has(child.type)) continue;
    nodeIdToLayerId.set(edge.target, parentLayerId);
    const list = nodeIdToLayerIds.get(edge.target) ?? [];
    list.push(parentLayerId);
    nodeIdToLayerIds.set(edge.target, list);
  }

  return { nodesById, nodeIdToLayerId, nodeIdToLayerIds };
}

/**
 * Derive pseudo-layers when graph.layers is missing.
 * @param {object} graph
 */
export function ensureLayers(graph) {
  if (Array.isArray(graph?.layers) && graph.layers.length > 0) {
    return graph.layers;
  }

  const buckets = new Map();
  for (const node of graph?.nodes ?? []) {
    const tag = (node.tags || []).find((t) => typeof t === "string" && t.length > 0);
    const fromPath = node.filePath ? node.filePath.split("/")[0] : null;
    const key = tag || fromPath || node.type || "Other";
    const list = buckets.get(key) ?? [];
    list.push(node.id);
    buckets.set(key, list);
  }

  return Array.from(buckets.entries()).map(([name, nodeIds], index) => ({
    id: `layer-${index}`,
    name,
    description: `${nodeIds.length} nodes`,
    nodeIds,
  }));
}

export function layerNodeIds(layer) {
  if (!layer) return [];
  if (Array.isArray(layer.nodeIds)) return layer.nodeIds;
  if (Array.isArray(layer.nodes)) {
    return layer.nodes.map((n) => (typeof n === "string" ? n : n?.id)).filter(Boolean);
  }
  return [];
}

/**
 * Expand layer membership with class nodes contained by layer files.
 * Functions stay in graph data but are not drawn on the canvas.
 */
export function expandLayerMembership(graph, layer, nodesById) {
  const baseIds = new Set(layerNodeIds(layer));
  const expanded = new Set(baseIds);

  for (const edge of normalizeEdges(graph?.edges)) {
    if (edge.type !== "contains" || !baseIds.has(edge.source)) continue;
    const child = nodesById.get(edge.target);
    if (child && GRAPH_UI_SUB_FILE_NODE_TYPES.has(child.type)) {
      expanded.add(edge.target);
    }
  }

  return expanded;
}

/** Map parent file id → contained class node ids (graph UI excludes functions). */
export function buildContainsChildrenByFile(graph, parentFileIds, nodesById) {
  const parentSet = parentFileIds instanceof Set ? parentFileIds : new Set(parentFileIds);
  const map = new Map();

  for (const edge of normalizeEdges(graph?.edges)) {
    if (edge.type !== "contains" || !parentSet.has(edge.source)) continue;
    const child = nodesById.get(edge.target);
    if (!child || !GRAPH_UI_SUB_FILE_NODE_TYPES.has(child.type)) continue;
    const list = map.get(edge.source) ?? [];
    list.push(edge.target);
    map.set(edge.source, list);
  }

  return map;
}

export function normalizeEdges(edges) {
  if (!Array.isArray(edges)) return [];
  return edges
    .map((e, index) => ({
      id: String(e.id ?? `edge-${index}`),
      source: e.source ?? e.from ?? e.src,
      target: e.target ?? e.to ?? e.dst,
      type: e.type,
      label: e.description || e.type,
    }))
    .filter((e) => e.source && e.target);
}

/** Aggregate complexity for a layer from its nodes. */
export function aggregateLayerComplexity(nodeIds, nodesById) {
  const ranks = { simple: 0, moderate: 1, complex: 2 };
  let max = 0;
  for (const id of nodeIds) {
    const c = nodesById.get(id)?.complexity || "simple";
    max = Math.max(max, ranks[c] ?? 0);
  }
  if (max >= 2) return "complex";
  if (max >= 1) return "moderate";
  return "simple";
}
