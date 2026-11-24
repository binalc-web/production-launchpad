import { layerNodeIds, normalizeEdges } from "./graphIndexes.js";

/**
 * Aggregate edges between layers for overview and portal computation.
 * @param {object} graph
 * @param {object[]} layers
 */
export function aggregateLayerEdgesDetailed(graph, layers) {
  const nodeToLayer = new Map();
  for (const layer of layers) {
    for (const nodeId of layerNodeIds(layer)) {
      nodeToLayer.set(nodeId, layer.id);
    }
  }

  const pairMap = new Map();
  for (const edge of normalizeEdges(graph?.edges)) {
    const sourceLayer = nodeToLayer.get(edge.source);
    const targetLayer = nodeToLayer.get(edge.target);
    if (!sourceLayer || !targetLayer || sourceLayer === targetLayer) continue;

    const [layerA, layerB] =
      sourceLayer < targetLayer ? [sourceLayer, targetLayer] : [targetLayer, sourceLayer];
    const key = `${layerA}|${layerB}`;
    const existing = pairMap.get(key);
    if (existing) {
      existing.count += 1;
      existing.edgeTypes.add(edge.type);
    } else {
      pairMap.set(key, {
        sourceLayerId: layerA,
        targetLayerId: layerB,
        count: 1,
        edgeTypes: new Set([edge.type]),
      });
    }
  }

  return Array.from(pairMap.values()).map((entry) => ({
    ...entry,
    edgeTypes: [...entry.edgeTypes],
  }));
}

/**
 * Connected external layers for portal nodes in layer detail.
 * @param {object} graph
 * @param {string} activeLayerId
 * @param {object[]} aggregated
 */
export function computePortals(graph, activeLayerId, aggregated) {
  const layerNameMap = new Map((graph?.layers ?? []).map((layer) => [layer.id, layer.name]));
  const portalMap = new Map();

  for (const agg of aggregated) {
    if (agg.sourceLayerId === activeLayerId) {
      portalMap.set(agg.targetLayerId, (portalMap.get(agg.targetLayerId) ?? 0) + agg.count);
    } else if (agg.targetLayerId === activeLayerId) {
      portalMap.set(agg.sourceLayerId, (portalMap.get(agg.sourceLayerId) ?? 0) + agg.count);
    }
  }

  return Array.from(portalMap.entries()).map(([layerId, connectionCount]) => ({
    layerId,
    layerName: layerNameMap.get(layerId) ?? layerId,
    connectionCount,
  }));
}

/**
 * File nodes in activeLayer that connect to targetLayerId.
 */
export function findCrossLayerFileNodes(graph, activeLayerId, targetLayerId) {
  const activeLayer = graph?.layers?.find((layer) => layer.id === activeLayerId);
  const targetLayer = graph?.layers?.find((layer) => layer.id === targetLayerId);
  const activeNodeIds = new Set(layerNodeIds(activeLayer));
  const targetNodeIds = new Set(layerNodeIds(targetLayer));
  const result = new Set();

  for (const edge of normalizeEdges(graph?.edges)) {
    if (activeNodeIds.has(edge.source) && targetNodeIds.has(edge.target)) {
      result.add(edge.source);
    }
    if (activeNodeIds.has(edge.target) && targetNodeIds.has(edge.source)) {
      result.add(edge.target);
    }
  }

  return result;
}

/**
 * Bucket edges into intra-container and aggregated inter-container pairs.
 * @param {object[]} edges
 * @param {Map<string, string>} nodeToContainer
 */
export function aggregateContainerEdges(edges, nodeToContainer) {
  const intraContainer = [];
  const interMap = new Map();

  for (const edge of edges) {
    const sourceContainer = nodeToContainer.get(edge.source);
    const targetContainer = nodeToContainer.get(edge.target);
    if (!sourceContainer || !targetContainer) continue;

    if (sourceContainer === targetContainer) {
      intraContainer.push(edge);
      continue;
    }

    const key = `${sourceContainer.length}:${sourceContainer}\0${targetContainer}`;
    const existing = interMap.get(key);
    if (existing) {
      existing.count += 1;
      existing.edgeTypes.add(edge.type);
    } else {
      interMap.set(key, {
        sourceContainerId: sourceContainer,
        targetContainerId: targetContainer,
        count: 1,
        edgeTypes: new Set([edge.type]),
      });
    }
  }

  return {
    intraContainer,
    interContainerAggregated: [...interMap.values()].map((entry) => ({
      sourceContainerId: entry.sourceContainerId,
      targetContainerId: entry.targetContainerId,
      count: entry.count,
      edgeTypes: [...entry.edgeTypes],
    })),
  };
}
