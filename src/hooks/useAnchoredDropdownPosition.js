import { useCallback, useEffect, useLayoutEffect, useState } from "react";

const VIEWPORT_PADDING = 8;
const GAP = 4;

/**
 * Prefer drawer/dialog shells so portaled menus stay interactive inside modal surfaces.
 * @param {HTMLElement|null|undefined} containerEl
 */
export function resolveDropdownPortalRoot(containerEl) {
  if (!containerEl) return null;
  return (
    containerEl.closest('[data-slot="drawer-content"]') ??
    containerEl.closest('[data-slot="dialog-content"]') ??
    containerEl.closest('[data-slot="sheet-content"]') ??
    containerEl.closest("[data-branch-picker-host]") ??
    document.body
  );
}

/**
 * @param {HTMLElement} anchor
 * @param {HTMLElement|null|undefined} menu
 * @param {HTMLElement|null|undefined} portalRoot
 * @param {number} maxHeight
 */
export function computeDropdownStyle(anchor, menu, portalRoot, maxHeight) {
  const rect = anchor.getBoundingClientRect();
  const measuredHeight = menu?.offsetHeight ?? maxHeight;
  const width = Math.min(rect.width, window.innerWidth - VIEWPORT_PADDING * 2);

  if (portalRoot && portalRoot !== document.body) {
    const rootRect = portalRoot.getBoundingClientRect();
    const left = Math.min(
      Math.max(0, rect.left - rootRect.left),
      Math.max(0, rootRect.width - width),
    );
    const spaceBelow = rootRect.bottom - rect.bottom - GAP;
    const spaceAbove = rect.top - rootRect.top - GAP;
    const openAbove = spaceBelow < Math.min(measuredHeight, maxHeight) && spaceAbove > spaceBelow;
    const available = openAbove ? spaceAbove : spaceBelow;
    const resolvedMaxHeight = Math.max(120, Math.min(maxHeight, available));

    return {
      position: "absolute",
      top: openAbove ? rect.top - rootRect.top - GAP : rect.bottom - rootRect.top + GAP,
      left,
      width,
      transform: openAbove ? "translateY(-100%)" : undefined,
      zIndex: 100,
      maxHeight: resolvedMaxHeight,
    };
  }

  const left = Math.min(
    Math.max(VIEWPORT_PADDING, rect.left),
    window.innerWidth - width - VIEWPORT_PADDING,
  );
  const spaceBelow = window.innerHeight - rect.bottom - GAP - VIEWPORT_PADDING;
  const spaceAbove = rect.top - GAP - VIEWPORT_PADDING;
  const openAbove = spaceBelow < Math.min(measuredHeight, maxHeight) && spaceAbove > spaceBelow;
  const available = openAbove ? spaceAbove : spaceBelow;
  const resolvedMaxHeight = Math.max(120, Math.min(maxHeight, available));

  return {
    position: "fixed",
    top: openAbove ? rect.top - GAP : rect.bottom + GAP,
    left,
    width,
    transform: openAbove ? "translateY(-100%)" : undefined,
    zIndex: 9999,
    maxHeight: resolvedMaxHeight,
  };
}

/** @deprecated Use resolveDropdownPortalRoot during render instead. */
export function useDropdownPortalRoot(open, containerRef) {
  const [portalRoot, setPortalRoot] = useState(null);

  useLayoutEffect(() => {
    if (!open) {
      setPortalRoot(null);
      return;
    }
    setPortalRoot(resolveDropdownPortalRoot(containerRef.current));
  }, [open, containerRef]);

  return portalRoot;
}

/**
 * Fixed positioning for dropdown menus so they render above overflow-hidden ancestors.
 * @param {object} options
 * @param {boolean} options.open
 * @param {import('react').RefObject<HTMLElement|null>} options.anchorRef
 * @param {import('react').RefObject<HTMLElement|null>} options.menuRef
 * @param {import('react').RefObject<HTMLElement|null|undefined>} [options.portalRootRef]
 * @param {number} [options.maxHeight]
 * @param {unknown[]} [options.deps] Re-measure when dropdown content changes.
 */
export function useAnchoredDropdownPosition({
  open,
  anchorRef,
  menuRef,
  portalRootRef,
  maxHeight = 192,
  deps = [],
}) {
  const [style, setStyle] = useState(null);

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor || !open) return;
    const portalRoot = portalRootRef?.current ?? document.body;
    setStyle(computeDropdownStyle(anchor, menuRef.current, portalRoot, maxHeight));
  }, [open, anchorRef, menuRef, portalRootRef, maxHeight]);

  useLayoutEffect(() => {
    if (!open) {
      setStyle(null);
      return undefined;
    }

    updatePosition();
    const frame = window.requestAnimationFrame(updatePosition);

    const onScrollOrResize = () => updatePosition();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps are intentional content triggers
  }, [open, updatePosition, ...deps]);

  return style;
}

/**
 * Keep wheel scrolling inside the dropdown instead of chaining to a parent drawer.
 * @param {WheelEvent} event
 * @param {import('react').RefObject<HTMLElement|null>} menuRef
 */
export function scrollAnchoredDropdownWheel(event, menuRef) {
  const node = menuRef.current;
  if (!node || !node.contains(event.target)) return;

  const { scrollTop, scrollHeight, clientHeight } = node;
  if (scrollHeight <= clientHeight + 1) return;

  event.preventDefault();
  event.stopPropagation();

  const maxScrollTop = scrollHeight - clientHeight;
  node.scrollTop = Math.max(0, Math.min(scrollTop + event.deltaY, maxScrollTop));
}

/** @deprecated Use scrollAnchoredDropdownWheel via useAnchoredDropdownWheel */
export function handleAnchoredDropdownWheel(event, menuRef) {
  scrollAnchoredDropdownWheel(event, menuRef);
}

/**
 * Native non-passive wheel listener so scrolling works over nested buttons.
 * @param {import('react').RefObject<HTMLElement|null>} menuRef
 * @param {boolean} open
 * @param {unknown[]} [deps]
 */
export function useAnchoredDropdownWheel(menuRef, open, deps = []) {
  useEffect(() => {
    if (!open) return undefined;
    const node = menuRef.current;
    if (!node) return undefined;

    const onWheel = (event) => scrollAnchoredDropdownWheel(event, menuRef);
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [open, menuRef, ...deps]);
}
