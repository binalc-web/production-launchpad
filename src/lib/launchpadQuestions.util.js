/**
 * Frontend mirror of backend launchpad-questions helpers.
 * Keep in sync with backend/src/utils/launchpadQuestions.util.js
 */

function readTrimmedString(raw, keys) {
  if (!raw || typeof raw !== "object") return "";
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function optionsArrayFromRaw(raw) {
  if (Array.isArray(raw?.options)) return raw.options;
  if (Array.isArray(raw?.choices)) return raw.choices;
  return null;
}

function normalizeLaunchpadQuestion(raw, index, opts = {}) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const prompt = readTrimmedString(raw, ["prompt", "question"]);
  if (!prompt) return null;
  const id = typeof raw.id === "string" && raw.id.trim() ? raw.id.trim() : `q${index + 1}`;
  const optionsRaw = optionsArrayFromRaw(raw);
  if (!optionsRaw && !opts.allowMissingOptions) return null;
  const options = [];
  const source = optionsRaw || [];
  for (let i = 0; i < source.length; i += 1) {
    const opt = source[i];
    if (typeof opt === "string" && opt.trim()) {
      options.push({ id: `o${i + 1}`, label: opt.trim() });
      continue;
    }
    if (opt && typeof opt === "object" && !Array.isArray(opt)) {
      const label = readTrimmedString(opt, ["label", "text", "name"]);
      if (!label) continue;
      const optId = typeof opt.id === "string" && opt.id.trim() ? opt.id.trim() : `o${i + 1}`;
      const optDescription = typeof opt.description === "string" ? opt.description.trim() : "";
      options.push({
        id: optId,
        label,
        ...(optDescription ? { description: optDescription } : {}),
      });
    }
  }
  const minOptions = Number.isFinite(opts.minOptions) ? Number(opts.minOptions) : 0;
  if (options.length < minOptions) return null;
  const recommendedRaw = typeof raw.recommended === "string" ? raw.recommended.trim() : "";
  const recommended =
    options.length === 0
      ? null
      : recommendedRaw && options.some((o) => o.id === recommendedRaw)
        ? recommendedRaw
        : options[0].id;
  const allowMultiple = raw.allowMultiple === true || raw.allow_multiple === true;
  const questionDescription = typeof raw.description === "string" ? raw.description.trim() : "";
  return {
    id,
    prompt,
    options,
    recommended,
    allowMultiple,
    ...(questionDescription ? { description: questionDescription } : {}),
  };
}

/**
 * @param {unknown} parsed
 */
function questionsListFromParsed(parsed) {
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === "object" && Array.isArray(parsed.questions)) {
    return parsed.questions;
  }
  return null;
}

/**
 * @param {unknown} parsed
 */
function normalizeQuestionsFromParsed(parsed, opts = {}) {
  const list = questionsListFromParsed(parsed);
  if (!list || list.length === 0) return null;
  const questions = [];
  for (let i = 0; i < list.length; i += 1) {
    const q = normalizeLaunchpadQuestion(list[i], i, opts);
    if (q) questions.push(q);
  }
  return questions.length > 0 ? questions : null;
}

/**
 * @param {string} body
 */
function tryParseJson(body) {
  const s = typeof body === "string" ? body.trim() : "";
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch {
    try {
      return JSON.parse(s.replace(/,\s*([}\]])/g, "$1"));
    } catch {
      return null;
    }
  }
}

function optsForFence(tagged, opts) {
  if (!tagged) return opts;
  return {
    ...opts,
    allowMissingOptions: true,
    minOptions: Number.isFinite(opts.minOptions) ? opts.minOptions : 0,
  };
}

/**
 * @param {string} raw
 */
function findJsonSubstring(raw) {
  const text = typeof raw === "string" ? raw : "";
  const startCandidates = [];
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === "{" || text[i] === "[") startCandidates.push(i);
  }
  for (const start of startCandidates) {
    const open = text[start];
    const close = open === "{" ? "}" : "]";
    let depth = 0;
    let inString = false;
    let escape = false;
    for (let i = start; i < text.length; i += 1) {
      const ch = text[i];
      if (inString) {
        if (escape) {
          escape = false;
        } else if (ch === "\\") {
          escape = true;
        } else if (ch === '"') {
          inString = false;
        }
        continue;
      }
      if (ch === '"') {
        inString = true;
        continue;
      }
      if (ch === open) depth += 1;
      else if (ch === close) {
        depth -= 1;
        if (depth === 0) {
          return text.slice(start, i + 1);
        }
      }
    }
  }
  return null;
}

/**
 * @param {unknown} text
 */
