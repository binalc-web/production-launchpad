import axios from "axios";
import config from "../config/index.js";
import { enrichMigrateGithubAccessPayload } from "../lib/migrateGithubAccess.util.js";
import { AGENT_STATUS_FETCH_TIMEOUT_MS } from "../constants/agentPollTimeouts.js";
import { isTokenExpired, isTokenExpiringSoon } from "../utils/auth.js";
import { logger } from "../utils/logger.js";
import { getClientLinkVerifiedEmail } from "../lib/clientLinkVerifiedEmail.js";
import { isMigrateFrontendStreamStopEvent } from "../lib/migrateFrontendStream.util.js";
import { pullSseJsonEvents, readAbortableSseChunk, readSseJsonStream } from "../lib/sseJson.js";
import {
  buildPreviewDesktopControlWsUrl,
  connectPreviewDesktopControlSocket,
} from "../lib/previewDesktopControlSocket.js";
import { isApiConnectionError } from "../utils/apiErrors.js";
import { createTtlCache } from "../lib/ttlCache.js";

/** Client-link reads are stakeholder-scoped: default to the verified email in storage. */
function resolveClientLinkEmail(explicit) {
  const e = String(explicit || "").trim();
  return e || getClientLinkVerifiedEmail();
}

const API_URL = config.API_URL;

/** Refresh token proactively this many seconds before access token expires. */
const PROACTIVE_REFRESH_BUFFER_SEC = 5 * 60; // 5 minutes
/** How often to check if we should refresh (ms). */
const REFRESH_CHECK_INTERVAL_MS = 60 * 1000; // 1 minute
const HUB_API_URL = config.HUB_API_URL;

/** Optional Hub access token for skill-based backend operations. */
export function hubAccessTokenHeaders() {
  const token = localStorage.getItem("access_token") || localStorage.getItem("token") || "";
  const trimmed = typeof token === "string" ? token.trim() : "";
  return trimmed ? { "X-Hub-Access-Token": trimmed } : {};
}

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Launchpad APIs: use id token (stored as "token") so backend gets email from payload; Hub uses access_token separately
api.interceptors.request.use(
  (config) => {
    if (typeof FormData !== "undefined" && config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }
    const path = typeof config.url === "string" ? config.url : "";
    const isPublicClientLinkChat = path.includes("/api/chat/");
    const token = localStorage.getItem("token");
    if (token && !isPublicClientLinkChat) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const method = String(config.method ?? "get").toLowerCase();
    if (method === "get" && path.startsWith("/api/jobs")) {
      config.headers["Cache-Control"] = "no-cache";
      config.headers.Pragma = "no-cache";
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

const STORAGE_KEYS = ["token", "access_token", "user", "cognito_refresh_token"];

/** Removed features / older clients; safe to delete if present. */
const LEGACY_LOCAL_STORAGE_KEYS = ["authToken", "persist:auth", "hasCompletedTour", "meetings"];

const CREATE_PROJECT_DRAFT_LS_PREFIX = "createProjectDraft_v1:";

function clearCreateProjectDraftLocalStorage() {
  const keys = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const k = localStorage.key(i);
    if (k && k.startsWith(CREATE_PROJECT_DRAFT_LS_PREFIX)) keys.push(k);
  }
  keys.forEach((k) => localStorage.removeItem(k));
}

export function clearAuthStorageOnly() {
  [...STORAGE_KEYS, ...LEGACY_LOCAL_STORAGE_KEYS].forEach((k) => localStorage.removeItem(k));
  clearCreateProjectDraftLocalStorage();
}

/** Drop stale keys without clearing an active session. */
export function clearLegacyLocalStorageKeys() {
  LEGACY_LOCAL_STORAGE_KEYS.forEach((k) => localStorage.removeItem(k));
}

function sanitizeUserForStorage(user) {
  if (!user || typeof user !== "object") return null;
  const imageRaw =
    (typeof user.image === "string" && user.image.trim()) ||
    (typeof user.avatar === "string" && user.avatar.trim()) ||
    "";
  return {
    id: user.id ?? null,
    role: user.role ?? null,
    email: typeof user.email === "string" ? user.email : "",
    name: typeof user.name === "string" ? user.name : "",
    ...(imageRaw ? { image: imageRaw } : {}),
  };
}

/**
 * Merge Launchpad `/api/auth/me` into local `user` (id + role for RBAC sidebar).
 */
export async function syncLaunchpadUserFromMe() {
  const token = localStorage.getItem("token");
  if (!token || isTokenExpired(token)) return false;
  try {
    const { data } = await api.get("/api/auth/me");
    const serverUser = data?.user;
    if (!serverUser || typeof serverUser !== "object") return false;
    let existing = {};
    try {
      const parsed = JSON.parse(localStorage.getItem("user") || "{}");
      if (parsed && typeof parsed === "object") existing = parsed;
    } catch {
      existing = {};
    }
    const merged = {
      ...existing,
      id: serverUser.id ?? existing.id ?? null,
      role: serverUser.role ?? existing.role ?? null,
      email: typeof serverUser.email === "string" ? serverUser.email : (existing.email ?? ""),
      name: typeof serverUser.name === "string" ? serverUser.name : (existing.name ?? ""),
      image:
        (typeof serverUser.image === "string" && serverUser.image.trim()) ||
        (typeof existing.image === "string" && existing.image.trim()) ||
        undefined,
    };
    const sanitized = sanitizeUserForStorage(merged);
    if (!sanitized) return false;
    localStorage.setItem("user", JSON.stringify(sanitized));
    return Boolean(sanitized.role);
  } catch {
    return false;
  }
}

function clearAuthAndRedirect() {
  clearAuthStorageOnly();
  window.location.href = "/";
}

/**
 * Call Hub logout API with access token in Authorization header.
 * Uses access_token (Hub requires access token); does not clear local storage (caller clears after).
 */
export async function hubLogout() {
  const accessToken = localStorage.getItem("access_token") || localStorage.getItem("token");
  const refreshToken = localStorage.getItem("cognito_refresh_token");
  if (!HUB_API_URL || !accessToken) return;
  try {
    await axios.post(`${HUB_API_URL}/api/auth/logout`, refreshToken ? { refreshToken } : {}, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch {
    // Best-effort; caller always clears local state (e.g. even if Hub returns 401)
  }
}

/**
 * Call Hub's refresh API to get new tokens. Hub requires refreshToken + email (for Cognito SECRET_HASH).
 * POST HUB_API_URL/api/auth/refresh with { refreshToken, email }.
 */
function getStoredEmail() {
  try {
    const raw = localStorage.getItem("user");
    const user = raw ? JSON.parse(raw) : null;
    return user?.email ?? null;
  } catch {}
  return null;
}

/** Call Hub API to refresh tokens (Hub validates with Cognito; email required for SECRET_HASH). */
export async function refreshAppToken() {
  const refreshToken = localStorage.getItem("cognito_refresh_token");
  const email = getStoredEmail();
  if (!refreshToken || !email) return null;
  if (!HUB_API_URL) return null;
  try {
    const { data } = await axios.post(`${HUB_API_URL}/api/auth/refresh`, {
      refreshToken,
      email,
    });
    const body = data?.data ?? data;
    const idToken = body?.idToken ?? body?.id_token;
    const accessToken = body?.accessToken ?? body?.access_token;
    const newRefreshToken = body?.refreshToken ?? body?.refresh_token;
    const launchpadToken = idToken ?? accessToken;
    if (launchpadToken) {
      localStorage.setItem("token", launchpadToken);
      if (accessToken) localStorage.setItem("access_token", accessToken);
      if (newRefreshToken) localStorage.setItem("cognito_refresh_token", newRefreshToken);
      const userForStorage = sanitizeUserForStorage(body?.user);
      if (userForStorage) {
        localStorage.setItem("user", JSON.stringify(userForStorage));
      }
      return launchpadToken;
    }
  } catch {
    // Refresh failed; caller may redirect to login
  }
  return null;
}

/**
 * If we have a refresh token and the access token is missing or expiring soon, refresh in the background.
 * Returns true if a new token was stored, false otherwise.
 */
export async function tryProactiveRefresh() {
  const refreshToken = localStorage.getItem("cognito_refresh_token");
  const token = localStorage.getItem("token");

  if (!refreshToken) {
    if (token && isTokenExpired(token)) clearAuthAndRedirect();
    return false;
  }

  const needsRefresh =
    !token || isTokenExpired(token) || isTokenExpiringSoon(token, PROACTIVE_REFRESH_BUFFER_SEC);
  if (!needsRefresh) return false;

  const newToken = await refreshAppToken();
  if (newToken) return true;

  clearAuthAndRedirect();
  return false;
}

let refreshCheckTimerId = null;

/**
 * Start a timer that checks every REFRESH_CHECK_INTERVAL_MS and refreshes the token
 * when it will expire within PROACTIVE_REFRESH_BUFFER_SEC. Call on login.
 * Stops automatically when there is no refresh token (e.g. after logout).
 */
export function startTokenRefreshTimer() {
  if (refreshCheckTimerId != null) clearInterval(refreshCheckTimerId);
  refreshCheckTimerId = setInterval(async () => {
    if (!localStorage.getItem("cognito_refresh_token")) {
      clearInterval(refreshCheckTimerId);
      refreshCheckTimerId = null;
      return;
    }
    await tryProactiveRefresh();
  }, REFRESH_CHECK_INTERVAL_MS);
}

/** Stop the proactive refresh timer (e.g. on logout). */
export function stopTokenRefreshTimer() {
  if (refreshCheckTimerId != null) {
    clearInterval(refreshCheckTimerId);
    refreshCheckTimerId = null;
  }
}

// On 401: try refresh (frontend sends refresh token to backend), then retry; else logout
let isRefreshing = false;
let refreshSubscribers = [];

function subscribeTokenRefresh(cb) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    if (typeof status === "number" && status >= 500) {
      const d = error.response?.data;
      const msg = d && typeof d === "object" && typeof d.error === "string" ? d.error : undefined;
      logger.error("api_response_5xx", error.config?.method, error.config?.url, msg);
    }
    const originalRequest = error.config;
    if (error.response?.status !== 401) return Promise.reject(error);
    if (!originalRequest) return Promise.reject(error);

    const requestUrl = String(originalRequest.url || "");
    const apiError =
      typeof error.response?.data?.error === "string" ? error.response.data.error : "";

    // Never JWT-refresh retry integration/upstream auth failures (causes infinite loops).
    const skipJwtRefresh =
      requestUrl.includes("/discovery/confluence") ||
      requestUrl.includes("/discovery/workspace-documents/") ||
      /confluence|reconnect jira|scope does not match|atlassian/i.test(apiError);

    if (skipJwtRefresh || originalRequest._skipJwtRefresh) {
      return Promise.reject(error);
    }

    if (originalRequest._jwtRefreshRetry) {
      return Promise.reject(error);
    }
    originalRequest._jwtRefreshRetry = true;
    if (originalRequest.url?.includes("/api/chat/")) {
      return Promise.reject(error);
    }
    // Don't retry refresh endpoint to avoid loop
    if (originalRequest.url?.includes("/api/auth/refresh")) {
      clearAuthAndRedirect();
      return Promise.reject(error);
    }

    const refreshToken = localStorage.getItem("cognito_refresh_token");
    if (!refreshToken) {
      clearAuthAndRedirect();
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        subscribeTokenRefresh((newToken) => {
          if (!newToken) {
            reject(error);
            return;
          }
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          resolve(api(originalRequest));
        });
      });
    }

    isRefreshing = true;
    try {
      const newToken = await refreshAppToken();
      if (newToken) {
        onRefreshed(newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      }
      // Unblock waiters so they do not hang forever when refresh fails.
      onRefreshed(null);
    } catch {
      onRefreshed(null);
    } finally {
      isRefreshing = false;
    }
    clearAuthAndRedirect();
    return Promise.reject(error);
  },
);

/** Call after login when opened by Figma plugin (URL has ?state=writeKey). Tells backend to associate token with writeKey so plugin poll gets it. */
export const figmaComplete = async (state, access_token, refresh_token) => {
  try {
    const body = { state, access_token };
    if (typeof refresh_token === "string" && refresh_token.trim()) {
      body.refresh_token = refresh_token.trim();
    }
    const response = await axios.post(`${API_URL}/api/figma/complete`, body);
    return response.data;
  } catch (error) {
    const data = error.response?.data || {};
    return { error: data.error || "Failed to complete Figma login" };
  }
};

/** Call after login when opened by Preview Desktop (?state=writeKey&client=preview-desktop). */
export const previewDesktopComplete = async (state, launchpadToken) => {
  try {
    const response = await axios.post(`${API_URL}/api/preview-desktop/auth/complete`, {
      state,
      access_token: launchpadToken,
    });
    return response.data;
  } catch (error) {
    const data = error.response?.data || {};
    return { error: data.error || "Failed to complete Preview Desktop login" };
  }
};

export const fetchPreviewDesktopControl = async (projectId) => {
  const { data } = await api.get(`/api/preview-desktop/projects/${projectId}/control`);
  return data;
};

export const fetchPreviewDesktopControlPublic = async (projectId) => {
  const { data } = await api.get(`/api/preview-desktop/public/projects/${projectId}/control`);
  return data;
};

/**
 * Live preview-control state over a WebSocket (no polling). `onControl` gets the current lock on
 * connect and on every take/release. Returns a function that closes the socket.
 */
export function openPreviewDesktopControlSocket(projectId, { onControl, onDisconnect } = {}) {
  return connectPreviewDesktopControlSocket({
    url: buildPreviewDesktopControlWsUrl(API_URL, projectId),
    onControl: (control) => onControl?.(control),
    onDisconnect,
  });
}

export const forceReleasePreviewDesktopControl = async (projectId) => {
  const { data } = await api.post(
    `/api/preview-desktop/projects/${projectId}/control/force-release`,
  );
  return data;
};

/** Call after login when opened by QA Automation desktop app (?state=writeKey&client=qa-automation). */
export const qaAutomationComplete = async (state, launchpadToken, refresh_token) => {
  try {
    const body = { state, access_token: launchpadToken };
    const hubAccess = localStorage.getItem("access_token");
    if (typeof hubAccess === "string" && hubAccess.trim()) {
      body.hub_access_token = hubAccess.trim();
    }
    if (typeof refresh_token === "string" && refresh_token.trim()) {
      body.refresh_token = refresh_token.trim();
    }
    const response = await axios.post(`${API_URL}/api/qa-automation/complete`, body);
    return response.data;
  } catch (error) {
    const data = error.response?.data || {};
    return { error: data.error || "Failed to complete QA Automation login" };
  }
};

/**
 * Call after login when opened by the FigCraft design app (?state=writeKey&client=figcraft).
 * Only the LaunchPad token is sent (to be exchanged for a FigCraft-scoped one); the Hub access and
 * refresh tokens never go to FigCraft.
 */
export const figcraftComplete = async (state, launchpadToken) => {
  try {
    const response = await axios.post(`${API_URL}/api/figcraft/complete`, {
      state,
      access_token: launchpadToken,
    });
    return response.data;
  } catch (error) {
    const data = error.response?.data || {};
    return { error: data.error || "Failed to complete FigCraft login" };
  }
};

/** OAuth / integrations (GitHub, Bitbucket, Jira, Figma) — Bearer required via api interceptor */
export const fetchIntegrationsStatus = async ({ checkHealth = false } = {}) => {
  const { data } = await api.get("/api/integrations/status", {
    params: checkHealth ? { checkHealth: 1 } : undefined,
  });
  return data;
};

/** Latest QA Automation Mac app for this LaunchPad environment (version + dmg URL). */
export const fetchQaDesktopReleaseLatest = async () => {
  const { data } = await api.get("/api/qa-automation/desktop-releases/latest");
  return data;
};

/** Cursor cloud-agent: connection + whether a GitHub PAT is stored for your email */
export const fetchCursorIntegrationStatus = async () => {
  const { data } = await api.get("/api/integrations/cursor/status", {
    params: { _t: Date.now() },
    headers: {
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
  });
  return data;
};

/** Push GitHub OAuth access token to cursor-cloud-agent for your account email */
export const syncCursorGithubPatFromOAuth = async () => {
  const { data } = await api.post("/api/integrations/cursor/sync-github-pat");
  return data;
};

/** Push Bitbucket OAuth access token to cursor-cloud-agent for your account email */
export const syncCursorBitbucketTokenFromOAuth = async () => {
  const { data } = await api.post("/api/integrations/cursor/sync-bitbucket-token");
  return data;
};

/** Probe whether the project creator's GitHub PAT is ready for Cursor agent runs. */
export const fetchCursorAgentGithubReadiness = async (projectId, options = {}) => {
  const params = {};
  if (options.implementTarget) {
    params.implementTarget = options.implementTarget;
  }
  const { data } = await api.get(`/api/projects/${projectId}/cursor-agent/github-readiness`, {
    params,
  });
  return data;
};

/** Public client-link: GitHub PAT + push readiness for lock (no JWT). */
export const fetchPublicCursorAgentGithubReadiness = async (slug) => {
  const { data } = await api.get(
    `/api/projects/public/${encodeURIComponent(slug)}/cursor-agent/github-readiness`,
  );
  return data;
};

/** Public client-link: deploy-map environments for York internal lock-and-deploy (no JWT). */
export const fetchPublicClientLinkDeployEnvironments = async (slug, clientEmail) => {
  const { data } = await api.get(
    `/api/projects/public/${encodeURIComponent(slug)}/deploy-environments`,
    { params: { clientEmail: String(clientEmail || "").trim() } },
  );
  return data;
};

/**
 * User-facing message when readiness blocks migrate-frontend or lock-release.
 * @param {{ ready?: boolean, error?: string|null }|undefined|null} readiness
 * @returns {string|null}
 */
export const cursorAgentGithubGateMessage = (readiness) => {
  if (!readiness || readiness.ready) return null;
  return (
    readiness.error ||
    "GitHub is not ready. Connect GitHub under Connected accounts or fix repository access."
  );
};

/** Backend error code when migrate is blocked on GitHub repo access. */
export const MIGRATE_GITHUB_REPO_ACCESS_CODE = "MIGRATE_GITHUB_REPO_ACCESS";

/**
 * Build dialog payload from github-readiness when migrate is blocked.
 * @param {object|undefined|null} readiness
 * @param {{ gitRepoPath?: unknown }} [options]
 * @returns {{ error: string, launchpadRepoUrl?: string, launchpadRepoLabel?: string, repoAccess?: object[] }|null}
 */
export const migrateGithubAccessFromReadiness = (readiness, options = {}) => {
  if (!readiness || readiness.ready) return null;
  const error = cursorAgentGithubGateMessage(readiness);
  if (!error) return null;
  const migrateRepoAccess = readiness.migrateRepoAccess;
  return enrichMigrateGithubAccessPayload(
    {
      error,
      launchpadRepoUrl: migrateRepoAccess?.primaryLaunchpad?.url ?? null,
      launchpadRepoLabel: migrateRepoAccess?.primaryLaunchpad?.label ?? null,
      repoAccess: Array.isArray(migrateRepoAccess?.repoAccess) ? migrateRepoAccess.repoAccess : [],
    },
    options,
  );
};

/**
 * Extract migrate GitHub access dialog fields from an API error.
 * @param {unknown} err
 * @param {{ gitRepoPath?: unknown }} [options]
 * @returns {{ error: string, launchpadRepoUrl?: string, launchpadRepoLabel?: string, repoAccess?: object[], code?: string }|null}
 */
export const parseMigrateGithubAccessError = (err, options = {}) => {
  const data = (typeof err === "object" && err && (err.response?.data || err.data || err)) || null;
  if (!data || typeof data !== "object") {
    const fallback = (typeof err === "object" && err && (err.error || err.message)) || null;
    if (typeof fallback !== "string" || !fallback.trim()) return null;
    return enrichMigrateGithubAccessPayload({ error: fallback.trim() }, options);
  }
  const error =
    (typeof data.error === "string" && data.error.trim()) ||
    (typeof err === "object" && err && typeof err.message === "string" ? err.message.trim() : "");
  if (!error) return null;
  const code = typeof data.code === "string" ? data.code : undefined;
  const payload = enrichMigrateGithubAccessPayload(
    {
      error,
      code,
      launchpadRepoUrl: typeof data.launchpadRepoUrl === "string" ? data.launchpadRepoUrl : null,
      launchpadRepoLabel:
        typeof data.launchpadRepoLabel === "string" ? data.launchpadRepoLabel : null,
      repoAccess: Array.isArray(data.repoAccess) ? data.repoAccess : [],
    },
    options,
  );
  if (!payload) return null;
  const mentionsDevRepo = /(?:development|developer) repository/i.test(payload.error || "");
  if (
    code === MIGRATE_GITHUB_REPO_ACCESS_CODE ||
    payload.launchpadRepoUrl ||
    payload.repoAccess?.length > 0 ||
    mentionsDevRepo
  ) {
    return payload;
  }
  return { error: payload.error, code };
};

/** Sync project creator GitHub PAT to cursor-cloud-agent (Integrations-style manual refresh). */
export const syncProjectCursorAgentGithubPat = async (projectId) => {
  const { data } = await api.post(`/api/projects/${projectId}/cursor-agent/sync-github`);
  return data;
};

/**
 * Throws a user-facing error when Cursor agent GitHub readiness check fails.
 * @param {number|string} projectId
 */
export const assertCursorAgentGithubReady = async (projectId) => {
  const readiness = await fetchCursorAgentGithubReadiness(projectId);
  const message = cursorAgentGithubGateMessage(readiness);
  if (message) {
    const accessPayload = migrateGithubAccessFromReadiness(readiness);
    const err = new Error(message);
    err.error = message;
    if (accessPayload) {
      err.launchpadRepoUrl = accessPayload.launchpadRepoUrl;
      err.launchpadRepoLabel = accessPayload.launchpadRepoLabel;
      err.repoAccess = accessPayload.repoAccess;
      err.code = MIGRATE_GITHUB_REPO_ACCESS_CODE;
    }
    throw err;
  }
  return readiness;
};

/**
 * Throws when GitHub push access is missing (PAT may still be ok).
 * @param {number|string} projectId
 */
export const assertGithubPushReady = async (projectId) => {
  const readiness = await fetchCursorAgentGithubReadiness(projectId);
  if (readiness?.pushAccessOk === false) {
    const message =
      readiness.error || "You don't have access to push to the required repositories.";
    const err = new Error(message);
    err.error = message;
    throw err;
  }
  return readiness;
};

/** Store a GitHub PAT manually for cursor-cloud-agent (same as OAuth scope for private repos) */
export const saveCursorGithubPatManual = async (githubToken) => {
  const { data } = await api.post("/api/integrations/cursor/pat", {
    githubToken,
  });
  return data;
};

export const getGithubOAuthAuthorizeUrl = async (
  reconnectConnectionId,
  { returnTo, accessLevel } = {},
) => {
  const params = {};
  if (reconnectConnectionId != null && reconnectConnectionId !== "") {
    params.reconnectId = reconnectConnectionId;
  }
  if (returnTo) params.returnTo = returnTo;
  if (accessLevel) params.accessLevel = accessLevel;
  const { data } = await api.get("/api/integrations/github/start", {
    params,
    headers: { Accept: "application/json" },
  });
  if (!data?.url) throw new Error("GitHub OAuth is not available");
  return data.url;
};

export const getJiraOAuthAuthorizeUrl = async (reconnectConnectionId, { returnTo } = {}) => {
  const params = {};
  if (reconnectConnectionId != null && reconnectConnectionId !== "") {
    params.reconnectId = reconnectConnectionId;
  }
  if (returnTo) params.returnTo = returnTo;
  const { data } = await api.get("/api/integrations/jira/start", {
    params,
    headers: { Accept: "application/json" },
  });
  if (!data?.url) throw new Error("Jira OAuth is not available");
  return data.url;
};

/** Finish GitHub / Bitbucket / Jira / Figma OAuth as the signed-in user (provider callback hands off code + state). */
export const completeIntegrationOAuth = async (provider, code, state) => {
  const { data } = await api.post(`/api/integrations/${encodeURIComponent(provider)}/complete`, {
    code,
    state,
  });
  return data;
};

export const fetchJiraOAuthPendingSites = async (pendingToken) => {
  const { data } = await api.get("/api/integrations/jira/pending-sites", {
    params: { pending: pendingToken },
  });
  return Array.isArray(data?.sites) ? data.sites : [];
};

export const finishJiraOAuthSiteSelection = async (pendingToken, cloudId) => {
  const { data } = await api.post("/api/integrations/jira/finish", {
    pending: pendingToken,
    cloudId,
  });
  return data;
};

export const getBitbucketOAuthAuthorizeUrl = async (
  reconnectConnectionId,
  { returnTo, accessLevel } = {},
) => {
  const params = {};
  if (reconnectConnectionId != null && reconnectConnectionId !== "") {
    params.reconnectId = reconnectConnectionId;
  }
  if (returnTo) params.returnTo = returnTo;
  if (accessLevel) params.accessLevel = accessLevel;
  const { data } = await api.get("/api/integrations/bitbucket/start", {
    params,
    headers: { Accept: "application/json" },
  });
  if (!data?.url) throw new Error("Bitbucket OAuth is not available");
  return data.url;
};

export const disconnectGithubIntegration = async (connectionId) => {
  await api.delete(`/api/integrations/github/${connectionId}`);
};

export const disconnectBitbucketIntegration = async (connectionId) => {
  await api.delete(`/api/integrations/bitbucket/${connectionId}`);
};

export const disconnectJiraIntegration = async (connectionId) => {
  await api.delete(`/api/integrations/jira/${connectionId}`);
};

export const getFigmaOAuthAuthorizeUrl = async (reconnectConnectionId, { returnTo } = {}) => {
  const params = {};
  if (reconnectConnectionId != null && reconnectConnectionId !== "") {
    params.reconnectId = reconnectConnectionId;
  }
  if (returnTo) params.returnTo = returnTo;
  const { data } = await api.get("/api/integrations/figma/start", {
    params,
    headers: { Accept: "application/json" },
  });
  if (!data?.url) throw new Error("Figma OAuth is not available");
  return data.url;
};

export const disconnectFigmaIntegration = async (connectionId) => {
  await api.delete(`/api/integrations/figma/${connectionId}`);
};

/** Save Figma personal access token (stored encrypted; not verified against Figma on save). */
export const saveFigmaIntegrationPat = async (figmaToken) => {
  const { data } = await api.post("/api/integrations/figma/pat", {
    figmaToken,
  });
  return data;
};

export const saveGranolaApiKey = async (apiKey) => {
  const { data } = await api.post("/api/integrations/granola/api-key", {
    apiKey,
  });
  return data;
};

export const disconnectGranolaIntegration = async () => {
  const { data } = await api.delete("/api/integrations/granola");
  return data;
};

/** List active MCP API keys for the signed-in user (no plaintext secrets). */
export const fetchMcpApiKeys = async () => {
  const { data } = await api.get("/api/mcp/api-keys");
  return data;
};

/**
 * Create an MCP API key. Returns plaintext `apiKey` once (lp_mcp_…).
 * @param {{ name: string }} body
 */
export const createMcpApiKey = async (body) => {
  const { data } = await api.post("/api/mcp/api-keys", body);
  return data;
};

/** Revoke an MCP API key owned by the signed-in user. */
export const revokeMcpApiKey = async (keyId) => {
  const { data } = await api.delete(`/api/mcp/api-keys/${encodeURIComponent(keyId)}`);
  return data;
};

/** Download the build-time LaunchPad MCP SDLC skill zip (launchpad-mcp-sdlc.zip). */
export const downloadLaunchpadMcpSdlcSkillZip = async () => {
  try {
    const response = await api.get("/api/mcp/sdlc-skill/download", {
      responseType: "blob",
    });
    const contentType = String(response.headers["content-type"] || "");
    if (contentType.includes("application/json")) {
      const text = await response.data.text();
      let parsed = {};
      try {
        parsed = JSON.parse(text);
      } catch {
        /* ignore */
      }
      throw parsed?.error || parsed?.message || { error: "Skill pack unavailable" };
    }
    const disposition = String(response.headers["content-disposition"] || "");
    const match = /filename="([^"]+)"/i.exec(disposition);
    return {
      blob: response.data,
      filename: match?.[1] || "launchpad-mcp-sdlc.zip",
    };
  } catch (error) {
    const data = error.response?.data;
    if (typeof Blob !== "undefined" && data instanceof Blob) {
      const text = await data.text();
      try {
        const parsed = JSON.parse(text);
        throw parsed?.error || parsed?.message || { error: "Skill pack unavailable" };
      } catch (parseErr) {
        if (parseErr?.error || parseErr?.message) throw parseErr;
      }
    }
    if (error?.error || error?.message) throw error;
    throw error.response?.data || { error: "Skill pack unavailable" };
  }
};

