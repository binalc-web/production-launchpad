import { Bot } from "lucide-react";

/** Admin-only project section for live agent analytics. */
export const AGENT_ANALYTICS_SECTION = Object.freeze({
  id: "agent-analytics",
  label: "AI Agents",
  icon: Bot,
  group: "quality",
  adminOnly: true,
});

/**
 * @param {string|null|undefined} raw
 * @param {{ isAdmin?: boolean }} [opts]
 */
export function normalizeAgentAnalyticsSection(raw, opts = {}) {
  if (raw === AGENT_ANALYTICS_SECTION.id) {
    return opts.isAdmin ? AGENT_ANALYTICS_SECTION.id : "discovery";
  }
  return raw;
}
