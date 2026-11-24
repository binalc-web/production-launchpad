import { Position } from "@xyflow/react";
import { computePrimaryFlowChain } from "./computePrimaryFlowChain.js";
import {
  COLUMN_ENTER_DELAY_MS,
  COLUMN_SPACING,
  GROUP_PADDING_X,
  GROUP_PADDING_Y,
  MOTION_NODE_CAP,
  ROW_SPACING,
  SERVICE_NODE_WIDTH,
} from "./motionConstants.js";
import { TIER_LABELS, TIER_TO_LANE } from "./laneVisuals.js";
import { resolveTechIcon } from "./resolveTechIcon.js";

export const TIER_ORDER = [
  "users",
  "ingress",
  "auth",
  "compute",
  "data",
  "observability",
  "cicd",
  "other",
];

function mapZone(zone) {
  const z = String(zone ?? "").toLowerCase();
  if (z.includes("user") || z.includes("client") || z.includes("internet")) return "users";
  if (z.includes("ingress") || z.includes("network") || z.includes("gateway")) return "ingress";
  if (z.includes("auth") || z.includes("security") || z.includes("identity")) return "auth";
  if (z.includes("compute") || z.includes("api") || z.includes("app") || z.includes("service"))
    return "compute";
  if (z.includes("data") || z.includes("database") || z.includes("storage") || z.includes("cache"))
    return "data";
  if (z.includes("observ") || z.includes("monitor") || z.includes("log")) return "observability";
  if (z.includes("cicd") || z.includes("ci") || z.includes("deploy") || z.includes("pipeline"))
    return "cicd";
  return undefined;
}

export function tierOf(node) {
  const tier = String(node?.tier ?? node?.group ?? mapZone(node?.zone) ?? "other").toLowerCase();
  return TIER_ORDER.includes(tier) ? tier : "other";
}

function tierIndex(tier) {
  const index = TIER_ORDER.indexOf(tier);
  return index >= 0 ? index : TIER_ORDER.length - 1;
}

function inferPrimaryEdges(rawEdges, nodeTierMap) {
  const forward = rawEdges
    .map((edge, index) => {
      const source = String(edge.source ?? edge.from ?? "");
      const target = String(edge.target ?? edge.to ?? "");
      const sourceTier = nodeTierMap.get(source) ?? 0;
      const targetTier = nodeTierMap.get(target) ?? 0;
      return {
        id: String(edge.id ?? `e-${index}`),
        source,
        target,
        sourceTier,
        targetTier,
        forward: targetTier > sourceTier,
      };
    })
    .filter((edge) => edge.source && edge.target && edge.forward);

  forward.sort((a, b) => {
    if (a.sourceTier !== b.sourceTier) return a.sourceTier - b.sourceTier;
    return a.targetTier - b.targetTier;
  });

  const primaryIds = new Set(forward.slice(0, 12).map((edge) => edge.id));
  return primaryIds;
}

/**
 * Convert persisted architectureGraph JSON into React Flow nodes and edges.
 * @param {object} architectureGraph
 * @param {{ flowPaused?: boolean, flowSpeed?: number, highlightFlows?: boolean, selectedNodeId?: string | null }} options
 */
