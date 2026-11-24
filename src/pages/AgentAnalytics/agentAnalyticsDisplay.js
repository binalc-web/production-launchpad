import { format, parseISO } from "date-fns";
import { CURSOR_AGENT_TOKEN_PRICE_PER_MILLION } from "../../constants/cursorAgentPricing.js";
import { getCursorModelLabel, getCursorModelPricing } from "../../constants/cursorModelCatalog.js";

export { getCursorModelLabel };

/**
 * Turn a model-router reason code into short UI copy (self_select free text passes through).
 * @param {string|null|undefined} reason
 * @returns {string|null}
 */
export function formatModelSelectReason(reason) {
  const raw = typeof reason === "string" ? reason.trim() : "";
  if (!raw) return null;
  if (raw === "ask_auto") return "Ask mode always uses Auto";
  if (raw === "fixed" || raw === "fixed:build") return "Configured as the fixed build model";
  if (raw === "fixed:plan") return "Configured as the fixed plan model";
  if (raw === "opencode:plan") return "Configured as the OpenCode plan model";
  if (raw === "opencode:build") return "Configured as the OpenCode build model";
  if (raw.startsWith("fixed_by_part:")) {
    const rest = raw.slice("fixed_by_part:".length).trim();
    const [part, phase] = rest.split(":");
    if (phase === "plan" || phase === "build") {
      return `Configured ${phase} model for ${part || "this part"}`;
    }
    return `Configured fixed model for ${rest || "this part"}`;
  }
  if (raw === "invalid_resolved_model_auto") return "Fell back to Auto after an invalid model id";
  if (raw === "openai_key_missing_fallback") return "Fell back because the picker was unavailable";
  if (raw === "openai_timeout_fallback") return "Fell back after the model picker timed out";
  if (raw === "openai_error_fallback") return "Fell back after the model picker failed";
  if (raw === "openai_invalid_json_fallback") return "Fell back after an invalid picker response";
  if (raw === "openai_invalid_model_fallback") return "Fell back after an unknown picker model";
  if (raw === "openai_selected") return "Chosen by smart select";
  return raw;
}

/** Source labels for agent run rows. */
export const SOURCE_LABELS = {
  client_link: "Client Link",
  scratch: "From scratch",
  figma_plugin: "Figma convert",
  backend_lock: "Backend lock",
  understand_graph: "Understand graph",
  backend_code_chat: "App repositories",
  backend_code_preview: "Code preview",
  cloud_deploy: "Cloud deploy",
  qa_automation: "QA automation",
  qa_automation_chat: "QA chat",
  qa_desktop_live: "AI Test",
  feedback_ai_fix: "Feedback fix",
  scope_implement: "Scope implement",
  scope_implement_item: "Scope story",
  infra_analysis: "Infra analysis",
  infra_analysis_chat: "Infra analysis chat",
  infra_analysis_chat_preview: "Infra preview",
  project_dev_agent: "Dev agent",
  cloud_debug_chat: "Cloud debugging",
  job_automation: "Job automation",
  migrate_frontend: "Build Frontend App",
  project_memory: "Project knowledge",
};

