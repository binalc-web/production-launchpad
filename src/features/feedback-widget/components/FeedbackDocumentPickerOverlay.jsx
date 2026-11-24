import React, { useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { SquareMousePointer, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  pickDocumentElementAtClientPoint,
  serializePickedElement,
} from "@/lib/previewElementAnchor.util";
import {
  EMBED_SURFACE_CLASS,
  getOrCreateEmbedOverlayRoot,
  stopHostPointerPropagation,
} from "@/embed/embedOverlayRoot.js";

/** Above embed launcher (2147483000) and modal (2147483001). */
const PICK_OVERLAY_Z_CLASS = "z-[2147483002]";

/**
 * Full-viewport overlay for picking a host-page element (Code Snippet embed).
 * Portals into the embed shadow overlay root so pointer events reach the layer.
 */
export function FeedbackDocumentPickerOverlay({ active, onPinned, onCancel }) {
  const overlayRef = useRef(null);
  const hoverBoxRef = useRef(null);
  const rafRef = useRef(0);

  const clearHoverBox = useCallback(() => {
    const node = hoverBoxRef.current;
    if (node) {
      node.style.display = "none";
    }
  }, []);

  const showHoverBox = useCallback(
    (box) => {
      const node = hoverBoxRef.current;
      if (!node || !box) {
        clearHoverBox();
        return;
      }
      node.style.display = "block";
      node.style.left = `${box.left}px`;
      node.style.top = `${box.top}px`;
      node.style.width = `${box.width}px`;
      node.style.height = `${box.height}px`;
    },
    [clearHoverBox],
  );

  const scheduleHover = useCallback(
    (clientX, clientY) => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        if (!active) {
          clearHoverBox();
          return;
        }
        const picked = pickDocumentElementAtClientPoint(clientX, clientY);
        if (!picked?.el) {
          clearHoverBox();
          return;
        }
        const er = picked.el.getBoundingClientRect();
        showHoverBox({
          left: er.left,
          top: er.top,
          width: er.width,
          height: er.height,
        });
      });
    },
    [active, clearHoverBox, showHoverBox],
  );

  const handlePointerMove = useCallback(
    (e) => {
      if (!active) return;
      scheduleHover(e.clientX, e.clientY);
    },
    [active, scheduleHover],
  );

  const handlePointerDown = useCallback(
    (e) => {
      if (!active) return;
      e.preventDefault();
      e.stopPropagation();
      const picked = pickDocumentElementAtClientPoint(e.clientX, e.clientY);
      if (!picked?.el) return;
      const serialized = serializePickedElement(picked.el, picked.win);
      if (serialized) onPinned?.(serialized);
    },
    [active, onPinned],
  );

  useEffect(() => {
    if (!active) {
      clearHoverBox();
      return undefined;
    }

    const onKey = (e) => {
      if (e.key === "Escape") onCancel?.();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [active, clearHoverBox, onCancel]);

  useEffect(
    () => () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  if (!active) return null;

  const overlay = (
    <div
      ref={overlayRef}
      data-feedback-widget-pick-overlay
      className={cn(
        EMBED_SURFACE_CLASS,
        "pointer-events-auto fixed inset-0 h-full w-full cursor-crosshair",
        PICK_OVERLAY_Z_CLASS,
      )}
      style={{ background: "transparent", backgroundColor: "transparent" }}
      role="presentation"
      onPointerMove={handlePointerMove}
      onPointerDown={handlePointerDown}
      onMouseDown={stopHostPointerPropagation}
      onClick={stopHostPointerPropagation}
    >
      <div
        className="pointer-events-auto fixed left-1/2 top-4 z-[1] flex max-w-[min(100vw-2rem,28rem)] -translate-x-1/2 items-center gap-2 rounded-full border px-3 py-2 text-xs shadow-lg backdrop-blur-sm"
        style={{
          backgroundColor: "#0f172a",
          borderColor: "rgba(255,255,255,0.2)",
          color: "#ffffff",
        }}
        onPointerDown={stopHostPointerPropagation}
        onMouseDown={stopHostPointerPropagation}
        onClick={stopHostPointerPropagation}
      >
        <SquareMousePointer
          className="size-3.5 shrink-0"
          style={{ color: "var(--primary, #00b48a)" }}
          aria-hidden
        />
        <span className="leading-snug" style={{ color: "#ffffff" }}>
          Click an element on the page to capture it
        </span>
        <button
          type="button"
          className="ml-1 inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium"
          style={{
            borderColor: "rgba(255,255,255,0.25)",
            backgroundColor: "rgba(255,255,255,0.12)",
            color: "#ffffff",
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onCancel?.();
          }}
        >
          <X className="size-3" aria-hidden />
          Cancel
        </button>
      </div>
      <div
        ref={hoverBoxRef}
        className="pointer-events-none fixed hidden rounded-sm"
        style={{
          // Inline styles: embed CSS is scoped under .launchpad-feedback-surface and
          // Tailwind border utilities would not paint reliably on the pick overlay.
          border: "2px solid var(--primary, #00b48a)",
          backgroundColor: "color-mix(in oklab, var(--primary, #00b48a) 14%, transparent)",
          boxSizing: "border-box",
          zIndex: 2,
        }}
        aria-hidden
      />
    </div>
  );

  const portalTarget = getOrCreateEmbedOverlayRoot();
  if (portalTarget) {
    return createPortal(overlay, portalTarget);
  }

  return overlay;
}
