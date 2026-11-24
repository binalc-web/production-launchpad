/**
 * Mirror of backend/src/constants/cursorModelCatalog.constants.js
 * for Agent Analytics cost display and model labels.
 */

/** @typedef {{ input: number|null, cacheWrite: number|null, cacheRead: number|null, output: number|null }} ModelPricing */

/** @type {readonly { id: string, label: string, provider: string, pricing: ModelPricing|null }[]} */
export const CURSOR_MODEL_CATALOG = Object.freeze([
  Object.freeze({
    id: "Auto",
    label: "Auto",
    provider: "Cursor",
    pricing: null,
  }),
  Object.freeze({
    id: "composer-2.5",
    label: "Composer 2.5",
    provider: "Cursor",
    pricing: Object.freeze({ input: 0.5, cacheWrite: null, cacheRead: 0.2, output: 2.5 }),
  }),
  Object.freeze({
    id: "composer-2.5-fast",
    label: "Composer 2.5 (Fast)",
    provider: "Cursor",
    pricing: Object.freeze({ input: 3, cacheWrite: null, cacheRead: 0.5, output: 15 }),
  }),
  Object.freeze({
    id: "grok-4.7-high",
    label: "Grok 4.7",
    provider: "Cursor",
    pricing: Object.freeze({ input: 2, cacheWrite: null, cacheRead: 0.5, output: 6 }),
  }),
  Object.freeze({
    id: "grok-4.7-medium",
    label: "Grok 4.7 Medium",
    provider: "Cursor",
    pricing: Object.freeze({ input: 2, cacheWrite: null, cacheRead: 0.5, output: 6 }),
  }),
  Object.freeze({
    id: "grok-4.7-high-fast",
    label: "Grok 4.7 Fast",
    provider: "Cursor",
    pricing: Object.freeze({ input: 4, cacheWrite: null, cacheRead: 1, output: 12 }),
  }),
  Object.freeze({
    id: "grok-4.7-medium-fast",
    label: "Grok 4.7 Medium Fast",
    provider: "Cursor",
    pricing: Object.freeze({ input: 4, cacheWrite: null, cacheRead: 1, output: 12 }),
  }),
  Object.freeze({
    id: "cursor-grok-4.5-high",
    label: "Cursor Grok 4.5",
    provider: "Cursor",
    pricing: Object.freeze({ input: 2, cacheWrite: null, cacheRead: 0.5, output: 6 }),
  }),
  Object.freeze({
    id: "cursor-grok-4.5-high-fast",
    label: "Cursor Grok 4.5 Fast",
    provider: "Cursor",
    pricing: Object.freeze({ input: 4, cacheWrite: null, cacheRead: 1, output: 18 }),
  }),
  Object.freeze({
    id: "claude-fable-5-high",
    label: "Claude Fable 5",
    provider: "Anthropic",
    pricing: Object.freeze({ input: 10, cacheWrite: 12.5, cacheRead: 1, output: 50 }),
  }),
  Object.freeze({
    id: "claude-opus-5-5-high",
    label: "Claude Opus 5.5",
    provider: "Anthropic",
    pricing: Object.freeze({ input: 4, cacheWrite: 5, cacheRead: 0.2, output: 20 }),
  }),
  Object.freeze({
    id: "claude-opus-5-5-medium",
    label: "Claude Opus 5.5 Medium",
    provider: "Anthropic",
    pricing: Object.freeze({ input: 4, cacheWrite: 5, cacheRead: 0.2, output: 20 }),
  }),
  Object.freeze({
    id: "claude-opus-4-8-high",
    label: "Claude Opus 4.8",
    provider: "Anthropic",
    pricing: Object.freeze({ input: 5, cacheWrite: 6.25, cacheRead: 0.5, output: 25 }),
  }),
  Object.freeze({
    id: "claude-sonnet-5-high",
    label: "Claude Sonnet 5",
    provider: "Anthropic",
    pricing: Object.freeze({ input: 3, cacheWrite: 3.75, cacheRead: 0.3, output: 15 }),
  }),
  Object.freeze({
    id: "gemini-3.1-pro",
    label: "Gemini 3.1 Pro",
    provider: "Google",
    pricing: Object.freeze({ input: 2, cacheWrite: null, cacheRead: 0.2, output: 12 }),
  }),
  Object.freeze({
    id: "gemini-3.5-flash",
    label: "Gemini 3.5 Flash",
    provider: "Google",
    pricing: Object.freeze({ input: 1.5, cacheWrite: null, cacheRead: 0.15, output: 9 }),
  }),
  Object.freeze({
    id: "gpt-5.6-luna-medium",
    label: "GPT-5.6 Luna",
    provider: "OpenAI",
    pricing: Object.freeze({ input: 0.2, cacheWrite: 0.25, cacheRead: 0.02, output: 1.2 }),
  }),
  Object.freeze({
    id: "gpt-5.6-sol-medium",
    label: "GPT-5.6 Sol",
    provider: "OpenAI",
    pricing: Object.freeze({ input: 5, cacheWrite: 6.25, cacheRead: 0.5, output: 30 }),
  }),
  Object.freeze({
    id: "gpt-5.6-terra-medium",
    label: "GPT-5.6 Terra",
    provider: "OpenAI",
    pricing: Object.freeze({ input: 2, cacheWrite: 2.5, cacheRead: 0.2, output: 12 }),
  }),
]);

/**
 * OpenCode runtime models (`provider/model` ids) for projects whose agent runtime is OpenCode.
 * @type {readonly { id: string, label: string, provider: string, pricing: ModelPricing|null }[]}
 */
