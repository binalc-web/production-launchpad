/** Turn Jev decisions into spoken directives for the realtime voice model. */

/** Keep in sync with CLIENT_LINK_VOICE_MARKERS in backend clientLinkVoiceSession.util.js. */
export const VOICE_MARKERS = Object.freeze({
  DECISION: "[DECISION]",
  SCREEN: "[SCREEN]",
  WORK_FINISHED: "[WORK_FINISHED]",
});

/** Words the transcriber commonly invents from room noise. Real answers like "yes"/"okay" are not here. */
const NOISE_FILLERS = new Set([
  "you",
  "thank",
  "thanks",
  "bye",
  "uh",
  "um",
  "hmm",
  "mm",
  "mhm",
  "ah",
  "oh",
  "huh",
]);

/**
 * Background chatter often transcribes as a lone filler word or non-English script;
 * those must not reach Jev as a user turn.
 * @param {string} text
 */
export function isLikelyNoiseTranscript(text) {
  const t = String(text || "").trim();
  const letters = t.match(/\p{L}/gu) || [];
  if (letters.length < 2) return true;
  const latin = t.match(/[A-Za-z]/g) || [];
  if (latin.length / letters.length < 0.8) return true;
  const words = t
    .toLowerCase()
    .replace(/[^a-z\s']/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  return words.length <= 3 && words.every((w) => NOISE_FILLERS.has(w));
}

const MISSING_DETAIL_PHRASE = {
  target_location: "which page, section or element they mean",
  visual_details: "the look they want (colors, sizes, layout)",
  copy_text: "the exact wording",
  behavior: "how it should behave",
};

/**
 * @param {{ action: string, missingDetail?: string | null, navigateTarget?: string | null } | null} decision
 * @returns {{ directive: string, forceStartWork?: boolean, allowReadTools?: boolean }}
 */
export function buildTurnDirective(decision) {
  if (!decision?.action) {
    return {
      directive:
        "The decision engine is unavailable for this turn; decide yourself. Only call start_work if the user explicitly confirmed a concrete change.",
    };
  }
  switch (decision.action) {
    case "clarify":
      return {
        directive: `Ask one short question about ${
          MISSING_DETAIL_PHRASE[decision.missingDetail] || "the missing detail"
        }. Refer to what is on screen when it helps.`,
      };
    case "confirm_plan":
      return {
        directive:
          "Restate the change in one sentence, concretely referencing the screen, and ask whether to go ahead.",
      };
    case "start_work":
      return {
        directive:
          "Call start_work now with a complete, self-contained prompt for the coding agent. Do not speak.",
        forceStartWork: true,
      };
    case "answer":
      return {
        directive:
          "Answer the user's question briefly using the latest [SCREEN] context. If it is about this version's status, past revisions, what the last change did, or feedback, call the matching read-only tool first.",
        allowReadTools: true,
      };
    case "navigate":
      return {
        directive: `You just opened ${decision.navigateTarget || "the requested page"} in the preview. Say so in one short sentence and describe what's there once the next [SCREEN] arrives.`,
      };
    case "confirm_stop":
      return {
        directive: "Ask the user to confirm they want to cancel the change that is running.",
      };
    case "stop_confirmed":
      return { directive: "Tell the user the running change was cancelled and ask what's next." };
    case "idle_chat":
    default:
      return {
        directive: "Reply briefly and naturally, then ask what they'd like to change on this page.",
      };
  }
}

/** Heuristic outcome when Jev is unavailable after a run. */
export function fallbackResultOutcome(report) {
  const text = String(report || "");
  if (/Run outcome:\s*(failed|stopped|error)/i.test(text)) return "report_failure";
  if (/no new code changes/i.test(text)) return "report_no_changes";
  return "demo";
}

export const WORKING_DIRECTIVE =
  "Say only one short sentence: the agent is working on it now and we're both waiting. Then stay silent.";
