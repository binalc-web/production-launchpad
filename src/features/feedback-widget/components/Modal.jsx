import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { EmbedPortalContainerProvider } from "@/embed/EmbedPortalContainerContext.jsx";
import {
  EMBED_SURFACE_CLASS,
  getOrCreateEmbedOverlayRoot,
  stopHostPointerPropagation,
} from "@/embed/embedOverlayRoot.js";

/** Above host modals and the embed Report Issue tab (2147483000). */
const EMBED_MODAL_Z_CLASS = "z-[2147483001]";

function mayCloseOverlay(allowOverlayClose) {
  return typeof allowOverlayClose !== "function" || allowOverlayClose();
}

function isBackdropClick(event, panelEl) {
  if (!panelEl) return false;
  const rect = panelEl.getBoundingClientRect();
  const { clientX, clientY } = event;
  return clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom;
}

function handleDialogBackdropPointerDown(event, allowOverlayClose, onClose) {
  const panelEl = event.currentTarget.querySelector("[data-feedback-widget-panel]");
  if (isBackdropClick(event, panelEl) && mayCloseOverlay(allowOverlayClose)) {
    onClose();
    return;
  }
  stopHostPointerPropagation(event);
}

const Modal = ({ isOpen, onClose, children, allowOverlayClose, elevatedLayer = false }) => {
  const dialogRef = useRef(null);
  const [dialogEl, setDialogEl] = useState(null);

  const setDialogRef = useCallback((node) => {
    dialogRef.current = node;
    setDialogEl(node);
  }, []);

  useEffect(() => {
    if (elevatedLayer) return undefined;
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen, elevatedLayer]);

  useLayoutEffect(() => {
    if (!elevatedLayer) return undefined;
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    if (isOpen) {
      if (!dialog.open) {
        try {
          dialog.showModal();
        } catch {
          /* already open */
        }
      }
    } else if (dialog.open) {
      dialog.close();
    }
    return undefined;
  }, [isOpen, elevatedLayer]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key !== "Escape" || !isOpen) return;
      if (!mayCloseOverlay(allowOverlayClose)) return;
      if (elevatedLayer) {
        e.preventDefault();
        e.stopPropagation();
      }
      onClose();
    };

    document.addEventListener("keydown", handleEscape, true);
    return () => document.removeEventListener("keydown", handleEscape, true);
  }, [isOpen, onClose, allowOverlayClose, elevatedLayer]);

  if (!isOpen) return null;

  const panel = (
    <div
      data-feedback-widget-panel
      className="pointer-events-auto flex h-[90vh] max-h-[900px] w-[95vw] max-w-[1800px] flex-col overflow-hidden rounded-xl bg-white shadow-[0_20px_60px_rgba(0,0,0,0.3)] animate-in fade-in-0 slide-in-from-bottom-[50px] duration-300 max-md:max-h-[95vh] max-md:w-[95%]"
      onPointerDown={stopHostPointerPropagation}
      onMouseDown={stopHostPointerPropagation}
      onClick={stopHostPointerPropagation}
    >
      {elevatedLayer && dialogEl ? (
        <EmbedPortalContainerProvider container={dialogEl}>{children}</EmbedPortalContainerProvider>
      ) : (
        children
      )}
    </div>
  );

  if (elevatedLayer) {
    const overlayRoot = getOrCreateEmbedOverlayRoot();
    if (!overlayRoot) return null;

    const dialog = (
      <dialog
        ref={setDialogRef}
        data-feedback-widget-overlay
        className={cn(
          EMBED_SURFACE_CLASS,
          "launchpad-feedback-dialog pointer-events-auto m-0 flex h-full max-h-none w-full max-w-none items-center justify-center border-0 bg-transparent p-4 backdrop:bg-black/50",
          EMBED_MODAL_Z_CLASS,
        )}
        onPointerDown={(e) => handleDialogBackdropPointerDown(e, allowOverlayClose, onClose)}
        onMouseDown={stopHostPointerPropagation}
        onClick={stopHostPointerPropagation}
        onCancel={(e) => {
          e.preventDefault();
          if (mayCloseOverlay(allowOverlayClose)) onClose();
        }}
      >
        {panel}
      </dialog>
    );

    return createPortal(dialog, overlayRoot);
  }

  const handleOverlayClick = (e) => {
    if (e.target !== e.currentTarget) return;
    if (mayCloseOverlay(allowOverlayClose)) onClose();
  };

  const overlay = (
    <div
      data-feedback-widget-overlay
      className={cn(
        "pointer-events-auto fixed inset-0 flex h-full w-full animate-in fade-in-0 duration-200 items-center justify-center bg-black/50 z-[1000000]",
      )}
      onPointerDown={stopHostPointerPropagation}
      onMouseDown={stopHostPointerPropagation}
      onClick={handleOverlayClick}
    >
      {panel}
    </div>
  );

  return createPortal(overlay, document.body);
};

export default Modal;
