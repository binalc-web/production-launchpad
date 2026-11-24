import Graph from "graphology";
import louvain from "graphology-communities-louvain";

/**
 * Run Louvain community detection over layer-internal edges.
 * @param {string[]} nodeIds
 * @param {object[]} edges
 * @returns {Map<string, number>}
 */
export function detectCommunities(nodeIds, edges) {
  const ids = new Set(nodeIds);
  const graph = new Graph({ type: "undirected", multi: false });

  for (const id of nodeIds) graph.addNode(id);

  for (const edge of edges) {
    if (!ids.has(edge.source) || !ids.has(edge.target)) continue;
    if (edge.source === edge.target) continue;
    if (graph.hasEdge(edge.source, edge.target)) continue;
    graph.addEdge(edge.source, edge.target);
  }

  const result = louvain(graph);
  const map = new Map();
  for (const id of nodeIds) {
    map.set(id, result[id] ?? -1);
  }

  let next = Math.max(...Array.from(map.values()).filter((value) => value >= 0), -1) + 1;
  for (const [id, communityId] of map) {
    if (communityId === -1) map.set(id, next++);
  }

  return map;
}
