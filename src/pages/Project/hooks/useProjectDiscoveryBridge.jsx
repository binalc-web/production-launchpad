import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

const ProjectDiscoveryBridgeContext = createContext(null);

export function ProjectDiscoveryBridgeProvider({ children }) {
  const prdRefreshRef = useRef(() => {});
  const documentsRefreshRef = useRef(() => {});
  const [backlogBootstrapPayload, setBacklogBootstrapPayload] = useState(null);
  const [backlogBootstrapSessionKey, setBacklogBootstrapSessionKey] = useState(0);

  const registerPrdRefresh = useCallback((fn) => {
    prdRefreshRef.current = fn;
    return () => {
      prdRefreshRef.current = () => {};
    };
  }, []);

  const registerDocumentsRefresh = useCallback((fn) => {
    documentsRefreshRef.current = fn;
    return () => {
      documentsRefreshRef.current = () => {};
    };
  }, []);

  const notifyPrdRefresh = useCallback(() => {
    prdRefreshRef.current?.();
  }, []);

  const notifyDocumentsRefresh = useCallback(() => {
    documentsRefreshRef.current?.();
  }, []);

  const setBacklogSuggestionBootstrap = useCallback((payload) => {
    setBacklogBootstrapPayload(payload ?? null);
    if (payload) {
      setBacklogBootstrapSessionKey((key) => key + 1);
    }
  }, []);

  /** Returns the latest bootstrap payload; survives section switches within the project shell. */
  const consumeBacklogSuggestionBootstrap = useCallback(() => {
    return backlogBootstrapPayload;
  }, [backlogBootstrapPayload]);

  const value = useMemo(
    () => ({
      registerPrdRefresh,
      registerDocumentsRefresh,
      notifyPrdRefresh,
      notifyDocumentsRefresh,
      setBacklogSuggestionBootstrap,
      consumeBacklogSuggestionBootstrap,
      backlogBootstrapSessionKey,
    }),
    [
      registerPrdRefresh,
      registerDocumentsRefresh,
      notifyPrdRefresh,
      notifyDocumentsRefresh,
      setBacklogSuggestionBootstrap,
      consumeBacklogSuggestionBootstrap,
      backlogBootstrapSessionKey,
    ],
  );

  return (
    <ProjectDiscoveryBridgeContext.Provider value={value}>
      {children}
    </ProjectDiscoveryBridgeContext.Provider>
  );
}

export function useProjectDiscoveryBridge() {
  const ctx = useContext(ProjectDiscoveryBridgeContext);
  if (!ctx) {
    return {
      registerPrdRefresh: () => () => {},
      registerDocumentsRefresh: () => () => {},
      notifyPrdRefresh: () => {},
      notifyDocumentsRefresh: () => {},
      setBacklogSuggestionBootstrap: () => {},
      consumeBacklogSuggestionBootstrap: () => null,
      backlogBootstrapSessionKey: 0,
    };
  }
  return ctx;
}
