import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Maximize2,
  Minimize2,
  Monitor,
  Plus,
  RectangleHorizontal,
  RectangleVertical,
  RotateCw,
  Smartphone,
  Tablet,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import config from "@/config";
import { createQaChatBrowserViewerToken } from "@/api";
import {
  buildViewerWsUrl,
  clampViewerZoom,
  formatViewerZoom,
  keyEventToViewerInput,
  mapPointerToRemote,
  stepViewerZoom,
  viewerZoomShortcut,
  zoomFromWheel,
} from "@/lib/qaChat.util";

const DEVICE_OPTIONS = [
  { id: "desktop", label: "Desktop", Icon: Monitor },
  { id: "tablet", label: "Tablet", Icon: Tablet },
  { id: "mobile", label: "Mobile", Icon: Smartphone },
];

const PING_MS = 20_000;
const MAX_RECONNECTS = 5;
const MOVE_THROTTLE_MS = 50;

/**
 * Live, user-interactive view of the QA Chat project browser. Frames, tabs and input flow over a
 * WebSocket (backend proxy -> qa-runner) authorised by a single-use viewer token; a dropped socket
 * reconnects with a fresh token while the browser is still running.
 *
 * Used by QA Chat (token minted per chat) and by Link session (`getViewerToken` mints the token for
 * the link browser): both are the same runner browser session behind the same WebSocket proxy.
 *
 * @param {{
 *   chatId?: string,
 *   sessionKey?: string,
 *   getViewerToken?: (mode: "view" | "control") => Promise<{ wsPath: string }>,
 *   live: boolean,
 *   agentWorking?: boolean,
 *   onClosed?: (reason: string | null) => void,
 *   maximized?: boolean,
 *   onToggleMaximize?: () => void,
 *   className?: string,
 * }} props
 */
