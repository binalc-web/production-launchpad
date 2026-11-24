/**
 * Build a map of diagram node id → display label from architectureGraph.
 * @param {object | null | undefined} architectureGraph
 * @returns {Map<string, string>}
 */
export function buildNodeLabelMap(architectureGraph) {
  const map = new Map();
  const nodes = Array.isArray(architectureGraph?.nodes) ? architectureGraph.nodes : [];
  for (const node of nodes) {
    const id = String(node?.id ?? "");
    if (!id) continue;
    const label = String(node.plainName ?? node.label ?? node.name ?? id);
    map.set(id, label);
  }
  return map;
}

/**
 * Resolve related node ids to display labels.
 * @param {string[]} relatedNodeIds
 * @param {Map<string, string>} nodeLabelMap
 */
export function resolveRelatedNodeLabels(relatedNodeIds, nodeLabelMap) {
  const ids = Array.isArray(relatedNodeIds) ? relatedNodeIds : [];
  return ids.map((id) => ({
    id: String(id),
    label: nodeLabelMap.get(String(id)) ?? String(id),
  }));
}