/** Time-range options for project agent analytics (default 7d). */
export const AGENT_ANALYTICS_HORIZON_OPTIONS = [
  { value: "24h", label: "24 hours" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
];

/** @type {Record<string, { ms: number, label: string, priorLabel: string }>} */
export const AGENT_ANALYTICS_HORIZONS = {
  "24h": { ms: 24 * 60 * 60 * 1000, label: "24 hours", priorLabel: "prior 24 hours" },
  "7d": { ms: 7 * 24 * 60 * 60 * 1000, label: "7 days", priorLabel: "prior 7 days" },
  "30d": { ms: 30 * 24 * 60 * 60 * 1000, label: "30 days", priorLabel: "prior 30 days" },
  "90d": { ms: 90 * 24 * 60 * 60 * 1000, label: "90 days", priorLabel: "prior 90 days" },
};

export const DEFAULT_AGENT_ANALYTICS_HORIZON = "7d";

export { CURSOR_AGENT_TOKEN_PRICE_PER_MILLION };

/**
 * Normalize usage token fields from a usage totals object.
 * @param {object|null|undefined} usageTotals
 */
export function readUsageTokenFields(usageTotals) {
  if (!usageTotals || typeof usageTotals !== "object") {
    return {
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    };
  }
  return {
    inputTokens: Number(usageTotals.inputTokens ?? usageTotals.input_tokens ?? 0) || 0,
    outputTokens: Number(usageTotals.outputTokens ?? usageTotals.output_tokens ?? 0) || 0,
    cacheReadTokens: Number(usageTotals.cacheReadTokens ?? usageTotals.cache_read_tokens ?? 0) || 0,
    cacheWriteTokens:
      Number(usageTotals.cacheWriteTokens ?? usageTotals.cache_write_tokens ?? 0) || 0,
  };
}

/**
 * Resolve token rates for a model (per-model catalog or flat fallback).
 * @param {string|null|undefined} [modelId]
 */
export function resolveCursorAgentTokenRates(modelId) {
  const perModel = getCursorModelPricing(modelId);
  const flat = CURSOR_AGENT_TOKEN_PRICE_PER_MILLION;
  if (!perModel) return { ...flat };
  return {
    input: perModel.input ?? flat.input,
    output: perModel.output ?? flat.output,
    cacheRead: perModel.cacheRead ?? flat.cacheRead,
    cacheWrite: perModel.cacheWrite ?? flat.cacheWrite,
  };
}

/**
 * Estimated USD cost for Cursor agent token usage.
 * @param {object|null|undefined} usageTotals
 * @param {string|null|undefined} [modelId]
 */
export function computeCursorAgentUsageCostUsd(usageTotals, modelId) {
  const { inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens } =
    readUsageTokenFields(usageTotals);
  const million = 1_000_000;
  const rates = resolveCursorAgentTokenRates(modelId);
  return (
    (inputTokens / million) * rates.input +
    (outputTokens / million) * rates.output +
    (cacheReadTokens / million) * rates.cacheRead +
    (cacheWriteTokens / million) * rates.cacheWrite
  );
}

/**
 * Line-item cost breakdown for usage display.
 * @param {object|null|undefined} usageTotals
 * @param {string|null|undefined} [modelId]
 */
export function buildCursorAgentUsageCostBreakdown(usageTotals, modelId) {
  const fields = readUsageTokenFields(usageTotals);
  const rates = resolveCursorAgentTokenRates(modelId);
  const million = 1_000_000;
  const rows = [
    {
      key: "input",
      label: "Input",
      tokens: fields.inputTokens,
      rate: rates.input,
      costUsd: (fields.inputTokens / million) * rates.input,
    },
    {
      key: "output",
      label: "Output",
      tokens: fields.outputTokens,
      rate: rates.output,
      costUsd: (fields.outputTokens / million) * rates.output,
    },
    {
      key: "cacheRead",
      label: "Cache read",
      tokens: fields.cacheReadTokens,
      rate: rates.cacheRead,
      costUsd: (fields.cacheReadTokens / million) * rates.cacheRead,
    },
    {
      key: "cacheWrite",
      label: "Cache write",
      tokens: fields.cacheWriteTokens,
      rate: rates.cacheWrite,
      costUsd: (fields.cacheWriteTokens / million) * rates.cacheWrite,
    },
  ];
  const totalCostUsd = rows.reduce((sum, row) => sum + row.costUsd, 0);
  return { rows, totalCostUsd, modelId: modelId || null, ...fields };
}

/**
 * @param {number} amountUsd
 */
export function formatUsd(amountUsd) {
  const amount = Number(amountUsd) || 0;
  if (amount > 0 && amount < 0.01) return "<$0.01";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * @param {string|null|undefined} horizon
 * @param {number} [nowMs]
 */
export function getAgentAnalyticsPeriodBounds(horizon, nowMs = Date.now()) {
  const meta =
    AGENT_ANALYTICS_HORIZONS[horizon] ?? AGENT_ANALYTICS_HORIZONS[DEFAULT_AGENT_ANALYTICS_HORIZON];
  const ms = meta.ms;
  const currentEnd = nowMs;
  const currentStart = nowMs - ms;
  return {
    currentStart,
    currentEnd,
    previousStart: nowMs - ms * 2,
    previousEnd: currentStart,
    horizonMs: ms,
  };
}

/**
 * @param {object|null|undefined} run
 * @returns {number|null}
 */
export function runFinishedAtMs(run) {
  if (!run || typeof run !== "object") return null;
  const raw = run.finishedAt ?? run.updatedAt ?? null;
  if (raw == null || raw === "") return null;
  const ms = Date.parse(String(raw));
  return Number.isFinite(ms) ? ms : null;
}

/**
 * Terminal run finished within [start, end).
 * @param {object} run
 * @param {number} start
 * @param {number} end
 */
export function isRunInFinishedPeriod(run, start, end) {
  if (isAgentRunActive(run)) return false;
  const finishedMs = runFinishedAtMs(run);
  if (finishedMs == null) return false;
  return finishedMs >= start && finishedMs <= end;
}

/**
 * Sum token KPIs for terminal runs finished in [start, end).
 * @param {object[]} runs
 * @param {number} start
 * @param {number} end
 */
export function rollupPeriodTokenTotals(runs, start, end) {
  const totals = {
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    cacheTokens: 0,
  };
  for (const run of runs) {
    if (!isRunInFinishedPeriod(run, start, end)) continue;
    const fields = readUsageTokenFields(run?.usageTotals);
    if (
      fields.inputTokens + fields.outputTokens + fields.cacheReadTokens + fields.cacheWriteTokens <=
      0
    ) {
      continue;
    }
    totals.inputTokens += fields.inputTokens;
    totals.outputTokens += fields.outputTokens;
    totals.cacheReadTokens += fields.cacheReadTokens;
    totals.cacheWriteTokens += fields.cacheWriteTokens;
  }
  totals.cacheTokens = totals.cacheReadTokens + totals.cacheWriteTokens;
  return totals;
}

/**
 * @param {number} current
 * @param {number} previous
 */
export function computePeriodTrend(current, previous) {
  const cur = Number(current) || 0;
  const prev = Number(previous) || 0;
  if (prev <= 0) {
    return { deltaPct: cur > 0 ? null : 0, direction: cur > 0 ? "new" : "flat" };
  }
  const deltaPct = Math.round(((cur - prev) / prev) * 1000) / 10;
  if (deltaPct === 0) return { deltaPct: 0, direction: "flat" };
  return { deltaPct, direction: deltaPct > 0 ? "up" : "down" };
}

/**
 * @param {{ inputTokens: number, outputTokens: number, cacheTokens: number }} current
 * @param {{ inputTokens: number, outputTokens: number, cacheTokens: number }} previous
 */
export function buildPeriodTokenTrends(current, previous) {
  return {
    inputTokens: computePeriodTrend(current.inputTokens, previous.inputTokens),
    outputTokens: computePeriodTrend(current.outputTokens, previous.outputTokens),
    cacheTokens: computePeriodTrend(current.cacheTokens, previous.cacheTokens),
    estimatedCostUsd: computePeriodTrend(
      computeCursorAgentUsageCostUsd(current),
      computeCursorAgentUsageCostUsd(previous),
    ),
  };
}

/**
 * Table visibility: active runs always; terminal runs in current horizon window.
 * @param {object} run
 * @param {string} horizon
 */
export function isRunVisibleInHorizonTable(run, horizon = DEFAULT_AGENT_ANALYTICS_HORIZON) {
  if (isAgentRunActive(run)) return true;
  const { currentStart, currentEnd } = getAgentAnalyticsPeriodBounds(horizon);
  return isRunInFinishedPeriod(run, currentStart, currentEnd);
}

const UNDERSTAND_GRAPH_STATUS = {
  GENERATING: "generating",
  READY: "ready",
  FAILED: "failed",
  NONE: "none",
};

export function formatTokens(value) {
  const n = Number(value) || 0;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export function runTokenTotal(usageTotals) {
  if (!usageTotals || typeof usageTotals !== "object") return 0;
  const explicit = Number(usageTotals.totalTokens ?? usageTotals.total_tokens ?? 0);
  if (explicit > 0) return explicit;
  return (
    (Number(usageTotals.inputTokens ?? usageTotals.input_tokens ?? 0) || 0) +
    (Number(usageTotals.outputTokens ?? usageTotals.output_tokens ?? 0) || 0) +
    (Number(usageTotals.cacheReadTokens ?? usageTotals.cache_read_tokens ?? 0) || 0) +
    (Number(usageTotals.cacheWriteTokens ?? usageTotals.cache_write_tokens ?? 0) || 0)
  );
}

export function formatRunTimeMs(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n) || n < 1) return null;
  if (n < 1000) return `${Math.round(n)}ms`;

  let totalSec = Math.round(n / 1000);
  const hours = Math.floor(totalSec / 3600);
  totalSec %= 3600;
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;

  if (hours > 0) {
    const parts = [`${hours}h`];
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0) parts.push(`${seconds}s`);
    return parts.join(" ");
  }
  if (minutes > 0) {
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
  }
  return `${seconds}s`;
}