export function buildInfraAnalysisFlow(architectureGraph, options = {}) {
  const rawNodes = Array.isArray(architectureGraph?.nodes) ? architectureGraph.nodes : [];
  const rawEdges = Array.isArray(architectureGraph?.edges) ? architectureGraph.edges : [];

  const nodeTierMap = new Map();
  const byTier = new Map();

  rawNodes.forEach((node) => {
    const tier = tierOf(node);
    const id = String(node.id ?? "");
    if (!id) return;
    nodeTierMap.set(id, tierIndex(tier));
    if (!byTier.has(tier)) byTier.set(tier, []);
    byTier.get(tier).push(node);
  });

  const primaryEdgeIds = inferPrimaryEdges(rawEdges, nodeTierMap);

  const graphEdges = rawEdges
    .map((edge, index) => {
      const source = String(edge.source ?? edge.from ?? "");
      const target = String(edge.target ?? edge.to ?? "");
      if (!source || !target || !nodeTierMap.has(source) || !nodeTierMap.has(target)) {
        return null;
      }
      const id = String(edge.id ?? `e-${index}`);
      const isPrimary = primaryEdgeIds.has(id);
      return {
        id,
        source,
        target,
        edgeRole: isPrimary ? "primary_flow" : "dependency_flow",
        label: edge.plainLabel ?? edge.label,
      };
    })
    .filter(Boolean);

  let flowOrder = 1;
  for (const edge of graphEdges) {
    if (edge.edgeRole === "primary_flow") {
      edge.flowOrder = flowOrder;
      flowOrder += 1;
    }
  }

  const chain = computePrimaryFlowChain(graphEdges);

  const servicePositions = new Map();
  const flowNodes = [];

  TIER_ORDER.forEach((tier) => {
    const group = byTier.get(tier) ?? [];
    if (!group.length) return;

    const colIndex = tierIndex(tier);
    const colX = colIndex * COLUMN_SPACING;

    group.forEach((node, rowIndex) => {
      const id = String(node.id);
      const label = String(node.plainName ?? node.label ?? node.name ?? id);
      const position = node.position ?? { x: colX, y: rowIndex * ROW_SPACING };
      servicePositions.set(id, position);

      const { icon, generic } = resolveTechIcon(node);
      const enterDelayMs = COLUMN_ENTER_DELAY_MS[tier] ?? 0;
      const flowHopActive = chain.nodeHopDelaySec.has(id);
      const flowHopDelaySec = chain.nodeHopDelaySec.get(id);

      flowNodes.push({
        id,
        type: "serviceNode",
        position,
        zIndex: 2,
        draggable: true,
        data: {
          label,
          description: node.plainDescription ?? node.description ?? "",
          kind: node.kind,
          zone: node.zone,
          status: node.status ?? "detected",
          confidence: node.confidence ?? "medium",
          icon,
          iconGeneric: generic,
          isNew: flowNodes.length < MOTION_NODE_CAP,
          enterDelayMs,
          flowHopActive,
          flowHopDelaySec,
        },
      });
    });
  });

  TIER_ORDER.forEach((tier) => {
    const group = byTier.get(tier) ?? [];
    if (!group.length) return;

    const colIndex = tierIndex(tier);
    const colX = colIndex * COLUMN_SPACING;
    const positions = group.map((node) => servicePositions.get(String(node.id))).filter(Boolean);

    const minY = Math.min(...positions.map((p) => p.y));
    const maxY = Math.max(...positions.map((p) => p.y));
    const height = maxY - minY + ROW_SPACING + GROUP_PADDING_Y;
    const width = SERVICE_NODE_WIDTH + GROUP_PADDING_X * 2;

    flowNodes.unshift({
      id: `group-${tier}`,
      type: "groupLayer",
      position: { x: colX - GROUP_PADDING_X, y: minY - GROUP_PADDING_Y / 2 },
      zIndex: 0,
      selectable: false,
      draggable: false,
      data: {
        label: TIER_LABELS[tier] ?? tier,
        layerKey: `lane-${TIER_TO_LANE[tier] ?? "operations"}`,
      },
      style: { width, height, zIndex: 0 },
    });
  });

  const nodeIds = new Set(flowNodes.map((node) => node.id));

  const flowEdges = graphEdges
    .filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target))
    .map((edge, index) => {
      const isPrimary = edge.edgeRole === "primary_flow";
      const timing = chain.edgeTiming.get(edge.id);
      const isConnected =
        options.selectedNodeId &&
        (edge.source === options.selectedNodeId || edge.target === options.selectedNodeId);

      const dimmed = Boolean(options.highlightFlows) && !isPrimary && !isConnected;

      const highlighted = Boolean(isConnected);

      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: isPrimary ? "workbenchFlowEdge" : "architectureEdge",
        zIndex: isPrimary ? 1 : 0,
        label: edge.label,
        data: {
          edgeRole: edge.edgeRole,
          flowOrder: edge.flowOrder,
          chainDelaySec: timing?.chainDelaySec ?? 0,
          chainDurationSec: timing?.chainDurationSec,
          flowSpeed: options.flowSpeed ?? 1,
          paused: options.flowPaused ?? false,
          highlighted,
          dimmed,
          animated: isPrimary,
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        pathOffset: (index % 3) * 8 - 8,
      };
    });

  return { nodes: flowNodes, edges: flowEdges, chain };
}