export function extractLaunchpadQuestionsFence(text, opts = {}) {
  const raw = typeof text === "string" ? text : "";
  if (!raw.trim()) return null;

  const fencePatterns = [
    { re: /```[ \t]*launchpad[-_ ]?questions\b[^\n]*\r?\n([\s\S]*?)```/i, tagged: true },
    { re: /```json\b[^\n]*\r?\n([\s\S]*?)```/i, tagged: false },
    { re: /```\r?\n([\s\S]*?)```/, tagged: false },
  ];
  for (const pattern of fencePatterns) {
    const match = raw.match(pattern.re);
    if (!match) continue;
    const body = String(match[1] ?? "").trim();
    const questions = normalizeQuestionsFromParsed(
      tryParseJson(body),
      optsForFence(pattern.tagged, opts),
    );
    if (questions) return questions;
  }

  const jsonSub = findJsonSubstring(raw);
  if (jsonSub) {
    const questions = normalizeQuestionsFromParsed(tryParseJson(jsonSub), opts);
    if (questions) return questions;
  }
  return null;
}

/**
 * @param {unknown} text
 */
export function replyHasLaunchpadQuestions(text) {
  return Boolean(extractLaunchpadQuestionsFence(text)?.length);
}

/**
 * @param {unknown} text
 */
export function stripLaunchpadQuestionsFromReply(text, opts = {}) {
  let raw = typeof text === "string" ? text : "";
  if (!raw.trim()) return "";

  raw = raw.replace(/```[ \t]*launchpad[-_ ]?questions\b[^\n]*\r?\n[\s\S]*?```/gi, "");
  raw = raw.replace(/```json\b[^\n]*\r?\n([\s\S]*?)```/gi, (full, body) => {
    const questions = normalizeQuestionsFromParsed(tryParseJson(body), opts);
    return questions ? "" : full;
  });
  raw = raw.replace(/```\r?\n([\s\S]*?)```/g, (full, body) => {
    const questions = normalizeQuestionsFromParsed(tryParseJson(body), opts);
    return questions ? "" : full;
  });

  const jsonSub = findJsonSubstring(raw);
  if (jsonSub) {
    const questions = normalizeQuestionsFromParsed(tryParseJson(jsonSub), opts);
    if (questions) {
      raw = raw.replace(jsonSub, "");
    }
  }

  return raw.replace(/\n{3,}/g, "\n\n").trim();
}

export const LAUNCHPAD_QUESTIONS_CONTINUE_PLAN =
  "Please emit one ```launchpad-plan``` fence with the concrete implementation plan now. Do not re-ask the same questions.";

export const LAUNCHPAD_QUESTIONS_CONTINUE_IMPLEMENT =
  "Continue with the implementation using these answers. Do not re-ask the same questions. Do not emit another ```launchpad-questions``` fence unless a new decision is truly blocking.";

/** Continue after MCQs for backlog suggestion generation. */
export const LAUNCHPAD_QUESTIONS_CONTINUE_BACKLOG_SUGGESTIONS =
  'Generate backlog suggestions using these answers. Set status to "ok" with suggestions. Do not re-ask the same questions unless a new decision is truly blocking.';

/** Reserved option id for the UI-injected "Other" free-text choice. */
export const LAUNCHPAD_QUESTIONS_OTHER_OPTION_ID = "__other__";

/**
 * Resolve display labels for selected option ids + optional Other free text.
 * @param {{ options?: Array<{ id: string, label: string }> }} q
 * @param {Array<string>} selectedIds
 * @param {string} customText
 * @returns {string[]}
 */
export function resolveLaunchpadAnswerLabels(q, selectedIds, customText) {
  const options = Array.isArray(q?.options) ? q.options : [];
  const ids = Array.isArray(selectedIds) ? selectedIds.map(String) : [];
  const text = typeof customText === "string" ? customText.trim() : "";
  const hasOther = ids.includes(LAUNCHPAD_QUESTIONS_OTHER_OPTION_ID);
  const labels = [];
  for (const id of ids) {
    if (id === LAUNCHPAD_QUESTIONS_OTHER_OPTION_ID) continue;
    const label = options.find((o) => o.id === id)?.label || String(id);
    if (label) labels.push(label);
  }
  if (hasOther && text) {
    labels.push(`Other: ${text}`);
  } else if (!hasOther && text && labels.length === 0) {
    // Prompt-only free text (no MCQ selection).
    labels.push(text);
  }
  return labels;
}

/**
 * @param {Array<object>} questions
 * @param {Record<string, string|string[]>} answersByQuestionId
 * @param {{ continueInstruction?: string, customAnswersByQuestionId?: Record<string, string> }} [opts]
 */
export function formatLaunchpadQuestionsAnswerPrompt(questions, answersByQuestionId, opts = {}) {
  const list = Array.isArray(questions) ? questions : [];
  const answers =
    answersByQuestionId && typeof answersByQuestionId === "object" ? answersByQuestionId : {};
  const customAnswers =
    opts.customAnswersByQuestionId && typeof opts.customAnswersByQuestionId === "object"
      ? opts.customAnswersByQuestionId
      : {};
  const continueInstruction =
    typeof opts.continueInstruction === "string" && opts.continueInstruction.trim()
      ? opts.continueInstruction.trim()
      : LAUNCHPAD_QUESTIONS_CONTINUE_IMPLEMENT;
  const lines = [];
  for (const q of list) {
    const raw = answers[q.id];
    const selectedIds = Array.isArray(raw) ? raw : raw != null ? [raw] : [];
    const customText = typeof customAnswers[q.id] === "string" ? customAnswers[q.id].trim() : "";
    const labels = resolveLaunchpadAnswerLabels(q, selectedIds, customText);
    if (labels.length === 0) continue;
    lines.push(`Q (${q.id}): ${q.prompt}`);
    lines.push(`A: ${labels.join("; ")}`);
  }
  if (lines.length === 0) return "";
  return `${lines.join("\n")}\n\n${continueInstruction}`;
}