/** Paginated GitHub repos visible to the OAuth connection (affiliation owner/collaborator/org member). */
export const fetchGithubReposPage = async (connectionId, { page = 1, projectId } = {}) => {
  const params = { connectionId, page };
  if (projectId != null && projectId !== "") params.projectId = projectId;
  const { data } = await api.get("/api/integrations/github/repos", { params });
  return data;
};

/** Paginated Bitbucket repos for the OAuth connection. */
export const fetchBitbucketReposPage = async (connectionId, { page = 1, projectId } = {}) => {
  const params = { connectionId, page };
  if (projectId != null && projectId !== "") params.projectId = projectId;
  const { data } = await api.get("/api/integrations/bitbucket/repos", {
    params,
  });
  return data;
};

/** Jira projects for an OAuth connection; includes jiraBaseUrl for the site. */
export const fetchJiraProjectsForConnection = async (connectionId, { projectId } = {}) => {
  const params = { connectionId };
  if (projectId != null && projectId !== "") params.projectId = projectId;
  const { data } = await api.get("/api/integrations/jira/projects", { params });
  return data;
};

/** Project creator's OAuth connections (for edit-project UI); requires project settings access. */
export const fetchCreatorIntegrationConnections = async (
  projectId,
  { checkHealth = false } = {},
) => {
  const { data } = await api.get(`/api/integrations/creator-connections/${projectId}`, {
    params: checkHealth ? { checkHealth: 1 } : undefined,
  });
  return data;
};

// Function to create a new project
export const createProject = async (projectData) => {
  try {
    const headers = projectData?.promptConfig != null ? hubAccessTokenHeaders() : {};
    const response = await api.post("/api/projects", projectData, { headers });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to create project" };
  }
};

export const checkProjectSlugAvailability = async (payload) => {
  try {
    const response = await api.post("/api/projects/slug-availability", payload);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to validate project slug" };
  }
};

/** Fetch Hub project IDs that are already imported into Launchpad to prevent duplicate onboarding. */
export const fetchImportedHubProjectIds = async () => {
  try {
    const response = await api.get("/api/projects/imported-hub-project-ids");
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to load hub import status" };
  }
};

export const initializeProjectOnboarding = async (projectId, payload) => {
  try {
    const response = await api.post(`/api/projects/${projectId}/onboarding/init`, payload);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to initialize onboarding" };
  }
};

