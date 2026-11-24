/**
 * Lightweight client-side node search (name, summary, tags, filePath).
 * @param {object|null} graph
 * @param {string} query
 * @param {number} [limit=25]
 */
export function searchGraphNodes(graph, query, limit = 25) {
  const trimmed = String(query || "")
    .trim()
    .toLowerCase();
  if (!trimmed || !graph?.nodes?.length) return [];

  const results = [];
  for (const node of graph.nodes) {
    const haystack = [
      node.name,
      node.summary,
      node.filePath,
      ...(Array.isArray(node.tags) ? node.tags : []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (!haystack.includes(trimmed)) continue;

    let score = 0;
    if (
      String(node.name || "")
        .toLowerCase()
        .includes(trimmed)
    )
      score += 3;
    if (
      String(node.filePath || "")
        .toLowerCase()
        .includes(trimmed)
    )
      score += 2;
    if (
      String(node.summary || "")
        .toLowerCase()
        .includes(trimmed)
    )
      score += 1;

    results.push({ nodeId: node.id, score });
  }

  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}

/**
 * BFS shortest path between two nodes on filtered edges.
 * @param {object[]} edges
 * @param {string} startId
 * @param {string} endId
 */
export function findShortestPath(edges, startId, endId) {
  if (!startId || !endId || startId === endId) return [startId].filter(Boolean);

  const adjacency = new Map();
  for (const edge of edges) {
    if (!adjacency.has(edge.source)) adjacency.set(edge.source, new Set());
    if (!adjacency.has(edge.target)) adjacency.set(edge.target, new Set());
    adjacency.get(edge.source).add(edge.target);
    adjacency.get(edge.target).add(edge.source);
  }

  const queue = [startId];
  const visited = new Set([startId]);
  const previous = new Map();

  while (queue.length) {
    const current = queue.shift();
    if (current === endId) break;
    for (const neighbor of adjacency.get(current) ?? []) {
      if (visited.has(neighbor)) continue;
      visited.add(neighbor);
      previous.set(neighbor, current);
      queue.push(neighbor);
    }
  }

  if (!visited.has(endId)) return [];

  const path = [endId];
  let cursor = endId;
  while (previous.has(cursor)) {
    cursor = previous.get(cursor);
    path.unshift(cursor);
  }
  return path;
}
