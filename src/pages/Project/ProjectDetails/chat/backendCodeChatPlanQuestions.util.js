/**
 * Frontend Backend Code Plan helpers — re-exports shared launchpad-questions
 * plus Plan-specific incomplete-turn helpers.
 * Keep plan fence heuristics aligned with backend/src/utils/backendCodeChatPlan.util.js
 */
export {
  extractLaunchpadQuestionsFence,
  stripLaunchpadQuestionsFromReply,
  formatPlanQuestionsAnswerPrompt,
  formatLaunchpadQuestionsAnswerPrompt,
  replyHasLaunchpadQuestions,
  findActiveLaunchpadQuestions,
  findActivePlanQuestions,
  LAUNCHPAD_QUESTIONS_CONTINUE_PLAN,
  LAUNCHPAD_QUESTIONS_CONTINUE_IMPLEMENT,
} from "../../../../lib/launchpadQuestions.util.js";

import {
  extractLaunchpadQuestionsFence,
  replyHasLaunchpadQuestions,
} from "../../../../lib/launchpadQuestions.util.js";

export const PLAN_INCOMPLETE_RETRY_PROMPT =
  "Please emit one ```launchpad-plan``` fence with the concrete implementation plan now. Do not re-ask the same questions.";

/** @param {unknown} text */
export function extractLaunchpadPlanFenceFromReply(text) {
  const raw = typeof text === "string" ? text : "";
  if (!raw.trim()) return null;
  const patterns = [
    /```launchpad-plan\b[^\n]*\r?\n([\s\S]*?)```/i,
    /```launchpad[_-]plan\b[^\n]*\r?\n([\s\S]*?)```/i,
    /```plan\b[^\n]*\r?\n([\s\S]*?)```/i,
  ];
  for (const re of patterns) {
    const match = raw.match(re);
    if (!match) continue;
    const body = String(match[1] ?? "").trim();
    if (body) return body;
  }
  return null;
}

/**
 * True when reply has a plan fence/body or clarifying questions.
 * @param {unknown} text
 */
export function isPlanTurnOutcomeReady(text) {
  if (extractLaunchpadPlanFenceFromReply(text)) return true;
  if (replyHasLaunchpadQuestions(text)) return true;
  return false;
}

/**
 * Latest Plan assistant that finished without a pending plan or questions (stuck / failed).
 * @param {Array<object>} messages
 * @param {boolean} hasPendingPlan
 */
export function findIncompletePlanTurn(messages, hasPendingPlan) {
  if (hasPendingPlan) return null;
  const list = Array.isArray(messages) ? messages : [];
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const row = list[i];
    if (row?.role !== "assistant") continue;
    const status = String(row.status ?? "").toLowerCase();
    if (status !== "completed" && status !== "failed") continue;
    if (String(row.mode ?? "").toLowerCase() !== "plan") continue;
    if (isPlanTurnOutcomeReady(row.reply)) {
      return null;
    }
    return { messageId: row.id, reply: row.reply ?? "" };
  }
  return null;
}

// Silence unused import when only used via re-export path in some bundlers
void extractLaunchpadQuestionsFence;
