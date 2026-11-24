import { useCallback, useEffect, useState } from "react";

/**
 * Tracks per-suggestion approval state when generating release ideas.
 * @param {string[]} suggestionIds
 */
export function useSuggestionDecisions(suggestionIds) {
  const [decisionById, setDecisionById] = useState({});

  const key = suggestionIds.join("|");
  useEffect(() => {
    const next = {};
    for (const id of suggestionIds) {
      next[id] = "pending";
    }
    setDecisionById(next);
  }, [key]);

  const setDecision = useCallback((id, status) => {
    setDecisionById((prev) => ({ ...prev, [id]: status }));
  }, []);

  return { decisionById, setDecision };
}