export function QaBrowserViewer({
  chatId,
  sessionKey,
  getViewerToken,
  live,
  agentWorking = false,
  onClosed,
  maximized = false,
  onToggleMaximize,
  className,
}) {
  const canvasRef = useRef(null);
  const keyboardRef = useRef(null);
  const wrapRef = useRef(null);
  const wsRef = useRef(null);
  const remoteRef = useRef({ width: 1280, height: 720 });
  const lastMoveRef = useRef(0);
  const pressedRef = useRef(false);

  // Latest token minter without re-opening the socket when a parent re-renders with a new closure.
  const getViewerTokenRef = useRef(getViewerToken);
  getViewerTokenRef.current = getViewerToken;
  const connectionKey = sessionKey ?? chatId;

  const [conn, setConn] = useState("idle"); // idle | connecting | ready | reconnecting | failed
  const [hasFrame, setHasFrame] = useState(false);
  const [tabs, setTabs] = useState([]);
  const [url, setUrl] = useState("");
  const [aspect, setAspect] = useState(16 / 9);
  const [notice, setNotice] = useState("");
  const [device, setDevice] = useState({ preset: "desktop", landscape: false });
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(1);
  const zoomTimerRef = useRef(null);
  // The agent works in the same browser: zoom changes its layout, so it stays at 100% meanwhile.
  const zoomLockedRef = useRef(false);
  zoomLockedRef.current = agentWorking;

  const send = useCallback((payload) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
  }, []);

  const applyZoom = useCallback(
    (next) => {
      const z = clampViewerZoom(next);
      zoomRef.current = z;
      setZoom(z);
      window.clearTimeout(zoomTimerRef.current);
      // Wheel/pinch fire many events: send only the latest value.
      zoomTimerRef.current = window.setTimeout(() => {
        zoomTimerRef.current = null;
        send({ type: "zoom", zoom: z });
      }, 80);
    },
    [send],
  );

  /** Adopt the zoom the runner reports unless the user is mid-change. */
  const adoptServerZoom = useCallback((value) => {
    if (zoomTimerRef.current !== null || value === undefined) return;
    const z = clampViewerZoom(value);
    zoomRef.current = z;
    setZoom(z);
  }, []);

  useEffect(() => () => window.clearTimeout(zoomTimerRef.current), []);

  useEffect(() => {
    if (agentWorking && conn === "ready" && zoomRef.current !== 1) applyZoom(1);
  }, [agentWorking, conn, applyZoom]);

  const drawFrame = useCallback((b64, meta) => {
    const canvas = canvasRef.current;
    if (!canvas || !b64) return;
    const img = new Image();
    img.onload = () => {
      // The bitmap keeps its full pixel size (2x on the runner) so it stays sharp on HiDPI
      // screens; input coordinates stay in the page's CSS pixels (metadata size).
      const cssW = meta?.deviceWidth || img.width;
      const cssH = meta?.deviceHeight || img.height;
      if (canvas.width !== img.width || canvas.height !== img.height) {
        canvas.width = img.width;
        canvas.height = img.height;
      }
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, img.width, img.height);
      }
      remoteRef.current = { width: cssW, height: cssH };
      setAspect(cssW / cssH);
      setHasFrame(true);
    };
    img.src = `data:image/jpeg;base64,${b64}`;
  }, []);

  // Connect / reconnect while the browser is live.
  useEffect(() => {
    if (!live || !connectionKey) {
      setConn("idle");
      setHasFrame(false);
      setTabs([]);
      setUrl("");
      return undefined;
    }
    let cancelled = false;
    let attempt = 0;
    let ws = null;
    let pingTimer = null;
    let retryTimer = null;

    const connect = async () => {
      setConn(attempt === 0 ? "connecting" : "reconnecting");
      let viewer;
      try {
        viewer = getViewerTokenRef.current
          ? await getViewerTokenRef.current("control")
          : await createQaChatBrowserViewerToken(chatId, "control");
      } catch (err) {
        if (cancelled) return;
        // 404/409: browser is gone; the parent's status poll will flip `live`.
        setConn("failed");
        setNotice(err?.error || "Could not open the browser viewer.");
        return;
      }
      if (cancelled) return;
      ws = new WebSocket(buildViewerWsUrl(config.API_URL || window.location.origin, viewer.wsPath));
      wsRef.current = ws;
      let serverClosed = false;
      ws.onmessage = (ev) => {
        let msg;
        try {
          msg = JSON.parse(typeof ev.data === "string" ? ev.data : "");
        } catch {
          return;
        }
        switch (msg.type) {
          case "ready":
            attempt = 0;
            setConn("ready");
            setNotice("");
            if (Array.isArray(msg.tabs)) setTabs(msg.tabs);
            if (msg.url) setUrl(msg.url);
            if (msg.device?.preset) {
              setDevice({ preset: msg.device.preset, landscape: Boolean(msg.device.landscape) });
              adoptServerZoom(msg.device.zoom);
            }
            break;
          case "device":
            if (msg.preset) setDevice({ preset: msg.preset, landscape: Boolean(msg.landscape) });
            adoptServerZoom(msg.zoom);
            break;
          case "frame":
            drawFrame(msg.data, msg.metadata);
            break;
          case "tabs":
            if (Array.isArray(msg.tabs)) {
              setTabs(msg.tabs);
              const active = msg.tabs.find((t) => t.active);
              if (active?.url) setUrl(active.url);
            }
            break;
          case "navigated":
            if (msg.url) setUrl(msg.url);
            break;
          case "notice":
            setNotice(String(msg.message || ""));
            break;
          case "closed":
            serverClosed = true;
            onClosed?.(msg.reason ?? null);
            break;
          default:
            break;
        }
      };
      ws.onclose = () => {
        window.clearInterval(pingTimer);
        if (cancelled || serverClosed) return;
        if (attempt >= MAX_RECONNECTS) {
          setConn("failed");
          setNotice("Lost the connection to the browser.");
          return;
        }
        attempt += 1;
        setConn("reconnecting");
        retryTimer = window.setTimeout(connect, Math.min(1000 * 2 ** attempt, 10_000));
      };
      ws.onerror = () => {};
      ws.onopen = () => {
        pingTimer = window.setInterval(() => send({ type: "ping" }), PING_MS);
      };
    };
    void connect();

    return () => {
      cancelled = true;
      window.clearInterval(pingTimer);
      window.clearTimeout(retryTimer);
      try {
        ws?.close();
      } catch {
        /* ignore */
      }
      wsRef.current = null;
    };
  }, [chatId, connectionKey, live, drawFrame, onClosed, send, adoptServerZoom]);

  // Match the remote viewport to the panel size (debounced).
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || conn !== "ready" || device.preset !== "desktop") return undefined;
    let timer = null;
    const ro = new ResizeObserver(() => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const rect = el.getBoundingClientRect();
        if (rect.width > 100 && rect.height > 100) {
          send({ type: "resize", width: Math.round(rect.width), height: Math.round(rect.height) });
        }
      }, 400);
    });
    ro.observe(el);
    return () => {
      window.clearTimeout(timer);
      ro.disconnect();
    };
  }, [conn, device.preset, send]);

  // Non-passive wheel so the page behind does not scroll.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const onWheel = (e) => {
      e.preventDefault();
      // Ctrl/Cmd + wheel and trackpad pinch zoom the page, like a normal browser.
      if (e.ctrlKey || e.metaKey) {
        if (!zoomLockedRef.current) applyZoom(zoomFromWheel(zoomRef.current, e.deltaY));
        return;
      }
      const { x, y } = mapPointerToRemote(e, canvas.getBoundingClientRect(), remoteRef.current);
      send({ type: "wheel", x, y, deltaX: e.deltaX, deltaY: e.deltaY });
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [send, hasFrame, applyZoom]);

  const pointer = (e) =>
    mapPointerToRemote(e, e.currentTarget.getBoundingClientRect(), remoteRef.current);
  const buttonName = (e) => (e.button === 2 ? "right" : e.button === 1 ? "middle" : "left");

  const onKeyDown = (e) => {
    // Let the browser fire a paste event; we forward the clipboard text instead.
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") return;
    const zoomKey = viewerZoomShortcut(e);
    if (zoomKey) {
      e.preventDefault();
      e.stopPropagation();
      if (!zoomLockedRef.current) {
        applyZoom(
          zoomKey === "reset" ? 1 : stepViewerZoom(zoomRef.current, zoomKey === "in" ? 1 : -1),
        );
      }
      return;
    }
    const input = keyEventToViewerInput(e);
    if (!input) return;
    e.preventDefault();
    e.stopPropagation();
    send(input);
  };

  const onPaste = (e) => {
    const text = e.clipboardData?.getData("text");
    if (text) {
      e.preventDefault();
      send({ type: "text", text });
    }
  };

  const interactive = conn === "ready";
  const portrait = aspect < 1;

  const chooseDevice = (preset, landscape = false) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    // Desktop follows the panel size; tablet/mobile use fixed device sizes on the runner.
    send({
      type: "device",
      preset,
      landscape,
      ...(preset === "desktop" && rect
        ? { width: Math.round(rect.width), height: Math.round(rect.height) }
        : {}),
    });
    setDevice({ preset, landscape });
  };

  return (
    <div className={cn("flex min-h-0 flex-col gap-2", maximized && "flex-1", className)}>
      <div
        className="flex items-center gap-1 overflow-x-auto"
        role="tablist"
        aria-label="Browser tabs"
      >
        {tabs.map((t) => (
          <div
            key={t.id}
            role="tab"
            aria-selected={Boolean(t.active)}
            className={cn(
              "group flex max-w-[180px] items-center gap-1 rounded-md border px-2 py-1 text-xs",
              t.active ? "bg-muted font-medium" : "bg-background text-muted-foreground",
            )}
          >
            <button
              type="button"
              className="min-w-0 flex-1 truncate text-left"
              onClick={() => send({ type: "tab", action: "switch", id: t.id })}
              title={t.url}
            >
              {t.title || t.url || "New tab"}
            </button>
            {tabs.length > 1 ? (
              <button
                type="button"
                aria-label="Close tab"
                className="opacity-60 hover:opacity-100"
                onClick={() => send({ type: "tab", action: "close", id: t.id })}
              >
                <X className="size-3" />
              </button>
            ) : null}
          </div>
        ))}
        {interactive ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-6 shrink-0"
            aria-label="New tab"
            onClick={() => send({ type: "tab", action: "new" })}
          >
            <Plus className="size-3.5" />
          </Button>
        ) : null}
      </div>

      <form className="flex items-center gap-1" onSubmit={(e) => e.preventDefault()}>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7"
          aria-label="Back"
          disabled={!interactive}
          onClick={() => send({ type: "nav", action: "back" })}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7"
          aria-label="Forward"
          disabled={!interactive}
          onClick={() => send({ type: "nav", action: "forward" })}
        >
          <ArrowRight className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7"
          aria-label="Reload"
          disabled={!interactive}
          onClick={() => send({ type: "nav", action: "reload" })}
        >
          <RotateCw className="size-4" />
        </Button>
        <div
          aria-label="Address"
          title={url || undefined}
          className="flex h-8 min-w-0 flex-1 items-center truncate rounded-md border border-input bg-muted/40 px-3 font-mono text-xs text-muted-foreground"
        >
          {url || "—"}
        </div>
      </form>

      <div className="flex items-center gap-1" role="group" aria-label="Device">
        {DEVICE_OPTIONS.map(({ id, label, Icon }) => (
          <Button
            key={id}
            type="button"
            size="sm"
            variant={device.preset === id ? "secondary" : "ghost"}
            className="h-7 gap-1 px-2 text-xs"
            disabled={!interactive}
            aria-pressed={device.preset === id}
            onClick={() => chooseDevice(id, device.landscape)}
          >
            <Icon className="size-3.5" aria-hidden />
            {label}
          </Button>
        ))}
        {device.preset !== "desktop" ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-xs"
            disabled={!interactive}
            aria-label={device.landscape ? "Switch to portrait" : "Switch to landscape"}
            onClick={() => chooseDevice(device.preset, !device.landscape)}
          >
            {device.landscape ? (
              <RectangleVertical className="size-3.5" aria-hidden />
            ) : (
              <RectangleHorizontal className="size-3.5" aria-hidden />
            )}
            {device.landscape ? "Portrait" : "Landscape"}
          </Button>
        ) : null}
        <div className="ml-auto flex items-center gap-0.5" role="group" aria-label="Zoom and size">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label="Zoom out"
            title={agentWorking ? "Zoom is locked while the agent works" : "Zoom out (Ctrl/Cmd -)"}
            disabled={!interactive || agentWorking || zoom <= 0.25}
            onClick={() => applyZoom(stepViewerZoom(zoom, -1))}
          >
            <ZoomOut className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 min-w-12 px-1.5 text-xs tabular-nums"
            aria-label={`Zoom ${formatViewerZoom(zoom)}. Reset to 100%`}
            title="Reset zoom (Ctrl/Cmd 0)"
            disabled={!interactive || agentWorking || zoom === 1}
            onClick={() => applyZoom(1)}
          >
            {formatViewerZoom(zoom)}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label="Zoom in"
            title={agentWorking ? "Zoom is locked while the agent works" : "Zoom in (Ctrl/Cmd +)"}
            disabled={!interactive || agentWorking || zoom >= 3}
            onClick={() => applyZoom(stepViewerZoom(zoom, 1))}
          >
            <ZoomIn className="size-4" />
          </Button>
          {onToggleMaximize ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="ml-1 size-7"
              aria-label={maximized ? "Restore browser size" : "Maximize browser"}
              aria-pressed={maximized}
              title={maximized ? "Restore (Esc)" : "Maximize browser"}
              onClick={onToggleMaximize}
            >
              {maximized ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </Button>
          ) : null}
        </div>
      </div>

      {agentWorking && interactive ? (
        <p
          role="status"
          className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-900 dark:text-amber-200"
        >
          The agent is working in this browser. Your clicks and typing go to the same page, so it
          may get confused. Wait for it to finish, or stop it first.
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="text-xs text-muted-foreground">
          {notice}
        </p>
      ) : null}

      <div
        ref={wrapRef}
        className={cn(
          "relative min-h-0 w-full overflow-hidden rounded-lg border bg-neutral-950",
          maximized && "flex-1",
        )}
        onPointerDown={() => keyboardRef.current?.focus({ preventScroll: true })}
      >
        <input
          ref={keyboardRef}
          type="text"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          aria-label="Type here to control the remote browser"
          className="pointer-events-none absolute left-2 top-2 z-10 h-px w-px opacity-0"
          style={{ fontSize: 16 }}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          onCompositionEnd={(e) => e.data && send({ type: "text", text: e.data })}
        />
        <div
          className={cn(
            maximized
              ? device.preset === "desktop"
                ? "absolute inset-0"
                : "absolute left-1/2 top-0 -translate-x-1/2"
              : "relative mx-auto",
          )}
          style={
            maximized
              ? // Maximized: the page fills the panel (desktop) or the device frame fits its height.
                device.preset === "desktop"
                ? undefined
                : { height: "100%", aspectRatio: aspect, maxWidth: "100%" }
              : {
                  aspectRatio: aspect,
                  // Tall phone/tablet frames fit the panel height instead of the panel width.
                  ...(portrait
                    ? {
                        height: "min(68dvh, 820px)",
                        width: `calc(min(68dvh, 820px) * ${aspect})`,
                        maxWidth: "100%",
                      }
                    : { width: "100%" }),
                }
          }
        >
          {!hasFrame ? (
            <Skeleton className="absolute inset-0 rounded-none" aria-label="Loading browser" />
          ) : null}
          <canvas
            ref={canvasRef}
            tabIndex={0}
            role="img"
            aria-label="Live project browser. Click, then type to interact."
            className={cn(
              "absolute inset-0 size-full touch-none outline-none focus-visible:ring-2 focus-visible:ring-primary",
              interactive ? "cursor-default" : "pointer-events-none opacity-60",
              !hasFrame && "invisible",
            )}
            onContextMenu={(e) => e.preventDefault()}
            onPointerDown={(e) => {
              if (!interactive) return;
              e.currentTarget.setPointerCapture(e.pointerId);
              pressedRef.current = true;
              const { x, y } = pointer(e);
              send({
                type: "mouse",
                action: "down",
                x,
                y,
                button: buttonName(e),
                clickCount: e.detail || 1,
              });
            }}
            onPointerUp={(e) => {
              if (!interactive) return;
              pressedRef.current = false;
              const { x, y } = pointer(e);
              send({
                type: "mouse",
                action: "up",
                x,
                y,
                button: buttonName(e),
                clickCount: e.detail || 1,
              });
            }}
            onPointerMove={(e) => {
              if (!interactive) return;
              const now = performance.now();
              if (now - lastMoveRef.current < MOVE_THROTTLE_MS) return;
              lastMoveRef.current = now;
              const { x, y } = pointer(e);
              send({ type: "mouse", action: "move", x, y });
            }}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
          />
          {conn === "connecting" || conn === "reconnecting" ? (
            <div className="absolute inset-x-0 bottom-0 bg-background/80 px-3 py-1 text-xs text-muted-foreground">
              {conn === "reconnecting"
                ? "Reconnecting to the browser…"
                : "Connecting to the browser…"}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
