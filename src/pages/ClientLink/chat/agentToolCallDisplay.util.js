/**
 * Display helpers for live agent tool_call timeline items.
 */

/** Shorten long file paths for compact tool cards. */
export function shortenPath(path) {
  const trimmed = typeof path === "string" ? path.trim() : "";
  if (!trimmed) return "";
  const parts = trimmed.split("/");
  if (parts.length <= 3) return trimmed;
  return `.../${parts.slice(-2).join("/")}`;
}

/**
 * Count real +/- lines in a unified diff preview (ignores ---/+++ headers and @@ hunks).
 * @param {string} diff
 * @returns {{ added: number, removed: number }}
 */
export function countUnifiedDiffLineStats(diff) {
  const text = typeof diff === "string" ? diff : "";
  let added = 0;
  let removed = 0;
  for (const line of text.split("\n")) {
    if (
      line.startsWith("+++") ||
      line.startsWith("---") ||
      line.startsWith("@@")
    ) {
      continue;
    }
    if (line.startsWith("+")) added += 1;
    else if (line.startsWith("-")) removed += 1;
  }
  return { added, removed };
}

/** True when text looks like a JSON object payload (legacy resultPreview). */
export function looksLikeJsonObject(text) {
  const trimmed = typeof text === "string" ? text.trim() : "";
  return trimmed.startsWith("{") && trimmed.endsWith("}");
}

/**
 * Parse legacy JSON resultPreview from older ingest (path + diffString).
 * @param {string} text
 * @returns {{ targetPath?: string, diffPreview?: string } | null}
 */
export function parseLegacyToolResultPreview(text) {
  if (!looksLikeJsonObject(text)) return null;
  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object") return null;
    const targetPath =
      typeof parsed.path === "string" && parsed.path.trim()
        ? parsed.path.trim()
        : undefined;
    const diffPreview =
      typeof parsed.diffString === "string" && parsed.diffString.trim()
        ? parsed.diffString.trim()
        : undefined;
    if (!targetPath && !diffPreview) return null;
    return { targetPath, diffPreview };
  } catch {
    return null;
  }
}

/**
 * Normalize a tool_call timeline item into display fields (with legacy fallback).
 * @param {object} item
 * @returns {{
 *   toolName: string,
 *   toolKind: string,
 *   detail: string,
 *   targetPath?: string,
 *   diffPreview?: string,
 *   diffAdded?: number,
 *   diffRemoved?: number,
 *   resultPreview?: string,
 *   todoSummary?: string,
 *   status: string,
 * }}
 */
export function resolveToolCallDisplay(item) {
  const status = typeof item?.status === "string" ? item.status : "running";
  let toolName =
    typeof item?.toolName === "string" && item.toolName.trim()
      ? item.toolName.trim()
      : "Tool";
  const toolKind =
    typeof item?.toolKind === "string" && item.toolKind.trim()
      ? item.toolKind.trim()
      : "other";

  let targetPath =
    typeof item?.targetPath === "string" && item.targetPath.trim()
      ? item.targetPath.trim()
      : undefined;
  let diffPreview =
    typeof item?.diffPreview === "string" && item.diffPreview.trim()
      ? item.diffPreview.trim()
      : undefined;
  let diffAdded =
    typeof item?.diffAdded === "number" && item.diffAdded >= 0
      ? item.diffAdded
      : undefined;
  let diffRemoved =
    typeof item?.diffRemoved === "number" && item.diffRemoved >= 0
      ? item.diffRemoved
      : undefined;
  const todoSummary =
    typeof item?.todoSummary === "string" && item.todoSummary.trim()
      ? item.todoSummary.trim()
      : undefined;
  const command =
    typeof item?.command === "string" && item.command.trim()
      ? item.command.trim()
      : undefined;

  let resultPreview =
    typeof item?.resultPreview === "string" && item.resultPreview.trim()
      ? item.resultPreview.trim()
      : undefined;

  let legacyDiffSource;
  if (!diffPreview && !targetPath && resultPreview) {
    const legacy = parseLegacyToolResultPreview(resultPreview);
    if (legacy) {
      targetPath = legacy.targetPath ?? targetPath;
      diffPreview = legacy.diffPreview ?? diffPreview;
      legacyDiffSource = legacy.diffPreview;
      resultPreview = undefined;
    } else if (looksLikeJsonObject(resultPreview)) {
      resultPreview = undefined;
    }
  }

  if (diffAdded === undefined && diffRemoved === undefined) {
    const statsSource = legacyDiffSource ?? diffPreview;
    if (statsSource) {
      const stats = countUnifiedDiffLineStats(statsSource);
      diffAdded = stats.added;
      diffRemoved = stats.removed;
    }
  }

  let detail = "";
  if (
    (toolKind === "shell" || toolKind === "subagent") &&
    command &&
    command.includes("spawn-subagent.sh")
  ) {
    toolName = "Subagent (CLI)";
    detail = command;
  } else if (toolKind === "shell" && command) {
    detail = command;
  } else if (toolKind === "search" && command) {
    detail = targetPath
      ? `"${command}" in ${shortenPath(targetPath)}`
      : command;
  } else if (todoSummary) {
    detail = todoSummary;
  } else if (targetPath) {
    detail = shortenPath(targetPath);
  } else if (typeof item?.label === "string" && item.label.trim()) {
    const label = item.label.trim();
    detail = looksLikeJsonObject(label) ? "" : label;
  }

  return {
    toolName,
    toolKind,
    detail,
    targetPath,
    diffPreview,
    diffAdded,
    diffRemoved,
    resultPreview,
    todoSummary,
    status,
  };
}
