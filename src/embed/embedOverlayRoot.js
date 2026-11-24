import { getOrCreateEmbedShadowHost } from "@/embed/embedShadowHost.js";

export {
  EMBED_OVERLAY_ROOT_ID,
  EMBED_SURFACE_CLASS,
  EMBED_WIDGET_ROOT_ID,
} from "@/embed/embedConstants.js";

/** Overlay root for modals, selects, and tooltips — always inside the embed shadow tree. */
export function getOrCreateEmbedOverlayRoot() {
  if (typeof document === "undefined") return null;
  const { overlayRoot } = getOrCreateEmbedShadowHost();
  return overlayRoot;
}

/** Bubble-phase only — never use in capture handlers (blocks child clicks). */
export function stopHostPointerPropagation(event) {
  event.stopPropagation();
}
