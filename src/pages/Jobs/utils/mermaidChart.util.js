/** Mermaid diagram keywords — first substantive line must match one of these. */
const MERMAID_DIAGRAM_START =
  /^(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram-v2|stateDiagram|erDiagram|journey|gantt|pie|gitGraph|mindmap|timeline|quadrantChart|xychart-beta|block-beta|sankey-beta|packet-beta|kanban|architecture-beta|C4Context)\b/i;

/**
 * True when fenced markdown content is a Mermaid chart (not generic code/logs).
 * @param {string} source
 */
export function looksLikeMermaidChart(source) {
  const lines = String(source ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("%%"));
  const firstLine = lines[0] ?? "";
  return MERMAID_DIAGRAM_START.test(firstLine);
}

/**
 * @param {string|undefined|null} className
 */
export function isMermaidLanguageClass(className) {
  const match = /language-(\w+)/.exec(className || "");
  return match?.[1]?.toLowerCase() === "mermaid";
}

/** Matches fenced ```mermaid blocks (optional trailing spaces on fence line). */
const MERMAID_FENCE_RE = /```mermaid[ \t]*\r?\n([\s\S]*?)```/g;

/**
 * @typedef {{ type: "markdown" | "mermaid", content: string }} JobReportMarkdownSegment
 */

/**
 * Split report markdown into plain markdown and isolated Mermaid chart segments.
 * Invalid ```mermaid fences stay inside markdown segments unchanged.
 * @param {string} markdown
 * @returns {JobReportMarkdownSegment[]}
 */
export function splitJobReportMarkdown(markdown) {
  const source = String(markdown ?? "");
  if (!source) return [];

  /** @type {JobReportMarkdownSegment[]} */
  const segments = [];
  let lastIndex = 0;
  let match;

  MERMAID_FENCE_RE.lastIndex = 0;
  while ((match = MERMAID_FENCE_RE.exec(source)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "markdown", content: source.slice(lastIndex, match.index) });
    }

    const fenceBlock = match[0];
    const chartBody = match[1] ?? "";

    if (looksLikeMermaidChart(chartBody)) {
      segments.push({ type: "mermaid", content: chartBody.trim() });
    } else {
      segments.push({ type: "markdown", content: fenceBlock });
    }

    lastIndex = MERMAID_FENCE_RE.lastIndex;
  }

  if (lastIndex < source.length) {
    segments.push({ type: "markdown", content: source.slice(lastIndex) });
  }

  if (segments.length === 0) {
    return [{ type: "markdown", content: source }];
  }

  /** @type {JobReportMarkdownSegment[]} */
  const merged = [];
  for (const segment of segments) {
    const prev = merged[merged.length - 1];
    if (segment.type === "markdown" && prev?.type === "markdown") {
      prev.content += segment.content;
    } else {
      merged.push({ ...segment });
    }
  }

  return merged;
}