export function runCliDurationMs(run) {
  const explicit = Number(run?.cliDurationMs);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  const invocations = Array.isArray(run?.usageInvocations) ? run.usageInvocations : [];
  let total = 0;
  let hasValue = false;
  for (const row of invocations) {
    const ms = Number(row?.durationMs);
    if (Number.isFinite(ms) && ms > 0) {
      total += ms;
      hasValue = true;
    }
  }
  return hasValue ? total : null;
}

export function normalizeStatus(status) {
  if (status == null || status === "") return "UNKNOWN";
  return String(status).trim().toUpperCase().replace(/\s+/g, "_");
}

function isCursorStatusActive(status) {
  const u = normalizeStatus(status);
  if (!u || u === "UNKNOWN") return true;
  if (
    u === "FINISHED" ||
    u === "COMPLETED" ||
    u === "COMPLETE" ||
    u === "SUCCEEDED" ||
    u === "SUCCESS" ||
    u === "DONE" ||
    u === "FAILED" ||
    u === "ERROR" ||
    u === "CANCELLED" ||
    u === "CANCELED" ||
    u === "STOPPED"
  ) {
    return false;
  }
  // Match backend isCursorAgentFailureTerminal — e.g. MIGRATE_PLATFORM_SYNC_FAILED.
  if (u.includes("FAIL")) return false;
  return true;
}

