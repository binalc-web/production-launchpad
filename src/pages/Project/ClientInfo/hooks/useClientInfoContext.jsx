import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { fetchClientDetails, patchClientDetails } from "@/api";
import { toast } from "sonner";
import { useProjectDiscoveryBridge } from "@/pages/Project/hooks/useProjectDiscoveryBridge";
import { useProfileUpdatePoll } from "./useProfileUpdatePoll";

const ClientInfoContext = createContext(null);

function isProfileUpdatingStatus(status) {
  return status === "queued" || status === "running";
}

export function ClientInfoProvider({ projectId, hubProjectId = null, children }) {
  const [initialLoading, setInitialLoading] = useState(true);
  const [clientDetails, setClientDetails] = useState(null);
  const [discoveryData, setDiscoveryData] = useState(null);
  const [clientInfo, setClientInfo] = useState(null);
  const [meta, setMeta] = useState({ slug: "", projectName: "", discoveryPublicToken: null });

  const applyClientDetailsPayload = useCallback((data) => {
    if (!data) return;
    if (data.clientDetails) setClientDetails(data.clientDetails);
    if (data.discoveryData) setDiscoveryData(data.discoveryData);
    setClientInfo(data.clientInfo || null);
    setMeta({
      slug: data.slug || "",
      projectName: data.projectName || "",
      discoveryPublicToken: data.discoveryPublicToken ?? null,
    });
  }, []);

  const refresh = useCallback(
    async (options = {}) => {
      if (!projectId) return;
      const silent = options?.silent === true;
      if (!silent) setInitialLoading(true);
      try {
        const data = await fetchClientDetails(projectId);
        setClientDetails(data.clientDetails);
        setDiscoveryData(data.discoveryData);
        setClientInfo(data.clientInfo || null);
        setMeta({
          slug: data.slug,
          projectName: data.projectName,
          discoveryPublicToken: data.discoveryPublicToken,
        });
        return data;
      } catch (err) {
        if (!silent) {
          toast.error(err?.error || "Failed to load client info");
        }
        return null;
      } finally {
        if (!silent) setInitialLoading(false);
      }
    },
    [projectId],
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isProfileUpdating =
    isProfileUpdatingStatus(discoveryData?.profileUpdate?.status) ||
    (discoveryData?.profileUpdate?.pendingEntryIds?.length ?? 0) > 0;

  const { notifyDocumentsRefresh } = useProjectDiscoveryBridge();
  const wasProfileUpdatingRef = useRef(false);

  useProfileUpdatePoll(projectId, isProfileUpdating, applyClientDetailsPayload);

  useEffect(() => {
    if (wasProfileUpdatingRef.current && !isProfileUpdating) {
      notifyDocumentsRefresh();
    }
    wasProfileUpdatingRef.current = isProfileUpdating;
  }, [isProfileUpdating, notifyDocumentsRefresh]);

  const patch = useCallback(
    async (body) => {
      try {
        const data = await patchClientDetails(projectId, body);
        if (data.clientDetails) setClientDetails(data.clientDetails);
        await refresh({ silent: true });
        return data;
      } catch (err) {
        const msg = typeof err?.error === "string" ? err.error : "";
        if (msg.includes("updating from new capture") || msg.includes("Profiles are updating")) {
          toast.error("Profiles are updating from new capture — try again shortly.");
        }
        throw err;
      }
    },
    [projectId, refresh],
  );

  const updateLocal = useCallback((updater) => {
    setClientDetails((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      return next;
    });
  }, []);

  const updateDiscoveryLocal = useCallback((updater) => {
    setDiscoveryData((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      projectId,
      hubProjectId,
      loading: initialLoading,
      clientDetails,
      discoveryData,
      clientInfo,
      meta,
      isProfileUpdating,
      profileUpdate: discoveryData?.profileUpdate || null,
      refresh,
      patch,
      updateLocal,
      updateDiscoveryLocal,
      setClientDetails,
      setDiscoveryData,
    }),
    [
      projectId,
      hubProjectId,
      initialLoading,
      clientDetails,
      discoveryData,
      clientInfo,
      meta,
      isProfileUpdating,
      refresh,
      patch,
      updateLocal,
      updateDiscoveryLocal,
    ],
  );

  return <ClientInfoContext.Provider value={value}>{children}</ClientInfoContext.Provider>;
}

export function useClientInfoContext() {
  const ctx = useContext(ClientInfoContext);
  if (!ctx) throw new Error("useClientInfoContext must be used within ClientInfoProvider");
  return ctx;
}

/** Safe for platform chrome when ClientInfoProvider is absent (e.g. no project context). */
export function useOptionalClientInfoContext() {
  return useContext(ClientInfoContext);
}

/**
 * Use an ancestor ClientInfoProvider when present; otherwise mount one for `projectId`.
 * Project Settings (and other platform-chrome routes) render the chat FAB without the
 * project-workspace provider, which previously crashed the error boundary on open.
 */
export function EnsureClientInfoProvider({ projectId, children, fallback = null }) {
  const ctx = useContext(ClientInfoContext);
  if (ctx) return children;
  if (!projectId) return fallback;
  return <ClientInfoProvider projectId={projectId}>{children}</ClientInfoProvider>;
}
