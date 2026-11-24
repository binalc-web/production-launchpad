import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import config from "@/config";
import { isPlatformDeployModeBlocking, PLATFORM_DEPLOY_MODE } from "@/constants/platformDeployMode";

/** Health responses can lag a mode change (server-side cache), so trust local actions this long. */
const LOCAL_MODE_TRUST_MS = 20_000;

/** Remember the maintenance start if health drops while the platform is deploying. */
const DEPLOY_SINCE_STORAGE_KEY = "launchpad.platformDeploySince";

/** Ignore a stored start older than a long deploy so a stale tab does not keep the banner. */
const DEPLOY_SINCE_MAX_AGE_MS = 6 * 60 * 60 * 1000;

/** @type {React.Context<{ deployMode: string, deployModeSince: string | null, isBlocking: boolean, loading: boolean, refresh: () => Promise<void>, applyMode: (mode: string | null | undefined) => void }>} */
const PlatformDeployModeContext = createContext({
  deployMode: PLATFORM_DEPLOY_MODE.NORMAL,
  deployModeSince: null,
  isBlocking: false,
  loading: true,
  refresh: async () => {},
  applyMode: () => {},
});

function readStoredDeploySince() {
  try {
    const raw = localStorage.getItem(DEPLOY_SINCE_STORAGE_KEY);
    const started = Date.parse(raw || "");
    if (!Number.isFinite(started)) return null;
    if (Date.now() - started > DEPLOY_SINCE_MAX_AGE_MS) {
      localStorage.removeItem(DEPLOY_SINCE_STORAGE_KEY);
      return null;
    }
    return new Date(started).toISOString();
  } catch {
    return null;
  }
}

/**
 * @param {string|null|undefined} iso
 */
function writeStoredDeploySince(iso) {
  try {
    if (!iso) localStorage.removeItem(DEPLOY_SINCE_STORAGE_KEY);
    else localStorage.setItem(DEPLOY_SINCE_STORAGE_KEY, iso);
  } catch {
    /* private mode */
  }
}

/**
 * @param {unknown} value
 * @returns {string|null}
 */
function parseSince(value) {
  if (typeof value !== "string") return null;
  const started = Date.parse(value);
  if (!Number.isFinite(started)) return null;
  return new Date(started).toISOString();
}

function normalizeMode(mode) {
  return (
    String(mode || PLATFORM_DEPLOY_MODE.NORMAL)
      .trim()
      .toLowerCase() || PLATFORM_DEPLOY_MODE.NORMAL
  );
}

/**
 * Polls public health for platform deploy mode (no auth required).
 */
export function PlatformDeployModeProvider({ children }) {
  const [deployMode, setDeployMode] = useState(PLATFORM_DEPLOY_MODE.NORMAL);
  const [deployModeSince, setDeployModeSince] = useState(null);
  const [loading, setLoading] = useState(true);
  const localOverrideRef = useRef({ mode: null, until: 0 });

  const clearSince = useCallback(() => {
    setDeployModeSince(null);
    writeStoredDeploySince(null);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const base = String(config.API_URL || "").replace(/\/$/, "");
      const res = await fetch(`${base}/api/health`, { method: "GET" });
      if (!res.ok) {
        const stored = readStoredDeploySince();
        if (stored) {
          setDeployMode((prev) =>
            isPlatformDeployModeBlocking(prev) ? prev : PLATFORM_DEPLOY_MODE.PREPARING,
          );
          setDeployModeSince(stored);
        }
        return;
      }
      const data = await res.json();
      const mode = normalizeMode(data?.deploy_mode);
      const override = localOverrideRef.current;
      if (override.mode && Date.now() < override.until && override.mode !== mode) return;
      localOverrideRef.current = { mode: null, until: 0 };
      setDeployMode(mode);
      if (isPlatformDeployModeBlocking(mode)) {
        setDeployModeSince((current) => {
          const since =
            parseSince(data?.deploy_mode_since) ||
            current ||
            readStoredDeploySince() ||
            new Date().toISOString();
          writeStoredDeploySince(since);
          return since;
        });
      } else {
        clearSince();
      }
    } catch {
      const stored = readStoredDeploySince();
      if (stored) {
        setDeployMode((prev) =>
          isPlatformDeployModeBlocking(prev) ? prev : PLATFORM_DEPLOY_MODE.PREPARING,
        );
        setDeployModeSince(stored);
      }
    } finally {
      setLoading(false);
    }
  }, [clearSince]);

  const applyMode = useCallback(
    (mode) => {
      if (!mode) return;
      const next = normalizeMode(mode);
      localOverrideRef.current = { mode: next, until: Date.now() + LOCAL_MODE_TRUST_MS };
      setDeployMode(next);
      setLoading(false);
      if (isPlatformDeployModeBlocking(next)) {
        setDeployModeSince((current) => {
          if (current) return current;
          const iso = new Date().toISOString();
          writeStoredDeploySince(iso);
          return iso;
        });
        return;
      }
      clearSince();
    },
    [clearSince],
  );

  useEffect(() => {
    refresh();
    const pollMs = isPlatformDeployModeBlocking(deployMode) ? 10_000 : 30_000;
    const id = setInterval(refresh, pollMs);
    return () => clearInterval(id);
  }, [refresh, deployMode]);

  const value = useMemo(
    () => ({
      deployMode,
      deployModeSince,
      isBlocking: isPlatformDeployModeBlocking(deployMode),
      loading,
      refresh,
      applyMode,
    }),
    [deployMode, deployModeSince, loading, refresh, applyMode],
  );

  return (
    <PlatformDeployModeContext.Provider value={value}>
      {children}
    </PlatformDeployModeContext.Provider>
  );
}

export function usePlatformDeployMode() {
  return useContext(PlatformDeployModeContext);
}