/**
 * @param {unknown} value
 * @returns {number}
 */
function parseAgentTimestampMs(value) {
  const ms = Date.parse(String(value ?? ""));
  return Number.isFinite(ms) ? ms : 0;
}

/**
 * Early bootstrap statuses — registry terminal should beat these even without timestamps.
 * @param {string} status
 */
function isEarlyActiveAgentStatus(status) {
  const u = normalizeStatus(status);
  return (
    u === "CREATING" || u === "QUEUED" || u === "PENDING" || u === "STARTING" || u === "UNKNOWN"
  );
}

/**
 * Non-empty status for analytics rows. Empty `agentStatus` must not block statusHint.
 * When active vs terminal disagree, prefer terminal only if finished/registry is newer
 * (or live is still early bootstrap / no fresher live timestamp).
 * @param {object|null|undefined} run
 * @returns {string|null}
 */
function resolveAgentRunStatus(run) {
  if (!run || typeof run !== "object") return null;
  const agentStatus = String(run.agentStatus ?? "").trim();
  const statusHint = String(run.statusHint ?? "").trim();
  if (agentStatus && statusHint && agentStatus.toUpperCase() !== statusHint.toUpperCase()) {
    const agentActive = isCursorStatusActive(agentStatus);
    const hintActive = isCursorStatusActive(statusHint);
    if (agentActive && !hintActive) {
      if (isEarlyActiveAgentStatus(agentStatus)) return statusHint;
      const liveTs = Math.max(
        parseAgentTimestampMs(run.updatedAt),
        parseAgentTimestampMs(run.startedAt),
      );
      const terminalTs = Math.max(
        parseAgentTimestampMs(run.finishedAt),
        parseAgentTimestampMs(run.registryUpdatedAt),
      );
      if (liveTs > 0 && liveTs > terminalTs) return agentStatus;
      return statusHint;
    }
    if (!agentActive && hintActive) return agentStatus;
  }
  return agentStatus || statusHint || null;
}

/**
 * Source-aware active check (mirrors backend resolveProjectAgentRunActive).
 * @param {object|null|undefined} run
 */
export function isAgentRunActive(run) {
  if (!run || typeof run !== "object") return true;
  const stopSummary =
    typeof run.summary === "string"
      ? run.summary.trim()
      : typeof run.pipelineDetail === "string"
        ? run.pipelineDetail.trim()
        : "";
  // Cursor may briefly keep RUNNING after stop while summary is already "Stopped by API".
  if (stopSummary === "Stopped by API") return false;
  const source = String(run.source ?? "")
    .trim()
    .toLowerCase();
  if (source === "understand_graph") {
    const hint = String(run.statusHint ?? run.agentStatus ?? "")
      .trim()
      .toLowerCase();
    if (hint === UNDERSTAND_GRAPH_STATUS.GENERATING) return true;
    if (
      hint === UNDERSTAND_GRAPH_STATUS.READY ||
      hint === UNDERSTAND_GRAPH_STATUS.FAILED ||
      hint === UNDERSTAND_GRAPH_STATUS.NONE
    ) {
      return false;
    }
  }
  const resolved = resolveAgentRunStatus(run);
  if (isFinishedWithQueuedFollowups(resolved, run.followupQueueDepth)) return true;
  return isCursorStatusActive(resolved);
}