/** Start Migrate Frontend after launchpad GitHub invitation is accepted (onboarding). */
export const startMigrateOnboardingAgent = async (projectId, { releaseId }) => {
  try {
    const response = await api.post(`/api/projects/${projectId}/onboarding/migrate-start`, {
      releaseId,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to start migrate" };
  }
};

export const enhanceScratchPrompt = async ({ prompt, system_prompt }) => {
  try {
    const body = { prompt };
    if (typeof system_prompt === "string" && system_prompt.trim()) {
      body.system_prompt = system_prompt.trim();
    }
    const response = await api.post("/api/projects/enhance-prompt", body);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to enhance prompt" };
  }
};

/** List branches for a repo via OAuth connection (onboarding before project is fully configured). */
export const fetchIntegrationRepoBranches = async (scmHost, connectionId, repoPath, opts = {}) => {
  try {
    const host = scmHost === "bitbucket" ? "bitbucket" : "github";
    const params = {
      connectionId,
      repoPath: String(repoPath || "").trim(),
    };
    const q = typeof opts.q === "string" ? opts.q.trim() : "";
    if (q.length >= 2) params.q = q;
    if (opts.projectId != null && opts.projectId !== "") params.projectId = opts.projectId;
    const response = await api.get(`/api/integrations/${host}/branches`, { params });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to fetch repository branches" };
  }
};

export const fetchDeveloperRepoBranches = async (projectId, developmentRepoUrl, opts = {}) => {
  try {
    const params = {};
    if (typeof developmentRepoUrl === "string" && developmentRepoUrl.trim()) {
      params.developmentRepoUrl = developmentRepoUrl.trim();
    }
    const q = typeof opts.q === "string" ? opts.q.trim() : "";
    if (q.length >= 2) params.q = q;
    const response = await api.get(`/api/projects/${projectId}/developer-repo-branches`, {
      params,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to fetch repository branches" };
  }
};

/** Verify a branch exists on a repo via OAuth connection (onboarding / create project). */
export const validateIntegrationRepoBranch = async (
  scmHost,
  connectionId,
  repoPath,
  branch,
  opts = {},
) => {
  try {
    const host = scmHost === "bitbucket" ? "bitbucket" : "github";
    const params = {
      connectionId,
      repoPath: String(repoPath || "").trim(),
      branch: String(branch || "").trim(),
    };
    if (opts.projectId != null && opts.projectId !== "") params.projectId = opts.projectId;
    const response = await api.get(`/api/integrations/${host}/branches/validate`, {
      params,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Could not verify branch" };
  }
};

/** Verify a branch exists on a project's development repository. */
export const validateDeveloperRepoBranch = async (projectId, developmentRepoUrl, branch) => {
  try {
    const params = { branch: String(branch || "").trim() };
    if (typeof developmentRepoUrl === "string" && developmentRepoUrl.trim()) {
      params.developmentRepoUrl = developmentRepoUrl.trim();
    }
    const response = await api.get(`/api/projects/${projectId}/developer-repo-branches/validate`, {
      params,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Could not verify branch" };
  }
};

// Function to fetch all projects
export const fetchProjects = async ({ includeInactive = false } = {}) => {
  try {
    const params = includeInactive ? { includeInactive: "true" } : undefined;
    const response = await api.get("/api/projects", { params });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to fetch projects" };
  }
};

/** Lightweight project search — id, name, and isFavorite (favorites sorted first). */
export const searchProjects = async ({ q, includeInactive = false } = {}) => {
  try {
    const params = {};
    if (typeof q === "string" && q.trim()) params.q = q.trim();
    if (includeInactive) params.includeInactive = "true";
    const response = await api.get("/api/projects/search", { params });
    return Array.isArray(response.data?.projects) ? response.data.projects : [];
  } catch (error) {
    if (isApiConnectionError(error)) throw error;
    throw error.response?.data || { error: "Failed to search projects" };
  }
};

// Function to fetch project details by ID
export const fetchProjectById = async (projectId) => {
  try {
    const response = await api.get(`/api/projects/${projectId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to fetch project" };
  }
};

/** Current authenticated user (includes project journey tour state). */
export const fetchCurrentUser = async () => {
  try {
    const response = await api.get("/api/auth/me");
    return response.data?.user ?? null;
  } catch (error) {
    throw error.response?.data || { error: "Failed to fetch current user" };
  }
};

/** Persist the project journey tour result. @param {"completed"|"skipped"} status */
export const updateProjectJourneyTourStatus = async (status) => {
  try {
    const response = await api.patch("/api/auth/me/journey-tour", { status });
    return response.data?.user ?? null;
  } catch (error) {
    throw error.response?.data || { error: "Failed to update tour status" };
  }
};

export const deleteProject = async (projectId, options = {}) => {
  try {
    const deleteLaunchpadGithubRepo = Boolean(options.deleteLaunchpadGithubRepo);
    const response = await api.delete(`/api/projects/${projectId}`, {
      params: deleteLaunchpadGithubRepo ? { deleteLaunchpadGithubRepo: "true" } : undefined,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to delete project" };
  }
};

export const fetchReportedIssuesOverview = async () => {
  try {
    const response = await api.get("/api/client-feedbacks");
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to fetch reported issues" };
  }
};

export const fetchProjectSentryIntegration = async (projectId) => {
  try {
    const response = await api.get(`/api/projects/${projectId}/sentry-integration`);
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to load Sentry integration" };
  }
};

export const fetchProjectSentryProjects = async (projectId) => {
  try {
    const response = await api.get(`/api/projects/${projectId}/sentry-integration/sentry-projects`);
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Could not load Sentry projects" };
  }
};

export const saveProjectSentryIntegration = async (projectId, body) => {
  try {
    const response = await api.put(`/api/projects/${projectId}/sentry-integration`, body);
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to save Sentry integration" };
  }
};

export const importProjectSentryIssues = async (projectId) => {
  try {
    const response = await api.post(`/api/projects/${projectId}/sentry-integration/import-issues`);
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Could not import Sentry issues" };
  }
};

export const deleteProjectSentryIntegration = async (projectId) => {
  try {
    const response = await api.delete(`/api/projects/${projectId}/sentry-integration`, {
      data: { confirm: true },
    });
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to unlink Sentry" };
  }
};

export const fetchProjectClientFeedbacks = async (projectId, { page = 1, pageSize = 20 } = {}) => {
  try {
    const response = await api.get(`/api/client-feedbacks/${projectId}`, {
      params: { page, pageSize },
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to fetch project feedbacks" };
  }
};

export const fetchProjectClientFeedback = async (projectId, feedbackId) => {
  try {
    const response = await api.get(`/api/client-feedbacks/${projectId}/${feedbackId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to fetch feedback detail" };
  }
};

export const fetchProjectQaReports = async (projectId, { page = 1, pageSize = 20 } = {}) => {
  try {
    const response = await api.get(`/api/qa-automation/projects/${projectId}/qa-reports`, {
      params: { page, pageSize },
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to fetch QA reports" };
  }
};

export const fetchProjectQaReportDetail = async (projectId, messageId) => {
  try {
    const response = await api.get(
      `/api/qa-automation/projects/${projectId}/qa-reports/${messageId}`,
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to fetch QA report detail" };
  }
};

export const moveQaReportToFeedbackFix = async (projectId, messageId, { failureIndex } = {}) => {
  try {
    const body = failureIndex !== undefined ? { failureIndex } : {};
    const response = await api.post(
      `/api/qa-automation/projects/${projectId}/qa-reports/${messageId}/move-to-feedback`,
      body,
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to move QA report to feedback" };
  }
};

export const startFeedbackAiFix = async (projectId, feedbackId, body = {}) => {
  try {
    const response = await api.post(
      `/api/client-feedbacks/${projectId}/${feedbackId}/ai-fix`,
      body,
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to start AI fix" };
  }
};

export const startFeedbackAiFixBatch = async (projectId, body = {}) => {
  try {
    const response = await api.post(`/api/client-feedbacks/${projectId}/ai-fix/batch`, body);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to start bulk AI fix" };
  }
};

export const cancelFeedbackAiFix = async (projectId, feedbackId) => {
  try {
    const response = await api.post(
      `/api/client-feedbacks/${projectId}/${feedbackId}/ai-fix/cancel`,
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to cancel AI fix" };
  }
};

export const clarifyFeedbackAiFix = async (projectId, feedbackId, prompt) => {
  try {
    const response = await api.post(
      `/api/client-feedbacks/${projectId}/${feedbackId}/ai-fix/clarify`,
      { prompt },
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to send clarifying answers" };
  }
};

export const fetchFeedbackAiFixStatus = async (projectId, feedbackId) => {
  try {
    const response = await api.get(
      `/api/client-feedbacks/${projectId}/${feedbackId}/ai-fix/status`,
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to fetch AI fix status" };
  }
};

export async function consumeFeedbackAiFixStream(projectId, feedbackId, handlers = {}) {
  const { onEvent, signal } = handlers;
  const token = localStorage.getItem("token");
  const base = String(API_URL || "").replace(/\/$/, "");
  const url = `${base}/api/client-feedbacks/${projectId}/${feedbackId}/ai-fix/stream`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "text/event-stream",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    signal,
  });
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `AI fix stream failed (${res.status})`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  try {
    while (true) {
      const { done, value } = await readAbortableSseChunk(reader);
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      for (;;) {
        const sep = buf.indexOf("\n\n");
        if (sep === -1) break;
        const rawEvent = buf.slice(0, sep);
        buf = buf.slice(sep + 2);
        let dataLine = "";
        for (const line of rawEvent.split("\n")) {
          if (line.startsWith("data:")) {
            dataLine = line.slice(5).replace(/^\s/, "");
          }
        }
        if (!dataLine) continue;
        let data;
        try {
          data = JSON.parse(dataLine);
        } catch {
          continue;
        }
        if (data.type === "heartbeat") continue;
        onEvent?.(data);
        if (data.type === "terminal") {
          await reader.cancel().catch(() => {});
          return data;
        }
      }
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  return null;
}

export const fetchProjectClientFeedbackJiraPriorities = async (projectId) => {
  try {
    const response = await api.get(`/api/client-feedbacks/${projectId}/jira-priorities`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to fetch Jira priorities" };
  }
};

export const fetchProjectClientFeedbackJiraLabels = async (projectId, q = "") => {
  try {
    const response = await api.get(`/api/client-feedbacks/${projectId}/jira-labels`, {
      params: { q },
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to fetch Jira labels" };
  }
};

export const approveProjectClientFeedback = async (projectId, feedbackId, payload = {}) => {
  try {
    const response = await api.post(
      `/api/client-feedbacks/${projectId}/${feedbackId}/approve`,
      payload,
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to approve feedback" };
  }
};

export const deleteProjectClientFeedback = async (projectId, feedbackId) => {
  try {
    const response = await api.delete(`/api/client-feedbacks/${projectId}/${feedbackId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to delete feedback" };
  }
};

/** AI backlog suggestions (OpenAI Responses + web search when configured). */
export const fetchBacklogSuggestions = async (projectId, body = {}, axiosConfig = {}) => {
  try {
    const response = await api.post(
      `/api/projects/${projectId}/backlog-suggestions`,
      body,
      axiosConfig,
    );
    return response.data;
  } catch (error) {
    if (error?.code === "ERR_CANCELED" || error?.name === "CanceledError") {
      throw error;
    }
    throw (
      error.response?.data || {
        error: "Failed to generate backlog suggestions",
      }
    );
  }
};

/** @deprecated use fetchBacklogSuggestions */
export const fetchReleaseFeatureSuggestions = fetchBacklogSuggestions;

export const fetchBacklogSuggestionDraft = async (projectId) => {
  try {
    const response = await api.get(`/api/projects/${projectId}/backlog-suggestions/draft`);
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      const notFound = new Error("No backlog suggestion draft");
      notFound.code = "BACKLOG_DRAFT_NOT_FOUND";
      notFound.status = 404;
      throw notFound;
    }
    throw error.response?.data || { error: "Failed to load backlog suggestion draft" };
  }
};

export const discardBacklogSuggestionDraft = async (projectId) => {
  try {
    const response = await api.delete(`/api/projects/${projectId}/backlog-suggestions/draft`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to discard backlog suggestion draft" };
  }
};

export const fetchBacklogEpics = async (projectId) => {
  try {
    const response = await api.get(`/api/projects/${projectId}/backlog/epics`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to load backlog" };
  }
};

export const createBacklogEpic = async (projectId, body) => {
  try {
    const response = await api.post(`/api/projects/${projectId}/backlog/epics`, body);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to create epic" };
  }
};

export const updateBacklogEpic = async (projectId, epicId, body) => {
  try {
    const response = await api.patch(`/api/projects/${projectId}/backlog/epics/${epicId}`, body);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to update epic" };
  }
};

export const deleteBacklogEpic = async (projectId, epicId) => {
  try {
    const response = await api.delete(`/api/projects/${projectId}/backlog/epics/${epicId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to delete epic" };
  }
};

export const createBacklogStory = async (projectId, body) => {
  try {
    const response = await api.post(`/api/projects/${projectId}/backlog/stories`, body);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to create story" };
  }
};

export const updateBacklogStory = async (projectId, storyId, body) => {
  try {
    const response = await api.patch(`/api/projects/${projectId}/backlog/stories/${storyId}`, body);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to update story" };
  }
};

export const deleteBacklogStory = async (projectId, storyId) => {
  try {
    const response = await api.delete(`/api/projects/${projectId}/backlog/stories/${storyId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to delete story" };
  }
};

export const applyBacklogSuggestion = async (projectId, suggestion) => {
  try {
    const response = await api.post(`/api/projects/${projectId}/backlog/suggestions/apply`, {
      suggestion,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to apply suggestion" };
  }
};

export const fetchReleaseScope = async (releaseId) => {
  try {
    const response = await api.get(`/api/releases/${releaseId}/scope`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to load release scope" };
  }
};

export const replaceReleaseScope = async (releaseId, items) => {
  try {
    const response = await api.put(`/api/releases/${releaseId}/scope`, {
      items,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to save release scope" };
  }
};

export const startReleaseScopeImplement = async (releaseId, body = {}) => {
  try {
    const response = await api.post(`/api/releases/${releaseId}/scope/implement`, body);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to start implement" };
  }
};

export const fetchActiveReleaseScopeImplementRun = async (releaseId) => {
  try {
    const response = await api.get(`/api/releases/${releaseId}/scope/implement/active`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to load active implement run" };
  }
};

export const fetchReleaseScopeImplementRun = async (releaseId, runId) => {
  try {
    const response = await api.get(`/api/releases/${releaseId}/scope/implement/${runId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to load implement run" };
  }
};

export const cancelReleaseScopeImplementRun = async (releaseId, runId) => {
  try {
    const response = await api.post(`/api/releases/${releaseId}/scope/implement/${runId}/cancel`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to cancel implement run" };
  }
};

export const continueReleaseScopeImplementRun = async (releaseId, runId) => {
  try {
    const response = await api.post(`/api/releases/${releaseId}/scope/implement/${runId}/continue`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to continue implement run" };
  }
};

export const clarifyReleaseScopeImplementRun = async (releaseId, runId, prompt) => {
  try {
    const response = await api.post(`/api/releases/${releaseId}/scope/implement/${runId}/clarify`, {
      prompt,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to send clarifying answers" };
  }
};

/** AI release & feature suggestions (OpenAI Responses + web search when configured). */
export const fetchReleaseFeatureSuggestionsLegacy = async (
  projectId,
  body = {},
  axiosConfig = {},
) => {
  try {
    const response = await api.post(
      `/api/projects/${projectId}/release-feature-suggestions`,
      body,
      axiosConfig,
    );
    return response.data;
  } catch (error) {
    if (error?.code === "ERR_CANCELED" || error?.name === "CanceledError") {
      throw error;
    }
    throw (
      error.response?.data || {
        error: "Failed to generate release suggestions",
      }
    );
  }
};

/** Cursor ask-mode scan of the development repo for release-suggestion meeting notes. */
export const fetchReleaseSuggestionRepoScan = async (projectId, axiosConfig = {}) => {
  try {
    const response = await api.post(
      `/api/projects/${projectId}/release-suggestion-repo-scan`,
      {},
      {
        timeout: 2 * 60 * 60 * 1000,
        ...axiosConfig,
      },
    );
    return response.data;
  } catch (error) {
    if (error?.code === "ERR_CANCELED" || error?.name === "CanceledError") {
      throw error;
    }
    throw (
      error.response?.data || {
        error: "Failed to fetch project details from the repository",
      }
    );
  }
};

/**
 * AI chat to refine a single Epic or Story (title + description). Multi-turn:
 * the caller sends the full conversation each time.
 *
 * @param {number|string} projectId
 * @param {{
 *   type: 'epic'|'story',
 *   currentContent: { title: string, description: string },
 *   epicContext?: string,
 *   siblingNames?: string[],
 *   messages: Array<{ role: 'user'|'assistant', content: string }>,
 * }} body
 * @param {import("axios").AxiosRequestConfig} [axiosConfig]
 */
export const fetchEpicStoryChat = async (projectId, body, axiosConfig = {}) => {
  try {
    const response = await api.post(
      `/api/projects/${projectId}/epic-story-chat`,
      body,
      axiosConfig,
    );
    return response.data;
  } catch (error) {
    if (error?.code === "ERR_CANCELED" || error?.name === "CanceledError") {
      throw error;
    }
    throw error.response?.data || { error: "Failed to chat with AI" };
  }
};

/**
 * Fetch all meeting-note pages from Hub for a Hub project id (Project.projectId).
 * Proxied via LaunchPad backend (/api/hub/*).
 * @param {string} hubProjectId
 * @param {import("axios").AxiosRequestConfig} [axiosConfig]
 */
export async function fetchHubMeetingNotesAggregated(hubProjectId, axiosConfig = {}) {
  if (!hubProjectId) {
    throw new Error("Hub project id is missing");
  }
  const { data: res } = await api.get(
    `/api/hub/projects/${encodeURIComponent(String(hubProjectId).trim())}/meeting-notes`,
    {
      ...axiosConfig,
      headers: {
        ...(axiosConfig.headers || {}),
        ...hubAccessTokenHeaders(),
      },
    },
  );
  const rows = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
  return rows;
}

/**
 * GET /api/projects/:id/jira/tickets — optional query:
 * types (or issueTypes), search (or summary / summaryContains), key (or issueKey),
 * limit (page size, default 50, max 100), cursor (Jira nextPageToken); types=all for all issue types
 * @param {string|number} projectId
 * @param {Record<string, string|number|boolean|undefined>} [params]
 */
export const fetchProjectJiraTickets = async (projectId, params = {}) => {
  try {
    const response = await api.get(`/api/projects/${projectId}/jira/tickets`, {
      params,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to fetch Jira tickets" };
  }
};

/** Authenticated full project by URL slug (same payload as fetchProjectById). */
export const fetchProjectBySlug = async (slug) => {
  try {
    const enc = encodeURIComponent(String(slug).trim());
    const response = await api.get(`/api/projects/${enc}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to fetch project" };
  }
};

/**
 * Starts the Cursor cloud Migrate Frontend agent (backend POST → cursor-cloud-agent `/v0/agents`).
 * Development + primary launchpad workspace: clones development repo(s) + launchpad; only the primary launchpad folder is a push target.
 * @param {number|string} projectId
 * @param {{ userPrompt?: string }} [opts]
 */
export const postMigrateFrontendAgent = async (projectId, opts = {}) => {
  try {
    const body = {};
    const prompt = typeof opts.userPrompt === "string" ? opts.userPrompt.trim() : "";
    if (prompt) {
      body.userPrompt = prompt;
    }
    const response = await api.post(`/api/projects/${projectId}/migrate-frontend-agent`, body);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to start migrate agent" };
  }
};

/** Download launchpad repo as zip (tracked files only — no node_modules, dist, etc.).
 * @param {number|string} projectId
 * @param {{ versionId?: number|string|null }} [opts]
 */
export const exportProjectLaunchpadZip = async (projectId, opts = {}) => {
  try {
    const versionId = opts?.versionId;
    const params =
      versionId != null && String(versionId).trim() !== ""
        ? { versionId: Number(versionId) }
        : undefined;
    const response = await api.get(`/api/projects/${projectId}/launchpad-export`, {
      responseType: "blob",
      params,
    });
    const contentType = String(response.headers["content-type"] || "");
    if (contentType.includes("application/json")) {
      const text = await response.data.text();
      let parsed = {};
      try {
        parsed = JSON.parse(text);
      } catch {
        /* ignore */
      }
      throw parsed?.error || parsed?.message || { error: "Failed to export launchpad repository" };
    }
    const disposition = String(response.headers["content-disposition"] || "");
    const match = /filename="([^"]+)"/i.exec(disposition);
    return {
      blob: response.data,
      filename: match?.[1] || "preview-export.zip",
    };
  } catch (error) {
    const data = error.response?.data;
    if (typeof Blob !== "undefined" && data instanceof Blob) {
      const text = await data.text();
      try {
        const parsed = JSON.parse(text);
        throw (
          parsed?.error || parsed?.message || { error: "Failed to export launchpad repository" }
        );
      } catch (parseErr) {
        if (parseErr?.error || parseErr?.message) throw parseErr;
      }
    }
    if (error?.error || error?.message) throw error;
    throw error.response?.data || { error: "Failed to export launchpad repository" };
  }
};

/** Download full QA workspace ZIP from S3 for a project.
 * @param {number|string} projectId
 * @param {{ onProgress?: (status: unknown) => void }} [opts]
 * @returns {Promise<{ downloadUrl: string, filename: string, delivery: 'presigned' }>}
 */
export const fetchQaExportPrOptions = async (projectId) => {
  const pid = Number(projectId);
  if (!Number.isInteger(pid) || pid < 1) {
    throw { error: "Valid project id is required." };
  }
  try {
    const res = await api.get(`/api/qa-automation/projects/${pid}/export-pr/options`);
    return res.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to load export PR options." };
  }
};

export const fetchQaExportPrState = async (projectId) => {
  const pid = Number(projectId);
  if (!Number.isInteger(pid) || pid < 1) {
    throw { error: "Valid project id is required." };
  }
  try {
    const res = await api.get(`/api/qa-automation/projects/${pid}/export-pr/state`);
    return res.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to load export PR state." };
  }
};

export const startQaExportPr = async (projectId, body) => {
  const pid = Number(projectId);
  if (!Number.isInteger(pid) || pid < 1) {
    throw { error: "Valid project id is required." };
  }
  try {
    const res = await api.post(`/api/qa-automation/projects/${pid}/export-pr/start`, body);
    return res.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to start export PR." };
  }
};

export const fetchQaExportPrStatus = async (projectId, jobId) => {
  const pid = Number(projectId);
  if (!Number.isInteger(pid) || pid < 1) {
    throw { error: "Valid project id is required." };
  }
  try {
    const res = await api.get(
      `/api/qa-automation/projects/${pid}/export-pr/${encodeURIComponent(jobId)}/status`,
    );
    return res.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to load export PR status." };
  }
};

export const downloadQaTestsZip = async (projectId, opts = {}) => {
  const { onProgress } = opts;
  try {
    const pid = Number(projectId);
    if (!Number.isInteger(pid) || pid < 1) {
      throw { error: "Valid project id is required." };
    }

    const startRes = await api.post(`/api/qa-automation/projects/${pid}/download-qa-tests/start`);
    const exportId = String(startRes.data?.exportId || "").trim();
    if (!exportId) {
      throw { error: "Export did not start." };
    }

    const { pollQaTestsExportUntilReady } = await import("@/lib/qaDownloadExportFlow.js");
    const ready = await pollQaTestsExportUntilReady({
      projectId: pid,
      exportId,
      fetchStatus: async (projectIdValue, exportIdValue) => {
        const res = await api.get(
          `/api/qa-automation/projects/${projectIdValue}/download-qa-tests/${encodeURIComponent(exportIdValue)}/status`,
        );
        return res.data;
      },
      onProgress,
    });
    const downloadUrl = String(ready?.downloadUrl || "").trim();
    if (!downloadUrl) {
      throw { error: "Export finished without a download link." };
    }
    return {
      downloadUrl,
      filename: String(ready?.filename || "").trim() || "qa-tests.zip",
      delivery: "presigned",
    };
  } catch (error) {
    const status = error.response?.status;
    const data = error.response?.data;
    if (typeof Blob !== "undefined" && data instanceof Blob) {
      const text = await data.text();
      try {
        const parsed = JSON.parse(text);
        const apiMessage = parsed?.error || parsed?.message;
        if (apiMessage) {
          throw { error: String(apiMessage), status };
        }
      } catch (parseErr) {
        if (parseErr && typeof parseErr === "object" && parseErr.error) throw parseErr;
      }
    } else if (data && typeof data === "object" && (data.error || data.message)) {
      throw { error: String(data.error || data.message), status };
    }
    if (error?.error) throw { error: String(error.error), status };
    if (status === 404) {
      throw {
        error: "No QA test artifacts found for this project yet.",
        status,
      };
    }
    throw { error: "Failed to download QA tests", status };
  }
};

/** Catalog: merged list of PatrickJS/awesome-cursorrules folders plus shared custom packs (backend). */
export const fetchCursorRulesCatalog = async (projectId) => {
  try {
    const response = await api.get(`/api/projects/${projectId}/cursor-rules/catalog`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to load Cursor rules catalog" };
  }
};

/** List shared custom Cursor rules (same for all projects; projectId is only for API auth). */
export const fetchProjectCustomCursorRules = async (projectId) => {
  try {
    const response = await api.get(`/api/projects/${projectId}/cursor-rules/custom`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to load custom Cursor rules" };
  }
};

/** Create or update a shared custom rule pack (instance-wide; projectId is only for API auth). */
export const createProjectCustomCursorRule = async (projectId, { folderName, body }) => {
  try {
    const response = await api.post(`/api/projects/${projectId}/cursor-rules/custom`, {
      folderName,
      body,
    });
    return response.data;
  } catch (error) {
    const data = error.response?.data;
    if (data && typeof data === "object") throw data;
    throw {
      error:
        (typeof error.message === "string" && error.message.trim()) ||
        "Failed to save custom Cursor rules",
    };
  }
};

/** Push selected rule packs to the GitHub developer repository under `.cursor/rules/awesome-cursorrules/...`. */
export const importCursorRulesFolders = async (projectId, folders) => {
  try {
    const response = await api.post(`/api/projects/${projectId}/cursor-rules/import`, { folders });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to import Cursor rules" };
  }
};

/** Catalog: workspace custom Cursor skill packs plus optional Hub public skills. */
export const fetchCursorSkillsCatalog = async (projectId) => {
  try {
    const response = await api.get(`/api/projects/${projectId}/cursor-skills/catalog`, {
      headers: hubAccessTokenHeaders(),
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to load Cursor skills catalog" };
  }
};

export const fetchWorkspaceCursorSkillsCatalog = async () => {
  try {
    const response = await api.get("/api/projects/cursor-catalog/skills", {
      headers: hubAccessTokenHeaders(),
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to load Cursor skills catalog" };
  }
};

export const fetchWorkspaceCursorRulesCatalog = async () => {
  try {
    const response = await api.get("/api/projects/cursor-catalog/rules");
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to load Cursor rules catalog" };
  }
};

export const fetchWorkspaceCustomCursorSkills = async () => {
  try {
    const response = await api.get("/api/projects/cursor-catalog/custom-skills");
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to load custom Cursor skills" };
  }
};

export const fetchWorkspaceCustomCursorRules = async () => {
  try {
    const response = await api.get("/api/projects/cursor-catalog/custom-rules");
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to load custom Cursor rules" };
  }
};

/** Curated onboarding design-template gallery (categories + templates). */
export const fetchDesignTemplateCatalog = async () => {
  try {
    const response = await api.get("/api/projects/cursor-catalog/design-templates");
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to load design templates" };
  }
};

/** Vendored example.html for a template folder, for sandboxed iframe preview. */
export const fetchDesignTemplatePreview = async (folderName) => {
  try {
    const response = await api.get(
      `/api/projects/cursor-catalog/design-templates/${encodeURIComponent(folderName)}/preview`,
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to load template preview" };
  }
};

/** List shared custom Cursor skills (same for all projects; projectId is only for API auth). */
export const fetchProjectCustomCursorSkills = async (projectId) => {
  try {
    const response = await api.get(`/api/projects/${projectId}/cursor-skills/custom`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to load custom Cursor skills" };
  }
};

/** Create or update a shared custom skill pack (instance-wide; projectId is only for API auth). */
export const createProjectCustomCursorSkill = async (projectId, { folderName, body }) => {
  try {
    const response = await api.post(`/api/projects/${projectId}/cursor-skills/custom`, {
      folderName,
      body,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to save custom Cursor skills" };
  }
};

/** Push selected skill packs to the GitHub developer repository under `.cursor/skills/launchpad-cursor-skills/...`. */
export const importCursorSkillsFolders = async (
  projectId,
  { folders = [], hubSkillIds = [] } = {},
) => {
  try {
    const response = await api.post(
      `/api/projects/${projectId}/cursor-skills/import`,
      { folders, hubSkillIds },
      { headers: hubAccessTokenHeaders() },
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to import Cursor skills" };
  }
};

/** Start deferred from-scratch Cursor agent (release 1.0.0 + agent). */
export const startProjectScratchAgent = async (projectId, prompt) => {
  try {
    const response = await api.post(`/api/projects/${projectId}/scratch-agent`, {
      prompt,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to start scratch agent" };
  }
};

/** Stop scratch agent, revert workspace, and tear down early preview. */
export const stopProjectScratchAgent = async (projectId) => {
  try {
    const response = await api.post(`/api/projects/${projectId}/scratch-agent/stop`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to stop scratch agent" };
  }
};

/** Stop Cursor agent by id with workspace revert (authenticated). */
export const stopCursorAgentAndRevert = async (agentId, projectId) => {
  try {
    const response = await api.post(
      `/api/cursor/agents/${encodeURIComponent(agentId)}/stop-and-revert`,
      { projectId },
    );
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        error: "Failed to stop agent and revert changes",
      }
    );
  }
};

// Release Management API Functions

// Function to fetch all releases for a project
export const fetchReleases = async (projectId) => {
  try {
    const response = await api.get(`/api/releases/project/${projectId}`, {
      params: { _: Date.now() },
      headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to fetch releases" };
  }
};

// Function to create a new release
export const createRelease = async (releaseData) => {
  try {
    const response = await api.post("/api/releases", releaseData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to create release" };
  }
};

// Function to lock/unlock a release
export const toggleReleaseLock = async (releaseId, locked, options = {}) => {
  try {
    const body = { locked, ...options };
    if (body.developmentRepoUrl === undefined || body.developmentRepoUrl === "") {
      delete body.developmentRepoUrl;
    }
    if (body.developerSubmodulePath === undefined) delete body.developerSubmodulePath;
    if (body.developerAgentRef === undefined || body.developerAgentRef === "") {
      delete body.developerAgentRef;
    }
    if (body.skipLockAgentOperations === undefined) {
      delete body.skipLockAgentOperations;
    }
    if (body.userPrompt === undefined || body.userPrompt === "") {
      delete body.userPrompt;
    } else if (typeof body.userPrompt === "string") {
      body.userPrompt = body.userPrompt.trim();
      if (!body.userPrompt) delete body.userPrompt;
    }
    const response = await api.post(`/api/releases/${releaseId}/lock`, body);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to toggle release lock" };
  }
};

export const publicLockRelease = async (releaseId, lockedBy, options = {}) => {
  try {
    const body = { lockedBy, ...options };
    if (body.developmentRepoUrl === undefined || body.developmentRepoUrl === "") {
      delete body.developmentRepoUrl;
    }
    if (body.developerSubmodulePath === undefined) delete body.developerSubmodulePath;
    if (body.developerAgentRef === undefined || body.developerAgentRef === "") {
      delete body.developerAgentRef;
    }
    if (body.deployEnvironmentId === undefined || body.deployEnvironmentId === "") {
      delete body.deployEnvironmentId;
    }
    if (body.skipLockAgentOperations === undefined) {
      delete body.skipLockAgentOperations;
    }
    if (body.userPrompt === undefined || body.userPrompt === "") {
      delete body.userPrompt;
    } else if (typeof body.userPrompt === "string") {
      body.userPrompt = body.userPrompt.trim();
      if (!body.userPrompt) delete body.userPrompt;
    }
    const response = await api.post(`/api/releases/${releaseId}/public-lock`, body);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to lock release" };
  }
};

/** Public: clarifying MCQs while release-lock agent awaits answers. */
export const publicReleaseBackendAgentQuestions = async (releaseId, email) => {
  try {
    const response = await api.get(`/api/releases/${releaseId}/public-backend-agent-questions`, {
      params: { email },
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to load clarifying questions" };
  }
};

/** Public: submit clarifying answers to resume release-lock agent. */
export const publicReleaseBackendAgentClarify = async (releaseId, lockedBy, prompt) => {
  try {
    const response = await api.post(`/api/releases/${releaseId}/public-backend-agent-clarify`, {
      lockedBy,
      prompt,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to send clarifying answers" };
  }
};

/** Public client-link chat (routes under /api/chat). No JWT. */
export const clientLinkSendFollowup = async (
  slug,
  releaseId,
  text,
  clientEmail,
  replacementImage = null,
  referenceImages = null,
  mode = "agent",
  jiraTicketLinks = null,
  referencePdfs = null,
) => {
  const enc = encodeURIComponent(String(slug).trim());
  const body = {
    r: Number(releaseId),
    t: text,
    clientEmail: String(clientEmail || "").trim(),
  };
  const normalizedMode = typeof mode === "string" ? mode.trim().toLowerCase() : "agent";
  if (normalizedMode === "ask" || normalizedMode === "plan") {
    body.mode = normalizedMode;
  }
  if (Array.isArray(jiraTicketLinks) && jiraTicketLinks.length > 0) {
    body.jiraTicketLinks = jiraTicketLinks;
  }
  if (
    replacementImage &&
    typeof replacementImage === "object" &&
    typeof replacementImage.data === "string"
  ) {
    body.replacementImage = {
      data: replacementImage.data,
      mimeType: replacementImage.mimeType || "image/png",
      width: Number(replacementImage.width) || 512,
      height: Number(replacementImage.height) || 512,
    };
  }
  if (Array.isArray(referenceImages) && referenceImages.length > 0 && !replacementImage) {
    body.referenceImages = referenceImages
      .filter(
        (img) => img && typeof img === "object" && typeof img.data === "string" && img.data.trim(),
      )
      .map((img) => ({
        data: img.data,
        mimeType: img.mimeType || "image/png",
        width: Number(img.width) || 512,
        height: Number(img.height) || 512,
      }));
  }
  if (Array.isArray(referencePdfs) && referencePdfs.length) {
    body.referencePdfs = referencePdfs
      .filter(
        (pdf) => pdf && typeof pdf === "object" && typeof pdf.data === "string" && pdf.data.trim(),
      )
      .map((pdf) => ({
        data: pdf.data,
        fileName: pdf.fileName || "attachment.pdf",
        mimeType: pdf.mimeType || "application/pdf",
      }));
  }
  const response = await api.post(`/api/chat/${enc}/followup`, body);
  return response.data;
};

/** Approve pending Client Link plan and run Build (agent turn). */
export async function clientLinkBuildPlan(slug, releaseId, clientEmail, { planMarkdown } = {}) {
  const enc = encodeURIComponent(String(slug).trim());
  try {
    const response = await api.post(`/api/chat/${enc}/build-plan`, {
      r: Number(releaseId),
      clientEmail: String(clientEmail || "").trim(),
      ...(typeof planMarkdown === "string" ? { planMarkdown } : {}),
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Could not build plan" };
  }
}

/** Dismiss pending Client Link plan without building. */
export async function clientLinkClearPendingPlan(slug, releaseId, clientEmail) {
  const enc = encodeURIComponent(String(slug).trim());
  try {
    const response = await api.delete(`/api/chat/${enc}/pending-plan`, {
      data: {
        r: Number(releaseId),
        clientEmail: String(clientEmail || "").trim(),
      },
      params: {
        r: Number(releaseId),
        clientEmail: String(clientEmail || "").trim(),
      },
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Could not clear pending plan" };
  }
}

/**
 * Recovery retry — POST /followup (action=retry); same flow as send + pollUntilAgentSettles.
 * @param {string} slug
 * @param {{ action: 'retry', runId: number, projectId: number, r: number, clientEmail: string }} body
 */
export async function clientLinkRecoveryFollowup(slug, body) {
  const enc = encodeURIComponent(String(slug).trim());
  const response = await api.post(`/api/chat/${enc}/followup`, body);
  return response.data;
}

/** List queued client-link messages for a release. */
export async function fetchClientLinkChatQueue(slug, releaseId, clientEmail) {
  const enc = encodeURIComponent(String(slug).trim());
  const response = await api.get(`/api/chat/${enc}/queue`, {
    params: { r: Number(releaseId), clientEmail: resolveClientLinkEmail(clientEmail) },
  });
  return response.data;
}

/** Reorder queued client-link messages. */
export async function reorderClientLinkChatQueue(slug, releaseId, orderedMessageIds, clientEmail) {
  const enc = encodeURIComponent(String(slug).trim());
  const response = await api.patch(`/api/chat/${enc}/queue/reorder`, {
    r: Number(releaseId),
    orderedMessageIds,
    clientEmail: resolveClientLinkEmail(clientEmail),
  });
  return response.data;
}

/** Cancel a queued client-link message. */
export async function cancelClientLinkChatQueueMessage(slug, releaseId, messageId, clientEmail) {
  const enc = encodeURIComponent(String(slug).trim());
  const response = await api.delete(`/api/chat/${enc}/queue/${messageId}`, {
    params: { r: Number(releaseId), clientEmail: resolveClientLinkEmail(clientEmail) },
  });
  return response.data;
}

/** Inject a queued client-link message into the live agent turn. */
export async function steerClientLinkChatQueueMessage(slug, releaseId, messageId, clientEmail) {
  const enc = encodeURIComponent(String(slug).trim());
  const response = await api.post(`/api/chat/${enc}/queue/${messageId}/steer`, {
    r: Number(releaseId),
    clientEmail: resolveClientLinkEmail(clientEmail),
  });
  return response.data;
}

/**
 * Scratch onboarding recovery when preview exists but no active version yet.
 * @param {string} slug
 * @param {{ r: number, projectId: number, clientEmail: string }} body
 */
export async function clientLinkScratchRecover(slug, body) {
  const enc = encodeURIComponent(String(slug).trim());
  const response = await api.post(`/api/chat/${enc}/scratch-recover`, body);
  return response.data;
}

/**
 * Public client-link: AI SVG from reference image (Anthropic via backend; no browser API key).
 * Same auth gate as followup (stakeholder email + release).
 */
export const clientLinkAiPreviewSvg = async (
  slug,
  {
    releaseId,
    clientEmail,
    imageBase64,
    mediaType,
    fileName,
    width,
    height,
    animate,
    customPrompt,
  },
) => {
  const enc = encodeURIComponent(String(slug).trim());
  const body = {
    r: Number(releaseId),
    clientEmail: String(clientEmail || "").trim(),
    imageBase64,
    mediaType,
    fileName,
    width,
    height,
    animate: Boolean(animate),
  };
  if (typeof customPrompt === "string" && customPrompt.trim()) {
    body.customPrompt = customPrompt.trim();
  }
  const response = await api.post(`/api/chat/${enc}/ai-preview-svg`, body);
  return response.data;
};

export const clientLinkFetchAgentStatus = async (slug, releaseId, options = {}) => {
  const enc = encodeURIComponent(String(slug).trim());
  const response = await api.get(`/api/chat/${enc}/agent-status`, {
    params: { r: Number(releaseId), clientEmail: resolveClientLinkEmail(options.clientEmail) },
    signal: options.signal,
    timeout: options.timeout != null ? options.timeout : AGENT_STATUS_FETCH_TIMEOUT_MS,
  });
  return response.data;
};

/**
 * Consume GET /api/chat/:slug/agent-events SSE (server push from backend agent poller).
 * Resolves when a terminal event arrives, the stream ends, or `onEvent` returns true.
 * @param {string} slug
 * @param {number} releaseId
 * @param {{ onEvent?: (evt: { type: string, status?: object }) => boolean | Promise<boolean>, signal?: AbortSignal }} [handlers]
 */
export async function consumeClientLinkAgentStream(slug, releaseId, handlers = {}) {
  const { onEvent, signal, clientEmail, dispatchOnly = false } = handlers;
  const enc = encodeURIComponent(String(slug).trim());
  const base = String(API_URL || "").replace(/\/$/, "");
  const emailParam = resolveClientLinkEmail(clientEmail);
  const url =
    `${base}/api/chat/${enc}/agent-events?r=${Number(releaseId)}` +
    (dispatchOnly ? "&dispatch=1" : "") +
    (emailParam ? `&clientEmail=${encodeURIComponent(emailParam)}` : "");
  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "text/event-stream" },
    signal,
  });
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Agent stream failed (${res.status})`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  try {
    while (true) {
      const { done, value } = await readAbortableSseChunk(reader);
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      for (;;) {
        const sep = buf.indexOf("\n\n");
        if (sep === -1) break;
        const rawEvent = buf.slice(0, sep);
        buf = buf.slice(sep + 2);
        let dataLine = "";
        for (const line of rawEvent.split("\n")) {
          if (line.startsWith("data:")) {
            dataLine = line.slice(5).replace(/^\s/, "");
          }
        }
        if (!dataLine) continue;
        let data;
        try {
          data = JSON.parse(dataLine);
        } catch {
          continue;
        }
        const stop = await onEvent?.(data);
        if (stop || data.type === "terminal") {
          await reader.cancel().catch(() => {});
          return data;
        }
      }
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  return null;
}

/** Public: per-turn chat state snapshot (turns, release status, live stream). */
export const clientLinkFetchChatState = async (slug, releaseId, clientEmail) => {
  const enc = encodeURIComponent(String(slug).trim());
  const response = await api.get(`/api/chat/${enc}/chat-state`, {
    params: { r: Number(releaseId), clientEmail: resolveClientLinkEmail(clientEmail) },
  });
  return response.data;
};

/**
 * Open GET /api/chat/:slug/chat-events SSE and call `onEvent` for each event until the stream
 * ends or `signal` aborts. Resolves when the server closes the stream.
 * @param {string} slug
 * @param {number} releaseId
 * @param {{ onEvent: (evt: object) => void, signal?: AbortSignal, clientEmail?: string }} opts
 */
export async function openClientLinkChatEventStream(
  slug,
  releaseId,
  { onEvent, signal, clientEmail } = {},
) {
  const enc = encodeURIComponent(String(slug).trim());
  const base = String(API_URL || "").replace(/\/$/, "");
  const emailParam = resolveClientLinkEmail(clientEmail);
  const url =
    `${base}/api/chat/${enc}/chat-events?r=${Number(releaseId)}` +
    (emailParam ? `&clientEmail=${encodeURIComponent(emailParam)}` : "");
  const res = await fetch(url, { method: "GET", headers: { Accept: "text/event-stream" }, signal });
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    const err = new Error(text || `Chat stream failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  try {
    for (;;) {
      const { done, value } = await readAbortableSseChunk(reader);
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      for (;;) {
        const sep = buf.indexOf("\n\n");
        if (sep === -1) break;
        const rawEvent = buf.slice(0, sep);
        buf = buf.slice(sep + 2);
        const dataLine = rawEvent
          .split("\n")
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).replace(/^\s/, ""))
          .join("\n");
        if (!dataLine) continue;
        try {
          onEvent?.(JSON.parse(dataLine));
        } catch {
          /* ignore malformed event */
        }
      }
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
}

/** Public: cancel in-flight Cursor agent generation for a release. */
export const clientLinkStopGeneration = async (
  slug,
  releaseId,
  clientEmail,
  requestId = null,
  options = {},
) => {
  const enc = encodeURIComponent(String(slug).trim());
  const body = {
    r: Number(releaseId),
    clientEmail: String(clientEmail || "").trim(),
  };
  if (typeof requestId === "string" && requestId.trim()) {
    body.requestId = requestId.trim();
  }
  const response = await api.post(`/api/chat/${enc}/stop-generation`, body, {
    signal: options.signal,
  });
  return response.data;
};

/** Public: short-lived OpenAI Realtime secret for Client Link voice mode (stakeholder email gate). */
export const clientLinkCreateVoiceSession = async (slug, releaseId, clientEmail) => {
  const enc = encodeURIComponent(String(slug).trim());
  const response = await api.post(`/api/chat/${enc}/voice-session`, {
    r: Number(releaseId),
    clientEmail: resolveClientLinkEmail(clientEmail),
  });
  return response.data;
};

/**
 * Public: Jev typed decision for the next voice-mode step.
 * @param {{ stage: "turn"|"result"|"demo" } & Record<string, unknown>} payload
 */
export const clientLinkVoiceDecide = async (slug, clientEmail, payload) => {
  const enc = encodeURIComponent(String(slug).trim());
  const response = await api.post(`/api/chat/${enc}/voice-decide`, {
    ...payload,
    clientEmail: resolveClientLinkEmail(clientEmail),
  });
  return response.data;
};

/** Public: read-only project tool (release status, versions, last run, feedback) for voice mode. */
export const clientLinkVoiceTool = async (slug, releaseId, clientEmail, name, args = {}) => {
  const enc = encodeURIComponent(String(slug).trim());
  const response = await api.post(`/api/chat/${enc}/voice-tool`, {
    r: Number(releaseId),
    clientEmail: resolveClientLinkEmail(clientEmail),
    name,
    args,
  });
  return response.data;
};

/** Public: summary after agent finishes for the selected release. */
export const clientLinkFetchExecutionSummary = async (slug, releaseId, clientEmail) => {
  const enc = encodeURIComponent(String(slug).trim());
  const response = await api.get(`/api/chat/${enc}/summary`, {
    params: { r: Number(releaseId), clientEmail: resolveClientLinkEmail(clientEmail) },
  });
  return response.data;
};

/** Public: persisted chat messages for client-link release. */
export const clientLinkFetchChatMessages = async (slug, releaseId, clientEmail) => {
  const enc = encodeURIComponent(String(slug).trim());
  const response = await api.get(`/api/chat/${enc}/messages`, {
    params: { r: Number(releaseId), clientEmail: resolveClientLinkEmail(clientEmail) },
  });
  return response.data;
};

/** Public: list older client-link chat threads for a release. */
export const clientLinkFetchArchivedThreads = async (slug, releaseId, clientEmail) => {
  const enc = encodeURIComponent(String(slug).trim());
  const response = await api.get(`/api/chat/${enc}/archived-threads`, {
    params: { r: Number(releaseId), clientEmail: resolveClientLinkEmail(clientEmail) },
  });
  return response.data;
};

/** Public: read-only messages for one archived client-link thread. */
export const clientLinkFetchArchivedThreadMessages = async (
  slug,
  releaseId,
  threadId,
  clientEmail,
) => {
  const enc = encodeURIComponent(String(slug).trim());
  const tid = encodeURIComponent(String(threadId).trim());
  const response = await api.get(`/api/chat/${enc}/archived-threads/${tid}/messages`, {
    params: { r: Number(releaseId), clientEmail: resolveClientLinkEmail(clientEmail) },
  });
  return response.data;
};

/** Public: Jira @-mention ticket search for client-link AI chat. */
export const clientLinkFetchJiraTickets = async (slug, clientEmail, params = {}) => {
  const enc = encodeURIComponent(String(slug).trim());
  try {
    const response = await api.get(`/api/chat/${enc}/jira/tickets`, {
      params: {
        clientEmail: String(clientEmail || "").trim(),
        ...params,
      },
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to fetch Jira tickets" };
  }
};

/** Public: revert merged chat (agent-branch git revert + restore launchpad main/tag). */
export const clientLinkRevertMerge = async (slug, releaseId, messageId, clientEmail = "") => {
  const enc = encodeURIComponent(String(slug).trim());
  const response = await api.post(
    `/api/chat/${enc}/revert-merge`,
    {
      r: Number(releaseId),
      m: Number(messageId),
      clientEmail: String(clientEmail || "").trim(),
    },
    { timeout: 2 * 60 * 60 * 1000 },
  );
  return response.data;
};

/** Public: re-fetch tag, rebuild, redeploy live preview (long-running; same timeout as release upload). */
export const clientLinkRefreshLiveBuild = async (
  slug,
  releaseId,
  clientEmail = "",
  { clean = false } = {},
) => {
  const enc = encodeURIComponent(String(slug).trim());
  const response = await api.post(
    `/api/chat/${enc}/refresh-build`,
    {
      r: Number(releaseId),
      clientEmail: String(clientEmail || "").trim(),
      ...(clean ? { clean: true } : {}),
    },
    { timeout: 2 * 60 * 60 * 1000 },
  );
  return response.data;
};

/** Public: whether the server preview workspace is behind launchpad main (e.g. after Preview Desktop). */
export const clientLinkWorkspaceSyncStatus = async (slug, clientEmail = "") => {
  const enc = encodeURIComponent(String(slug).trim());
  const response = await api.get(`/api/chat/${enc}/workspace-sync`, {
    params: { clientEmail: String(clientEmail || "").trim() },
  });
  return response.data;
};

/** Public: git pull main into the preview workspace and restart preview (after desktop advanced the repo). */
export const clientLinkPullWorkspaceFromGit = async (slug, releaseId, clientEmail = "") => {
  const enc = encodeURIComponent(String(slug).trim());
  const response = await api.post(
    `/api/chat/${enc}/pull-workspace`,
    {
      r: Number(releaseId),
      clientEmail: String(clientEmail || "").trim(),
    },
    { timeout: 2 * 60 * 60 * 1000 },
  );
  return response.data;
};

/** Public: hide current chat history and retire the active agent — next message starts a new agent. */
export const clientLinkArchiveChatHistory = async (slug, releaseId, clientEmail = "") => {
  const enc = encodeURIComponent(String(slug).trim());
  const response = await api.post(`/api/chat/${enc}/archive-history`, {
    r: Number(releaseId),
    clientEmail: String(clientEmail || "").trim(),
  });
  return response.data;
};

// Function to upload ZIP to a release
export const uploadToRelease = async (releaseId, file) => {
  try {
    const formData = new FormData();
    formData.append("project", file);
    const response = await api.post(`/api/releases/${releaseId}/upload`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      timeout: 2 * 60 * 60 * 1000, // align with nginx proxy_read_timeout for /api (2h)
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to upload to release" };
  }
};

/**
 * Consume GET …/deployments/:workflowId/stream with Bearer auth (browser EventSource cannot send headers).
 * Resolves when `phase` is `done` or `error`, or the body ends.
 * @param {number|string} projectId
 * @param {string} workflowId
 * @param {{ onEvent?: (evt: { phase: string, message?: string, level?: string }) => void, signal?: AbortSignal }} [handlers]
 * @returns {Promise<{ phase: string, message?: string } | null>}
 */
export async function consumeDeploymentWorkflowStream(projectId, workflowId, handlers = {}) {
  const { onEvent, signal } = handlers;
  const token = localStorage.getItem("token");
  const base = String(API_URL || "").replace(/\/$/, "");
  const url = `${base}/api/projects/${Number(projectId)}/deployments/${encodeURIComponent(String(workflowId))}/stream`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "text/event-stream",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    signal,
  });
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Deployment stream failed (${res.status})`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let last = null;
  try {
    while (true) {
      const { done, value } = await readAbortableSseChunk(reader);
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      for (;;) {
        const sep = buf.indexOf("\n\n");
        if (sep === -1) break;
        const rawEvent = buf.slice(0, sep);
        buf = buf.slice(sep + 2);
        let dataLine = "";
        for (const line of rawEvent.split("\n")) {
          if (line.startsWith("data:")) {
            dataLine = line.slice(5).replace(/^\s/, "");
          }
        }
        if (!dataLine) continue;
        let data;
        try {
          data = JSON.parse(dataLine);
        } catch {
          continue;
        }
        last = data;
        onEvent?.(data);
        if (data.phase === "done" || data.phase === "error") {
          await reader.cancel().catch(() => {});
          return data;
        }
      }
    }
    return last;
  } finally {
    await reader.cancel().catch(() => {});
  }
}

/**
 * Revert commits on platform `main` from a locked baseline tag through HEAD, push,
 * tag a new revision on the active release, deploy, and activate.
 */
/**
 * Seed active release from latest prior release revision (baseline git copy or Cursor agent).
 * @param {number|string} projectId
 * @param {number|string} releaseId
 * @param {{ mode: 'baseline_copy'|'agent', promptText?: string, selectedJiraIssues?: object[] }} body
 */
/**
 * Start a scratch agent that creates the first revision on an empty active release.
 * @param {number|string} projectId
 * @param {number|string} releaseId
 * @param {string} promptText
 */
export const startFirstRevisionFromPrompt = async (projectId, releaseId, promptText) => {
  try {
    const response = await api.post(
      `/api/projects/${projectId}/releases/${releaseId}/first-revision/from-prompt`,
      { promptText },
    );
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        error: "Failed to start the first revision agent",
      }
    );
  }
};

/**
 * Publish a minimal Vite React app as the first revision on an empty release.
 * @param {number|string} projectId
 * @param {number|string} releaseId
 */
export const createEmptyReactRevision = async (projectId, releaseId) => {
  try {
    const response = await api.post(
      `/api/projects/${projectId}/releases/${releaseId}/first-revision/empty-react`,
      {},
      { timeout: 2 * 60 * 60 * 1000 },
    );
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        error: "Failed to create the empty React revision",
      }
    );
  }
};

export const seedReleaseFromPrior = async (projectId, releaseId, body = {}) => {
  try {
    const response = await api.post(
      `/api/projects/${projectId}/releases/${releaseId}/seed-from-prior`,
      body,
      body?.mode === "baseline_copy" ? { timeout: 2 * 60 * 60 * 1000 } : undefined,
    );
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        error: "Failed to seed release from prior revision",
      }
    );
  }
};

export const revertActiveReleaseToBaseline = async (
  projectId,
  activeReleaseId,
  { baselineProjectVersionId, reason },
) => {
  try {
    const response = await api.post(
      `/api/projects/${projectId}/releases/${activeReleaseId}/revert-to-baseline`,
      {
        baselineProjectVersionId: Number(baselineProjectVersionId),
        reason: String(reason || "").trim(),
      },
      { timeout: 2 * 60 * 60 * 1000 },
    );
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        error: "Failed to revert active release to baseline",
      }
    );
  }
};

/**
 * Start Migrate Frontend: Cursor agent on GitHub dev repo; backend copies UI to platform after success.
 * @param {number|string} projectId
 * @param {number|string} releaseId
 * @param {{ projectVersionId?: number, migrateFrontend?: boolean, userPrompt?: string }} [opts]
 * @param {number} [opts.projectVersionId] — optional platform revision to update (moves that revision’s tag); omit to create a new revision.
 * @param {boolean} [opts.migrateFrontend] — must be true (user confirmed checklist).
 * @param {string} [opts.userPrompt] — optional agent instructions; when set, uses Cursor agent path.
 */
export const startMigrateFrontend = async (projectId, releaseId, opts = {}) => {
  try {
    const body = {};
    const pv = opts.projectVersionId;
    if (pv != null && !Number.isNaN(Number(pv)) && Number(pv) > 0) {
      body.projectVersionId = Number(pv);
    }
    if (opts.migrateFrontend === true) {
      body.migrateFrontend = true;
    }
    const prompt = typeof opts.userPrompt === "string" ? opts.userPrompt.trim() : "";
    if (prompt) {
      body.userPrompt = prompt;
    }
    const response = await api.post(
      `/api/projects/${projectId}/releases/${releaseId}/migrate-frontend`,
      body,
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to start Build Frontend App" };
  }
};

/**
 * GET /api/cursor/agents/:id — Cursor Cloud agent payload (status, branch, etc.).
 * Migrate Frontend jobs may include `migrateFrontendPipeline` (phase, headline, detail).
 */
export const fetchCursorAgentById = async (agentId) => {
  try {
    const enc = encodeURIComponent(String(agentId || "").trim());
    const response = await api.get(`/api/cursor/agents/${enc}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to fetch Cursor agent status" };
  }
};

// Function to update a project
export const updateProject = async (projectId, projectData) => {
  try {
    const response = await api.put(`/api/projects/${projectId}`, projectData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to update project" };
  }
};

export const setProjectFavorite = async (projectId, favorite) => {
  try {
    const response = await api.put(`/api/projects/${projectId}/favorite`, { favorite });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to update favorite" };
  }
};

export const fetchProjectPromptConfigOptions = async (projectId) => {
  try {
    const url = projectId
      ? `/api/projects/${projectId}/prompt-config-options`
      : "/api/projects/prompt-config-options";
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to load prompt options" };
  }
};

export const createOnboardingManagedPrompt = async (body) => {
  try {
    const response = await api.post("/api/projects/managed-prompts", body);
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to create prompt" };
  }
};

export const enhanceOnboardingManagedPrompt = async (body) => {
  try {
    const response = await api.post("/api/projects/managed-prompts/enhance", body);
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to enhance prompt" };
  }
};

export const createProjectManagedPrompt = async (projectId, body) => {
  try {
    const response = await api.post(`/api/projects/${projectId}/managed-prompts`, body);
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to create prompt" };
  }
};

export const fetchProjectManagedPromptById = async (projectId, promptId) => {
  try {
    const response = await api.get(`/api/projects/${projectId}/managed-prompts/${promptId}`);
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to fetch prompt" };
  }
};

export const updateProjectManagedPrompt = async (projectId, promptId, body) => {
  try {
    const response = await api.patch(
      `/api/projects/${projectId}/managed-prompts/${promptId}`,
      body,
    );
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to update prompt" };
  }
};

export const previewProjectManagedPrompt = async (projectId, promptId, body) => {
  try {
    const response = await api.post(
      `/api/projects/${projectId}/managed-prompts/${promptId}/preview`,
      body,
    );
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to preview prompt" };
  }
};

export const enhanceProjectManagedPrompt = async (projectId, body) => {
  try {
    const response = await api.post(`/api/projects/${projectId}/managed-prompts/enhance`, body);
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to enhance prompt" };
  }
};

export const fetchProjectPromptConfigSystemBases = async (projectId) => {
  try {
    const response = await api.get(`/api/projects/${projectId}/prompt-config/system-bases`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to load system prompt bases" };
  }
};

export const fetchProjectPromptConfig = async (projectId) => {
  try {
    const response = await api.get(`/api/projects/${projectId}/prompt-config`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to load prompt configuration" };
  }
};

export const updateProjectPromptConfig = async (projectId, payload) => {
  try {
    const response = await api.put(`/api/projects/${projectId}/prompt-config`, payload, {
      headers: hubAccessTokenHeaders(),
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to save prompt configuration" };
  }
};

export const validateProjectConventions = async (projectId) => {
  try {
    const response = await api.get(`/api/projects/${projectId}/conventions/validate`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to validate project conventions" };
  }
};

export const fetchProjectConventions = async (projectId) => {
  try {
    const response = await api.get(`/api/projects/${projectId}/conventions`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to load project conventions" };
  }
};

export const fetchConventionsExample = async () => {
  try {
    const response = await api.get("/api/projects/conventions-example");
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to load conventions example" };
  }
};

/** Preflight backend cloud deploy (template, tools, backend folder). */
export async function preflightBackendCloudDeploy(projectId) {
  try {
    const response = await api.get(`/api/projects/${projectId}/backend-cloud-deploy/preflight`);
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        error: "Could not check cloud deploy readiness",
      }
    );
  }
}

/** Start async backend cloud deploy; returns { runId, status }. */
export async function startBackendCloudDeploy(
  projectId,
  { environmentId, userPrompt, forceFreshAgent } = {},
) {
  try {
    /** @type {Record<string, string | boolean>} */
    const body = {};
    if (environmentId && String(environmentId).trim()) {
      body.environmentId = String(environmentId).trim();
    }
    if (userPrompt && String(userPrompt).trim()) {
      body.userPrompt = String(userPrompt).trim();
    }
    if (forceFreshAgent === true) {
      body.forceFreshAgent = true;
    }
    const response = await api.post(`/api/projects/${projectId}/backend-cloud-deploy`, body);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Could not start cloud deploy" };
  }
}

export async function getProjectCicd(projectId) {
  try {
    const response = await api.get(`/api/projects/${projectId}/cicd`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Could not load CI/CD settings" };
  }
}

export async function enableProjectCicd(projectId) {
  try {
    const response = await api.post(`/api/projects/${projectId}/cicd/enable`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Could not turn on CI/CD" };
  }
}

export async function attachProjectCicd(projectId, provider) {
  try {
    const response = await api.post(`/api/projects/${projectId}/cicd/attach`, { provider });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Could not attach CI/CD" };
  }
}

export async function createProjectCicd(projectId, { provider, branch } = {}) {
  try {
    const response = await api.post(`/api/projects/${projectId}/cicd/create`, { provider, branch });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Could not create CI/CD" };
  }
}

export async function syncProjectCicd(projectId, environmentId) {
  try {
    const response = await api.post(`/api/projects/${projectId}/cicd/sync`, { environmentId });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Could not sync CI/CD secrets" };
  }
}

export async function runProjectCicd(projectId, environmentId) {
  try {
    const response = await api.post(`/api/projects/${projectId}/cicd/run`, { environmentId });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Could not run the pipeline" };
  }
}

export async function disableProjectCicd(projectId) {
  try {
    const response = await api.delete(`/api/projects/${projectId}/cicd`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Could not turn off CI/CD" };
  }
}

/** Recursive file paths for the primary GitHub development repository. */
export async function fetchDevRepoTree(projectId, { ref } = {}) {
  try {
    const response = await api.get(`/api/projects/${projectId}/dev-repo/tree`, {
      params: ref ? { ref } : undefined,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Could not load repository file tree" };
  }
}

/** Read a text file from the primary GitHub development repository. */
export async function fetchDevRepoFile(projectId, filePath, { ref } = {}) {
  try {
    const response = await api.get(`/api/projects/${projectId}/dev-repo/file`, {
      params: {
        path: filePath,
        ...(ref ? { ref } : {}),
      },
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Could not load file" };
  }
}

/** GitHub compare of changed files (agent working branch vs base when available). */
export async function fetchDevRepoChangedFiles(projectId, { head, base } = {}) {
  try {
    const response = await api.get(`/api/projects/${projectId}/dev-repo/changed-files`, {
      params: {
        ...(head ? { head } : {}),
        ...(base ? { base } : {}),
      },
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Could not load changed files" };
  }
}

/** Recent commits on the primary GitHub development repository. */
export async function fetchDevRepoCommits(projectId, { ref, perPage } = {}) {
  try {
    const response = await api.get(`/api/projects/${projectId}/dev-repo/commits`, {
      params: {
        ...(ref ? { ref } : {}),
        ...(perPage != null ? { perPage } : {}),
      },
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Could not load commit history" };
  }
}

/** List this user's parallel backend code chat sessions. */
export async function fetchBackendCodeChatSessions(projectId) {
  try {
    const response = await api.get(`/api/projects/${projectId}/backend-code-chat/sessions`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Could not load chat sessions" };
  }
}

/** Create a new parallel backend code chat (allowed while another is running). */
export async function createBackendCodeChatSession(projectId, body = {}) {
  try {
    const response = await api.post(`/api/projects/${projectId}/backend-code-chat/sessions`, body);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Could not create chat session" };
  }
}

/** Permanently delete one of this user's backend code chat sessions. */
export async function deleteBackendCodeChatSession(projectId, sessionId) {
  try {
    const response = await api.delete(
      `/api/projects/${projectId}/backend-code-chat/sessions/${encodeURIComponent(sessionId)}`,
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Could not delete chat" };
  }
}

/** Load persisted backend code chat for a project. */
export async function fetchBackendCodeChat(projectId, { sessionId } = {}) {
  try {
    const response = await api.get(`/api/projects/${projectId}/backend-code-chat`, {
      params: sessionId ? { sessionId } : undefined,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Could not load backend code chat" };
  }
}

/** Send a backend code chat message (ask or agent mode). */
export async function sendBackendCodeChatMessage(projectId, body) {
  try {
    const response = await api.post(`/api/projects/${projectId}/backend-code-chat/messages`, body);
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        error: "Could not send backend code chat message",
      }
    );
  }
}

/** Execute pending Plan-mode plan as an agent turn. */
export async function buildBackendCodeChatPlan(
  projectId,
  { planMarkdown, sessionId, baseBranch } = {},
) {
  try {
    const response = await api.post(`/api/projects/${projectId}/backend-code-chat/build-plan`, {
      ...(planMarkdown != null ? { planMarkdown } : {}),
      ...(sessionId ? { sessionId } : {}),
      ...(baseBranch ? { baseBranch } : {}),
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Could not build plan" };
  }
}

/** Dismiss pending Plan-mode plan without building. */
export async function clearBackendCodeChatPendingPlan(projectId, { sessionId } = {}) {
  try {
    const response = await api.delete(`/api/projects/${projectId}/backend-code-chat/pending-plan`, {
      params: sessionId ? { sessionId } : undefined,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Could not clear pending plan" };
  }
}

export async function fetchBackendCodeChatQueue(projectId, { sessionId } = {}) {
  try {
    const response = await api.get(`/api/projects/${projectId}/backend-code-chat/queue`, {
      params: sessionId ? { sessionId } : undefined,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Could not load message queue" };
  }
}

export async function reorderBackendCodeChatQueue(
  projectId,
  orderedMessageIds,
  { sessionId } = {},
) {
  try {
    const response = await api.patch(`/api/projects/${projectId}/backend-code-chat/queue/reorder`, {
      orderedMessageIds,
      ...(sessionId ? { sessionId } : {}),
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Could not reorder queue" };
  }
}

export async function cancelBackendCodeChatQueueMessage(projectId, messageId, { sessionId } = {}) {
  try {
    const response = await api.delete(
      `/api/projects/${projectId}/backend-code-chat/queue/${messageId}`,
      { params: sessionId ? { sessionId } : undefined },
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Could not remove queued message" };
  }
}

export async function steerBackendCodeChatQueueMessage(projectId, messageId, { sessionId } = {}) {
  try {
    const response = await api.post(
      `/api/projects/${projectId}/backend-code-chat/queue/${messageId}/steer`,
      sessionId ? { sessionId } : {},
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Could not steer queued message" };
  }
}

/** Stop the in-flight backend code chat Cursor agent. */
export async function stopBackendCodeChat(projectId, { sessionId } = {}) {
  try {
    const response = await api.post(`/api/projects/${projectId}/backend-code-chat/stop`, {
      ...(sessionId ? { sessionId } : {}),
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Could not stop the agent" };
  }
}

/** Archive backend code chat — clears Cursor agent and hides prior messages. */
export async function archiveBackendCodeChat(projectId, { sessionId } = {}) {
  try {
    const response = await api.post(`/api/projects/${projectId}/backend-code-chat/archive`, {
      ...(sessionId ? { sessionId } : {}),
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Could not start a new chat" };
  }
}

/** List older backend code chat threads. */
export async function fetchBackendCodeChatArchivedThreads(projectId, { sessionId } = {}) {
  try {
    const response = await api.get(
      `/api/projects/${projectId}/backend-code-chat/archived-threads`,
      {
        params: sessionId ? { sessionId } : undefined,
      },
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Could not load older chats" };
  }
}

/** Read-only messages for one archived backend code chat thread. */
export async function fetchBackendCodeChatArchivedThreadMessages(
  projectId,
  threadId,
  { sessionId } = {},
) {
  try {
    const tid = encodeURIComponent(String(threadId).trim());
    const response = await api.get(
      `/api/projects/${projectId}/backend-code-chat/archived-threads/${tid}/messages`,
      { params: sessionId ? { sessionId } : undefined },
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Could not load older chat" };
  }
}

/** Recent Client Link agent-mode prompts for project team audit (Preview → App tab). */
export async function fetchClientLinkPromptHistory(projectId, { releaseId, limit } = {}) {
  try {
    const response = await api.get(`/api/projects/${projectId}/client-link-chat/prompt-history`, {
      params: {
        ...(releaseId != null ? { releaseId: Number(releaseId) } : {}),
        ...(limit != null ? { limit } : {}),
      },
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Could not load prompt history" };
  }
}

/**
 * Consume GET /api/projects/:projectId/backend-code-chat/agent-events SSE.
 * @param {number|string} projectId
 * @param {{ onEvent?: (evt: object) => boolean | Promise<boolean>, signal?: AbortSignal, sessionId?: string }} [handlers]
 */
export async function consumeBackendCodeChatAgentStream(projectId, handlers = {}) {
  const { onEvent, signal, sessionId } = handlers;
  const pid = encodeURIComponent(String(projectId).trim());
  const base = String(API_URL || "").replace(/\/$/, "");
  const token = localStorage.getItem("token");
  const qs = sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : "";
  const url = `${base}/api/projects/${pid}/backend-code-chat/agent-events${qs}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "text/event-stream",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    signal,
  });
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Backend code chat stream failed (${res.status})`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  try {
    while (true) {
      const { done, value } = await readAbortableSseChunk(reader);
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      for (;;) {
        const sep = buf.indexOf("\n\n");
        if (sep === -1) break;
        const rawEvent = buf.slice(0, sep);
        buf = buf.slice(sep + 2);
        let dataLine = "";
        for (const line of rawEvent.split("\n")) {
          if (line.startsWith("data:")) {
            dataLine = line.slice(5).replace(/^\s/, "");
          }
        }
        if (!dataLine) continue;
        let data;
        try {
          data = JSON.parse(dataLine);
        } catch {
          continue;
        }
        const stop = await onEvent?.(data);
        if (stop || data.type === "terminal") {
          await reader.cancel().catch(() => {});
          return data;
        }
      }
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  return null;
}

/** Cloud debug chat readiness (prerequisites gate). */
export async function fetchCloudDebugChatReadiness(projectId, environmentId) {
  try {
    const params = environmentId ? { environmentId } : {};
    const response = await api.get(`/api/projects/${projectId}/cloud-debug-chat/readiness`, {
      params,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Could not load debugging readiness" };
  }
}

/** Load persisted cloud debug chat for a project. */
export async function fetchCloudDebugChat(projectId, { sessionId } = {}) {
  try {
    const response = await api.get(`/api/projects/${projectId}/cloud-debug-chat`, {
      params: sessionId ? { sessionId } : undefined,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Could not load cloud debug chat" };
  }
}

/** Create a parallel cloud debug chat session. */
export async function createCloudDebugChatSession(projectId, body = {}) {
  try {
    const response = await api.post(`/api/projects/${projectId}/cloud-debug-chat/sessions`, body);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Could not create chat session" };
  }
}

/** Send a cloud debug chat message (ask mode only). */
export async function sendCloudDebugChatMessage(projectId, body) {
  try {
    const response = await api.post(`/api/projects/${projectId}/cloud-debug-chat/messages`, body);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Could not send debug message" };
  }
}

export async function fetchCloudDebugChatQueue(projectId) {
  try {
    const response = await api.get(`/api/projects/${projectId}/cloud-debug-chat/queue`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Could not load message queue" };
  }
}

export async function reorderCloudDebugChatQueue(projectId, orderedMessageIds) {
  try {
    const response = await api.patch(`/api/projects/${projectId}/cloud-debug-chat/queue/reorder`, {
      orderedMessageIds,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Could not reorder queue" };
  }
}

export async function cancelCloudDebugChatQueueMessage(projectId, messageId) {
  try {
    const response = await api.delete(
      `/api/projects/${projectId}/cloud-debug-chat/queue/${messageId}`,
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Could not remove queued message" };
  }
}

export async function steerCloudDebugChatQueueMessage(projectId, messageId) {
  try {
    const response = await api.post(
      `/api/projects/${projectId}/cloud-debug-chat/queue/${messageId}/steer`,
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Could not steer queued message" };
  }
}

/** Archive cloud debug chat. */
export async function archiveCloudDebugChat(projectId) {
  try {
    const response = await api.post(`/api/projects/${projectId}/cloud-debug-chat/archive`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Could not start a new chat" };
  }
}

/** List older cloud debug chat threads. */
export async function fetchCloudDebugChatArchivedThreads(projectId) {
  try {
    const response = await api.get(`/api/projects/${projectId}/cloud-debug-chat/archived-threads`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Could not load older chats" };
  }
}

/** Read-only messages for one archived cloud debug chat thread. */
export async function fetchCloudDebugChatArchivedThreadMessages(projectId, threadId) {
  try {
    const tid = encodeURIComponent(String(threadId).trim());
    const response = await api.get(
      `/api/projects/${projectId}/cloud-debug-chat/archived-threads/${tid}/messages`,
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Could not load older chat" };
  }
}

/**
 * Consume GET /api/projects/:projectId/cloud-debug-chat/agent-events SSE.
 * @param {number|string} projectId
 * @param {{ onEvent?: (evt: object) => boolean | Promise<boolean>, signal?: AbortSignal }} [handlers]
 */
export async function consumeCloudDebugChatAgentStream(projectId, handlers = {}) {
  const { onEvent, signal } = handlers;
  const pid = encodeURIComponent(String(projectId).trim());
  const base = String(API_URL || "").replace(/\/$/, "");
  const token = localStorage.getItem("token");
  const url = `${base}/api/projects/${pid}/cloud-debug-chat/agent-events`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
      Accept: "text/event-stream",
    },
    signal,
  });
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Cloud debug chat stream failed (${res.status})`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  try {
    while (true) {
      const { done, value } = await readAbortableSseChunk(reader);
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      for (;;) {
        const sep = buf.indexOf("\n\n");
        if (sep === -1) break;
        const rawEvent = buf.slice(0, sep);
        buf = buf.slice(sep + 2);
        let dataLine = "";
        for (const line of rawEvent.split("\n")) {
          if (line.startsWith("data:")) {
            dataLine = line.slice(5).replace(/^\s/, "");
          }
        }
        if (!dataLine) continue;
        let data;
        try {
          data = JSON.parse(dataLine);
        } catch {
          continue;
        }
        const stop = await onEvent?.(data);
        if (stop || data.type === "terminal") {
          await reader.cancel().catch(() => {});
          return data;
        }
      }
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  return null;
}

/** Load persisted infra analysis chat for a project. */
export async function fetchInfraAnalysisChat(projectId, { sessionId } = {}) {
  try {
    const response = await api.get(`/api/projects/${projectId}/infra-analysis-chat`, {
      params: sessionId ? { sessionId } : undefined,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Could not load infra analysis chat" };
  }
}

/** Create a parallel infra analysis chat session. */
export async function createInfraAnalysisChatSession(projectId, body = {}) {
  try {
    const response = await api.post(
      `/api/projects/${projectId}/infra-analysis-chat/sessions`,
      body,
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Could not create chat session" };
  }
}

/** Send an infra analysis chat message (ask or agent mode). */
export async function sendInfraAnalysisChatMessage(projectId, body) {
  try {
    const response = await api.post(
      `/api/projects/${projectId}/infra-analysis-chat/messages`,
      body,
    );
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        error: "Could not send infra analysis chat message",
      }
    );
  }
}

export async function fetchInfraAnalysisChatQueue(projectId) {
  try {
    const response = await api.get(`/api/projects/${projectId}/infra-analysis-chat/queue`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Could not load message queue" };
  }
}

export async function reorderInfraAnalysisChatQueue(projectId, orderedMessageIds) {
  try {
    const response = await api.patch(
      `/api/projects/${projectId}/infra-analysis-chat/queue/reorder`,
      { orderedMessageIds },
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Could not reorder queue" };
  }
}

export async function cancelInfraAnalysisChatQueueMessage(projectId, messageId) {
  try {
    const response = await api.delete(
      `/api/projects/${projectId}/infra-analysis-chat/queue/${messageId}`,
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Could not remove queued message" };
  }
}

export async function steerInfraAnalysisChatQueueMessage(projectId, messageId) {
  try {
    const response = await api.post(
      `/api/projects/${projectId}/infra-analysis-chat/queue/${messageId}/steer`,
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Could not steer queued message" };
  }
}

/** Stop the in-flight infra analysis chat Cursor agent. */
export async function stopInfraAnalysisChat(projectId) {
  try {
    const response = await api.post(`/api/projects/${projectId}/infra-analysis-chat/stop`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Could not stop the agent" };
  }
}

/** Confirm a pending infra analysis change after diagram preview. */
export async function confirmInfraAnalysisChatChange(projectId, messageId) {
  try {
    const response = await api.post(
      `/api/projects/${projectId}/infra-analysis-chat/messages/${messageId}/confirm`,
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Could not confirm change" };
  }
}

/** Reject a pending infra analysis change and revert diagram preview. */
export async function rejectInfraAnalysisChatChange(projectId, messageId) {
  try {
    const response = await api.post(
      `/api/projects/${projectId}/infra-analysis-chat/messages/${messageId}/reject`,
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Could not discard change" };
  }
}

/** Archive infra analysis chat — clears Cursor agent and hides prior messages. */
export async function archiveInfraAnalysisChat(projectId) {
  try {
    const response = await api.post(`/api/projects/${projectId}/infra-analysis-chat/archive`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Could not start a new chat" };
  }
}

/** List older infra analysis chat threads. */
export async function fetchInfraAnalysisChatArchivedThreads(projectId) {
  try {
    const response = await api.get(
      `/api/projects/${projectId}/infra-analysis-chat/archived-threads`,
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Could not load older chats" };
  }
}

/** Read-only messages for one archived infra analysis chat thread. */
export async function fetchInfraAnalysisChatArchivedThreadMessages(projectId, threadId) {
  try {
    const tid = encodeURIComponent(String(threadId).trim());
    const response = await api.get(
      `/api/projects/${projectId}/infra-analysis-chat/archived-threads/${tid}/messages`,
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Could not load older chat" };
  }
}

/**
 * Consume GET /api/projects/:projectId/infra-analysis-chat/agent-events SSE.
 * @param {number|string} projectId
 * @param {{ onEvent?: (evt: object) => boolean | Promise<boolean>, signal?: AbortSignal }} [handlers]
 */
export async function consumeInfraAnalysisChatAgentStream(projectId, handlers = {}) {
  const { onEvent, signal } = handlers;
  const pid = encodeURIComponent(String(projectId).trim());
  const base = String(API_URL || "").replace(/\/$/, "");
  const token = localStorage.getItem("token");
  const url = `${base}/api/projects/${pid}/infra-analysis-chat/agent-events`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "text/event-stream",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    signal,
  });
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Infra analysis chat stream failed (${res.status})`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  try {
    while (true) {
      const { done, value } = await readAbortableSseChunk(reader);
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      for (;;) {
        const sep = buf.indexOf("\n\n");
        if (sep === -1) break;
        const rawEvent = buf.slice(0, sep);
        buf = buf.slice(sep + 2);
        let dataLine = "";
        for (const line of rawEvent.split("\n")) {
          if (line.startsWith("data:")) {
            dataLine = line.slice(5).replace(/^\s/, "");
          }
        }
        if (!dataLine) continue;
        let data;
        try {
          data = JSON.parse(dataLine);
        } catch {
          continue;
        }
        const stop = await onEvent?.(data);
        if (stop || data.type === "terminal") {
          await reader.cancel().catch(() => {});
          return data;
        }
      }
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  return null;
}

/** Understand-Anything graph status for Backend Code tab. */
export async function fetchUnderstandGraphStatus(projectId) {
  try {
    const response = await api.get(`/api/projects/${projectId}/understand/status`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Could not load knowledge graph status" };
  }
}

/** Trigger knowledge graph generation on the dev repo. */
export async function generateUnderstandGraph(projectId, body = {}) {
  try {
    const response = await api.post(`/api/projects/${projectId}/understand/generate`, body);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Could not start graph generation" };
  }
}

/** Sync knowledge graph cache from dev repo. */
export async function syncUnderstandGraph(projectId) {
  try {
    const response = await api.post(`/api/projects/${projectId}/understand/sync`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Could not sync knowledge graph" };
  }
}

/** Knowledge graph JSON for Architecture tab native explorer. */
export async function fetchUnderstandGraph(projectId) {
  try {
    const response = await api.get(`/api/projects/${projectId}/understand/graph`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Could not load knowledge graph" };
  }
}

/** Domain graph JSON for business-flow view (optional). */
export async function fetchUnderstandDomainGraph(projectId) {
  try {
    const response = await api.get(`/api/projects/${projectId}/understand/domain-graph`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Could not load domain graph" };
  }
}

/** Diff overlay node ids for diagram preview highlighting. */
export async function fetchUnderstandDiffOverlay(projectId) {
  try {
    const response = await api.get(`/api/projects/${projectId}/understand/diff-overlay`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Could not load diagram overlay" };
  }
}

/** Source file preview for a graph file path. */
export async function fetchUnderstandFileContent(projectId, filePath) {
  try {
    const response = await api.get(`/api/projects/${projectId}/understand/file-content`, {
      params: { path: filePath },
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Could not load file preview" };
  }
}

/**
 * Consume GET …/understand/stream (SSE).
 * @param {number|string} projectId
 * @param {{ onEvent?: (evt: object) => void, signal?: AbortSignal }} [handlers]
 */
export async function consumeUnderstandGraphStream(projectId, handlers = {}) {
  const { onEvent, signal } = handlers;
  const token = localStorage.getItem("token");
  const base = String(API_URL || "").replace(/\/$/, "");
  const url = `${base}/api/projects/${Number(projectId)}/understand/stream`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "text/event-stream",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    signal,
  });
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Architecture stream failed (${res.status})`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  try {
    while (true) {
      const { done, value } = await readAbortableSseChunk(reader);
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      for (;;) {
        const sep = buf.indexOf("\n\n");
        if (sep === -1) break;
        const rawEvent = buf.slice(0, sep);
        buf = buf.slice(sep + 2);
        let dataLine = "";
        for (const line of rawEvent.split("\n")) {
          if (line.startsWith("data:")) {
            dataLine = line.slice(5).replace(/^\s/, "");
          }
        }
        if (!dataLine) continue;
        let data;
        try {
          data = JSON.parse(dataLine);
        } catch {
          continue;
        }
        if (data.type === "heartbeat") continue;
        onEvent?.(data);
        if (data.type === "terminal") {
          await reader.cancel().catch(() => {});
          return data;
        }
      }
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  return null;
}

/**
 * Coalesce parallel GETs (JourneyShell + status bar + env tab often fire together)
 * and briefly reuse the response so remounts do not triple the network cost.
 */
const deployMapCache = createTtlCache({ ttlMs: 5_000, maxEntries: 50 });

function deployMapCacheKey(projectId) {
  return `deploy-map:${projectId}`;
}

/** Drop cached deploy-map after mutations or when a caller needs a fresh read. */
export function invalidateDeployMapCache(projectId) {
  if (projectId == null || projectId === "") {
    deployMapCache.clear();
    return;
  }
  deployMapCache.invalidate(deployMapCacheKey(projectId));
}

/**
 * Load deploy-map (public view — no secret values).
 * @param {string|number} projectId
 * @param {{ force?: boolean }} [opts] — `force: true` bypasses TTL (e.g. scan polling).
 */
export async function getDeployMap(projectId, opts = {}) {
  const key = deployMapCacheKey(projectId);
  if (opts.force) invalidateDeployMapCache(projectId);
  try {
    return await deployMapCache.getOrSet(key, async () => {
      const response = await api.get(`/api/projects/${projectId}/deploy-map`);
      return response.data;
    });
  } catch (error) {
    throw error.response?.data || { error: "Could not load deploy map" };
  }
}

/** Patch deploy-map (environments and/or non-empty value updates). */
export async function patchDeployMap(projectId, body) {
  try {
    const response = await api.patch(`/api/projects/${projectId}/deploy-map`, body);
    invalidateDeployMapCache(projectId);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Could not update deploy map" };
  }
}

/** Prepare environment (silent auto-resolve + naming). */
export async function prepareDeployMapEnvironment(projectId, body) {
  try {
    const response = await api.post(`/api/projects/${projectId}/deploy-map/prepare`, body);
    invalidateDeployMapCache(projectId);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Could not prepare environment" };
  }
}

/** Export deploy-map values as dotenv text. */
export async function exportDeployMapEnvironment(projectId, params = {}) {
  try {
    const response = await api.get(`/api/projects/${projectId}/deploy-map/export`, { params });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Could not export environment" };
  }
}

/** Cursor ask-mode scan of development repos for environment variables. */
export async function scanProjectEnvironments(projectId, axiosConfig = {}) {
  try {
    const response = await api.post(
      `/api/projects/${projectId}/environment-scan`,
      {},
      {
        timeout: 2 * 60 * 60 * 1000,
        ...axiosConfig,
      },
    );
    invalidateDeployMapCache(projectId);
    return response.data;
  } catch (error) {
    if (error?.code === "ERR_CANCELED" || error?.name === "CanceledError") {
      throw error;
    }
    throw error.response?.data || { error: "Environment scan failed" };
  }
}

/** Install or remove the report issue embed snippet in the development repo. */
export async function setFeedbackSnippetEnabled(projectId, enabled) {
  try {
    const response = await api.post(`/api/projects/${projectId}/feedback-snippet`, { enabled });
    invalidateDeployMapCache(projectId);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Could not update the report issue snippet." };
  }
}

/** Start Cloud Infra multi-repo architecture analysis. */
export async function runProjectInfraAnalysis(projectId, body = {}) {
  try {
    const response = await api.post(`/api/projects/${projectId}/infra-analysis/run`, body);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Could not start analysis" };
  }
}

/** Poll latest infra analysis run (status, phase log, result when complete). */
export async function getLatestProjectInfraAnalysis(projectId) {
  try {
    const response = await api.get(`/api/projects/${projectId}/infra-analysis/latest`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Could not load analysis status" };
  }
}

/** Latest completed infra analysis artifacts. */
export async function getProjectInfraAnalysisResult(projectId) {
  try {
    const response = await api.get(`/api/projects/${projectId}/infra-analysis/result`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Could not load analysis results" };
  }
}

/**
 * Consume GET …/infra-analysis/runs/:runId/stream (SSE).
 * @param {number|string} projectId
 * @param {number|string} runId
 * @param {{ onEvent?: (evt: object) => void, signal?: AbortSignal }} [handlers]
 */
export async function consumeInfraAnalysisStream(projectId, runId, handlers = {}) {
  const { onEvent, signal } = handlers;
  const token = localStorage.getItem("token");
  const base = String(API_URL || "").replace(/\/$/, "");
  const url = `${base}/api/projects/${Number(projectId)}/infra-analysis/runs/${encodeURIComponent(String(runId))}/stream`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "text/event-stream",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    signal,
  });
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Analysis stream failed (${res.status})`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  try {
    while (true) {
      const { done, value } = await readAbortableSseChunk(reader);
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      for (;;) {
        const sep = buf.indexOf("\n\n");
        if (sep === -1) break;
        const rawEvent = buf.slice(0, sep);
        buf = buf.slice(sep + 2);
        let dataLine = "";
        for (const line of rawEvent.split("\n")) {
          if (line.startsWith("data:")) {
            dataLine = line.slice(5).replace(/^\s/, "");
          }
        }
        if (!dataLine) continue;
        let data;
        try {
          data = JSON.parse(dataLine);
        } catch {
          continue;
        }
        if (data.type === "heartbeat") continue;
        onEvent?.(data);
        if (data.type === "terminal") {
          await reader.cancel().catch(() => {});
          return data;
        }
      }
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  return null;
}

/** Poll a backend cloud deploy run. */
export async function getBackendCloudDeployRun(projectId, runId) {
  try {
    const response = await api.get(`/api/projects/${projectId}/backend-cloud-deploy/runs/${runId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Could not load deploy status" };
  }
}

/** Most recent cloud deploy run for a project (resume in-progress deploys). */
export async function getLatestBackendCloudDeployRun(projectId) {
  try {
    const response = await api.get(`/api/projects/${projectId}/backend-cloud-deploy/runs/latest`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Could not load latest deploy" };
  }
}

/**
 * Consume GET …/backend-cloud-deploy/runs/:runId/stream (SSE).
 * @param {number|string} projectId
 * @param {string} runId
 * @param {{ onEvent?: (evt: object) => void, signal?: AbortSignal }} [handlers]
 */
export async function consumeBackendCloudDeployStream(projectId, runId, handlers = {}) {
  const { onEvent, signal } = handlers;
  const token = localStorage.getItem("token");
  const base = String(API_URL || "").replace(/\/$/, "");
  const url = `${base}/api/projects/${Number(projectId)}/backend-cloud-deploy/runs/${encodeURIComponent(String(runId))}/stream`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "text/event-stream",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    signal,
  });
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Deploy stream failed (${res.status})`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  try {
    while (true) {
      const { done, value } = await readAbortableSseChunk(reader);
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      for (;;) {
        const sep = buf.indexOf("\n\n");
        if (sep === -1) break;
        const rawEvent = buf.slice(0, sep);
        buf = buf.slice(sep + 2);
        let dataLine = "";
        for (const line of rawEvent.split("\n")) {
          if (line.startsWith("data:")) {
            dataLine = line.slice(5).replace(/^\s/, "");
          }
        }
        if (!dataLine) continue;
        let data;
        try {
          data = JSON.parse(dataLine);
        } catch {
          continue;
        }
        if (data.type === "heartbeat") continue;
        onEvent?.(data);
        if (data.type === "terminal") {
          await reader.cancel().catch(() => {});
          return data;
        }
      }
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  return null;
}

/**
 * Consume GET …/releases/:releaseId/backend-agent/stream (SSE).
 * @param {number|string} releaseId
 * @param {{ onEvent?: (evt: object) => void, signal?: AbortSignal }} [handlers]
 */
export async function consumeReleaseBackendAgentStream(releaseId, handlers = {}) {
  const { onEvent, signal } = handlers;
  const token = localStorage.getItem("token");
  const base = String(API_URL || "").replace(/\/$/, "");
  const url = `${base}/api/releases/${Number(releaseId)}/backend-agent/stream`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "text/event-stream",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    signal,
  });
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Release lock stream failed (${res.status})`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  try {
    while (true) {
      const { done, value } = await readAbortableSseChunk(reader);
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      for (;;) {
        const sep = buf.indexOf("\n\n");
        if (sep === -1) break;
        const rawEvent = buf.slice(0, sep);
        buf = buf.slice(sep + 2);
        let dataLine = "";
        for (const line of rawEvent.split("\n")) {
          if (line.startsWith("data:")) {
            dataLine = line.slice(5).replace(/^\s/, "");
          }
        }
        if (!dataLine) continue;
        let data;
        try {
          data = JSON.parse(dataLine);
        } catch {
          continue;
        }
        if (data.type === "heartbeat") continue;
        onEvent?.(data);
        if (data.type === "terminal") {
          await reader.cancel().catch(() => {});
          return data;
        }
      }
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  return null;
}

/**
 * Fetch project agent analytics snapshot (admin-only).
 * @param {number|string} projectId
 */
export async function fetchProjectAgentAnalyticsRuns(projectId) {
  const res = await api.get(`/api/projects/${Number(projectId)}/agent-analytics/runs`);
  return res.data;
}

/**
 * Fetch one agent run detail (admin-only).
 * @param {number|string} projectId
 * @param {string} agentId
 */
export async function fetchProjectAgentAnalyticsRunDetail(projectId, agentId) {
  const id = encodeURIComponent(String(agentId ?? "").trim());
  const res = await api.get(`/api/projects/${Number(projectId)}/agent-analytics/runs/${id}`);
  return res.data;
}

/**
 * Consume GET …/projects/:projectId/agent-analytics/runs/:agentId/stream (SSE).
 * @param {number|string} projectId
 * @param {string} agentId
 * @param {{ onEvent?: (evt: object) => void, signal?: AbortSignal }} [handlers]
 */
export async function consumeProjectAgentAnalyticsRunStream(projectId, agentId, handlers = {}) {
  const { onEvent, signal } = handlers;
  const token = localStorage.getItem("token");
  const base = String(API_URL || "").replace(/\/$/, "");
  const id = encodeURIComponent(String(agentId ?? "").trim());
  const url = `${base}/api/projects/${Number(projectId)}/agent-analytics/runs/${id}/stream`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "text/event-stream",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    signal,
  });
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    const err = new Error(text || `Agent run stream failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  await readSseJsonStream(res, { onEvent });
  return null;
}

/**
 * Stop an analytics agent run. Pass `{ clearFollowups: true }` to also cancel the queue.
 * Does not revert git.
 * @param {number|string} projectId
 * @param {string} agentId
 * @param {{ clearFollowups?: boolean }} [opts]
 */
export async function stopProjectAgentAnalyticsRun(projectId, agentId, opts = {}) {
  const id = encodeURIComponent(String(agentId ?? "").trim());
  const res = await api.post(`/api/projects/${Number(projectId)}/agent-analytics/runs/${id}/stop`, {
    clearFollowups: opts.clearFollowups === true,
  });
  return res.data;
}

/**
 * Consume GET …/projects/:projectId/agent-analytics/stream (SSE).
 * @param {number|string} projectId
 * @param {{ onEvent?: (evt: object) => void, signal?: AbortSignal }} [handlers]
 */
export async function consumeProjectAgentAnalyticsStream(projectId, handlers = {}) {
  const { onEvent, signal } = handlers;
  const token = localStorage.getItem("token");
  const base = String(API_URL || "").replace(/\/$/, "");
  const url = `${base}/api/projects/${Number(projectId)}/agent-analytics/stream`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "text/event-stream",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    signal,
  });
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Agent analytics stream failed (${res.status})`);
  }
  await readSseJsonStream(res, { onEvent });
  return null;
}

/**
 * Fetch the paginated project activity timeline.
 * @param {number|string} projectId
 * @param {{ limit?: number, before?: string, actorType?: string, kind?: string, branch?: string, releaseId?: number }} [params]
 */
export async function fetchProjectCollaborationTimeline(projectId, params = {}) {
  const res = await api.get(`/api/projects/${Number(projectId)}/collaboration/timeline`, {
    params,
  });
  return res.data;
}

/**
 * Send a presence heartbeat for the current user viewing a project.
 * @param {number|string} projectId
 * @param {string} [section]
 */
export async function sendProjectPresenceHeartbeat(projectId, section) {
  const res = await api.post(
    `/api/projects/${Number(projectId)}/collaboration/presence/heartbeat`,
    { section: section ?? null },
  );
  return res.data;
}

/** @param {number|string} projectId */
export async function fetchProjectConflicts(projectId) {
  const res = await api.get(`/api/projects/${Number(projectId)}/collaboration/conflicts`);
  return res.data;
}

/** @param {number|string} projectId @param {{ refresh?: boolean }} [opts] */
export async function fetchProjectTeamDigest(projectId, opts = {}) {
  const res = await api.get(`/api/projects/${Number(projectId)}/collaboration/digest`, {
    params: opts.refresh ? { refresh: 1 } : {},
  });
  return res.data;
}

/**
 * Consume GET …/projects/:projectId/collaboration/stream (SSE): activity, presence, conflicts.
 * @param {number|string} projectId
 * @param {{ onEvent?: (evt: object) => void, signal?: AbortSignal }} [handlers]
 */
export async function consumeProjectCollaborationStream(projectId, handlers = {}) {
  const { onEvent, signal } = handlers;
  const token = localStorage.getItem("token");
  const base = String(API_URL || "").replace(/\/$/, "");
  const url = `${base}/api/projects/${Number(projectId)}/collaboration/stream`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "text/event-stream",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    signal,
  });
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Collaboration stream failed (${res.status})`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  try {
    while (true) {
      const { done, value } = await readAbortableSseChunk(reader);
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      for (;;) {
        const sep = buf.indexOf("\n\n");
        if (sep === -1) break;
        const rawEvent = buf.slice(0, sep);
        buf = buf.slice(sep + 2);
        let dataLine = "";
        for (const line of rawEvent.split("\n")) {
          if (line.startsWith("data:")) {
            dataLine = line.slice(5).replace(/^\s/, "");
          }
        }
        if (!dataLine) continue;
        let data;
        try {
          data = JSON.parse(dataLine);
        } catch {
          continue;
        }
        if (data.type === "heartbeat") continue;
        onEvent?.(data);
      }
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  return null;
}

/** @param {number|string} projectId */
export async function fetchProjectBudget(projectId) {
  const res = await api.get(`/api/projects/${Number(projectId)}/budget`);
  return res.data;
}

/** @param {number|string} projectId @param {number} budgetUsd */
export async function patchProjectBudget(projectId, budgetUsd) {
  const res = await api.patch(`/api/projects/${Number(projectId)}/budget`, { budgetUsd });
  return res.data;
}

/** Admin: Client Link voice mode setting ({ enabled, override, platformDefaultEnabled }). */
export async function fetchProjectClientLinkVoice(projectId) {
  const res = await api.get(`/api/projects/${Number(projectId)}/client-link-voice`);
  return res.data;
}

/** Admin: @param {boolean | null} enabled true/false override, null = platform default. */
export async function patchProjectClientLinkVoice(projectId, enabled) {
  const res = await api.patch(`/api/projects/${Number(projectId)}/client-link-voice`, { enabled });
  return res.data;
}

/** GET project memory (preferences + knowledge + settings). */
export async function fetchProjectMemory(projectId) {
  const res = await api.get(`/api/projects/${Number(projectId)}/memory`);
  return res.data;
}

/** PATCH project memory settings (knowledgeEnabled). */
export async function patchProjectMemorySettings(projectId, body) {
  const res = await api.patch(`/api/projects/${Number(projectId)}/memory/settings`, body);
  return res.data;
}

/** POST refresh preferences (sync) + enqueue knowledge Cursor job. */
export async function refreshProjectMemory(projectId) {
  const res = await api.post(`/api/projects/${Number(projectId)}/memory/refresh`);
  return res.data;
}

/** @param {number|string} projectId @param {{ newCreatorEmail: string }} body */
export async function transferProjectCreator(projectId, { newCreatorEmail }) {
  const res = await api.post(`/api/projects/${Number(projectId)}/transfer-creator`, {
    newCreatorEmail,
    confirm: true,
  });
  return res.data;
}

/**
 * Admin: mark stuck active/queued DevRepoGitOperation rows as failed for a project.
 * @param {number|string} projectId
 */
export async function failStuckDevRepoGitOps(projectId) {
  const res = await api.post(`/api/projects/${Number(projectId)}/dev-repo-git-ops/fail-stuck`);
  return res.data;
}

/** GET platform Cursor API keys (admin; masked). */
export async function fetchPlatformCursorApiKeys() {
  const res = await api.get("/api/admin/cursor-api-keys");
  return res.data;
}

/** POST add platform Cursor API key (admin). */
export async function createPlatformCursorApiKey(body) {
  const res = await api.post("/api/admin/cursor-api-keys", body);
  return res.data;
}

/** POST activate platform Cursor API key (admin). */
export async function activatePlatformCursorApiKey(id) {
  const res = await api.post(`/api/admin/cursor-api-keys/${Number(id)}/activate`);
  return res.data;
}

/** DELETE platform Cursor API key (admin). */
export async function deletePlatformCursorApiKey(id) {
  const res = await api.delete(`/api/admin/cursor-api-keys/${Number(id)}`);
  return res.data;
}

/** GET platform model router (admin). */
export async function fetchPlatformModelRouter() {
  const res = await api.get("/api/admin/model-router");
  return res.data;
}

/** GET projects with custom model-router overrides (admin). */
export async function fetchProjectModelRouterOverrides() {
  const res = await api.get("/api/admin/model-router/project-overrides");
  return res.data;
}

/** PATCH platform model router (admin). */
export async function patchPlatformModelRouter(body) {
  const res = await api.patch("/api/admin/model-router", body);
  return res.data;
}

/** GET project model router override + effective (admin). */
export async function fetchProjectModelRouter(projectId) {
  const res = await api.get(`/api/projects/${Number(projectId)}/model-router`);
  return res.data;
}

/** PATCH project model router (admin). */
export async function patchProjectModelRouter(projectId, body) {
  const res = await api.patch(`/api/projects/${Number(projectId)}/model-router`, body);
  return res.data;
}

/** @param {{ search?: string, overBudgetOnly?: boolean }} [params] */
export async function fetchAdminCostAnalytics(params = {}) {
  const res = await api.get("/api/admin/cost-analytics", { params });
  return res.data;
}

/** @param {number|string} projectId @param {{ from?: string, to?: string, limit?: number }} [params] */
export async function fetchAdminProjectCostDetail(projectId, params = {}) {
  const res = await api.get(`/api/admin/cost-analytics/projects/${Number(projectId)}`, { params });
  return res.data;
}

/** @param {number|string} projectId @param {{ from?: string, to?: string }} [params] */
export async function fetchAdminProjectDailySpend(projectId, params = {}) {
  const res = await api.get(`/api/admin/cost-analytics/projects/${Number(projectId)}/daily`, {
    params,
  });
  return res.data;
}

/** @param {{ from?: string, to?: string, granularity?: "day"|"week"|"month" }} [params] */
export async function getAdminPlatformOverview(params = {}) {
  const res = await api.get("/api/admin/platform-analytics/overview", { params });
  return res.data;
}

/** @param {{ from?: string, to?: string, search?: string, role?: string, sort?: string, order?: "asc"|"desc", page?: number, limit?: number }} [params] */
export async function listAdminPlatformUsers(params = {}) {
  const res = await api.get("/api/admin/platform-analytics/users", { params });
  return res.data;
}

/** @param {number|string} userId @param {{ from?: string, to?: string }} [params] */
export async function getAdminPlatformUser(userId, params = {}) {
  const res = await api.get(`/api/admin/platform-analytics/users/${Number(userId)}`, { params });
  return res.data;
}

/** @param {{ from?: string, to?: string, search?: string, status?: string, sort?: string, order?: "asc"|"desc", page?: number, limit?: number }} [params] */
export async function listAdminPlatformProjects(params = {}) {
  const res = await api.get("/api/admin/platform-analytics/projects", { params });
  return res.data;
}

/** @param {{ from?: string, to?: string }} [params] */
export async function getAdminFeatureAdoption(params = {}) {
  const res = await api.get("/api/admin/platform-analytics/feature-adoption", { params });
  return res.data;
}

/** @param {{ cursor?: string, limit?: number, kind?: string, projectId?: number, actorUserId?: number, from?: string, to?: string, order?: "asc"|"desc" }} [params] */
export async function listAdminPlatformActivity(params = {}) {
  const res = await api.get("/api/admin/platform-analytics/activity", { params });
  return res.data;
}

/** @param {number|string} projectId @param {{ signal?: AbortSignal }} [opts] */
export async function fetchProjectQaConfig(projectId, opts = {}) {
  const res = await api.get(`/api/qa-automation/projects/${Number(projectId)}/qa-config`, {
    signal: opts.signal,
  });
  return res.data;
}

/** @param {number|string} projectId @param {object} qaConfigurations */
export async function updateProjectQaConfig(projectId, qaConfigurations) {
  const res = await api.patch(`/api/qa-automation/projects/${Number(projectId)}/qa-config`, {
    qaConfigurations,
  });
  return res.data;
}

/** @param {number|string} projectId @param {{ environmentId: string, personaId: string, urlName?: string }} body */
export async function startQaLiveLoginSession(projectId, body) {
  const res = await api.post(
    `/api/qa-automation/projects/${Number(projectId)}/qa-login-sessions`,
    body,
  );
  return res.data;
}

/**
 * Single-use viewer token for the Link session browser. Connect the WebSocket to the returned
 * `wsPath` (same viewer protocol as QA Chat).
 * @param {number|string} projectId @param {string} loginId @param {"view"|"control"} [mode]
 */
export async function createQaLiveLoginViewerToken(projectId, loginId, mode = "control") {
  const res = await api.post(
    `/api/qa-automation/projects/${Number(projectId)}/qa-login-sessions/${encodeURIComponent(loginId)}/viewer-token`,
    { mode },
  );
  return res.data;
}

/** @param {number|string} projectId @param {string} loginId */
export async function finishQaLiveLoginSession(projectId, loginId) {
  const res = await api.post(
    `/api/qa-automation/projects/${Number(projectId)}/qa-login-sessions/${encodeURIComponent(loginId)}/finish`,
  );
  return res.data;
}

/** @param {number|string} projectId @param {string} loginId */
export async function cancelQaLiveLoginSession(projectId, loginId) {
  const res = await api.post(
    `/api/qa-automation/projects/${Number(projectId)}/qa-login-sessions/${encodeURIComponent(loginId)}/cancel`,
  );
  return res.data;
}

/** @param {number|string} projectId @param {{ environmentId: string, personaId: string }} query */
export async function fetchMcpAuthCaptureLatest(projectId, query) {
  const res = await api.get(
    `/api/qa-automation/projects/${Number(projectId)}/mcp-auth-captures/latest`,
    { params: query },
  );
  return res.data;
}

/** @param {Record<string, unknown>} [params] */
export async function fetchQaAnalyticsDashboard(params = {}) {
  const { signal, ...query } = params;
  const res = await api.get("/api/qa-analytics/dashboard", { params: query, signal });
  return res.data;
}

/** @param {Record<string, unknown>} [params] */
export async function fetchQaAnalyticsTestCases(params = {}) {
  const { signal, ...query } = params;
  const res = await api.get("/api/qa-analytics/test-cases", { params: query, signal });
  return res.data;
}

/** @param {Record<string, unknown>} [params] */
export async function fetchAdminQaAnalyticsPortfolio(params = {}) {
  const { signal, ...query } = params;
  const res = await api.get("/api/admin/qa-analytics", { params: query, signal });
  return res.data;
}

/**
 * Consume GET …/releases/:releaseId/migrate-frontend/stream (SSE).
 * @param {number|string} releaseId
 * @param {{ onEvent?: (evt: object) => void | Promise<void>, onConnected?: (evt: object) => void, signal?: AbortSignal }} [handlers]
 */
export async function consumeMigrateFrontendStream(releaseId, handlers = {}) {
  const { onEvent, onConnected, signal } = handlers;
  const token = localStorage.getItem("token");
  const base = String(API_URL || "").replace(/\/$/, "");
  const url = `${base}/api/releases/${Number(releaseId)}/migrate-frontend/stream`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "text/event-stream",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    signal,
  });
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Build Frontend App stream failed (${res.status})`);
  }
  let didConnect = false;
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  const emit = async (data) => {
    if (data.type === "connected" && !didConnect) {
      didConnect = true;
      onConnected?.(data);
    }
    await onEvent?.(data);
    return isMigrateFrontendStreamStopEvent(data);
  };
  try {
    while (true) {
      const { done, value } = await readAbortableSseChunk(reader);
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const pulled = pullSseJsonEvents(buf);
      buf = pulled.rest;
      for (const data of pulled.events) {
        if (await emit(data)) {
          await reader.cancel().catch(() => {});
          return data;
        }
      }
    }
    if (buf.trim()) {
      const pulled = pullSseJsonEvents(`${buf}\n\n`);
      for (const data of pulled.events) {
        if (await emit(data)) return data;
      }
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  return null;
}

/**
 * Parse Hub /auth/callback response. We store both: idToken for launchpad (has email), accessToken for Hub.
 * Format: { success, data: { accessToken, refreshToken, idToken?, expiresIn, permissions, employeeData } }
 */
function parseHubAuthResponse(body) {
  if (!body || typeof body !== "object") return null;
  const d = body.data != null && typeof body.data === "object" ? body.data : body;
  const idToken = d.idToken ?? d.id_token ?? body.idToken ?? body.id_token;
  const accessToken = d.accessToken ?? d.access_token ?? body.accessToken ?? body.access_token;
  const refreshToken = d.refreshToken ?? d.refresh_token ?? body.refreshToken ?? body.refresh_token;
  const launchpadToken = idToken ?? accessToken ?? d.token ?? body.token;
  if (!launchpadToken) return null;

  const emp = d.employeeData && typeof d.employeeData === "object" ? d.employeeData : null;
  const nameFromEmp =
    emp?.first_name != null || emp?.last_name != null
      ? [emp.first_name, emp.last_name].filter(Boolean).join(" ").trim()
      : null;
  const imageFromEmp =
    emp?.profile_pic ?? emp?.image ?? d.picture ?? d.image ?? body.picture ?? body.image;
  let user = d.user || d.userProfile || d.profile || body.user;
  if (user && typeof user === "string") {
    try {
      user = JSON.parse(user);
    } catch {
      user = null;
    }
  }
  if (!user || typeof user !== "object") {
    user = {
      id: emp?.employee_id ?? d.id ?? body.id ?? "user",
      email: emp?.email ?? d.email ?? body.email ?? "",
      name: nameFromEmp ?? d.name ?? d.username ?? body.name ?? "User",
      image: imageFromEmp ?? user?.image,
      employee_id: emp?.employee_id,
      first_name: emp?.first_name,
      last_name: emp?.last_name,
      account_status: emp?.account_status,
      user_type: emp?.user_type,
    };
  } else if (emp) {
    user = {
      ...user,
      image: imageFromEmp ?? user.image,
      employee_id: emp.employee_id ?? user.employee_id,
      first_name: emp.first_name ?? user.first_name,
      last_name: emp.last_name ?? user.last_name,
      account_status: emp.account_status ?? user.account_status,
      user_type: emp.user_type ?? user.user_type,
      name: nameFromEmp || user.name,
      email: emp.email ?? user.email,
    };
  }
  return {
    token: launchpadToken,
    idToken: idToken || launchpadToken,
    accessToken: accessToken || launchpadToken,
    refreshToken: refreshToken || null,
    expiresIn: d.expiresIn ?? body.expiresIn,
    permissions: d.permissions ?? body.permissions ?? [],
    employeeData: emp || null,
    user,
  };
}

const hubAuthByCode = new Map();

/**
 * Exchange Hub OAuth code for Cognito tokens. Store id token for launchpad (email in payload), access token for Hub.
 */
export async function exchangeHubAuthCode(code, redirectUri) {
  if (hubAuthByCode.has(code)) return hubAuthByCode.get(code);

  const redirect_uri = redirectUri || config.HUB_OAUTH_REDIRECT_URL;
  const promise = (async () => {
    const { data } = await axios.get(`${HUB_API_URL}/api/auth/callback`, {
      params: { code, redirect_uri },
    });
    const parsed = parseHubAuthResponse(data);
    if (!parsed) {
      const err = new Error(data?.message || data?.error || "Unexpected response from Hub");
      throw err;
    }
    const idToken = parsed.idToken || parsed.token;
    const accessToken = parsed.accessToken || parsed.token;
    if (!idToken && !accessToken) throw new Error("No token in callback response");
    const nameFromCallback =
      parsed.user?.name ??
      [parsed.employeeData?.first_name, parsed.employeeData?.last_name]
        .filter(Boolean)
        .join(" ")
        .trim();
    const imageFromCallback =
      parsed.user?.image ?? parsed.employeeData?.profile_pic ?? parsed.user?.image;
    let user = {
      ...parsed.user,
      email: parsed.user?.email ?? parsed.employeeData?.email,
      name: nameFromCallback || parsed.user?.name,
      image: imageFromCallback,
      employee_data: parsed.employeeData ?? undefined,
      permissions: Array.isArray(parsed.permissions) ? parsed.permissions : undefined,
    };
    if (accessToken) localStorage.setItem("access_token", accessToken);
    localStorage.setItem("cognito_refresh_token", parsed.refreshToken || "");

    let launchpadToken = idToken || accessToken;
    const launchpadCandidates = [...new Set([idToken, accessToken].filter(Boolean))];
    if (launchpadCandidates.length) {
      for (const candidate of launchpadCandidates) {
        try {
          localStorage.setItem("token", candidate);
          const meRes = await api.get("/api/auth/me");
          if (meRes.data?.user) {
            user = { ...user, ...meRes.data.user };
            launchpadToken = candidate;
            break;
          }
        } catch {
          // Try next candidate token.
        }
      }
    } else {
      localStorage.setItem("token", launchpadToken);
    }

    localStorage.setItem("token", launchpadToken);
    try {
      const syncPayload = {};
      if (nameFromCallback) syncPayload.name = nameFromCallback;
      if (imageFromCallback) syncPayload.image = imageFromCallback;
      if (Object.keys(syncPayload).length > 0) {
        const syncRes = await api.put("/api/auth/me", syncPayload);
        if (syncRes.data?.user) user = { ...user, ...syncRes.data.user };
      }
    } catch {
      // Token valid; DB user will be linked on first protected request
    }
    const userForStorage = sanitizeUserForStorage(user);
    if (userForStorage) {
      localStorage.setItem("user", JSON.stringify(userForStorage));
      user = userForStorage;
    }
    return {
      token: launchpadToken,
      user,
      employeeData: parsed.employeeData,
    };
  })();

  hubAuthByCode.set(code, promise);
  promise.catch(() => hubAuthByCode.delete(code));
  return promise;
}

// Active release versions
export const activateReleaseVersions = async (projectId, versionId) => {
  try {
    const response = await api.post(`/api/projects/${projectId}/versions/${versionId}/activate`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to activate release version" };
  }
};

// Switch project version (preview) – returns buildUrl for iframe.
// Builds can take many minutes (checkout + npm + vite); avoid axios default hang with no user feedback.
const SWITCH_VERSION_TIMEOUT_MS = 15 * 60 * 1000;

export const switchProjectVersion = async (projectId, versionId, isPermanent = false) => {
  try {
    const response = await api.post(
      `/api/projects/${projectId}/switch`,
      {
        versionId: Number(versionId),
        isPermanent,
      },
      { timeout: SWITCH_VERSION_TIMEOUT_MS },
    );
    return response.data;
  } catch (error) {
    if (error?.code === "ECONNABORTED" || /timeout/i.test(String(error?.message || ""))) {
      throw {
        error:
          "Version preview timed out. The build may still be finishing — wait a minute and try again.",
      };
    }
    throw error.response?.data || { error: "Failed to switch version" };
  }
};

/** GET /api/projects/public/:slug — no auth; id, name, releases/versions for client link. */
export const fetchPublicProjectBySlug = async (slug) => {
  try {
    const enc = encodeURIComponent(String(slug).trim());
    const response = await api.get(`/api/projects/public/${enc}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to load public project" };
  }
};

/** POST /api/projects/public/:slug/preview/ensure — start dev preview on project port (Client Link iframe). */
export const ensurePublicProjectPreview = async (slug, opts = {}) => {
  try {
    const enc = encodeURIComponent(String(slug).trim());
    const response = await api.post(`/api/projects/public/${enc}/preview/ensure`, {
      retry: Boolean(opts.retry),
      forceRestart: Boolean(opts.forceRestart),
      clientEmail: resolveClientLinkEmail(opts.clientEmail),
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to start project preview" };
  }
};

/** GET /api/projects/public/:slug/preview/status — poll install/dev boot progress or failure. */
export const fetchPublicProjectPreviewStatus = async (slug) => {
  try {
    const enc = encodeURIComponent(String(slug).trim());
    const response = await api.get(`/api/projects/public/${enc}/preview/status`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to load preview status" };
  }
};

/** GET /api/projects/public/:slug/client-link-verify — latest post-turn host build check. */
export const fetchPublicClientLinkVerifyStatus = async (slug) => {
  const enc = encodeURIComponent(String(slug).trim());
  const response = await api.get(`/api/projects/public/${enc}/client-link-verify`);
  return response.data;
};

/** POST /api/projects/public/:slug/preview/heartbeat — keep preview alive while Client Link tab is open. */
export const sendPublicProjectPreviewHeartbeat = async (slug) => {
  const enc = encodeURIComponent(String(slug).trim());
  await api.post(`/api/projects/public/${enc}/preview/heartbeat`);
};

/** POST /api/projects/public/:slug/preview/stop — legacy; always-on mode keeps PM2 running. */
export const stopPublicProjectPreview = async (slug, clientEmail = "") => {
  const enc = encodeURIComponent(String(slug).trim());
  const email = resolveClientLinkEmail(clientEmail);
  await api.post(`/api/projects/public/${enc}/preview/stop`, { clientEmail: email });
};

/** GET /api/projects/:projectId/preview/status — operator preview runtime status. */
export const fetchProjectPreviewStatus = async (projectId) => {
  const response = await api.get(`/api/projects/${projectId}/preview/status`);
  return response.data;
};

/** POST /api/projects/:projectId/preview/start — start/keep warm for Client Link. */
export const startProjectPreview = async (projectId) => {
  const response = await api.post(`/api/projects/${projectId}/preview/start`);
  return response.data;
};

/** POST /api/projects/:projectId/preview/stop — operator stop (frees server resources). */
export const stopProjectPreview = async (projectId) => {
  const response = await api.post(`/api/projects/${projectId}/preview/stop`);
  return response.data;
};

/**
 * POST /api/projects/:projectId/preview/share-with-client — keep the preview running for the
 * client share window (24h) instead of the 30-minute idle stop. Returns keepAliveUntil.
 * Optional `emails` upserts recipients into the project stakeholder allowlist.
 * @param {number|string} projectId
 * @param {{ emails?: string[] | string }} [opts]
 */
export const shareProjectPreviewWithClient = async (projectId, { emails } = {}) => {
  const body = {};
  if (emails !== undefined) body.emails = emails;
  const response = await api.post(`/api/projects/${projectId}/preview/share-with-client`, body);
  return response.data;
};

/**
 * POST /api/projects/:projectId/preview/direct-link — signed URL for the preview subdomain
 * (top-level page with the feedback widget). Also runs the share-with-client flow unless
 * `share: false`. Returns `{ url, expiresAt, keepAliveUntil, … }`.
 * @param {number|string} projectId
 * @param {{ share?: boolean, emails?: string[] | string }} [opts]
 */
export const createProjectPreviewDirectLink = async (projectId, { share = true, emails } = {}) => {
  const body = { share };
  if (emails !== undefined) body.emails = emails;
  const response = await api.post(`/api/projects/${projectId}/preview/direct-link`, body);
  return response.data;
};

/** GET /api/projects/:projectId/preview/env — redacted preview env vars (one-way). */
export const fetchProjectPreviewEnv = async (projectId) => {
  const response = await api.get(`/api/projects/${projectId}/preview/env`);
  return response.data;
};

/** PUT /api/projects/:projectId/preview/env — upsert/remove + materialize `.env`. */
export const putProjectPreviewEnv = async (projectId, body) => {
  const response = await api.put(`/api/projects/${projectId}/preview/env`, body);
  return response.data;
};

/** POST /api/projects/public/:slug/preview/restore-live — full page load; back to active/live preview. */
export const restorePublicProjectLivePreview = async (slug) => {
  try {
    const enc = encodeURIComponent(String(slug).trim());
    const response = await api.post(`/api/projects/public/${enc}/preview/restore-live`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to restore live preview" };
  }
};

/**
 * Consume GET /api/projects/public/:slug/preview/logs/stream SSE (preview.log live follow).
 * Resolves when the stream ends or `onEvent` returns true.
 * @param {string} slug
 * @param {{ onEvent?: (evt: object) => boolean | Promise<boolean>, signal?: AbortSignal }} [handlers]
 */
export async function consumePublicPreviewLogsStream(slug, handlers = {}) {
  const { onEvent, signal } = handlers;
  const enc = encodeURIComponent(String(slug || "").trim());
  const base = String(API_URL || "").replace(/\/$/, "");
  const url = `${base}/api/projects/public/${enc}/preview/logs/stream`;
  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "text/event-stream" },
    signal,
  });
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Preview logs stream failed (${res.status})`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  try {
    while (true) {
      const { done, value } = await readAbortableSseChunk(reader);
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      for (;;) {
        const sep = buf.indexOf("\n\n");
        if (sep === -1) break;
        const rawEvent = buf.slice(0, sep);
        buf = buf.slice(sep + 2);
        let dataLine = "";
        for (const line of rawEvent.split("\n")) {
          if (line.startsWith("data:")) {
            dataLine = line.slice(5).replace(/^\s/, "");
          }
        }
        if (!dataLine) continue;
        let data;
        try {
          data = JSON.parse(dataLine);
        } catch {
          continue;
        }
        const stop = await onEvent?.(data);
        if (stop) {
          await reader.cancel().catch(() => {});
          return data;
        }
      }
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  return null;
}

/**
 * Signed Hub profile picture URL. The browser calls LaunchPad, which calls Hub
 * with x-api-key. Hub does not allow that header on cross-origin browser requests.
 */
const HUB_PROFILE_PIC_CACHE_MS = 5 * 60 * 1000;
const hubProfilePicCache = new Map();

export async function fetchHubProfilePicSignedUrl(email) {
  const trimmed = typeof email === "string" ? email.trim() : "";
  if (!trimmed) return null;
  const key = trimmed.toLowerCase();
  const cached = hubProfilePicCache.get(key);
  if (cached && Date.now() - cached.at < HUB_PROFILE_PIC_CACHE_MS) return cached.promise;
  const promise = (async () => {
    try {
      const { data } = await api.get("/api/hub/profile-pic", {
        params: { email: trimmed },
        validateStatus: (s) => s === 200,
      });
      const raw = data?.url;
      if (raw == null || typeof raw !== "string" || !raw.trim()) return null;
      return raw.trim();
    } catch {
      return null;
    }
  })();
  hubProfilePicCache.set(key, { promise, at: Date.now() });
  return promise;
}

// fetch project list from Hub (legacy user-token API — used by Create Project hub select)
export const fetchExternalHubProjects = async () => {
  if (!HUB_API_URL) {
    throw new Error("Hub API URL is not configured");
  }

  try {
    const token = localStorage.getItem("access_token");

    const res = await axios.get(`${HUB_API_URL}/api/projects/external/list`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    return res.data?.data || [];
  } catch (err) {
    throw new Error(err?.response?.data?.message || err?.message || "Failed to fetch projects");
  }
};

/**
 * Set release lifecycle status: draft | active | locked | skip.
 * @param {number|string} releaseId
 * @param {string} status
 * @param {string|{ reason?: string, developmentRepoUrl?: string, developerSubmodulePath?: string, developerAgentRef?: string, skipLockAgentOperations?: boolean, userPrompt?: string }} [reasonOrOptions] — string reason for non-lock transitions; object when locking with optional dev-repo fields
 */
export const updateReleaseStatus = async (releaseId, status, reasonOrOptions = "") => {
  try {
    const body = { status };
    if (typeof reasonOrOptions === "string") {
      body.reason = reasonOrOptions;
    } else if (reasonOrOptions && typeof reasonOrOptions === "object") {
      body.reason = reasonOrOptions.reason ?? "";
      if (
        reasonOrOptions.developmentRepoUrl != null &&
        String(reasonOrOptions.developmentRepoUrl).trim() !== ""
      ) {
        body.developmentRepoUrl = String(reasonOrOptions.developmentRepoUrl).trim();
      }
      if (reasonOrOptions.developerSubmodulePath != null) {
        body.developerSubmodulePath = reasonOrOptions.developerSubmodulePath;
      }
      if (
        reasonOrOptions.developerAgentRef != null &&
        String(reasonOrOptions.developerAgentRef).trim() !== ""
      ) {
        body.developerAgentRef = String(reasonOrOptions.developerAgentRef).trim();
      }
      if (reasonOrOptions.skipLockAgentOperations === true) {
        body.skipLockAgentOperations = true;
      }
      if (reasonOrOptions.userPrompt != null && String(reasonOrOptions.userPrompt).trim() !== "") {
        body.userPrompt = String(reasonOrOptions.userPrompt).trim();
      }
    } else {
      body.reason = "";
    }
    const response = await api.patch(`/api/releases/${releaseId}/status`, body);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to update release status" };
  }
};

export const patchRelease = async (releaseId, payload) => {
  try {
    const response = await api.patch(`/api/releases/${releaseId}`, payload);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to update release" };
  }
};

export const fetchReleaseChangelog = async (releaseId) => {
  try {
    const response = await api.get(`/api/releases/${releaseId}/changelog`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to load release history" };
  }
};

/** Recent Build Frontend App (migrate) runs for a release (newest first). */
export const fetchMigrateFrontendHistory = async (releaseId) => {
  try {
    const response = await api.get(`/api/releases/${releaseId}/migrate-frontend/history`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to load Build Frontend App history" };
  }
};

/** POST — regenerate AI “what to review” summary for client link (requires server OPENAI_API_KEY). */
export const regenerateReleaseReviewSummary = async (releaseId, opts = {}) => {
  try {
    const body = Object.prototype.hasOwnProperty.call(opts, "clientReviewAiGenerationContext")
      ? {
          clientReviewAiGenerationContext: opts.clientReviewAiGenerationContext,
        }
      : {};
    const response = await api.post(`/api/releases/${releaseId}/regenerate-review-summary`, body);
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        error: "Failed to regenerate review summary",
      }
    );
  }
};

function isAbortedAxiosRequest(error) {
  if (!error || typeof error !== "object") return false;
  if (axios.isCancel?.(error)) return true;
  if (error.code === "ERR_CANCELED") return true;
  if (error.name === "CanceledError" || error.name === "AbortError") return true;
  const m = String(error.message ?? "").toLowerCase();
  return m.includes("canceled") || m.includes("cancelled");
}

/** Minimal id + name for job project dropdown. */
export const fetchProjectNamesForDropdown = async () => {
  try {
    return await searchProjects();
  } catch (error) {
    throw error.response?.data || { error: "Failed to fetch projects" };
  }
};

/** GET default branch + branch list for a project's development repository. */
export const fetchProjectDeveloperRepoBranches = async (projectId) => {
  try {
    const response = await api.get(`/api/projects/${projectId}/developer-repo-branches`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to fetch project branches" };
  }
};

/** POST branch probe for automation targets (`git ls-remote --heads ...`). */
export const validateProjectJobBranch = async ({ projectId, branch, repoPath }) => {
  try {
    const response = await api.post("/api/jobs/validate-project-branch", {
      projectId,
      branch,
      ...(repoPath ? { repoPath } : {}),
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to validate branch" };
  }
};

/** Development repos available as automation targets for a project. */
export const fetchProjectAutomationRepos = async (projectId) => {
  try {
    const response = await api.get(`/api/projects/${projectId}/automation-repos`);
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        error: "Failed to fetch automation repositories",
      }
    );
  }
};

/** Discovery workspace documents available for automation output binding. */
export const fetchProjectAutomationDocuments = async (projectId) => {
  try {
    const response = await api.get(`/api/projects/${projectId}/automation-documents`);
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        error: "Failed to fetch automation documents",
      }
    );
  }
};

/** Automations linked to a project (team-visible). */
export const fetchProjectJobs = async (projectId) => {
  try {
    const response = await api.get(`/api/projects/${projectId}/jobs`);
    return response.data?.data ?? [];
  } catch (error) {
    throw error.response?.data || { error: "Failed to fetch project automations" };
  }
};

export const fetchJobs = async () => {
  try {
    const response = await api.get("/api/jobs");
    return response.data?.data ?? [];
  } catch (error) {
    if (isAbortedAxiosRequest(error)) throw error;
    throw error.response?.data || { error: "Failed to fetch jobs" };
  }
};

export const createJob = async (body) => {
  try {
    const hasSkill = body?.hubSkillId != null && String(body.hubSkillId).trim();
    const headers = hasSkill ? hubAccessTokenHeaders() : {};
    const response = await api.post("/api/jobs", body, { headers });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to create job" };
  }
};

export const fetchJobById = async (jobId, requestConfig = {}) => {
  const baseParams =
    typeof requestConfig.params === "object" && requestConfig.params != null
      ? { ...requestConfig.params }
      : {};
  try {
    /** Unique URL so the browser does not reuse a 304 / empty body after Job Details already cached `GET /api/jobs/:id`. */
    const response = await api.get(`/api/jobs/${jobId}`, {
      ...requestConfig,
      params: { ...baseParams, _cb: Date.now() },
    });
    const payload = response.data;
    if (payload == null) return null;
    const job =
      payload && typeof payload === "object" && "data" in payload ? payload.data : payload;
    return job && typeof job === "object" ? job : null;
  } catch (error) {
    if (isAbortedAxiosRequest(error)) {
      throw error;
    }
    if (error?.response?.status === 304) {
      const response = await api.get(`/api/jobs/${jobId}`, {
        ...requestConfig,
        params: { ...baseParams, _cb: Date.now() },
      });
      const payload = response.data;
      if (payload == null) return null;
      const job =
        payload && typeof payload === "object" && "data" in payload ? payload.data : payload;
      return job && typeof job === "object" ? job : null;
    }
    if (error?.response?.data !== undefined) {
      throw error.response.data;
    }
    const msg =
      typeof error?.message === "string" && error.message.trim()
        ? error.message.trim()
        : "Failed to fetch job";
    throw { error: msg };
  }
};

export const updateJob = async (jobId, body) => {
  try {
    const hasSkillInBody =
      Object.prototype.hasOwnProperty.call(body ?? {}, "hubSkillId") &&
      body?.hubSkillId != null &&
      String(body.hubSkillId).trim();
    const headers = hasSkillInBody ? hubAccessTokenHeaders() : {};
    const response = await api.put(`/api/jobs/${jobId}`, body, { headers });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to update job" };
  }
};

export const deleteJob = async (jobId) => {
  try {
    const response = await api.delete(`/api/jobs/${jobId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to delete job" };
  }
};

export const runJobNow = async (jobId) => {
  try {
    const response = await api.post(`/api/jobs/${jobId}/run`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to run job" };
  }
};

export const fetchJobRuns = async (jobId) => {
  try {
    const response = await api.get(`/api/jobs/${jobId}/runs`, {
      params: { _cb: Date.now() },
    });
    return response.data?.data ?? [];
  } catch (error) {
    if (isAbortedAxiosRequest(error)) throw error;
    if (error?.response?.status === 304) {
      const retry = await api.get(
        `/api/jobs/${jobId}/runs?_=${encodeURIComponent(String(Date.now()))}`,
      );
      return retry.data?.data ?? [];
    }
    throw error.response?.data || { error: "Failed to fetch job runs" };
  }
};

export const deleteJobRun = async (jobId, runId) => {
  try {
    const response = await api.delete(`/api/jobs/${jobId}/runs/${runId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to delete run log" };
  }
};

/** @param {{ page?: number, limit?: number, search?: string, category?: string, isActive?: string }} [params] */
export const fetchManagedPrompts = async (params = {}) => {
  try {
    const response = await api.get("/api/managed-prompts", { params });
    return response.data?.data ?? { items: [], total: 0, page: 1, limit: 25 };
  } catch (error) {
    throw error.response?.data || { error: "Failed to fetch prompts" };
  }
};

/** @param {{ page?: number, limit?: number }} [params] */
export const fetchAppDeployments = async (params = {}) => {
  try {
    const response = await api.get("/api/app-deployments", { params });
    return response.data?.data ?? { items: [], total: 0, page: 1, limit: 25 };
  } catch (error) {
    throw error.response?.data || { error: "Failed to fetch deployments" };
  }
};

export const fetchPlatformDeployMode = async () => {
  try {
    const response = await api.get("/api/admin/platform-deploy-mode");
    return response.data?.data ?? { status: "normal", canResume: false, readinessBlockers: [] };
  } catch (error) {
    throw error.response?.data || { error: "Failed to load deploy mode" };
  }
};

export const preparePlatformDeployMode = async () => {
  try {
    const response = await api.post("/api/admin/platform-deploy-mode/prepare");
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to prepare platform for deploy" };
  }
};

export const resumePlatformDeployMode = async () => {
  try {
    const response = await api.post("/api/admin/platform-deploy-mode/resume");
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to resume platform" };
  }
};

export const cancelPlatformDeployMode = async () => {
  try {
    const response = await api.post("/api/admin/platform-deploy-mode/cancel");
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to cancel prepare mode" };
  }
};

/**
 * Consume GET /api/admin/platform-deploy-mode/stream (SSE).
 * @param {{ onEvent?: (evt: object) => void, signal?: AbortSignal }} [handlers]
 */
export async function consumePlatformDeployModeStream(handlers = {}) {
  const { onEvent, signal } = handlers;
  const token = localStorage.getItem("token");
  const base = String(API_URL || "").replace(/\/$/, "");
  const url = `${base}/api/admin/platform-deploy-mode/stream`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "text/event-stream",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    signal,
  });
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Deploy mode stream failed (${res.status})`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  try {
    while (true) {
      const { done, value } = await readAbortableSseChunk(reader);
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      for (;;) {
        const sep = buf.indexOf("\n\n");
        if (sep === -1) break;
        const rawEvent = buf.slice(0, sep);
        buf = buf.slice(sep + 2);
        let dataLine = "";
        for (const line of rawEvent.split("\n")) {
          if (line.startsWith("data:")) {
            dataLine = line.slice(5).replace(/^\s/, "");
          }
        }
        if (!dataLine) continue;
        let data;
        try {
          data = JSON.parse(dataLine);
        } catch {
          continue;
        }
        if (data.type === "heartbeat") continue;
        onEvent?.(data);
      }
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  return null;
}

export const fetchManagedPromptById = async (id) => {
  try {
    const response = await api.get(`/api/managed-prompts/${id}`);
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to fetch prompt" };
  }
};

export const createManagedPrompt = async (body) => {
  try {
    const response = await api.post("/api/managed-prompts", body);
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to create prompt" };
  }
};

export const updateManagedPrompt = async (id, body) => {
  try {
    const response = await api.patch(`/api/managed-prompts/${id}`, body);
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to update prompt" };
  }
};

export const deleteManagedPrompt = async (id) => {
  try {
    await api.delete(`/api/managed-prompts/${id}`);
  } catch (error) {
    throw error.response?.data || { error: "Failed to delete prompt" };
  }
};

export const duplicateManagedPrompt = async (id, body = {}) => {
  try {
    const response = await api.post(`/api/managed-prompts/${id}/duplicate`, body);
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to duplicate prompt" };
  }
};

export const previewManagedPrompt = async (id, body = {}) => {
  try {
    const response = await api.post(`/api/managed-prompts/${id}/preview`, body);
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to preview prompt" };
  }
};

export const enhanceManagedPrompt = async ({ prompt }) => {
  try {
    const response = await api.post("/api/managed-prompts/enhance", { prompt });
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to enhance prompt" };
  }
};

// ——— Discovery / Client Info ———

export const fetchClientDetails = async (projectId) => {
  try {
    const response = await api.get(`/api/projects/${projectId}/discovery/client-details`);
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to load client details" };
  }
};

export const patchClientDetails = async (projectId, body) => {
  try {
    const response = await api.patch(`/api/projects/${projectId}/discovery/client-details`, body);
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to save client details" };
  }
};

export const scrapeClientDetails = async (projectId, body) => {
  try {
    const response = await api.post(
      `/api/projects/${projectId}/discovery/client-details/scrape`,
      body,
    );
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to scrape client details" };
  }
};

export const enrichClientDetails = async (projectId, body) => {
  try {
    const response = await api.post(
      `/api/projects/${projectId}/discovery/client-details/enrich`,
      body,
    );
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to enrich client details" };
  }
};

export const clientSocialScrape = async (projectId, body) => {
  try {
    const response = await api.post(
      `/api/projects/${projectId}/discovery/personas/client/social-scrape`,
      body,
    );
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to generate from socials" };
  }
};

export const addTimelineNote = async (projectId, body) => {
  try {
    const response = await api.post(`/api/projects/${projectId}/discovery/timeline/note`, body);
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to save note" };
  }
};

export const patchEngagementPhase = async (projectId, body) => {
  try {
    const response = await api.patch(`/api/projects/${projectId}/discovery/engagement-phase`, body);
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to update engagement phase" };
  }
};

export const fetchWorkspaceDocuments = async (projectId) => {
  try {
    const response = await api.get(`/api/projects/${projectId}/discovery/workspace-documents`);
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to load documents" };
  }
};

export const createWorkspaceDocument = async (projectId, body) => {
  try {
    const response = await api.post(
      `/api/projects/${projectId}/discovery/workspace-documents`,
      body,
    );
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to create document" };
  }
};

export const patchWorkspaceDocument = async (projectId, docId, body) => {
  try {
    const response = await api.patch(
      `/api/projects/${projectId}/discovery/workspace-documents/${encodeURIComponent(docId)}`,
      body,
    );
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to save document" };
  }
};

export const deleteWorkspaceDocument = async (projectId, docId) => {
  try {
    const response = await api.delete(
      `/api/projects/${projectId}/discovery/workspace-documents/${encodeURIComponent(docId)}`,
    );
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to delete document" };
  }
};

export const generateWorkspaceDocument = async (projectId) => {
  try {
    const response = await api.post(
      `/api/projects/${projectId}/discovery/workspace-documents/generate`,
    );
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to generate document" };
  }
};

export const generateWorkspaceDocumentFromSelection = async (projectId, docId, body) => {
  try {
    const response = await api.post(
      `/api/projects/${projectId}/discovery/workspace-documents/${encodeURIComponent(docId)}/generate-from-selection`,
      body,
    );
    return response.data?.data;
  } catch (error) {
    throw (
      error.response?.data || {
        error: "Failed to create document from selection",
      }
    );
  }
};

export const regenerateWorkspaceDocument = async (projectId, docId, body) => {
  try {
    const response = await api.post(
      `/api/projects/${projectId}/discovery/workspace-documents/${encodeURIComponent(docId)}/regenerate`,
      body ?? {},
      { headers: hubAccessTokenHeaders() },
    );
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to regenerate document" };
  }
};

export const chatWorkspaceDocument = async (projectId, docId, body) => {
  try {
    const response = await api.post(
      `/api/projects/${projectId}/discovery/workspace-documents/${encodeURIComponent(docId)}/chat`,
      body,
    );
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to run AI on document" };
  }
};

export const rewriteCaptureImport = async (projectId, docId, body) => {
  try {
    const response = await api.post(
      `/api/projects/${projectId}/discovery/workspace-documents/${encodeURIComponent(docId)}/rewrite-capture-import`,
      body,
    );
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to rewrite capture" };
  }
};

export const fetchWorkspaceDocumentRevisions = async (projectId, docId) => {
  try {
    const response = await api.get(
      `/api/projects/${projectId}/discovery/workspace-documents/${encodeURIComponent(docId)}/revisions`,
    );
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to load revisions" };
  }
};

export const createWorkspaceDocumentRevision = async (projectId, docId, body) => {
  try {
    const response = await api.post(
      `/api/projects/${projectId}/discovery/workspace-documents/${encodeURIComponent(docId)}/revisions`,
      body,
    );
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to save version" };
  }
};

export const fetchWorkspaceDocumentRevision = async (projectId, docId, revisionId) => {
  try {
    const response = await api.get(
      `/api/projects/${projectId}/discovery/workspace-documents/${encodeURIComponent(docId)}/revisions/${encodeURIComponent(revisionId)}`,
    );
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to load version" };
  }
};

export const restoreWorkspaceDocumentRevision = async (projectId, docId, revisionId) => {
  try {
    const response = await api.post(
      `/api/projects/${projectId}/discovery/workspace-documents/${encodeURIComponent(docId)}/revisions/${encodeURIComponent(revisionId)}/restore`,
    );
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to restore revision" };
  }
};

export const createWorkspaceDocumentJiraIssue = async (projectId, docId, body) => {
  try {
    const response = await api.post(
      `/api/projects/${projectId}/discovery/workspace-documents/${encodeURIComponent(docId)}/jira/create`,
      body,
    );
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to create Jira issue" };
  }
};

export const linkWorkspaceDocumentJiraIssue = async (projectId, docId, body) => {
  try {
    const response = await api.patch(
      `/api/projects/${projectId}/discovery/workspace-documents/${encodeURIComponent(docId)}/jira/link`,
      body,
    );
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to link Jira issue" };
  }
};

export const listConfluenceSpaces = async (projectId) => {
  try {
    const response = await api.get(`/api/projects/${projectId}/discovery/confluence/spaces`, {
      _skipJwtRefresh: true,
    });
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to load Confluence spaces" };
  }
};

export const exportWorkspaceDocument = async (projectId, docId, body) => {
  try {
    const response = await api.post(
      `/api/projects/${projectId}/discovery/workspace-documents/${encodeURIComponent(docId)}/export`,
      body,
    );
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to export document" };
  }
};

export const fetchKickoffPresentations = async (projectId) => {
  try {
    const response = await api.get(`/api/projects/${projectId}/discovery/kickoff-presentations`);
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to load presentations" };
  }
};

export const fetchKickoffPresentation = async (projectId, presentationId) => {
  try {
    const response = await api.get(
      `/api/projects/${projectId}/discovery/kickoff-presentations/${encodeURIComponent(presentationId)}`,
    );
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to load presentation" };
  }
};

export const generateKickoffPresentation = async (projectId, body) => {
  try {
    const response = await api.post(
      `/api/projects/${projectId}/discovery/kickoff-presentations/generate`,
      body,
      { headers: hubAccessTokenHeaders(), timeout: 120000 },
    );
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to generate presentation" };
  }
};

export const patchKickoffPresentation = async (projectId, presentationId, body) => {
  try {
    const response = await api.patch(
      `/api/projects/${projectId}/discovery/kickoff-presentations/${encodeURIComponent(presentationId)}`,
      body,
    );
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to save presentation" };
  }
};

export const regenerateKickoffPresentation = async (projectId, presentationId) => {
  try {
    const response = await api.post(
      `/api/projects/${projectId}/discovery/kickoff-presentations/${encodeURIComponent(presentationId)}/regenerate`,
      {},
      { headers: hubAccessTokenHeaders(), timeout: 120000 },
    );
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to regenerate presentation" };
  }
};

export const fetchKickoffPresentationRevisions = async (projectId, presentationId) => {
  try {
    const response = await api.get(
      `/api/projects/${projectId}/discovery/kickoff-presentations/${encodeURIComponent(presentationId)}/revisions`,
    );
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to load revisions" };
  }
};

export const createKickoffPresentationRevision = async (projectId, presentationId, body) => {
  try {
    const response = await api.post(
      `/api/projects/${projectId}/discovery/kickoff-presentations/${encodeURIComponent(presentationId)}/revisions`,
      body,
    );
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to save version" };
  }
};

export const restoreKickoffPresentationRevision = async (projectId, presentationId, revisionId) => {
  try {
    const response = await api.post(
      `/api/projects/${projectId}/discovery/kickoff-presentations/${encodeURIComponent(presentationId)}/revisions/${encodeURIComponent(revisionId)}/restore`,
    );
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to restore version" };
  }
};

export const exportKickoffPresentation = async (projectId, presentationId, body) => {
  try {
    const response = await api.post(
      `/api/projects/${projectId}/discovery/kickoff-presentations/${encodeURIComponent(presentationId)}/export`,
      body,
    );
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to export presentation" };
  }
};

export const generateProductPersonaFromWebsite = async (projectId) => {
  try {
    const response = await api.post(
      `/api/projects/${projectId}/discovery/personas/product/draft-from-website`,
    );
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to draft product persona" };
  }
};

export const refreshPersonaSmartFields = async (projectId, personaType) => {
  try {
    const response = await api.post(
      `/api/projects/${projectId}/discovery/personas/${encodeURIComponent(personaType)}/smart-fields/refresh`,
    );
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to refresh smart fields" };
  }
};

export const uploadDiscoveryDocument = async (projectId, file) => {
  try {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post(
      `/api/projects/${projectId}/discovery/documents/upload`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    );
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to upload document" };
  }
};

export const ingestDiscoveryHubMeetings = async (projectId, meetings) => {
  try {
    const response = await api.post(
      `/api/projects/${projectId}/discovery/documents/ingest-hub-meetings`,
      { meetings },
    );
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to ingest Hub meetings" };
  }
};

export const deleteDiscoveryDocument = async (projectId, docId) => {
  try {
    const response = await api.delete(
      `/api/projects/${projectId}/discovery/documents/${encodeURIComponent(docId)}`,
    );
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to delete document" };
  }
};

export const transcribeDiscoveryAudio = async (
  projectId,
  audioBlob,
  applyToContext = false,
  filename = "recording.webm",
) => {
  try {
    const formData = new FormData();
    formData.append("audio", audioBlob, filename);
    if (applyToContext) formData.append("applyToContext", "true");
    const response = await api.post(`/api/projects/${projectId}/discovery/transcribe`, formData);
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to transcribe audio" };
  }
};

export const refreshCompetitorResearch = async (projectId) => {
  try {
    const response = await api.post(`/api/projects/${projectId}/discovery/competitors/refresh`);
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to refresh competitor research" };
  }
};

export const addCompetitorFromWebsite = async (projectId, body) => {
  try {
    const response = await api.post(
      `/api/projects/${projectId}/discovery/competitors/from-website`,
      body,
    );
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to add competitor from website" };
  }
};

export const detectExistingSaasProducts = async (projectId) => {
  try {
    const response = await api.post(
      `/api/projects/${projectId}/discovery/personas/product/detect-existing`,
    );
    return response.data?.data;
  } catch (error) {
    throw (
      error.response?.data || {
        error: "Failed to detect existing SaaS products",
      }
    );
  }
};

export const addExistingSaasProductFromWebsite = async (projectId, body) => {
  try {
    const response = await api.post(
      `/api/projects/${projectId}/discovery/personas/product/existing/from-website`,
      body,
    );
    return response.data?.data;
  } catch (error) {
    throw (
      error.response?.data || {
        error: "Failed to add existing SaaS product from website",
      }
    );
  }
};

export const refreshExistingSaasProducts = async (projectId, body = {}) => {
  try {
    const response = await api.post(
      `/api/projects/${projectId}/discovery/personas/product/existing/refresh`,
      body,
    );
    return response.data?.data;
  } catch (error) {
    throw (
      error.response?.data || {
        error: "Failed to refresh existing SaaS products",
      }
    );
  }
};

export const generatePersonaInsights = async (projectId) => {
  try {
    const response = await api.post(
      `/api/projects/${projectId}/discovery/persona/generate-insights`,
    );
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to generate persona insights" };
  }
};

export const postDiscoveryChat = async (projectId, body) => {
  try {
    const response = await api.post(`/api/projects/${projectId}/discovery/chat`, body);
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to send chat message" };
  }
};

export const postProjectRagSearch = async (projectId, body) => {
  try {
    const response = await api.post(`/api/projects/${projectId}/rag/search`, body);
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to search project knowledge" };
  }
};

export const getProjectRagStatus = async (projectId) => {
  try {
    const response = await api.get(`/api/projects/${projectId}/rag/status`);
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to load RAG status" };
  }
};

export const postProjectRagBackfill = async (projectId) => {
  try {
    const response = await api.post(`/api/projects/${projectId}/rag/backfill`);
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to queue RAG backfill" };
  }
};

export const generateDiscoverySummary = async (projectId) => {
  try {
    const response = await api.post(`/api/projects/${projectId}/discovery/summary/generate`);
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to generate summary" };
  }
};

export const patchDiscoverySummary = async (projectId, body) => {
  try {
    const response = await api.patch(`/api/projects/${projectId}/discovery/summary`, body);
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to save summary" };
  }
};

export const generateDiscoveryQuestions = async (projectId) => {
  try {
    const response = await api.post(`/api/projects/${projectId}/discovery/questions/generate`);
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to generate questions" };
  }
};

export const patchDiscoveryQuestions = async (projectId, body) => {
  try {
    const response = await api.patch(`/api/projects/${projectId}/discovery/questions`, body);
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to save questions" };
  }
};

export const generateQuestionnaireSummary = async (projectId, questionnaireId) => {
  try {
    const response = await api.post(
      `/api/projects/${projectId}/discovery/questionnaires/${encodeURIComponent(questionnaireId)}/summary/generate`,
    );
    return response.data?.data;
  } catch (error) {
    throw (
      error.response?.data || {
        error: "Failed to generate questionnaire summary",
      }
    );
  }
};

export const syncPrdFromDiscovery = async (projectId) => {
  try {
    const response = await api.post(`/api/projects/${projectId}/prd/sync-discovery`);
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to sync PRD from discovery" };
  }
};

export const publishQuestionnaire = async (projectId, questionnaireId) => {
  try {
    const response = await api.post(
      `/api/projects/${projectId}/discovery/questionnaires/${encodeURIComponent(questionnaireId)}/publish`,
    );
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to publish questionnaire" };
  }
};

export const unpublishQuestionnaire = async (projectId, questionnaireId) => {
  try {
    const response = await api.post(
      `/api/projects/${projectId}/discovery/questionnaires/${encodeURIComponent(questionnaireId)}/unpublish`,
    );
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to unpublish questionnaire" };
  }
};

export const captureQuestionnaire = async (projectId, questionnaireId) => {
  try {
    const response = await api.post(
      `/api/projects/${projectId}/discovery/questionnaires/${encodeURIComponent(questionnaireId)}/capture`,
    );
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to capture questionnaire" };
  }
};

/** @deprecated */
export const publishDiscovery = async (projectId, questionnaireId) => {
  if (questionnaireId) return publishQuestionnaire(projectId, questionnaireId);
  try {
    const response = await api.post(`/api/projects/${projectId}/discovery/publish`);
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to publish questionnaire" };
  }
};

/** @deprecated */
export const unpublishDiscovery = async (projectId, questionnaireId) => {
  if (questionnaireId) return unpublishQuestionnaire(projectId, questionnaireId);
  try {
    const response = await api.post(`/api/projects/${projectId}/discovery/unpublish`);
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to unpublish questionnaire" };
  }
};

export const patchDiscoveryStakeholders = async (projectId, body) => {
  try {
    const response = await api.patch(`/api/projects/${projectId}/discovery/stakeholders`, body);
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to save stakeholders" };
  }
};

export const resendDiscoveryStakeholderLink = async (projectId, email, questionnaireId) => {
  try {
    const response = await api.post(
      `/api/projects/${projectId}/discovery/stakeholders/${encodeURIComponent(email)}/resend`,
      questionnaireId ? { questionnaireId } : {},
    );
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to resend link" };
  }
};

export const fetchDiscoveryThreadStatus = async (projectId, questionnaireId) => {
  try {
    const qs = questionnaireId ? `?questionnaireId=${encodeURIComponent(questionnaireId)}` : "";
    const response = await api.get(`/api/projects/${projectId}/discovery/thread-status${qs}`);
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to load thread status" };
  }
};

export const fetchPublicDiscovery = async (publicPath, { email } = {}) => {
  try {
    const path = String(publicPath || "").replace(/^\/+/, "");
    const response = await api.get(`/api/discovery/public/${encodeURIComponent(path)}`, {
      params: email ? { email: String(email).trim().toLowerCase() } : undefined,
    });
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to load questionnaire" };
  }
};

export const respondPublicDiscovery = async (publicPath, body) => {
  try {
    const path = String(publicPath || "").replace(/^\/+/, "");
    const response = await api.post(
      `/api/discovery/public/${encodeURIComponent(path)}/respond`,
      body,
    );
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to send response" };
  }
};

export const editPublicDiscoveryResponse = async (publicPath, responseId, body) => {
  try {
    const path = String(publicPath || "").replace(/^\/+/, "");
    const response = await api.patch(
      `/api/discovery/public/${encodeURIComponent(path)}/responses/${encodeURIComponent(responseId)}`,
      body,
    );
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to update response" };
  }
};

export const suggestPublicDiscoveryAnswer = async (publicPath, body) => {
  try {
    const path = String(publicPath || "").replace(/^\/+/, "");
    const response = await api.post(
      `/api/discovery/public/${encodeURIComponent(path)}/suggest`,
      body,
    );
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to generate suggestion" };
  }
};

export const postPublicDiscoveryChat = async (publicPath, body) => {
  try {
    const path = String(publicPath || "").replace(/^\/+/, "");
    const response = await api.post(`/api/discovery/public/${encodeURIComponent(path)}/chat`, body);
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to send chat message" };
  }
};

export const transcribePublicDiscoveryAudio = async (
  publicPath,
  email,
  blob,
  filename = "recording.webm",
) => {
  try {
    const path = String(publicPath || "").replace(/^\/+/, "");
    const formData = new FormData();
    formData.append("audio", blob, filename);
    formData.append("email", email);
    const response = await api.post(
      `/api/discovery/public/${encodeURIComponent(path)}/transcribe`,
      formData,
    );
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to transcribe audio" };
  }
};

export const uploadPublicDiscoveryFile = async (publicPath, { email, questionId, file, note }) => {
  try {
    const path = String(publicPath || "").replace(/^\/+/, "");
    const formData = new FormData();
    formData.append("file", file, file?.name || "upload");
    formData.append("email", email);
    formData.append("questionId", questionId);
    if (note) formData.append("note", note);
    const response = await api.post(
      `/api/discovery/public/${encodeURIComponent(path)}/upload`,
      formData,
    );
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to upload file" };
  }
};

export const undoDiscoveryDocumentFill = async (projectId, docId) => {
  try {
    const response = await api.post(
      `/api/projects/${projectId}/discovery/documents/${docId}/undo-fill`,
    );
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to undo auto-fill" };
  }
};

export const fetchPrd = async (projectId) => {
  try {
    const response = await api.get(`/api/projects/${projectId}/prd`);
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to load PRD" };
  }
};

export const putPrd = async (projectId, body) => {
  try {
    const response = await api.put(`/api/projects/${projectId}/prd`, body);
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to save PRD" };
  }
};

export const generatePrd = async (projectId, body = {}) => {
  try {
    const response = await api.post(`/api/projects/${projectId}/prd/generate`, body);
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to generate PRD" };
  }
};

export const postPrdChat = async (projectId, body) => {
  try {
    const response = await api.post(`/api/projects/${projectId}/prd/chat`, body);
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to send PRD chat" };
  }
};

export const regeneratePrd = async (projectId, body) => {
  try {
    const response = await api.post(`/api/projects/${projectId}/prd/regenerate`, body);
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to regenerate PRD" };
  }
};

export const fetchGranolaNotes = async (projectId, params = {}) => {
  try {
    const response = await api.get(
      `/api/projects/${projectId}/discovery/integrations/granola/notes`,
      { params },
    );
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to load Granola meetings" };
  }
};

export const ingestGranolaNote = async (projectId, body) => {
  try {
    const response = await api.post(
      `/api/projects/${projectId}/discovery/integrations/granola/ingest`,
      body,
    );
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to import Granola meeting" };
  }
};

export const ingestConfluencePage = async (projectId, body) => {
  try {
    const response = await api.post(
      `/api/projects/${projectId}/discovery/integrations/confluence/ingest`,
      body,
    );
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to import Confluence page" };
  }
};

export const resolveDiscoveryCaptureContext = async (projectId, body) => {
  try {
    const response = await api.post(
      `/api/projects/${projectId}/discovery/capture/resolve-context`,
      body,
    );
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to resolve capture context" };
  }
};

export const fetchPrdRevisions = async (projectId) => {
  try {
    const response = await api.get(`/api/projects/${projectId}/prd/revisions`);
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to load revisions" };
  }
};

export const restorePrdRevision = async (projectId, revisionId) => {
  try {
    const response = await api.post(
      `/api/projects/${projectId}/prd/revisions/${revisionId}/restore`,
    );
    return response.data?.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to restore revision" };
  }
};

/** Queue a full-page preview PNG for the LaunchPad Figma plugin. */
export const uploadPreviewScreen = async (
  projectId,
  blob,
  { name, route, viewport, width, releaseId, batchId, batchSize } = {},
) => {
  const form = new FormData();
  form.append("image", blob, "screen.png");
  if (name) form.append("name", name);
  if (route) form.append("route", route);
  if (viewport) form.append("viewport", viewport);
  if (width) form.append("width", String(width));
  if (releaseId != null) form.append("releaseId", String(releaseId));
  if (batchId && batchSize > 1) {
    form.append("batchId", batchId);
    form.append("batchSize", String(batchSize));
  }
  try {
    const response = await api.post(`/api/projects/${projectId}/preview-screens`, form);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to send screen to Figma" };
  }
};

/** List Client Link preview comments for a release. */
export const fetchComments = async (
  projectSlug,
  { releaseId, previewPath, status, includeAllPaths = false, clientEmail } = {},
) => {
  const enc = encodeURIComponent(projectSlug);
  const response = await api.get(`/api/projects/public/${enc}/preview-comments`, {
    params: {
      r: releaseId,
      path: previewPath || undefined,
      status: status || undefined,
      includeAllPaths: includeAllPaths ? "true" : undefined,
      clientEmail: clientEmail ? String(clientEmail).trim() : undefined,
    },
  });
  return response.data;
};

/** Create a pinned Client Link comment. */
export const createComment = async (
  projectSlug,
  { releaseId, previewPath, anchor, body, logicBody, category, projectVersionId, clientEmail } = {},
) => {
  const enc = encodeURIComponent(projectSlug);
  const response = await api.post(`/api/projects/public/${enc}/preview-comments`, {
    r: releaseId,
    previewPath,
    anchor,
    body,
    logicBody,
    category,
    projectVersionId,
    clientEmail: clientEmail ? String(clientEmail).trim() : undefined,
  });
  return response.data;
};

/** Reply to a Client Link comment thread. */
export const replyComment = async (projectSlug, commentId, { body, clientEmail } = {}) => {
  const enc = encodeURIComponent(projectSlug);
  const response = await api.post(
    `/api/projects/public/${enc}/preview-comments/${commentId}/replies`,
    {
      body,
      clientEmail: clientEmail ? String(clientEmail).trim() : undefined,
    },
  );
  return response.data;
};

/** Resolve or reopen a Client Link comment thread. */
export const updateCommentStatus = async (
  projectSlug,
  commentId,
  { status, category, logicBody, clientEmail } = {},
) => {
  const enc = encodeURIComponent(projectSlug);
  const response = await api.patch(`/api/projects/public/${enc}/preview-comments/${commentId}`, {
    status,
    category,
    logicBody,
    clientEmail: clientEmail ? String(clientEmail).trim() : undefined,
  });
  return response.data;
};

/** Soft-delete a Client Link comment. */
export const deleteComment = async (projectSlug, commentId, { clientEmail } = {}) => {
  const enc = encodeURIComponent(projectSlug);
  const response = await api.delete(`/api/projects/public/${enc}/preview-comments/${commentId}`, {
    data: {
      clientEmail: clientEmail ? String(clientEmail).trim() : undefined,
    },
  });
  return response.data;
};

/** Global assistant threads (`/chat`). */
export async function listAssistantThreads() {
  const response = await api.get("/api/assistant/threads");
  return Array.isArray(response.data?.data) ? response.data.data : [];
}

export async function createAssistantThread(body = {}) {
  const response = await api.post("/api/assistant/threads", body);
  return response.data?.data;
}

export async function getAssistantThread(threadId) {
  const response = await api.get(`/api/assistant/threads/${threadId}`);
  return response.data?.data;
}

export async function patchAssistantThread(threadId, body) {
  const response = await api.patch(`/api/assistant/threads/${threadId}`, body);
  return response.data?.data;
}

export async function deleteAssistantThreadApi(threadId) {
  const response = await api.delete(`/api/assistant/threads/${threadId}`);
  return response.data;
}

export async function getAssistantBriefing() {
  const response = await api.get("/api/assistant/briefing");
  return response.data?.data;
}

/**
 * POST an assistant SSE endpoint and emit JSON events.
 * @param {string} path
 * @param {{ body?: object, signal?: AbortSignal, onEvent?: (evt: object) => void }} opts
 */
export async function consumeAssistantSse(path, { body, signal, onEvent } = {}) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      Accept: "text/event-stream",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body != null ? JSON.stringify(body) : undefined,
    signal,
  });
  if (!res.ok) {
    let err = { error: `Request failed (${res.status})` };
    try {
      const data = await res.json();
      if (data && typeof data === "object") err = data;
    } catch {
      /* keep default */
    }
    throw err;
  }
  await readSseJsonStream(res, { onEvent });
}

export async function sendAssistantMessage(threadId, body, opts = {}) {
  return consumeAssistantSse(`/api/assistant/threads/${threadId}/messages`, {
    body,
    signal: opts.signal,
    onEvent: opts.onEvent,
  });
}

export async function uploadChatAttachment(file, { channel, scopeId }) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("channel", channel);
  formData.append("scopeId", String(scopeId));
  const response = await api.post("/api/chat-attachments", formData);
  return response.data?.data;
}

export async function uploadAssistantAttachment(threadId, file) {
  const formData = new FormData();
  formData.append("file", file);
  const response = await api.post(`/api/assistant/threads/${threadId}/attachments`, formData);
  return response.data?.data;
}

export async function uploadPublicDiscoveryChatAttachment(publicPath, email, file) {
  const path = String(publicPath || "").replace(/^\/+/, "");
  const formData = new FormData();
  formData.append("file", file);
  formData.append("email", email);
  const response = await api.post(
    `/api/discovery/public/${encodeURIComponent(path)}/chat-attachments`,
    formData,
  );
  return response.data?.data;
}

export async function confirmAssistantPending(threadId, accept, opts = {}) {
  return consumeAssistantSse(`/api/assistant/threads/${threadId}/confirm`, {
    body: { accept, allowAll: Boolean(opts.allowAll) },
    signal: opts.signal,
    onEvent: opts.onEvent,
  });
}

export async function setAssistantGoal(threadId, body) {
  const response = await api.post(`/api/assistant/threads/${threadId}/goal`, body);
  return response.data?.data;
}

export async function cancelAssistantGoal(threadId) {
  const response = await api.post(`/api/assistant/threads/${threadId}/goal/cancel`);
  return response.data?.data;
}

/* ─── Platform notifications ─────────────────────────────────────────── */

export async function fetchNotifications(params = {}) {
  const res = await api.get("/api/notifications", {
    params: {
      limit: params.limit,
      cursor: params.cursor,
      unreadOnly: params.unreadOnly ? "1" : undefined,
    },
  });
  return res.data;
}

export async function fetchNotificationUnreadCount() {
  const res = await api.get("/api/notifications/unread-count");
  return res.data;
}

export async function markNotificationsRead(body) {
  const res = await api.post("/api/notifications/read", body || {});
  return res.data;
}

export async function fetchNotificationPreferences() {
  const res = await api.get("/api/notifications/preferences");
  return res.data;
}

export async function updateNotificationPreferences(body) {
  const res = await api.put("/api/notifications/preferences", body || {});
  return res.data;
}

export async function muteProjectNotifications(projectId) {
  const res = await api.post(`/api/notifications/mutes/${Number(projectId)}`);
  return res.data;
}

export async function unmuteProjectNotifications(projectId) {
  const res = await api.delete(`/api/notifications/mutes/${Number(projectId)}`);
  return res.data;
}

export async function fetchVapidPublicKey() {
  const res = await api.get("/api/notifications/push/vapid-public-key");
  return res.data;
}

export async function subscribePushNotifications(subscription) {
  const res = await api.post("/api/notifications/push/subscribe", {
    subscription: subscription?.toJSON ? subscription.toJSON() : subscription,
  });
  return res.data;
}

export async function unsubscribePushNotifications(endpoint) {
  const res = await api.delete("/api/notifications/push/subscribe", {
    data: { endpoint },
  });
  return res.data;
}

/**
 * Consume GET /api/notifications/stream (SSE).
 * @param {{ onEvent?: (evt: object) => void, signal?: AbortSignal }} [handlers]
 */
export async function consumeNotificationsStream(handlers = {}) {
  const { onEvent, signal } = handlers;
  const token = localStorage.getItem("token");
  const base = String(API_URL || "").replace(/\/$/, "");
  const url = `${base}/api/notifications/stream`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "text/event-stream",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    signal,
  });
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Notifications stream failed (${res.status})`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  try {
    while (true) {
      const { done, value } = await readAbortableSseChunk(reader);
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      for (;;) {
        const sep = buf.indexOf("\n\n");
        if (sep === -1) break;
        const rawEvent = buf.slice(0, sep);
        buf = buf.slice(sep + 2);
        const dataLine = rawEvent.split("\n").find((l) => l.startsWith("data:"));
        if (!dataLine) continue;
        const json = dataLine.replace(/^data:\s?/, "").trim();
        if (!json) continue;
        try {
          const evt = JSON.parse(json);
          onEvent?.(evt);
        } catch {
          /* ignore malformed */
        }
      }
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      /* ignore */
    }
  }
  return null;
}

// ---- QA Chat v2 (website live-browser chat) ---------------------------------------------------

const QA_CHAT_V2 = "/api/v2/qa-chat";

async function qaChatV2Request(method, path, { body, params, fallback } = {}) {
  try {
    const response = await api.request({ method, url: `${QA_CHAT_V2}${path}`, data: body, params });
    return response.data;
  } catch (error) {
    const data = error.response?.data;
    throw {
      ...(data && typeof data === "object" ? data : {}),
      error: data?.error || data?.message || fallback || "QA Chat request failed",
      status: error.response?.status ?? null,
    };
  }
}

export const fetchQaChatConfig = () =>
  qaChatV2Request("get", "/config", { fallback: "Could not load QA Chat config" });

export const listQaChats = (projectId) =>
  qaChatV2Request("get", `/projects/${Number(projectId)}/chats`, {
    fallback: "Could not load QA Chats",
  });

export const createQaChat = (projectId, body = {}) =>
  qaChatV2Request("post", `/projects/${Number(projectId)}/chats`, {
    body,
    fallback: "Could not create QA Chat",
  });

export const fetchQaChat = (chatId) =>
  qaChatV2Request("get", `/chats/${encodeURIComponent(chatId)}`, {
    fallback: "Could not load QA Chat",
  });

export const renameQaChat = (chatId, title) =>
  qaChatV2Request("patch", `/chats/${encodeURIComponent(chatId)}`, {
    body: { title },
    fallback: "Could not rename QA Chat",
  });

export const deleteQaChat = (chatId) =>
  qaChatV2Request("delete", `/chats/${encodeURIComponent(chatId)}`, {
    fallback: "Could not delete QA Chat",
  });

export const sendQaChatMessage = (chatId, body) =>
  qaChatV2Request("post", `/chats/${encodeURIComponent(chatId)}/messages`, {
    body,
    fallback: "Could not send message",
  });

/** Headless run (qa-runner) of the tests a "create tests" turn produced. Optionally a subset by case id. */
export const runQaChatTests = (chatId, messageId, body = {}) =>
  qaChatV2Request(
    "post",
    `/chats/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(messageId)}/run-tests`,
    { body, fallback: "Could not start the test run" },
  );

export const fetchQaChatTestRun = (chatId, runId) =>
  qaChatV2Request(
    "get",
    `/chats/${encodeURIComponent(chatId)}/test-runs/${encodeURIComponent(runId)}`,
    { fallback: "Could not load the test run" },
  );

/** The run of this message that is still going, or `{ run: null }`: lets a reload resume progress. */
export const fetchActiveQaChatTestRun = (chatId, messageId) =>
  qaChatV2Request(
    "get",
    `/chats/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(messageId)}/test-runs/active`,
    { fallback: "Could not load the active test run" },
  );

export const cancelQaChatTestRun = (chatId, runId) =>
  qaChatV2Request(
    "post",
    `/chats/${encodeURIComponent(chatId)}/test-runs/${encodeURIComponent(runId)}/cancel`,
    { body: {}, fallback: "Could not cancel the test run" },
  );

export const stopQaChatGeneration = (chatId) =>
  qaChatV2Request("post", `/chats/${encodeURIComponent(chatId)}/stop-generation`, {
    body: {},
    fallback: "Could not stop the agent",
  });

export const fetchQaChatAgentStatus = (chatId) =>
  qaChatV2Request("get", `/chats/${encodeURIComponent(chatId)}/agent-status`, {
    fallback: "Could not load agent status",
  });

export const fetchQaChatBrowser = (chatId) =>
  qaChatV2Request("get", `/chats/${encodeURIComponent(chatId)}/browser`, {
    fallback: "Could not load browser status",
  });

/** Environments, personas and URLs from the project's QA settings (no credentials). */
export const fetchQaChatWorkspace = (projectId) =>
  qaChatV2Request("get", `/projects/${Number(projectId)}/workspace`, {
    fallback: "Could not load environments and personas",
  });

/** Save the chat's environment/persona/URL; restarts a running browser if env or persona changed. */
export const updateQaChatBrowserSelection = (chatId, body) =>
  qaChatV2Request("patch", `/chats/${encodeURIComponent(chatId)}/browser/selection`, {
    body,
    fallback: "Could not change environment or persona",
  });

export const startQaChatBrowser = (chatId, body = {}) =>
  qaChatV2Request("post", `/chats/${encodeURIComponent(chatId)}/browser/start`, {
    body,
    fallback: "Could not start the browser",
  });

export const stopQaChatBrowser = (chatId) =>
  qaChatV2Request("post", `/chats/${encodeURIComponent(chatId)}/browser/stop`, {
    body: {},
    fallback: "Could not stop the browser",
  });

/** Single-use, short-lived viewer token; connect the WebSocket to the returned `wsPath`. */
export const createQaChatBrowserViewerToken = (chatId, mode = "control") =>
  qaChatV2Request("post", `/chats/${encodeURIComponent(chatId)}/browser/viewer-token`, {
    body: { mode },
    fallback: "Could not open the browser viewer",
  });

/**
 * Consume GET /api/v2/qa-chat/chats/:chatId/agent-events (SSE). The stream stays open across turns;
 * it resolves when the server or the abort signal closes it.
 * @param {string} chatId
 * @param {{ onEvent?: (evt: object) => void, signal?: AbortSignal }} [handlers]
 */
export async function consumeQaChatAgentStream(chatId, handlers = {}) {
  const { onEvent, signal } = handlers;
  const token = localStorage.getItem("token");
  const base = String(API_URL || "").replace(/\/$/, "");
  const url = `${base}${QA_CHAT_V2}/chats/${encodeURIComponent(chatId)}/agent-events`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "text/event-stream",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    signal,
  });
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    const err = new Error(text || `QA Chat stream failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  await readSseJsonStream(res, { onEvent });
  return null;
}
