import React, { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  buildCommentAnchor,
  buildCommentAnchorFromBridgePick,
  canAccessIframeDocument,
  clientPointToIframeViewport,
  COMMENT_COMPOSER_LAYOUT,
  computeCommentComposerPosition,
  computeOffsetRatio,
  elementRectToOverlayLocal,
  measureAnchorPinPosition,
  pickElementAtClientPoint,
  scrollIframeToAnchor,
  serializePickedElement,
  viewportRectToOverlayLocal,
} from "@/lib/previewElementAnchor.util";
import {
  callPreviewBridge,
  isPreviewBridgeFrame,
  removeIframeWindowListener,
  subscribePreviewBridgeViewport,
} from "@/lib/previewBridge";
import { ClientLinkCommentComposer } from "./ClientLinkCommentComposer";
import { ClientLinkCommentThreadPanel } from "./ClientLinkCommentThreadPanel";

/** Approximate size for inline thread panel positioning. */
const COMMENT_THREAD_PANEL_LAYOUT = {
  width: 420,
  height: 420,
};

/**
 * Figma-style comment pins and pick-to-comment overlay on the preview iframe.
 * Placement indicators (hover box, pending element outline, pending pin) stay
 * translucent — only ClientLinkCommentComposer / ThreadPanel modals are solid.
 */