const SUCCESS_TERMINAL_STATUSES = new Set([
  "FINISHED",
  "COMPLETED",
  "COMPLETE",
  "SUCCEEDED",
  "SUCCESS",
  "DONE",
]);

/**
 * A turn finished (FINISHED) but follow-ups are still queued: the agent is still working.
 * @param {string|null|undefined} status
 * @param {unknown} followupQueueDepth
 */
export function isFinishedWithQueuedFollowups(status, followupQueueDepth) {
  if (!(Number(followupQueueDepth) > 0)) return false;
  return SUCCESS_TERMINAL_STATUSES.has(normalizeStatus(status));
}

/** @deprecated Use isAgentRunActive(run) for run rows. */
export function isActiveStatus(status) {
  return isCursorStatusActive(status);
}

/**
 * Status label for table badge (understand graph ready → FINISHED).
 * @param {object|null|undefined} run
 */
export function getAgentRunDisplayStatus(run) {
  if (!run || typeof run !== "object") return "UNKNOWN";
  const source = String(run.source ?? "")
    .trim()
    .toLowerCase();
  const resolved = resolveAgentRunStatus(run);
  const hint = String(resolved ?? run.statusHint ?? "")
    .trim()
    .toLowerCase();
  if (source === "understand_graph" && hint === UNDERSTAND_GRAPH_STATUS.READY) {
    return "FINISHED";
  }
  if (source === "understand_graph" && hint === UNDERSTAND_GRAPH_STATUS.FAILED) {
    return "FAILED";
  }
  if (isFinishedWithQueuedFollowups(resolved, run.followupQueueDepth) && isAgentRunActive(run)) {
    return "RUNNING";
  }
  return normalizeStatus(resolved);
}

export function statusBadgeClass(status) {
  const u = normalizeStatus(status);
  if (isCursorStatusActive(u)) {
    return "border-primary/30 bg-primary/10 text-primary";
  }
  if (u.includes("FAIL") || u === "STOPPED") {
    return "border-destructive/30 bg-destructive/10 text-destructive";
  }
  return "border-primary/20 bg-primary/5 text-foreground";
}

/**
 * @param {string|null|undefined} iso
 * @param {{ includeSeconds?: boolean }} [opts]
 * @returns {{ compact: string, full: string } | null}
 */
export function formatAgentCreatedAt(iso, opts = {}) {
  if (!iso) return null;
  try {
    const date = parseISO(String(iso));
    if (Number.isNaN(date.getTime())) return null;
    return {
      compact: format(date, opts.includeSeconds ? "MMM d, h:mm:ss a" : "MMM d, h:mm a"),
      full: format(date, "MMM d, yyyy 'at' h:mm:ss a"),
    };
  } catch {
    return null;
  }
}

/** @param {object|null|undefined} run */
export function getAgentRunCreatedAt(run) {
  if (!run || typeof run !== "object") return null;
  return run.startedAt ?? run.updatedAt ?? null;
}

/** @param {object|null|undefined} run */
export function getAgentRunLastActivityAt(run) {
  if (!run || typeof run !== "object") return null;
  return run.updatedAt ?? run.startedAt ?? null;
}

/**
 * Nested `run` from analytics SSE, or the event itself when it already is a run row.
 * @param {object|null|undefined} evt
 */
export function readAgentAnalyticsEventRun(evt) {
  if (!evt || typeof evt !== "object") return null;
  if (evt.run && typeof evt.run === "object") return evt.run;
  if (typeof evt.cursorAgentId === "string" && evt.cursorAgentId.trim()) return evt;
  return null;
}

/**
 * Union two stream timelines by item id so a later shorter snapshot cannot wipe history.
 * @param {unknown} prev
 * @param {unknown} next
 * @returns {object[]}
 */
export function mergeAgentAnalyticsTimelines(prev, next) {
  const a = Array.isArray(prev) ? prev : [];
  const b = Array.isArray(next) ? next : [];
  if (b.length === 0) return a;
  if (a.length === 0) return b;
  /** @type {Map<string, object>} */
  const byId = new Map();
  /** @type {object[]} */
  const order = [];
  for (const item of [...a, ...b]) {
    if (!item || typeof item !== "object") continue;
    const id = typeof item.id === "string" && item.id.trim() ? item.id.trim() : "";
    if (!id) {
      order.push(item);
      continue;
    }
    if (!byId.has(id)) order.push({ id });
    byId.set(id, { ...(byId.get(id) ?? {}), ...item, id });
  }
  return order.map((item) => {
    const id = typeof item.id === "string" ? item.id : "";
    return id && byId.has(id) ? byId.get(id) : item;
  });
}

