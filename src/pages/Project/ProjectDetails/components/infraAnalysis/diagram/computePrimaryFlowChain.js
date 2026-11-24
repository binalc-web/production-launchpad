import { BASE_HOP_DURATION_SEC, MAX_ANIMATED_PRIMARY_EDGES } from "./motionConstants.js";

function isPrimaryFlowEdge(edge) {
  const role = edge.edgeRole ?? "primary_flow";
  return role === "primary_flow" || role === "primary";
}

function sortPrimaryEdges(edges) {
  const withOrder = edges.filter(
    (edge) => isPrimaryFlowEdge(edge) && typeof edge.flowOrder === "number",
  );
  const withoutOrder = edges.filter(
    (edge) => isPrimaryFlowEdge(edge) && typeof edge.flowOrder !== "number",
  );

  withOrder.sort((a, b) => (a.flowOrder ?? 0) - (b.flowOrder ?? 0));
  withoutOrder.sort((a, b) => a.source.localeCompare(b.source) || a.target.localeCompare(b.target));

  return [...withOrder, ...withoutOrder];
}

function buildOrderedNodeIds(edges) {
  if (!edges.length) return [];

  const ordered = [];
  const seen = new Set();

  const push = (id) => {
    if (!seen.has(id)) {
      seen.add(id);
      ordered.push(id);
    }
  };

  push(edges[0].source);
  for (const edge of edges) {
    push(edge.target);
  }

  return ordered;
}

function buildNodeHopDelays(edges, edgeTiming) {
  const delays = new Map();
  for (const edge of edges) {
    const timing = edgeTiming.get(edge.id);
    if (timing) {
      delays.set(edge.target, timing.chainDelaySec);
    }
  }
  return delays;
}

/** Chain-synced timing for primary flow edges. */
export function computePrimaryFlowChain(edges) {
  const primaryEdges = sortPrimaryEdges(edges).slice(0, MAX_ANIMATED_PRIMARY_EDGES);
  const orderedEdgeIds = primaryEdges.map((edge) => edge.id);
  const orderedNodeIds = buildOrderedNodeIds(primaryEdges);

  const edgeTiming = new Map();
  let cumulativeDelaySec = 0;

  for (let index = 0; index < primaryEdges.length; index += 1) {
    const edge = primaryEdges[index];
    edgeTiming.set(edge.id, {
      chainIndex: index,
      chainDelaySec: cumulativeDelaySec,
      chainDurationSec: BASE_HOP_DURATION_SEC,
    });
    cumulativeDelaySec += BASE_HOP_DURATION_SEC;
  }

  return {
    orderedEdgeIds,
    orderedNodeIds,
    edgeTiming,
    nodeHopDelaySec: buildNodeHopDelays(primaryEdges, edgeTiming),
    animateMotion: primaryEdges.length > 0,
  };
}