export const OPENCODE_MODEL_CATALOG = Object.freeze([
  Object.freeze({
    id: "anthropic/claude-sonnet-5-5",
    label: "Claude Sonnet 5.5",
    provider: "Anthropic",
    pricing: Object.freeze({ input: 3, cacheWrite: 3.75, cacheRead: 0.3, output: 15 }),
  }),
  Object.freeze({
    id: "anthropic/claude-opus-5-5",
    label: "Claude Opus 5.5",
    provider: "Anthropic",
    pricing: Object.freeze({ input: 4, cacheWrite: 5, cacheRead: 0.2, output: 20 }),
  }),
  Object.freeze({
    id: "anthropic/claude-sonnet-5",
    label: "Claude Sonnet 5",
    provider: "Anthropic",
    pricing: Object.freeze({ input: 3, cacheWrite: 3.75, cacheRead: 0.3, output: 15 }),
  }),
  Object.freeze({
    id: "anthropic/claude-fable-5-1",
    label: "Claude Fable 5.1",
    provider: "Anthropic",
    pricing: Object.freeze({ input: 10, cacheWrite: 12.5, cacheRead: 1, output: 50 }),
  }),
  Object.freeze({
    id: "openai/gpt-5.6-sol",
    label: "GPT-5.6 Sol",
    provider: "OpenAI",
    pricing: Object.freeze({ input: 5, cacheWrite: 6.25, cacheRead: 0.5, output: 30 }),
  }),
  Object.freeze({
    id: "openai/gpt-5.6-terra",
    label: "GPT-5.6 Terra",
    provider: "OpenAI",
    pricing: Object.freeze({ input: 2, cacheWrite: 2.5, cacheRead: 0.2, output: 12 }),
  }),
  Object.freeze({
    id: "openai/gpt-5.6-luna",
    label: "GPT-5.6 Luna",
    provider: "OpenAI",
    pricing: Object.freeze({ input: 0.2, cacheWrite: 0.25, cacheRead: 0.02, output: 1.2 }),
  }),
  Object.freeze({
    id: "york/york-llm-v1",
    label: "York LLM V1",
    provider: "York",
    pricing: Object.freeze({ input: 0, cacheWrite: 0, cacheRead: 0, output: 0 }),
  }),
]);

export const OPENCODE_DEFAULT_MODEL_ID = "anthropic/claude-sonnet-5-5";

/**
 * Catalog entry for a Cursor or OpenCode model id.
 * @param {string|null|undefined} modelId
 * @returns {{ id: string, label: string, provider: string, pricing: ModelPricing|null }|null}
 */
export function getCursorModelCatalogEntry(modelId) {
  const id = typeof modelId === "string" ? modelId.trim() : "";
  if (!id) return null;
  return (
    CURSOR_MODEL_CATALOG.find((entry) => entry.id === id) ||
    OPENCODE_MODEL_CATALOG.find((entry) => entry.id === id) ||
    null
  );
}

/**
 * Display label for a Cursor model id.
 * @param {string|null|undefined} modelId
 * @returns {string}
 */
export function getCursorModelLabel(modelId) {
  const id = typeof modelId === "string" ? modelId.trim() : "";
  if (!id) return "Auto";
  const entry = getCursorModelCatalogEntry(id);
  return entry?.label || id;
}

/**
 * Per-model pricing, or null when Auto/unknown (use flat fallback).
 * @param {string|null|undefined} modelId
 * @returns {ModelPricing|null}
 */
export function getCursorModelPricing(modelId) {
  const entry = getCursorModelCatalogEntry(modelId);
  return entry?.pricing ?? null;
}

/**
 * Compact USD rate for dropdown hints (e.g. `$0.50`).
 * @param {number} value
 * @returns {string}
 */
function formatUsdPerMillion(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "$0.00";
  return `$${n.toFixed(2)}`;
}

/**
 * Input/output price hint for a catalog pricing object.
 * @param {ModelPricing|null|undefined} pricing
 * @returns {string|null}
 */
export function formatCursorModelPriceHint(pricing) {
  if (!pricing || pricing.input == null || pricing.output == null) return null;
  if (pricing.input === 0 && pricing.output === 0) return "Free";
  return `${formatUsdPerMillion(pricing.input)} / ${formatUsdPerMillion(pricing.output)}`;
}

/**
 * Sort catalog entries: Auto first, then ascending by input (then output, then label).
 * Does not mutate the input array or frozen catalog.
 * @param {readonly { id: string, label?: string, pricing?: ModelPricing|null }[]} entries
 * @returns {typeof entries extends readonly (infer T)[] ? T[] : never}
 */
export function sortCursorModelCatalog(entries) {
  const list = Array.isArray(entries) ? [...entries] : [];
  list.sort((a, b) => {
    const aAuto = a?.id === "Auto";
    const bAuto = b?.id === "Auto";
    if (aAuto && !bAuto) return -1;
    if (!aAuto && bAuto) return 1;

    const aIn = a?.pricing?.input;
    const bIn = b?.pricing?.input;
    const aHasIn = typeof aIn === "number" && Number.isFinite(aIn);
    const bHasIn = typeof bIn === "number" && Number.isFinite(bIn);
    if (aHasIn && bHasIn && aIn !== bIn) return aIn - bIn;
    if (aHasIn && !bHasIn) return -1;
    if (!aHasIn && bHasIn) return 1;

    const aOut = a?.pricing?.output;
    const bOut = b?.pricing?.output;
    const aHasOut = typeof aOut === "number" && Number.isFinite(aOut);
    const bHasOut = typeof bOut === "number" && Number.isFinite(bOut);
    if (aHasOut && bHasOut && aOut !== bOut) return aOut - bOut;
    if (aHasOut && !bHasOut) return -1;
    if (!aHasOut && bHasOut) return 1;

    return String(a?.label || a?.id || "").localeCompare(String(b?.label || b?.id || ""));
  });
  return list;
}
