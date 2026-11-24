const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 15_000;
const NOT_FOUND_CLOSE_CODE = 4404;

/**
 * Reconnect delay: 1s, 2s, 4s … capped at 15s. `attempt` is 1 for the first retry.
 * @param {number} attempt
 */
export function previewControlReconnectDelayMs(attempt) {
  const n = Math.max(1, Math.floor(Number(attempt) || 1));
  return Math.min(RECONNECT_MAX_MS, RECONNECT_BASE_MS * 2 ** (n - 1));
}

/**
 * @param {string} apiUrl e.g. https://api.example.com
 * @param {number|string} projectId
 */
export function buildPreviewDesktopControlWsUrl(apiUrl, projectId) {
  const base = String(apiUrl || "").replace(/\/$/, "");
  const proto = base.startsWith("https") ? "wss" : "ws";
  const host = base.replace(/^https?:\/\//, "");
  return `${proto}://${host}/api/preview-desktop/public/projects/${projectId}/control/ws`;
}

/**
 * Live preview-control state over a WebSocket. The server sends the current state when the
 * socket opens and one message per change, so nothing polls. A dropped socket reconnects with
 * backoff; `onDisconnect` fires so the caller can take one snapshot while it is down.
 *
 * @param {{
 *   url: string,
 *   onControl: (control: object | null) => void,
 *   onDisconnect?: () => void,
 *   WebSocketImpl?: typeof WebSocket,
 *   setTimeoutImpl?: typeof setTimeout,
 *   clearTimeoutImpl?: typeof clearTimeout,
 * }} opts
 * @returns {() => void} close
 */
export function connectPreviewDesktopControlSocket(opts) {
  const WebSocketImpl = opts.WebSocketImpl ?? globalThis.WebSocket;
  const setTimer = opts.setTimeoutImpl ?? setTimeout;
  const clearTimer = opts.clearTimeoutImpl ?? clearTimeout;
  let stopped = false;
  let socket = null;
  let timer = null;
  let attempt = 0;

  const scheduleReconnect = () => {
    if (stopped || timer) return;
    attempt += 1;
    timer = setTimer(() => {
      timer = null;
      open();
    }, previewControlReconnectDelayMs(attempt));
  };

  function open() {
    if (stopped) return;
    let ws;
    try {
      ws = new WebSocketImpl(opts.url);
    } catch {
      opts.onDisconnect?.();
      scheduleReconnect();
      return;
    }
    socket = ws;
    ws.onopen = () => {
      attempt = 0;
    };
    ws.onmessage = (event) => {
      let evt;
      try {
        evt = JSON.parse(String(event.data));
      } catch {
        return;
      }
      if (evt?.type === "control") opts.onControl(evt.control || null);
    };
    ws.onclose = (event) => {
      if (socket === ws) socket = null;
      if (stopped) return;
      opts.onDisconnect?.();
      // 4404: the project does not exist, so retrying cannot help.
      if (event?.code === NOT_FOUND_CLOSE_CODE) return;
      scheduleReconnect();
    };
    ws.onerror = () => {
      try {
        ws.close();
      } catch {
        /* ignore */
      }
    };
  }

  open();

  return () => {
    stopped = true;
    if (timer) clearTimer(timer);
    timer = null;
    const ws = socket;
    socket = null;
    try {
      ws?.close();
    } catch {
      /* ignore */
    }
  };
}
