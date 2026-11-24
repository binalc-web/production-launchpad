/** Node type categories for quick filter pills. */
export const NODE_TYPE_TO_CATEGORY = {
  file: "code",
  function: "code",
  class: "code",
  module: "code",
  concept: "code",
  config: "config",
  document: "docs",
  service: "infra",
  table: "data",
  endpoint: "infra",
  pipeline: "infra",
  schema: "data",
  resource: "infra",
  domain: "domain",
  flow: "domain",
  step: "domain",
};

export const ALL_NODE_TYPES = [
  "file",
  "function",
  "class",
  "module",
  "concept",
  "config",
  "document",
  "service",
  "table",
  "endpoint",
  "pipeline",
  "schema",
  "resource",
  "domain",
  "flow",
  "step",
];

export const ALL_COMPLEXITIES = ["simple", "moderate", "complex"];

export const EDGE_CATEGORY_MAP = {
  structural: ["imports", "calls", "contains", "extends", "implements"],
  config: ["configures"],
  docs: ["documents"],
  infra: ["deploys", "triggers", "exposes"],
  data: ["stores", "queries"],
  domain: ["related", "cross_domain", "contains_flow"],
};

export const ALL_EDGE_CATEGORIES = Object.keys(EDGE_CATEGORY_MAP);

export const NODE_TYPE_PILL_CATEGORIES = [
  { key: "code", label: "Code", color: "#4a7c9b" },
  { key: "config", label: "Config", color: "#5eead4" },
  { key: "docs", label: "Docs", color: "#7dd3fc" },
  { key: "infra", label: "Infra", color: "#a78bfa" },
  { key: "data", label: "Data", color: "#6ee7b7" },
  { key: "domain", label: "Domain", color: "#b07a8a" },
];

export const DEFAULT_NODE_TYPE_FILTERS = Object.fromEntries(
  NODE_TYPE_PILL_CATEGORIES.map((category) => [category.key, true]),
);

export function createDefaultFilters() {
  return {
    nodeTypes: new Set(ALL_NODE_TYPES),
    complexities: new Set(ALL_COMPLEXITIES),
    layerIds: new Set(),
    edgeCategories: new Set(ALL_EDGE_CATEGORIES),
  };
}

export function getEdgeCategory(edgeType) {
  for (const [category, types] of Object.entries(EDGE_CATEGORY_MAP)) {
    if (types.includes(edgeType)) return category;
  }
  return null;
}
