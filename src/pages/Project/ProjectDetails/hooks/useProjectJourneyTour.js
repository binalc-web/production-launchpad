import { useCallback, useEffect, useRef, useState } from "react";
import { fetchCurrentUser, updateProjectJourneyTourStatus } from "@/api";
import { logger } from "@/utils/logger";

/**
 * Loads and persists the per-user project journey tour state.
 * `status` is null (never shown), "completed", or "skipped".
 * `startSignal` is a counter that bumps when the user manually replays the tour.
 */
export function useProjectJourneyTour() {
  const [status, setStatus] = useState(undefined); // undefined = loading
  const [startSignal, setStartSignal] = useState(0);
  const persistedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    fetchCurrentUser()
      .then((user) => {
        if (cancelled) return;
        setStatus(user?.projectJourneyTourStatus ?? null);
      })
      .catch((error) => {
        if (cancelled) return;
        logger.error("project_journey_tour_status_load", error);
        setStatus(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback((next) => {
    setStatus(next);
    persistedRef.current = true;
    updateProjectJourneyTourStatus(next).catch((error) => {
      logger.error("project_journey_tour_status_update", error);
    });
  }, []);

  const markCompleted = useCallback(() => persist("completed"), [persist]);
  const markSkipped = useCallback(() => persist("skipped"), [persist]);

  const startTour = useCallback(() => {
    setStartSignal((n) => n + 1);
  }, []);

  const loading = status === undefined;
  const shouldAutoStart = status === null;

  return {
    status,
    loading,
    shouldAutoStart,
    startSignal,
    markCompleted,
    markSkipped,
    startTour,
  };
}
