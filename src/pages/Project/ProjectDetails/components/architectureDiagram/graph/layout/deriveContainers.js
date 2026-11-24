import { detectCommunities } from "./detectCommunities.js";

const MIN_BUCKET_COUNT = 2;
const MAX_CONCENTRATION = 0.7;
const MIN_NODES_FOR_SUPPRESSION = 3;
const ROOT_BUCKET = "~";

function commonPrefix(paths) {
  if (paths.length === 0) return "";
  const dirs = paths.map((path) => {
    const slash = path.lastIndexOf("/");
    return slash >= 0 ? path.slice(0, slash) : "";
  });
  let prefix = dirs[0];
  for (const dir of dirs) {
    while (!dir.startsWith(prefix)) {
      prefix = prefix.slice(0, -1);
      if (!prefix) return "";
    }
  }
  const lastSlash = prefix.lastIndexOf("/");
  return lastSlash >= 0 ? prefix.slice(0, lastSlash + 1) : "";
}

function firstSegment(path) {
  const slash = path.indexOf("/");
  return slash >= 0 ? path.slice(0, slash) : path;
}

function groupByFolder(nodes) {
  const withPath = nodes.filter((node) => node.filePath);
  const lcp = commonPrefix(withPath.map((node) => node.filePath));
  const groups = new Map();
  const rooted = [];

  for (const node of nodes) {
    if (!node.filePath) {
      rooted.push(node.id);
      continue;
    }
    const stripped = node.filePath.slice(lcp.length);
    if (!stripped.includes("/")) {
      rooted.push(node.id);
      continue;
    }
    const segment = firstSegment(stripped);
    const list = groups.get(segment) ?? [];
    list.push(node.id);
    groups.set(segment, list);
  }

  return { groups, rooted };
}

function shouldFallbackToCommunity(groups, rooted, totalNodes) {
  const bucketCount = groups.size + (rooted.length > 0 ? 1 : 0);
  if (bucketCount < MIN_BUCKET_COUNT) return true;
  for (const ids of groups.values()) {
    if (ids.length / totalNodes > MAX_CONCENTRATION) return true;
  }
  if (rooted.length / totalNodes > MAX_CONCENTRATION) return true;
  return false;
}

/**
 * Group layer file nodes into folder or community containers.
 * @param {object[]} nodes
 * @param {object[]} edges
 */
export function deriveContainers(nodes, edges) {
  if (!nodes.length) {
    return { containers: [], ungrouped: [] };
  }

  const { groups, rooted } = groupByFolder(nodes);
  const useCommunity = shouldFallbackToCommunity(groups, rooted, nodes.length);
  let containers;

  if (useCommunity) {
    const communities = detectCommunities(
      nodes.map((node) => node.id),
      edges,
    );
    const byCommunity = new Map();
    for (const [nodeId, communityId] of communities) {
      const list = byCommunity.get(communityId) ?? [];
      list.push(nodeId);
      byCommunity.set(communityId, list);
    }
    const sorted = [...byCommunity.entries()].sort((a, b) => a[0] - b[0]);
    containers = sorted.map(([communityId, ids], index) => ({
      id: `container:cluster-${communityId}`,
      name: index < 26 ? `Cluster ${String.fromCharCode(65 + index)}` : `Cluster ${index + 1}`,
      nodeIds: ids,
      strategy: "community",
    }));
  } else {
    containers = [...groups.entries()].map(([segment, ids]) => ({
      id: `container:${segment}`,
      name: segment,
      nodeIds: ids,
      strategy: "folder",
    }));
    if (rooted.length > 0) {
      containers.push({
        id: `container:${ROOT_BUCKET}`,
        name: ROOT_BUCKET,
        nodeIds: rooted,
        strategy: "folder",
      });
    }
  }

  const ungrouped = [];
  if (nodes.length >= MIN_NODES_FOR_SUPPRESSION) {
    containers = containers.filter((container) => {
      if (container.nodeIds.length === 1) {
        ungrouped.push(container.nodeIds[0]);
        return false;
      }
      return true;
    });
  }

  return { containers, ungrouped };
}
