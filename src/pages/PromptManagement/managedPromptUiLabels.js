/**
 * Human-readable labels for managed prompt categories (API uses enum slugs).
 */

/** @type {Record<string, { title: string; summary: string }>} */
export const MANAGED_PROMPT_CATEGORY_LABELS = {
  cursor_agent: {
    title: "Cursor & Cloud agents",
    summary: "Scratch builds, backend plan after lock, Build Frontend App",
  },
  client_link: {
    title: "Client link chat",
    summary: "Stakeholder chat when replacing UI assets with an image",
  },
  release_planning: {
    title: "Release planning (AI)",
    summary: "OpenAI system text for release / feature JSON suggestions",
  },
  epic_chat: {
    title: "Epic & story editor",
    summary: "Chat that refines Jira epic or story title and description",
  },
  openai_chat: {
    title: "OpenAI (general)",
    summary: "Other chat completions, e.g. UAT checklist",
  },
  anthropic: {
    title: "Anthropic",
    summary: "SVG preview generation and animation passes",
  },
  figma_ir: {
    title: "Figma (React → layout IR)",
    summary: "Converts React/JSX snippets to JSON for the Figma plugin",
  },
  job: {
    title: "Automations",
    summary: "Tool routing, project analysis reports, run reports, script hints",
  },
};

/** Stable enum order for filters — sorted by human title. */
export const ORDERED_CATEGORY_SLUGS = Object.keys(MANAGED_PROMPT_CATEGORY_LABELS).sort((a, b) =>
  MANAGED_PROMPT_CATEGORY_LABELS[a].title.localeCompare(MANAGED_PROMPT_CATEGORY_LABELS[b].title),
);

/**
 * @param {string} category
 * @returns {{ title: string; summary: string }}
 */
export function getCategoryLabel(category) {
  const raw = String(category ?? "").trim();
  return (
    MANAGED_PROMPT_CATEGORY_LABELS[raw] ?? {
      title: raw || "Unknown",
      summary: "Custom category value",
    }
  );
}