/**
 * @param {Array<object>} questions
 * @param {Record<string, string|string[]>} answersByQuestionId
 */
export function formatPlanQuestionsAnswerPrompt(questions, answersByQuestionId) {
  return formatLaunchpadQuestionsAnswerPrompt(questions, answersByQuestionId, {
    continueInstruction: LAUNCHPAD_QUESTIONS_CONTINUE_PLAN,
  });
}

/**
 * Latest completed assistant reply with clarifying MCQs and no superseding user answer.
 * @param {Array<object>} messages
 * @param {{
 *   hasBlockingOutcome?: boolean,
 *   modeFilter?: string|null,
 *   replyField?: string,
 *   isAssistantRow?: (row: object) => boolean,
 *   extractReplyText?: (row: object) => string,
 *   isUserRow?: (row: object) => boolean,
 * }} [opts]
 * @returns {{ messageId: unknown, questions: Array<object> }|null}
 */

const PLAIN_QUESTION_MAX = 1200;

/** Plain-text fallback when the agent asked but did not emit the questions fence. */
export function synthesizePlainLaunchpadQuestions(text) {
  const raw = typeof text === "string" ? text.trim() : "";
  if (!raw || raw.length > PLAIN_QUESTION_MAX) return null;
  if (raw.includes("```")) return null;
  if (/^#{1,3}\s/m.test(raw)) return null;
  if (/\b(?:positive|negative|edge)\s+case\s*:/i.test(raw)) return null;
  if (/\bTC-[A-Z0-9-]+\b/.test(raw)) return null;
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length > 12) return null;
  const prompts = [];
  for (const line of lines) {
    const listed = line.match(/^(?:[-*]|\d+[.)])\s+(.+)$/);
    const body = (listed ? listed[1] : line).trim();
    if (!body.endsWith("?")) continue;
    if (body.length < 8 || body.length > 500) continue;
    if (!prompts.includes(body)) prompts.push(body);
    if (prompts.length === 4) break;
  }
  if (prompts.length === 0) {
    const first = lines[0] || "";
    if (
      !/^(which|what|who|where|when|why|how|can you|could you|please confirm|do you|should i|is there|are there)\b/i.test(
        first,
      )
    ) {
      return null;
    }
    prompts.push(raw.length > 500 ? first : raw);
  }
  return prompts.map((prompt, index) => ({
    id: `q${index + 1}`,
    prompt,
    options: [],
    recommended: null,
    allowMultiple: false,
  }));
}

export function findActiveLaunchpadQuestions(messages, opts = {}) {
  if (opts.hasBlockingOutcome) return null;
  const modeFilter =
    typeof opts.modeFilter === "string" && opts.modeFilter.trim()
      ? opts.modeFilter.trim().toLowerCase()
      : null;
  const replyField =
    typeof opts.replyField === "string" && opts.replyField ? opts.replyField : "reply";
  const isAssistantRow =
    typeof opts.isAssistantRow === "function"
      ? opts.isAssistantRow
      : (row) => row?.role === "assistant";
  const isUserRow =
    typeof opts.isUserRow === "function" ? opts.isUserRow : (row) => row?.role === "user";
  const extractReplyText =
    typeof opts.extractReplyText === "function"
      ? opts.extractReplyText
      : (row) => (typeof row?.[replyField] === "string" ? row[replyField] : "");
  const list = Array.isArray(messages) ? messages : [];

  for (let i = list.length - 1; i >= 0; i -= 1) {
    const row = list[i];
    if (!isAssistantRow(row)) continue;
    if (modeFilter && String(row.mode ?? "").toLowerCase() !== modeFilter) continue;
    const status = String(row.status ?? "completed").toLowerCase();
    if (status === "pending" || status === "generating" || status === "failed") {
      return null;
    }
    if (status !== "completed") continue;

    // A later user message after this assistant means questions were answered (or superseded).
    const hasLaterUser = list.slice(i + 1).some((m) => isUserRow(m));
    if (hasLaterUser) return null;

    const replyText = extractReplyText(row);
    const questions =
      extractLaunchpadQuestionsFence(replyText) || synthesizePlainLaunchpadQuestions(replyText);
    if (questions?.length) {
      return { messageId: row.id, questions };
    }
    // Most recent matching assistant without questions — stop scanning older turns.
    return null;
  }
  return null;
}

/**
 * Plan-mode helper — only Plan assistants, blocked when pending plan exists.
 * @param {Array<object>} messages
 * @param {boolean} hasPendingPlan
 */
export function findActivePlanQuestions(messages, hasPendingPlan) {
  return findActiveLaunchpadQuestions(messages, {
    hasBlockingOutcome: Boolean(hasPendingPlan),
    modeFilter: "plan",
  });
}
