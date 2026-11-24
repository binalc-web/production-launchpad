/** React Flow node dimensions — aligned with Understand Anything layout. */
export const NODE_WIDTH = 280;
export const NODE_HEIGHT = 120;
/** Compact card size for function/class nodes nested under a file. */
export const SUB_FILE_NODE_HEIGHT = 96;

/** Node types that live inside a parent file (via "contains" edges). */
export const SUB_FILE_NODE_TYPES = new Set(["function", "class"]);

/** Sub-file symbols drawn as nested graph nodes — functions are sidebar-only, not rendered. */
export const GRAPH_UI_SUB_FILE_NODE_TYPES = new Set(["class"]);

/** True when a node should appear on the architecture graph canvas. */
export function isGraphUiNode(node) {
  return Boolean(node && node.type !== "function");
}
export const LAYER_CLUSTER_WIDTH = 320;
export const LAYER_CLUSTER_HEIGHT = 180;
export const CONTAINER_HEADER_HEIGHT = 36;
/** Horizontal inset for file nodes laid out inside an expanded container. */
export const CONTAINER_INNER_PADDING_X = 20;
/** Top inset below the container header chrome (matches UA ~60px total vertical chrome). */
export const CONTAINER_INNER_PADDING_TOP = 48;
/** Bottom inset inside expanded container bounds. */
export const CONTAINER_INNER_PADDING_BOTTOM = 12;

/** Layer color palette for legend, clusters, and node accents. */
export const LAYER_PALETTE = [
  { label: "#4a7c9b", bg: "rgba(74, 124, 155, 0.12)", border: "rgba(74, 124, 155, 0.4)" },
  { label: "#5a9e6f", bg: "rgba(90, 158, 111, 0.12)", border: "rgba(90, 158, 111, 0.4)" },
  { label: "#8b6fb0", bg: "rgba(139, 111, 176, 0.12)", border: "rgba(139, 111, 176, 0.4)" },
  { label: "#c9a06c", bg: "rgba(201, 160, 108, 0.12)", border: "rgba(201, 160, 108, 0.4)" },
  { label: "#b07a8a", bg: "rgba(176, 122, 138, 0.12)", border: "rgba(176, 122, 138, 0.4)" },
  { label: "#4a9b8c", bg: "rgba(74, 155, 140, 0.12)", border: "rgba(74, 155, 140, 0.4)" },
  { label: "#788291", bg: "rgba(120, 130, 145, 0.12)", border: "rgba(120, 130, 145, 0.4)" },
];

export function getLayerColor(index = 0) {
  return LAYER_PALETTE[Math.abs(index) % LAYER_PALETTE.length];
}

/** Node type accent colors for file cards. */
export const NODE_TYPE_COLORS = {
  file: "#4a7c9b",
  function: "#5a9e6f",
  class: "#8b6fb0",
  module: "#c9a06c",
  concept: "#b07a8a",
  config: "#5eead4",
  document: "#7dd3fc",
  service: "#a78bfa",
  table: "#6ee7b7",
  endpoint: "#fdba74",
  pipeline: "#fda4af",
  schema: "#fcd34d",
  resource: "#a5b4fc",
};

export function nodeTypeColor(type) {
  return NODE_TYPE_COLORS[String(type || "file").toLowerCase()] ?? NODE_TYPE_COLORS.file;
}

export const ELK_DEFAULT_LAYOUT_OPTIONS = {
  algorithm: "layered",
  "elk.direction": "DOWN",
  "elk.layered.spacing.nodeNodeBetweenLayers": "80",
  "elk.spacing.nodeNode": "60",
  "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
  "elk.edgeRouting": "ORTHOGONAL",
  "elk.padding": "[top=40,left=20,right=20,bottom=20]",
};

/** React Flow edge type — Understand Anything uses default bezier (no explicit type). */
export const GRAPH_EDGE_TYPE = "default";

/** Bezier curvature (0–1); lower values produce subtler curves. */
export const GRAPH_EDGE_PATH_OPTIONS = { curvature: 0.25 };

/** Shared edge routing props for overview and layer-detail graphs. */
export function graphEdgeRouting(overrides = {}) {
  return {
    type: GRAPH_EDGE_TYPE,
    pathOptions: GRAPH_EDGE_PATH_OPTIONS,
    ...overrides,
  };
}
