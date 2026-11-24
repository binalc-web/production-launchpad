import { useState, useEffect, useCallback } from "react";
import {
  tryProactiveRefresh,
  startTokenRefreshTimer,
  stopTokenRefreshTimer,
  hubLogout,
  clearAuthStorageOnly,
  clearLegacyLocalStorageKeys,
  syncLaunchpadUserFromMe,
} from "../api/index";
import { isTokenExpired } from "../utils/auth";
import { syncSentryUser } from "../lib/sentry.js";
import { AuthContext } from "./AuthContext";

function normalizeStoredUser(rawUser) {
  if (!rawUser || typeof rawUser !== "object") return null;
  const image =
    (typeof rawUser.image === "string" && rawUser.image.trim()) ||
    (typeof rawUser.avatar === "string" && rawUser.avatar.trim()) ||
    "";
  return {
    id: rawUser.id ?? null,
    role: rawUser.role ?? null,
    email: typeof rawUser.email === "string" ? rawUser.email : "",
    name: typeof rawUser.name === "string" ? rawUser.name : "",
    ...(image ? { image } : {}),
  };
}

function readUserFromStorage() {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    const normalized = normalizeStoredUser(JSON.parse(raw));
    if (normalized) {
      localStorage.setItem("user", JSON.stringify(normalized));
    }
    return normalized;
  } catch {
    return null;
  }
}

/** Merge /api/auth/me into storage; never clears existing user on failure. */
async function hydrateUserFromMe() {
  try {
    await syncLaunchpadUserFromMe();
  } catch {
    /* keep localStorage user */
  }
  return readUserFromStorage();
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [launchpadRoleLoading, setLaunchpadRoleLoading] = useState(false);

  const clearAuthStorage = useCallback(() => {
    stopTokenRefreshTimer();
    clearAuthStorageOnly();
    setUser(null);
    setLaunchpadRoleLoading(false);
  }, []);

  const checkAuth = useCallback(async () => {
    const storedUser = localStorage.getItem("user");
    const token = localStorage.getItem("token");
    if (!storedUser || !token) {
      clearAuthStorage();
      return;
    }
    setLaunchpadRoleLoading(true);
    try {
      if (isTokenExpired(token)) {
        const refreshed = await tryProactiveRefresh();
        if (!refreshed) {
          clearAuthStorage();
          return;
        }
        const normalizedUser = await hydrateUserFromMe();
        if (normalizedUser) setUser(normalizedUser);
        else clearAuthStorage();
        return;
      }
      // Hydrate first, then set once — avoids AuthCallback effect cancel mid-signin.
      const hydrated = (await hydrateUserFromMe()) || readUserFromStorage();
      if (!hydrated) {
        clearAuthStorage();
        return;
      }
      setUser(hydrated);
    } finally {
      setLaunchpadRoleLoading(false);
    }
  }, [clearAuthStorage]);

  useEffect(() => {
    clearLegacyLocalStorageKeys();
    let cancelled = false;
    (async () => {
      const storedUser = localStorage.getItem("user");
      const token = localStorage.getItem("token");

      if (storedUser && token) {
        if (isTokenExpired(token)) {
          const refreshed = await tryProactiveRefresh();
          if (cancelled) return;
          if (refreshed) {
            const normalizedUser = await hydrateUserFromMe();
            if (!cancelled && normalizedUser) setUser(normalizedUser);
            else if (!cancelled) clearAuthStorage();
          } else {
            clearAuthStorage();
          }
        } else {
          // Show stored user immediately; hydrate image/role in background.
          const fromStorage = readUserFromStorage();
          if (!fromStorage) {
            clearAuthStorage();
          } else {
            setUser(fromStorage);
            const needsRole = !fromStorage.role;
            if (needsRole && !cancelled) setLaunchpadRoleLoading(true);
            const hydrated = await hydrateUserFromMe();
            if (!cancelled && hydrated) setUser(hydrated);
            if (!cancelled) setLaunchpadRoleLoading(false);
          }
        }
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [clearAuthStorage]);

  const logout = useCallback(async () => {
    stopTokenRefreshTimer();
    try {
      await hubLogout();
    } finally {
      localStorage.clear();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    syncSentryUser(user);
  }, [user]);

  useEffect(() => {
    if (user && localStorage.getItem("cognito_refresh_token")) {
      startTokenRefreshTimer();
    }
    return () => stopTokenRefreshTimer();
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, launchpadRoleLoading, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};
