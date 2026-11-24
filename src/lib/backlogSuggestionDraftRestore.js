import { suggestionToDraft } from "@/components/ReleaseSuggestions/ReleaseSuggestionDraftEditor";

export const BACKLOG_SUGGESTION_DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** @param {object} draft */
export function buildBacklogDraftRestoreState(draft) {
  const payload = draft?.payload && typeof draft.payload === "object" ? draft.payload : null;
  const snap =
    draft?.requestSnapshot && typeof draft.requestSnapshot === "object"
      ? draft.requestSnapshot
      : null;
  const clarificationHistory =
    typeof snap?.clarificationPrompt === "string" ? snap.clarificationPrompt : "";
  const clarificationRound = Number.isInteger(snap?.clarificationRound)
    ? snap.clarificationRound
    : 0;
  const restoredDraftMeta = {
    createdAt: draft.createdAt,
    expiresAt: draft.expiresAt,
  };

  if (
    payload?.status === "awaiting_questions" &&
    Array.isArray(payload.questions) &&
    payload.questions.length > 0
  ) {
    return {
      result: null,
      draftById: {},
      awaitingQuestions: payload.questions,
      clarifySummary: typeof payload.researchSummary === "string" ? payload.researchSummary : null,
      clarificationHistory,
      clarificationRound,
      restoredDraftMeta,
    };
  }

  if (!Array.isArray(payload?.suggestions) || !payload.suggestions.length) {
    return null;
  }

  const draftById = {};
  for (const s of payload.suggestions) {
    draftById[s.id] = suggestionToDraft(s);
  }
  return {
    result: payload,
    draftById,
    awaitingQuestions: null,
    clarifySummary: null,
    clarificationHistory,
    clarificationRound,
    restoredDraftMeta,
  };
}

/** @param {string|Date|null|undefined} expiresAt */
export function backlogDraftDaysUntilExpiry(expiresAt) {
  if (!expiresAt) return 0;
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (Number.isNaN(ms)) return 0;
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

export function freshBacklogDraftMeta() {
  const now = new Date();
  return {
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + BACKLOG_SUGGESTION_DRAFT_TTL_MS).toISOString(),
  };
}
