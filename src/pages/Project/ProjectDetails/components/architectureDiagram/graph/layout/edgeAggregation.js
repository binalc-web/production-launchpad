import { MarkerType } from "@xyflow/react";
import { graphEdgeRouting } from "../constants.js";

/** Shared React Flow edge styling for architecture graph connections. */
export function buildGraphEdgeStyle({ isIncident = true, strokeWidth = 2 } = {}) {
  return {
    strokeWidth: isIncident ? strokeWidth : 1,
    stroke: "var(--arch-edge)",
    opacity: isIncident ? 0.9 : 0.3,
  };
}

/** Label + arrow props shared by overview and layer-detail edges. */
export function buildGraphEdgeLabels(label) {
  return {
    label,
    markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
    labelStyle: {
      fontSize: 11,
      fontWeight: 600,
      fill: "var(--arch-edge-label)",
    },
    labelBgStyle: {
      fill: "var(--arch-card-bg)",
      fillOpacity: 0.92,
    },
    labelBgPadding: [4, 6],
    labelBgBorderRadius: 4,
  };
}

/**
 * Build React Flow edges for layer detail — direct file→file, always visible.
 */
export function buildVisibleLayerEdges({ layerEdges, visibleIds, selectedNodeId }) {
  const edgeByKey = new Map();

  for (const edge of layerEdges) {
    if (!visibleIds.has(edge.source) || !visibleIds.has(edge.target)) continue;
    if (edge.source === edge.target) continue;

    const key = `${edge.source}|${edge.target}|${edge.type}`;
    const existing = edgeByKey.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      edgeByKey.set(key, { ...edge, source: edge.source, target: edge.target, count: 1 });
    }
  }

  return Array.from(edgeByKey.values()).map((edge) => {
    const isSelectedEdge =
      selectedNodeId && (edge.source === selectedNodeId || edge.target === selectedNodeId);
    const isIncident = !selectedNodeId || isSelectedEdge;
    const label =
      edge.count > 1 ? `${edge.type} (${edge.count})` : edge.label || edge.type || "link";

    return {
      id: `${edge.source}|${edge.target}|${edge.type}`,
      source: edge.source,
      target: edge.target,
      ...graphEdgeRouting(),
      animated: Boolean(isSelectedEdge),
      ...buildGraphEdgeLabels(label),
      style: buildGraphEdgeStyle({
        isIncident,
        strokeWidth: isSelectedEdge ? 2.5 : 2,
      }),
      labelStyle: {
        fontSize: 11,
        fontWeight: 600,
        fill: "var(--arch-edge-label)",
        opacity: isIncident ? 0.9 : 0.25,
      },
    };
  });
}
