/** @typedef {{ upstreamHost?: string, hostDevUpstreamHost?: string | null, projectPortStart?: number | string, projectPortEnd?: number | string, resolveUpstreamHost?: (port: number) => string }} EmbedUpstreamOptions */

const DEFAULT_PROJECT_PORT_START = 8001;
const DEFAULT_PROJECT_PORT_END = 8100;

/** When false, embed proxy drops WebSocket upgrades and backend disables HMR env. */
export function isPreviewEmbedHmrEnabled() {
  const flag = String(process.env.PREVIEW_EMBED_HMR ?? "1").trim().toLowerCase();
  return flag !== "0" && flag !== "false" && flag !== "no";
}

/** Nginx / in-container project previews (backend container). */
export function isBackendProjectPort(port, start, end) {
  return Number.isInteger(port) && port >= start && port <= end;
}

/**
 * Pick upstream hostname for /embedded/<port>/ (Docker vs local Vite).
 * When `hostDevUpstreamHost` is set (Docker), ports in [start,end] → backend; others → host dev.
 */
export function createEmbedUpstreamResolver({
  upstreamHost = "localhost",
  hostDevUpstreamHost = null,
  projectPortStart = DEFAULT_PROJECT_PORT_START,
  projectPortEnd = DEFAULT_PROJECT_PORT_END,
} = {}) {
  const backendHost = String(upstreamHost || "localhost").trim() || "localhost";
  const devHost = hostDevUpstreamHost
    ? String(hostDevUpstreamHost).trim() || null
    : null;
  const start = Number(projectPortStart) || DEFAULT_PROJECT_PORT_START;
  const end = Number(projectPortEnd) || DEFAULT_PROJECT_PORT_END;

  return (port) => {
    if (devHost && isBackendProjectPort(port, start, end)) {
      return backendHost;
    }
    if (devHost) {
      return devHost;
    }
    return backendHost;
  };
}

/** @returns {EmbedUpstreamOptions} */
export function resolveEmbedUpstreamOptionsFromEnv() {
  const hostDev = process.env.EMBED_HOST_DEV_UPSTREAM_HOST?.trim();
  return {
    upstreamHost: process.env.EMBED_UPSTREAM_HOST || "localhost",
    hostDevUpstreamHost: hostDev || null,
    projectPortStart: process.env.PROJECT_PORT_START,
    projectPortEnd: process.env.PROJECT_PORT_END,
  };
}

/** @param {EmbedUpstreamOptions} [options] */
export function normalizeEmbedUpstreamResolver(options = {}) {
  if (typeof options.resolveUpstreamHost === "function") {
    return options.resolveUpstreamHost;
  }
  return createEmbedUpstreamResolver(options);
}

/** Vite `Host` header — never send Docker service names (backend, host.docker.internal). */
export function upstreamViteHostHeader(port) {
  return `localhost:${port}`;
}

/** Logical upstream origin for body/URL rewrite (matches what the dev server serves). */
export function upstreamViteOrigin(port) {
  return `http://localhost:${port}`;
}

/** Backend API port for in-container embed relay (Docker: frontend → backend:5000/embedded/:port). */
export function resolveEmbedBackendApiPort() {
  const n = Number(process.env.EMBED_BACKEND_API_PORT || process.env.PORT || 5000);
  return Number.isInteger(n) && n > 0 && n <= 65535 ? n : 5000;
}

/**
 * Route project previews through backend Express `/embedded/:port` (127.0.0.1 inside backend).
 * Avoids 502 when preview listens only on loopback or preview ports are not on the Docker bridge.
 * @param {string} upstreamHost
 * @param {number} port
 * @param {EmbedUpstreamOptions} [opts]
 */
/** WebSocket proxy target: project dev port (not Express /embedded relay on :5000). */
export function resolveEmbeddedWsUpstreamTarget(upstreamHost, port) {
  const host = String(upstreamHost || "localhost").trim() || "localhost";
  const n = Number(port);
  if (!Number.isInteger(n) || n < 1 || n > 65535) return null;
  return `http://${host}:${n}`;
}

export function shouldRelayEmbedViaBackendApi(upstreamHost, port, opts = {}) {
  const flag = String(process.env.EMBED_RELAY_VIA_BACKEND_API ?? "")
    .trim()
    .toLowerCase();
  if (flag === "0" || flag === "false" || flag === "no") return false;
  if (flag === "1" || flag === "true" || flag === "yes") return true;
  const host = String(upstreamHost || "")
    .trim()
    .toLowerCase();
  if (host !== "backend") return false;
  const start =
    Number(opts.projectPortStart) || DEFAULT_PROJECT_PORT_START;
  const end = Number(opts.projectPortEnd) || DEFAULT_PROJECT_PORT_END;
  return isBackendProjectPort(port, start, end);
}
