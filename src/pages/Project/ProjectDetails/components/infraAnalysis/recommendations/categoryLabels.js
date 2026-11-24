/** Human-readable labels for suggestion categories. */
export const CATEGORY_LABELS = {
  security: "Security",
  reliability: "Reliability",
  scalability: "Scalability",
  observability: "Observability",
  cost: "Cost",
};

export const CATEGORY_FILTER_OPTIONS = [
  { value: "all", label: "All categories" },
  { value: "security", label: "Security" },
  { value: "reliability", label: "Reliability" },
  { value: "scalability", label: "Scalability" },
  { value: "observability", label: "Observability" },
  { value: "cost", label: "Cost" },
];

export function categoryLabel(category) {
  const key = String(category ?? "").toLowerCase();
  return CATEGORY_LABELS[key] ?? (key.replace(/_/g, " ") || "General");
}
