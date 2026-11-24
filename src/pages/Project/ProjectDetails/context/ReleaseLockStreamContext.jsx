import { createContext, useCallback, useContext, useRef, useState } from "react";
import { useReleasesSnapshot } from "@/pages/Project/ProductManagement/ReleasesSnapshotContext";
import { useReleaseLockStream } from "../hooks/useReleaseLockStream";

const ReleaseLockStreamContext = createContext(null);

const defaultRetryState = {
  onRetry: null,
  retryReleaseId: null,
  retryDisabled: false,
};

/**
 * Provides shared release-lock SSE stream state across Releases and Backend Code sections.
 */
export function ReleaseLockStreamProvider({ projectId, children }) {
  const { releases } = useReleasesSnapshot();
  const reloadersRef = useRef({ loadReleasesSilent: null });
  const [lockRetryState, setLockRetryState] = useState(defaultRetryState);

  const onReleasesRefresh = useCallback(async () => {
    await reloadersRef.current.loadReleasesSilent?.();
  }, []);

  const lockStream = useReleaseLockStream({
    projectId,
    releases,
    onReleasesRefresh,
  });

  const registerReleaseReloaders = useCallback((fns) => {
    reloadersRef.current = fns ?? { loadReleasesSilent: null };
  }, []);

  const registerLockRetryState = useCallback((next) => {
    setLockRetryState((prev) => ({ ...prev, ...next }));
  }, []);

  const value = {
    ...lockStream,
    registerReleaseReloaders,
    registerLockRetryState,
    retryBackendPlanAgentLock: lockRetryState.onRetry,
    backendPlanRetryReleaseId: lockRetryState.retryReleaseId,
    lockRetryDisabled: lockRetryState.retryDisabled,
  };

  return (
    <ReleaseLockStreamContext.Provider value={value}>{children}</ReleaseLockStreamContext.Provider>
  );
}

export function useReleaseLockStreamContext() {
  const ctx = useContext(ReleaseLockStreamContext);
  if (!ctx) {
    throw new Error("useReleaseLockStreamContext must be used within ReleaseLockStreamProvider");
  }
  return ctx;
}