export function ClientLinkCommentOverlay({
  iframeRef,
  commentMode = false,
  comments = [],
  focusedCommentId = null,
  onFocusComment,
  onCloseThread,
  pendingPlacement = null,
  onPendingPlacementChange,
  onCreateComment,
  onReply,
  onResolve,
  onReopen,
  onDelete,
  onLogicBodyChange,
  onFixWithAi,
  disabled = false,
}) {
  const overlayRef = useRef(null);
  const composerRef = useRef(null);
  const commentsRef = useRef(comments);
  const refreshPinPositionsRef = useRef(null);
  const [hoverBox, setHoverBox] = useState(null);
  const [pinPositions, setPinPositions] = useState({});
  const rafRef = useRef(0);
  const hoverSeqRef = useRef(0);
  const pinSeqRef = useRef(0);

  commentsRef.current = comments;

  const focusedComment = comments.find((c) => c.id === focusedCommentId) || null;

  const refreshPinPositions = useCallback(() => {
    const iframe = iframeRef?.current;
    const overlay = overlayRef.current;
    if (iframe && overlay && isPreviewBridgeFrame(iframe)) {
      const targets = comments
        .filter((c) => c.anchor?.selector)
        .map((c) => ({ key: c.id, anchor: c.anchor }));
      if (pendingPlacement?.anchor?.selector) {
        targets.push({ key: "__pending", anchor: pendingPlacement.anchor });
      }
      const seq = ++pinSeqRef.current;
      if (!targets.length) {
        setPinPositions({});
        return;
      }
      callPreviewBridge(
        iframe,
        "boxesForSelectors",
        { selectors: targets.map((t) => t.anchor.selector) },
        { timeoutMs: 1500 },
      )
        .then((rects) => {
          if (seq !== pinSeqRef.current || !Array.isArray(rects)) return;
          const next = {};
          targets.forEach((t, i) => {
            const box = viewportRectToOverlayLocal(rects[i], iframe, overlayRef.current);
            if (!box) return;
            const ox = t.anchor.offsetRatio?.x ?? 0.5;
            const oy = t.anchor.offsetRatio?.y ?? 0.5;
            next[t.key] = {
              box,
              pinLeft: box.left + box.width * ox,
              pinTop: box.top + box.height * oy,
            };
          });
          setPinPositions(next);
        })
        .catch(() => {});
      return;
    }
    if (!iframe || !overlay || !canAccessIframeDocument(iframe)) {
      setPinPositions({});
      return;
    }
    const next = {};
    for (const comment of comments) {
      const pos = measureAnchorPinPosition(iframe, overlay, comment.anchor);
      if (pos) next[comment.id] = pos;
    }
    if (pendingPlacement?.anchor) {
      const pos = measureAnchorPinPosition(iframe, overlay, pendingPlacement.anchor);
      if (pos) next.__pending = pos;
    }
    setPinPositions(next);
  }, [iframeRef, comments, pendingPlacement]);

  refreshPinPositionsRef.current = refreshPinPositions;

  useEffect(() => {
    refreshPinPositions();
  }, [refreshPinPositions]);

  useEffect(() => {
    const iframe = iframeRef?.current;
    if (!iframe) return;
    if (!canAccessIframeDocument(iframe)) {
      // Cross-origin subdomain preview: the bridge pushes scroll/resize (and fires on load).
      const onWindowResize = () => refreshPinPositions();
      const unsubscribe = subscribePreviewBridgeViewport(iframe, onWindowResize);
      window.addEventListener("resize", onWindowResize);
      return () => {
        unsubscribe();
        window.removeEventListener("resize", onWindowResize);
      };
    }
    let win;
    try {
      win = iframe.contentWindow;
    } catch {
      return;
    }
    if (!win) return;

    const onScrollOrResize = () => refreshPinPositions();
    win.addEventListener("scroll", onScrollOrResize, true);
    win.addEventListener("resize", onScrollOrResize);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      removeIframeWindowListener(win, "scroll", onScrollOrResize, true);
      removeIframeWindowListener(win, "resize", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [iframeRef, refreshPinPositions, comments, commentMode, pendingPlacement]);

  /** Scroll to focused comment only when focus id changes — not on pin refresh. */
  useEffect(() => {
    if (!focusedCommentId) return;
    const iframe = iframeRef?.current;
    const comment = commentsRef.current.find((c) => c.id === focusedCommentId);
    if (!iframe || !comment?.anchor) return;
    scrollIframeToAnchor(iframe, comment.anchor);
    const t = window.setTimeout(() => {
      refreshPinPositionsRef.current?.();
    }, 350);
    return () => window.clearTimeout(t);
  }, [focusedCommentId, iframeRef]);

  useEffect(() => {
    if (!pendingPlacement) return;
    const t = window.requestAnimationFrame(() => {
      composerRef.current?.focus?.();
    });
    return () => window.cancelAnimationFrame(t);
  }, [pendingPlacement]);

  const pickModeActive = commentMode && !pendingPlacement && !focusedCommentId;

  const scheduleHover = useCallback(
    (clientX, clientY) => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        const iframe = iframeRef?.current;
        const overlay = overlayRef.current;
        if (!pickModeActive || !iframe || !overlay) {
          setHoverBox(null);
          return;
        }
        if (isPreviewBridgeFrame(iframe)) {
          const { x, y } = clientPointToIframeViewport(clientX, clientY, iframe);
          if (x < 0 || y < 0 || x > iframe.clientWidth || y > iframe.clientHeight) {
            setHoverBox(null);
            return;
          }
          const seq = ++hoverSeqRef.current;
          callPreviewBridge(iframe, "pickAt", { x, y }, { timeoutMs: 800 })
            .then((pick) => {
              if (seq !== hoverSeqRef.current) return;
              setHoverBox(
                pick?.context
                  ? viewportRectToOverlayLocal(pick.rect, iframe, overlayRef.current)
                  : null,
              );
            })
            .catch(() => {
              if (seq === hoverSeqRef.current) setHoverBox(null);
            });
          return;
        }
        const picked = pickElementAtClientPoint(iframe, clientX, clientY);
        if (!picked) {
          setHoverBox(null);
          return;
        }
        const box = elementRectToOverlayLocal(picked.el, iframe, overlay);
        setHoverBox(box);
      });
    },
    [pickModeActive, iframeRef],
  );

  const handleClick = (e) => {
    if (!pickModeActive || disabled) return;
    e.preventDefault();
    e.stopPropagation();
    const iframe = iframeRef?.current;
    if (iframe && isPreviewBridgeFrame(iframe)) {
      const point = clientPointToIframeViewport(e.clientX, e.clientY, iframe);
      if (
        point.x < 0 ||
        point.y < 0 ||
        point.x > iframe.clientWidth ||
        point.y > iframe.clientHeight
      ) {
        return;
      }
      callPreviewBridge(iframe, "pickAt", point)
        .then((pick) => {
          const anchor = buildCommentAnchorFromBridgePick(pick, point);
          if (!anchor) return;
          onPendingPlacementChange?.({
            anchor,
            previewPath: anchor.previewPath,
            pinLeft: null,
            pinTop: null,
          });
        })
        .catch(() => {});
      return;
    }
    if (!iframe || !canAccessIframeDocument(iframe)) return;
    const picked = pickElementAtClientPoint(iframe, e.clientX, e.clientY);
    if (!picked) return;
    const serialized = serializePickedElement(picked.el, picked.win);
    if (!serialized) return;
    const offsetRatio = computeOffsetRatio(picked.el, iframe, e.clientX, e.clientY);
    const anchor = buildCommentAnchor(serialized, picked.win, offsetRatio);
    onPendingPlacementChange?.({
      anchor,
      previewPath: anchor.previewPath,
      pinLeft: null,
      pinTop: null,
    });
  };

  const showOverlay = commentMode || Boolean(pendingPlacement) || Boolean(focusedCommentId);

  if (!showOverlay) return null;

  const pendingPos = pinPositions.__pending;
  const pendingElementBox = pendingPos?.box ?? null;
  const composerPosition =
    pendingPlacement && pendingPos && overlayRef.current
      ? computeCommentComposerPosition({
          pinLeft: pendingPos.pinLeft,
          pinTop: pendingPos.pinTop,
          overlayWidth: overlayRef.current.clientWidth,
          overlayHeight: overlayRef.current.clientHeight,
          composerWidth: COMMENT_COMPOSER_LAYOUT.width,
          composerHeight: COMMENT_COMPOSER_LAYOUT.height,
        })
      : null;

  const focusedPos = focusedCommentId ? pinPositions[focusedCommentId] : null;
  const threadPanelPosition =
    focusedComment && focusedPos && overlayRef.current
      ? computeCommentComposerPosition({
          pinLeft: focusedPos.pinLeft,
          pinTop: focusedPos.pinTop,
          overlayWidth: overlayRef.current.clientWidth,
          overlayHeight: overlayRef.current.clientHeight,
          composerWidth: COMMENT_THREAD_PANEL_LAYOUT.width,
          composerHeight: COMMENT_THREAD_PANEL_LAYOUT.height,
        })
      : null;

  return (
    <div
      ref={overlayRef}
      role="presentation"
      className={cn(
        "absolute inset-0 z-[1000004]",
        pickModeActive || pendingPlacement || focusedCommentId
          ? "pointer-events-auto"
          : "pointer-events-none",
        pickModeActive && "cursor-crosshair",
      )}
      onPointerMove={pickModeActive ? (e) => scheduleHover(e.clientX, e.clientY) : undefined}
      onPointerLeave={pickModeActive ? () => setHoverBox(null) : undefined}
      onClick={handleClick}
    >
      {pickModeActive ? (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none absolute top-0 right-0 left-0 border-b border-border bg-muted/95 px-3 py-1.5 text-center text-xs text-muted-foreground"
        >
          Click any element to leave feedback · Esc to exit
        </div>
      ) : null}

      {hoverBox && pickModeActive ? (
        <div
          className="pointer-events-none absolute rounded-sm border-2 border-amber-400 bg-amber-400/10 shadow-[0_0_0_1px_rgba(255,255,255,0.35)]"
          style={{
            left: hoverBox.left,
            top: hoverBox.top,
            width: Math.max(hoverBox.width, 4),
            height: Math.max(hoverBox.height, 4),
          }}
        />
      ) : null}

      {pendingElementBox && pendingPlacement ? (
        <div
          className="pointer-events-none absolute rounded-sm border-2 border-amber-500 bg-amber-500/15 shadow-[0_0_0_1px_rgba(255,255,255,0.35)]"
          style={{
            left: pendingElementBox.left,
            top: pendingElementBox.top,
            width: Math.max(pendingElementBox.width, 4),
            height: Math.max(pendingElementBox.height, 4),
          }}
        />
      ) : null}

      {commentMode
        ? comments.map((comment, index) => {
            const pos = pinPositions[comment.id];
            if (!pos) return null;
            const isFocused = focusedCommentId === comment.id;
            return (
              <button
                key={comment.id}
                type="button"
                className={cn(
                  "pointer-events-auto absolute flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-[11px] font-bold shadow-md transition",
                  comment.status === "resolved"
                    ? "border-muted-foreground/40 bg-muted text-muted-foreground"
                    : "border-amber-500 bg-amber-500 text-white",
                  isFocused && "ring-2 ring-amber-300 ring-offset-2",
                )}
                style={{ left: pos.pinLeft, top: pos.pinTop }}
                title={comment.body}
                aria-label={`Comment ${index + 1}`}
                aria-pressed={isFocused}
                onClick={(e) => {
                  e.stopPropagation();
                  onFocusComment?.(comment.id);
                }}
              >
                {index + 1}
              </button>
            );
          })
        : null}

      {pendingPos ? (
        <div
          className="pointer-events-none absolute size-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed border-amber-500 bg-amber-500/20"
          style={{ left: pendingPos.pinLeft, top: pendingPos.pinTop }}
        />
      ) : null}

      {pendingPlacement && pendingPos && composerPosition ? (
        <div
          className="pointer-events-auto absolute z-[1000007]"
          style={{
            left: composerPosition.left,
            top: composerPosition.top,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <ClientLinkCommentComposer
            ref={composerRef}
            anchor={pendingPlacement.anchor}
            disabled={disabled}
            onCancel={() => onPendingPlacementChange?.(null)}
            onSubmit={async (payload) => {
              await onCreateComment?.({
                anchor: pendingPlacement.anchor,
                previewPath: pendingPlacement.previewPath,
                ...payload,
              });
              onPendingPlacementChange?.(null);
            }}
          />
        </div>
      ) : null}

      {focusedComment && focusedPos && threadPanelPosition ? (
        <div
          className="pointer-events-auto absolute z-[1000007]"
          style={{
            left: threadPanelPosition.left,
            top: threadPanelPosition.top,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <ClientLinkCommentThreadPanel
            comment={focusedComment}
            disabled={disabled}
            onReply={onReply}
            onResolve={onResolve}
            onReopen={onReopen}
            onDelete={async (id) => {
              await onDelete?.(id);
              onCloseThread?.();
            }}
            onClose={onCloseThread}
            onFocusOnPage={undefined}
            onLogicBodyChange={onLogicBodyChange}
            onFixWithAi={onFixWithAi}
          />
        </div>
      ) : null}
    </div>
  );
}
