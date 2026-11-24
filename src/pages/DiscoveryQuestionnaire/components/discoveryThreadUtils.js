const THREAD_TYPES = new Set(["answer", "followup", "message", "file_upload"]);

function isThreadMessage(r) {
  if (!r || r.type === "ai_followup" || r.type === "thank_you") return false;
  if (r.stakeholderEmail === "ai@discovery") return false;
  return THREAD_TYPES.has(r.type);
}

export function responsesForQuestion(responses, questionId) {
  return (responses || [])
    .filter((r) => r.questionId === questionId && isThreadMessage(r))
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export function answerCountForQuestion(responses, questionId) {
  return responsesForQuestion(responses, questionId).length;
}

export function stakeholderAnsweredQuestionIds(responses, email) {
  const normalized = String(email || "")
    .trim()
    .toLowerCase();
  return new Set(
    (responses || [])
      .filter(
        (r) =>
          String(r.stakeholderEmail || "")
            .trim()
            .toLowerCase() === normalized &&
          r.questionId &&
          r.type !== "ai_followup" &&
          r.type !== "thank_you" &&
          r.stakeholderEmail !== "ai@discovery",
      )
      .map((r) => r.questionId),
  );
}

export function unansweredStakeholders(stakeholders, responses, questionId) {
  const answered = new Set(
    responsesForQuestion(responses, questionId).map((r) => r.stakeholderEmail),
  );
  return (stakeholders || []).filter((s) => !answered.has(s.email));
}