/**
 * Merge a live analytics run patch onto an existing row without clobbering richer stream fields.
 * @param {object|null|undefined} existing
 * @param {object|null|undefined} incoming
 */
export function mergeAgentAnalyticsRun(existing, incoming) {
  const prev = existing && typeof existing === "object" ? existing : null;
  const next = incoming && typeof incoming === "object" ? incoming : null;
  if (!next) return prev;
  if (!prev) return next;
  const merged = { ...prev, ...next };
  merged.streamTimeline = mergeAgentAnalyticsTimelines(prev.streamTimeline, next.streamTimeline);
  if (!String(next.streamText ?? "").trim() && String(prev.streamText ?? "").trim()) {
    merged.streamText = prev.streamText;
  }
  if (!String(next.streamPhase ?? "").trim() && String(prev.streamPhase ?? "").trim()) {
    merged.streamPhase = prev.streamPhase;
  }
  return merged;
}

/**
 * Latest human-readable activity line for an active analytics row.
 * @param {object|null|undefined} run
 * @returns {string|null}
 */
export function getAgentRunLiveActivityLabel(run) {
  const timeline = Array.isArray(run?.streamTimeline) ? run.streamTimeline : [];
  for (let i = timeline.length - 1; i >= 0; i -= 1) {
    const item = timeline[i];
    if (!item || typeof item !== "object") continue;
    if (item.type === "tool_call") {
      const label = String(item.label || item.toolName || "").trim();
      if (label) return label;
    }
    if (item.type === "assistant" || item.type === "thinking") {
      const text = typeof item.text === "string" ? item.text.trim() : "";
      if (!text) continue;
      const line = text.split("\n").find((part) => part.trim()) || text;
      return line.length > 72 ? `${line.slice(0, 71)}…` : line;
    }
  }
  const phase = typeof run?.streamPhase === "string" ? run.streamPhase.trim() : "";
  if (phase) return phase;
  const text = typeof run?.streamText === "string" ? run.streamText.trim() : "";
  return text || null;
}

/**
 * Client-side filters for project agent analytics table.
 * @param {object[]} runs
 * @param {{ statusFilter?: string, sourceFilter?: string, search?: string, horizon?: string }} filters
 */
export function filterAgentRuns(runs, filters = {}) {
  const search = String(filters.search ?? "")
    .trim()
    .toLowerCase();
  const statusFilter = filters.statusFilter ?? "__all";
  const sourceFilter = filters.sourceFilter ?? "__all";
  const horizon = filters.horizon ?? DEFAULT_AGENT_ANALYTICS_HORIZON;
  const { currentStart, currentEnd } = getAgentAnalyticsPeriodBounds(horizon);

  return runs.filter((run) => {
    const active = isAgentRunActive(run);
    const displayStatus = getAgentRunDisplayStatus(run);

    if (!active && !isRunInFinishedPeriod(run, currentStart, currentEnd)) {
      return false;
    }

    if (statusFilter === "active" && !active) return false;
    if (statusFilter === "finished") {
      // Exact FINISHED only — COMPLETED (and other terminal) use their own filters.
      if (displayStatus !== "FINISHED") return false;
    }
    if (statusFilter === "completed") {
      if (displayStatus !== "COMPLETED" && displayStatus !== "COMPLETE") return false;
    }
    if (statusFilter === "failed") {
      const u = displayStatus;
      if (!u.includes("FAIL") && u !== "STOPPED") return false;
    }

    if (sourceFilter !== "__all" && run.source !== sourceFilter) return false;

    if (search) {
      const hay = [run.label, run.cursorAgentId, run.source, SOURCE_LABELS[run.source]]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!hay.includes(search)) return false;
    }

    return true;
  });
}

/**
 * Sort runs: active first, then by latest activity.
 * @param {object[]} runs
 */
export function sortAgentRuns(runs) {
  return [...runs].sort((a, b) => {
    const aActive = isAgentRunActive(a);
    const bActive = isAgentRunActive(b);
    if (aActive !== bActive) return aActive ? -1 : 1;
    const ta = Date.parse(String(getAgentRunLastActivityAt(a) ?? 0)) || 0;
    const tb = Date.parse(String(getAgentRunLastActivityAt(b) ?? 0)) || 0;
    return tb - ta;
  });
}
