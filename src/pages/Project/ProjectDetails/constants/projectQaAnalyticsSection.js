import { BarChart3 } from "lucide-react";

/** Project section for QA App leadership analytics. */
export const QA_ANALYTICS_SECTION = Object.freeze({
  id: "qa-analytics",
  label: "QA Analytics",
  icon: BarChart3,
  group: "quality",
});

/**
 * @param {string|null|undefined} raw
 */
export function normalizeQaAnalyticsSection(raw) {
  if (raw === QA_ANALYTICS_SECTION.id) return QA_ANALYTICS_SECTION.id;
  return raw;
}
