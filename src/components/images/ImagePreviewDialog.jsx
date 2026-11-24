import { useCallback, useEffect, useRef, useState } from "react";
import { ImageOff, Loader2, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  MAX_SCALE,
  MIN_SCALE,
  ZOOM_STEP,
  clampPan,
  createImageZoomState,
  resetImageZoom,
  scaleFromPinchDistance,
  zoomBy,
} from "@/lib/imagePreviewZoom";

export function ImagePreviewDialog({ open, onOpenChange, src, fileName, alt }) {
  const [zoom, setZoom] = useState(() => createImageZoomState());
  const [status, setStatus] = useState("loading");
  const [interacting, setInteracting] = useState(false);
  const viewportRef = useRef(null);
  const pointersRef = useRef(new Map());
  const pinchRef = useRef(null);
  const dragRef = useRef(null);

  const reset = useCallback(() => {
    setZoom(resetImageZoom());
    pointersRef.current.clear();
    pinchRef.current = null;
    dragRef.current = null;
    setInteracting(false);
  }, []);

  useEffect(() => {
    if (open) {
      reset();
      setStatus(src ? "loading" : "error");
    }
  }, [open, src, reset]);

  const handleOpenChange = (next) => {
    if (!next) reset();
    onOpenChange?.(next);
  };

  const clampToViewport = useCallback((state) => {
    const el = viewportRef.current;
    if (!el) return state;
    const rect = el.getBoundingClientRect();
    return clampPan(state, { width: rect.width, height: rect.height }, { width: rect.width, height: rect.height });
  }, []);

  const applyZoom = useCallback(
    (updater) => setZoom((prev) => clampToViewport(updater(prev))),
    [clampToViewport],
  );

  const onWheel = (event) => {
    event.preventDefault();
    const factor = event.deltaY < 0 ? 1.1 : 1 / 1.1;
    applyZoom((prev) => zoomBy(prev, factor));
  };

  const onPointerDown = (event) => {
    if (status !== "loaded") return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    setInteracting(true);
    if (pointersRef.current.size === 2) {
      const [a, b] = [...pointersRef.current.values()];
      pinchRef.current = {
        startDistance: Math.hypot(a.x - b.x, a.y - b.y),
        state: zoom,
      };
      dragRef.current = null;
    } else if (pointersRef.current.size === 1 && zoom.scale > MIN_SCALE) {
      dragRef.current = { startX: event.clientX, startY: event.clientY, state: zoom };
    }
  };

  const onPointerMove = (event) => {
    if (!pointersRef.current.has(event.pointerId)) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointersRef.current.size === 2 && pinchRef.current) {
      const [a, b] = [...pointersRef.current.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      const base = pinchRef.current;
      applyZoom(() => scaleFromPinchDistance(base.state, base.startDistance, distance));
    } else if (dragRef.current) {
      const base = dragRef.current;
      applyZoom(() => ({
        scale: base.state.scale,
        x: base.state.x + (event.clientX - base.startX),
        y: base.state.y + (event.clientY - base.startY),
      }));
    }
  };

  const endPointer = (event) => {
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    if (pointersRef.current.size === 0) {
      dragRef.current = null;
      setInteracting(false);
    }
  };

  const onDoubleClick = () => {
    applyZoom((prev) =>
      prev.scale > MIN_SCALE ? resetImageZoom() : { scale: 2, x: 0, y: 0 },
    );
  };

  const label = fileName || alt || "Image preview";
  const percent = Math.round(zoom.scale * 100);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] w-[min(96vw,1200px)] max-w-[min(96vw,1200px)] gap-3 p-4 sm:max-w-[min(96vw,1200px)]">
        <DialogHeader className="pr-8 text-left">
          <DialogTitle className="truncate text-sm font-medium">{label}</DialogTitle>
          <DialogDescription className="sr-only">Image preview with zoom controls</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap items-center gap-1.5">
          <Button type="button" variant="outline" size="icon-sm" aria-label="Zoom out" disabled={zoom.scale <= MIN_SCALE} onClick={() => applyZoom((p) => zoomBy(p, 1 / ZOOM_STEP))}>
            <ZoomOut className="size-4" aria-hidden />
          </Button>
          <span className="min-w-12 text-center text-xs tabular-nums text-muted-foreground">{percent}%</span>
          <Button type="button" variant="outline" size="icon-sm" aria-label="Zoom in" disabled={zoom.scale >= MAX_SCALE} onClick={() => applyZoom((p) => zoomBy(p, ZOOM_STEP))}>
            <ZoomIn className="size-4" aria-hidden />
          </Button>
          <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={reset}>
            <RotateCcw className="size-3.5" aria-hidden /> Reset
          </Button>
        </div>
        <div
          ref={viewportRef}
          data-testid="image-preview-viewport"
          className={cn(
            "relative flex max-h-[65vh] min-h-48 w-full touch-none items-center justify-center overflow-hidden rounded-md bg-muted/30",
            zoom.scale > MIN_SCALE ? "cursor-grab active:cursor-grabbing" : "cursor-default",
          )}
          onWheel={onWheel}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endPointer}
          onPointerCancel={endPointer}
          onDoubleClick={onDoubleClick}
        >
          {status === "loading" ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center" role="status" aria-label="Loading image">
              <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden />
            </div>
          ) : null}
          {status === "error" ? (
            <div className="flex max-w-sm flex-col items-center gap-2 px-4 py-10 text-center">
              <ImageOff className="size-8 text-muted-foreground" aria-hidden />
              <p className="text-sm font-medium">This image couldn&apos;t be loaded</p>
              {label ? <p className="max-w-full truncate text-xs text-muted-foreground">{label}</p> : null}
              {src ? (
                <a href={src} target="_blank" rel="noreferrer" className="text-xs font-medium text-primary hover:underline">
                  Open original
                </a>
              ) : null}
            </div>
          ) : src ? (
            <img
              src={src}
              alt={alt || label}
              draggable={false}
              onLoad={() => setStatus("loaded")}
              onError={() => setStatus("error")}
              className={cn("max-h-[65vh] w-full object-contain select-none", status !== "loaded" && "invisible absolute")}
              style={{
                transform: `translate(${zoom.x}px, ${zoom.y}px) scale(${zoom.scale})`,
                transition: interacting ? "none" : "transform 150ms ease-out",
              }}
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ImagePreviewDialog;
