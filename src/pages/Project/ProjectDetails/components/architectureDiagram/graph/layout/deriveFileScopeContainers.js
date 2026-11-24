import { SUB_FILE_NODE_TYPES } from "../constants.js";
import { buildContainsChildrenByFile } from "./graphIndexes.js";

/**
 * Wrap each file that has contained classes in its own container.
 * Functions are kept in graph data but not rendered as nested nodes.
 */
export function deriveFileScopeContainers(graph, fileNodeIds, nodesById) {
  const containsByFile = buildContainsChildrenByFile(graph, fileNodeIds, nodesById);
  const containers = [];
  const absorbedIds = new Set();

  for (const [fileId, childIds] of containsByFile) {
    if (!childIds.length) continue;
    const fileNode = nodesById.get(fileId);
    containers.push({
      id: `container:file:${fileId}`,
      name: fileNode?.name || fileNode?.filePath || fileId,
      nodeIds: [fileId, ...childIds],
      fileScope: true,
    });
    absorbedIds.add(fileId);
    for (const childId of childIds) absorbedIds.add(childId);
  }

  return { containers, absorbedIds };
}

/** True when a node should not participate in folder-path grouping. */
export function isSubFileNode(node) {
  return Boolean(node && SUB_FILE_NODE_TYPES.has(node.type));
}
