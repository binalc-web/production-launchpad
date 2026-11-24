import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  buildQaAnalyticsSearchParams,
  parseQaAnalyticsUrlState,
} from "@/pages/QaAnalytics/qaAnalyticsDisplay.js";

/**
 * @param {{ embedded?: boolean, projectId?: number|string }} [opts]
 */
export function useQaAnalyticsFilters(opts = {}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const state = useMemo(() => parseQaAnalyticsUrlState(searchParams), [searchParams]);

  const patch = useCallback(
    (patchObj, { replace = false, resetDrill = false } = {}) => {
      setSearchParams(
        (prev) => {
          const nextState = {
            ...parseQaAnalyticsUrlState(prev),
            ...patchObj,
          };
          if (resetDrill) {
            nextState.testCaseKey = "";
            nextState.userId = patchObj.userId ?? "";
            nextState.status = patchObj.status ?? "";
          }
          const built = buildQaAnalyticsSearchParams(nextState, {
            section: opts.embedded ? "qa-analytics" : undefined,
            projectId: opts.projectId,
          });
          return built;
        },
        { replace },
      );
    },
    [setSearchParams, opts.embedded, opts.projectId],
  );

  const clearDrill = useCallback(() => {
    patch(
      {
        testCaseKey: "",
        userId: "",
        status: "",
        testCaseStatus: "",
        environment: "",
        project: "",
      },
      { replace: true },
    );
  }, [patch]);

  return { state, patch, clearDrill, searchParams };
}
