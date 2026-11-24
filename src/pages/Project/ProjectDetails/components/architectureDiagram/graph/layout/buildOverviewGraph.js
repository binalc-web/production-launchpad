import { graphEdgeRouting, LAYER_CLUSTER_HEIGHT, LAYER_CLUSTER_WIDTH } from "../constants.js";
import { aggregateLayerComplexity, layerNodeIds, normalizeEdges } from "./graphIndexes.js";
import { applyElkLayout } from "./applyElkLayout.js";
import { buildGraphEdgeLabels, buildGraphEdgeStyle } from "./edgeAggregation.js";

/**
 * Build overview React Flow nodes — one layer cluster per layer.
 * @param {object} params
 */
export async function buildOverviewGraph({ graph, layers, nodesById, layerEdges, onDrillIn }) {
  const flowNodes = layers.map((layer, index) => {
    const ids = layerNodeIds(layer);
    return {
      id: `layer:${layer.id}`,
      type: "layer-cluster",
      position: { x: 0, y: 0 },
      data: {
        layerId: layer.id,
        layerName: layer.name || layer.id,
        layerDescription: layer.description || "",
        fileCount: ids.length,
        aggregateComplexity: aggregateLayerComplexity(ids, nodesById),
        layerColorIndex: index,
        onDrillIn,
      },
    };
  });

  const dims = new Map(
    flowNodes.map((n) => [n.id, { width: LAYER_CLUSTER_WIDTH, height: LAYER_CLUSTER_HEIGHT }]),
  );

  const edges = (layerEdges || []).map((edge, index) => {
    const label = edge.count > 1 ? `${edge.type} (${edge.count})` : edge.type;
    return {
      id: `layer-edge-${index}-${edge.source}-${edge.target}-${edge.type}`,
      source: edge.source,
      target: edge.target,
      ...graphEdgeRouting(),
      ...buildGraphEdgeLabels(label),
      style: buildGraphEdgeStyle({ isIncident: true, strokeWidth: 2.25 }),
    };
  });

  return applyElkLayout(flowNodes, edges, dims);
}

/** Aggregate inter-layer edges from file-level edges. */
export function buildLayerEdges(graph, layers) {
  const nodeToLayer = new Map();
  for (const layer of layers) {
    for (const id of layerNodeIds(layer)) {
      nodeToLayer.set(id, `layer:${layer.id}`);
    }
  }
  const pairMap = new Map();
  for (const edge of normalizeEdges(graph?.edges)) {
    const srcLayer = nodeToLayer.get(edge.source);
    const tgtLayer = nodeToLayer.get(edge.target);
    if (!srcLayer || !tgtLayer || srcLayer === tgtLayer) continue;
    const key = `${srcLayer}->${tgtLayer}|${edge.type}`;
    const existing = pairMap.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      pairMap.set(key, { source: srcLayer, target: tgtLayer, type: edge.type, count: 1 });
    }
  }
  return Array.from(pairMap.values());
}
