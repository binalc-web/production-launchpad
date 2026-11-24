export const QUESTIONNAIRE_STEPS = [
  { id: "draft", label: "Draft" },
  { id: "live", label: "Live" },
  { id: "captured", label: "Captured" },
];

const RESPONSE_EXCLUDED_TYPES = new Set(["ai_followup", "thank_you"]);
const AI_EMAIL = "ai@discovery";

/**
 * @param {{ publishedAt?: string | null, capturedAt?: string | null } | null | undefined} qn
 * @returns {'draft' | 'live' | 'captured'}
 */
export function getQuestionnaireLifecycleStatus(qn) {
  if (!qn?.publishedAt) return "draft";
  if (qn.capturedAt) return "captured";
  return "live";
}

function isCountableResponse(response) {
  if (!response?.questionId) return false;
  if (RESPONSE_EXCLUDED_TYPES.has(response.type)) return false;
  if (response.stakeholderEmail === AI_EMAIL) return false;
  return true;
}

function stakeholderAnsweredCount(qn, stakeholderEmail) {
  const messages = (qn.responses || []).filter(
    (r) => r.stakeholderEmail === stakeholderEmail && isCountableResponse(r),
  );
  return new Set(messages.map((r) => r.questionId)).size;
}

/**
 * @param {object} qn
 * @param {Array<{ email?: string, status?: string }>} [stakeholders]
 */
export function getQuestionnaireAnswerStats(qn, stakeholders = []) {
  const questions = qn?.questions || [];
  const totalQuestions = questions.length;
  const responses = (qn?.responses || []).filter(isCountableResponse);

  const answeredQuestionIds = new Set(responses.map((r) => r.questionId));
  const questionsAnswered = answeredQuestionIds.size;
  const questionsUnanswered = Math.max(0, totalQuestions - questionsAnswered);

  const stakeholderList = stakeholders.length ? stakeholders : [];
  let stakeholdersAnswered = 0;
  let stakeholdersPending = 0;

  if (stakeholderList.length > 0) {
    for (const stakeholder of stakeholderList) {
      const email = stakeholder.email;
      if (!email) continue;
      const answeredCount = stakeholderAnsweredCount(qn, email);
      const fullyResponded =
        stakeholder.status === "responded" ||
        (totalQuestions > 0 && answeredCount >= totalQuestions);
      if (fullyResponded) stakeholdersAnswered += 1;
      else stakeholdersPending += 1;
    }
  }

  return {
    totalQuestions,
    questionsAnswered,
    questionsUnanswered,
    totalStakeholders: stakeholderList.length,
    stakeholdersAnswered,
    stakeholdersPending,
    responseCount: responses.length,
  };
}

export function getQuestionnaireStatusLabel(status) {
  if (status === "live") return "Live";
  if (status === "captured") return "Captured";
  return "Draft";
}

/**
 * Absolute share URL for a published questionnaire public path.
 * @param {string | null | undefined} publicPath
 * @returns {string}
 */
export function buildQuestionnaireShareUrl(publicPath) {
  const path = String(publicPath || "")
    .trim()
    .replace(/^\/+/, "");
  if (!path) return "";
  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin.replace(/\/+$/, "")
      : "";
  return origin ? `${origin}/${path}` : `/${path}`;
}

/**
 * Upgrade legacy path-only "Share link: /…" bodies to a full URL for display/copy.
 * @param {string | null | undefined} body
 * @param {string | null | undefined} [publicPath]
 * @returns {string}
 */
export function formatQuestionnaireShareBody(body, publicPath) {
  const text = String(body || "");
  if (!text) return text;
  const fullUrl = buildQuestionnaireShareUrl(
    publicPath || text.match(/Share link:\s*(\/\S+)/)?.[1],
  );
  if (!fullUrl) return text;
  return text.replace(/Share link:\s*\/\S+/g, `Share link: ${fullUrl}`);
}
