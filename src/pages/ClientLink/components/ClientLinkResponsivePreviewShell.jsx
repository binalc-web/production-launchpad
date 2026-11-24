import React, { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const MIN_PREVIEW_WIDTH = 320;
const MAX_PREVIEW_WIDTH = 1920;
/** Dark vertical strip (hit area), matches device-frame drag affordance. */
const DRAG_STRIP_W_PX = 14;

/** Approximate device aspect (width/height) so mobile/tablet are not stretched tall. */
const DEVICE_ASPECT_BY_WIDTH = {
  /** ~iPhone 14 logical */
  mobile: 390 / 844,
  /** ~iPad portrait-ish */
  tablet: 820 / 1180,
};

/**
 * Intrinsic device height for letterboxing. Desktop fills stage height; narrower
 * presets use a phone/tablet aspect so the iframe is not vertically stretched.
 * @param {number} widthPx
 * @param {number} stageHeightPx
 */
export function resolveDeviceFrameHeight(widthPx, stageHeightPx) {
  const w = Math.max(MIN_PREVIEW_WIDTH, Number(widthPx) || MIN_PREVIEW_WIDTH);
  const stageH = Math.max(0, Number(stageHeightPx) || 0);
  if (stageH <= 0) return Math.round(w / DEVICE_ASPECT_BY_WIDTH.mobile);

  if (w >= 1100) {
    // Desktop: fill stage (scale will be 1 when width fits).
    return stageH;
  }
  const aspect = w <= 480 ? DEVICE_ASPECT_BY_WIDTH.mobile : DEVICE_ASPECT_BY_WIDTH.tablet;
  const idealH = Math.round(w / aspect);
  // Cap to stage so we scale down rather than overflow when possible.
  return Math.min(idealH, stageH);
}

/**
 * Uniform scale to fit device frame inside the stage (letterbox). Never stretch axes independently.
 * @param {{ frameW: number, frameH: number, stageW: number, stageH: number, stripExtra?: number }} dims
 */
export function resolveDeviceFitScale(dims) {
  const frameW = Math.max(1, Number(dims.frameW) || 1);
  const frameH = Math.max(1, Number(dims.frameH) || 1);
  const stageW = Math.max(0, Number(dims.stageW) || 0);
  const stageH = Math.max(0, Number(dims.stageH) || 0);
  const stripExtra = Math.max(0, Number(dims.stripExtra) || 0);
  if (stageW <= 0 || stageH <= 0) return 1;
  const availW = Math.max(1, stageW - stripExtra);
  const scale = Math.min(1, availW / frameW, stageH / frameH);
  return Number.isFinite(scale) && scale > 0 ? scale : 1;
}

/**
 * Centered "device" column for iframe preview: measured stage, uniform scale-to-fit,
 * device-style border frame, and left/right edge drag handles.
 */
export function ClientLinkResponsivePreviewShell({
  widthPx,
  resizeHandleEnabled = true,
  onStageWidthChange,
  onWidthChangeFromDrag,
  overlay = null,
  children,
}) {
  const stageRef = useRef(null);
  const dragRef = useRef({
    active: false,
    startX: 0,
    startWidth: 0,
    pointerId: null,
    /** @type {'left' | 'right' | null} */
    edge: null,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [stageSize, setStageSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = stageRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect) return;
      const w = Math.floor(rect.width);
      const h = Math.floor(rect.height);
      if (w > 0) onStageWidthChange?.(w);
      setStageSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [onStageWidthChange]);

  const clampWidth = useCallback((w, stageW) => {
    const cap = stageW > 0 ? Math.min(stageW, MAX_PREVIEW_WIDTH) : MAX_PREVIEW_WIDTH;
    return Math.round(Math.min(cap, Math.max(MIN_PREVIEW_WIDTH, w)));
  }, []);

  const endDrag = useCallback(() => {
    const d = dragRef.current;
    d.active = false;
    d.pointerId = null;
    d.edge = null;
    setIsDragging(false);
  }, []);

  const handleResizePointerDown = useCallback(
    (edge) => (e) => {
      if (!resizeHandleEnabled) return;
      e.preventDefault();
      e.stopPropagation();
      const stageEl = stageRef.current;
      const stageW = stageEl ? Math.floor(stageEl.getBoundingClientRect().width) : 0;
      const d = dragRef.current;
      d.active = true;
      d.startX = e.clientX;
      d.startWidth = widthPx;
      d.pointerId = e.pointerId;
      d.edge = edge;
      setIsDragging(true);
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }

      const onMove = (ev) => {
        if (!dragRef.current.active) return;
        const delta = ev.clientX - dragRef.current.startX;
        const sign = dragRef.current.edge === "right" ? 1 : -1;
        const next = clampWidth(dragRef.current.startWidth + sign * delta, stageW);
        onWidthChangeFromDrag?.(next);
      };

      const onUp = (ev) => {
        if (dragRef.current.pointerId != null && ev.pointerId !== dragRef.current.pointerId) {
          return;
        }
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        try {
          e.currentTarget.releasePointerCapture(ev.pointerId);
        } catch {
          /* ignore */
        }
        endDrag();
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [clampWidth, endDrag, onWidthChangeFromDrag, resizeHandleEnabled, widthPx],
  );

  useEffect(() => {
    return () => endDrag();
  }, [endDrag]);

  const safeWidth = Math.max(MIN_PREVIEW_WIDTH, widthPx);
  const stripExtra = resizeHandleEnabled ? 2 * DRAG_STRIP_W_PX : 0;
  const frameHeight = resolveDeviceFrameHeight(safeWidth, stageSize.h);
  const scale = resolveDeviceFitScale({
    frameW: safeWidth,
    frameH: frameHeight,
    stageW: stageSize.w,
    stageH: stageSize.h,
    stripExtra,
  });
  const rowWidthPx = (safeWidth + stripExtra) * scale;

  const dragStrip = (side) => (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={
        side === "left"
          ? "Resize preview width from the left"
          : "Resize preview width from the right"
      }
      className="group flex h-full shrink-0 cursor-ew-resize touch-none select-none items-center justify-center"
      style={{ width: DRAG_STRIP_W_PX }}
      onPointerDown={handleResizePointerDown(side)}
    >
      <span
        className="h-20 w-[7px] shrink-0 rounded-full bg-zinc-400 transition-colors group-hover:bg-zinc-300"
        aria-hidden
      />
    </div>
  );

  return (
    <div className="relative mt-0 flex min-h-0 flex-1 flex-col">
      <div
        ref={stageRef}
        className={cn(
          "relative flex min-h-0 flex-1 items-center justify-center overflow-auto p-0",
          "bg-zinc-100",
        )}
      >
        <div
          className={cn(
            "relative flex shrink-0 flex-row items-stretch origin-center",
            !isDragging && "transition-[width,transform] duration-300 ease-out",
          )}
          style={{
            width: safeWidth + stripExtra,
            height: frameHeight,
            transform: scale < 0.999 ? `scale(${scale})` : undefined,
            // Keep layout box matching visual size so centering stays correct.
            marginLeft: scale < 0.999 ? (rowWidthPx - (safeWidth + stripExtra)) / 2 : undefined,
            marginRight: scale < 0.999 ? (rowWidthPx - (safeWidth + stripExtra)) / 2 : undefined,
          }}
        >
          {resizeHandleEnabled ? dragStrip("left") : null}
          <div
            className={cn(
              "relative min-h-0 shrink-0 overflow-hidden rounded-lg border border-zinc-300 bg-white shadow-sm",
            )}
            style={{ width: safeWidth, height: frameHeight }}
          >
            {children}
          </div>
          {resizeHandleEnabled ? dragStrip("right") : null}
        </div>
      </div>
      {overlay}
    </div>
  );
}
