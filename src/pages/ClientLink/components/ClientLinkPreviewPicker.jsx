import React, { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  canAccessIframeDocument,
  clientPointToIframeViewport,
  elementRectToOverlayLocal,
  measurePinnedBox,
  pickElementAtClientPoint,
  serializePickedElement,
} from "@/lib/previewElementAnchor.util";
import {
  callPreviewBridge,
  isPreviewBridgeFrame,
  removeIframeWindowListener,
} from "@/lib/previewBridge";
import { PreviewReplaceImageButton } from "./PreviewReplaceImageButton";

export {
  canAccessIframeDocument,
  buildSelector,
  buildDomPathString,
  extractReactComponentContext,
  serializePickedElement,
  buildOpeningTagSnippet,
} from "@/lib/previewElementAnchor.util";

export const FOLLOWUP_ELEMENT_USER_SPLIT = "\n\nUser request:\n\n";

/** Canonical header for picked-element follow-ups (must match {@link splitFollowupWithElementContext}). */
export const SELECTED_UI_ELEMENT_PREFIX = "[Selected UI element — edit this in the codebase]";

/** @deprecated Legacy header — kept so older chat messages still render as chips. */
export const SELECTED_UI_ELEMENT_PREFIX_LEGACY = "[Selected UI element — context for the AI]";

export function formatPickedElementForPrompt(ctx) {
  if (!ctx) return "";
  const reactStack = Array.isArray(ctx.reactComponentStack)
    ? ctx.reactComponentStack.filter(Boolean)
    : [];
  const sourceLoc =
    ctx.reactSourceFile && ctx.reactSourceLine
      ? `${ctx.reactSourceFile}:${ctx.reactSourceLine}`
      : ctx.reactSourceFile || "";

  const hint =
    ctx.componentHint ||
    [
      ctx.dataComponent && `data-component="${ctx.dataComponent}"`,
      ctx.dataTestId && `data-testid="${ctx.dataTestId}"`,
    ]
      .filter(Boolean)
      .join(", ");

  const lines = [
    SELECTED_UI_ELEMENT_PREFIX,
    reactStack.length ? `- React component stack (inner → outer): ${reactStack.join(" → ")}` : null,
    sourceLoc ? `- Likely source file (dev): ${sourceLoc}` : null,
    `- Preview route: ${ctx.path || "(unknown)"}`,
    `- CSS selector: ${ctx.selector || "(none)"}`,
    `- DOM path: ${ctx.domPath || "(none)"}`,
    `- Tag: ${ctx.tag}`,
    ctx.id ? `- id: ${ctx.id}` : null,
    ctx.className ? `- class: ${ctx.className}` : null,
    ctx.parentSummary ? `- Parent: ${ctx.parentSummary}` : null,
    hint ? `- Test/component hint: ${hint}` : null,
    ctx.textPreview ? `- Visible text: ${JSON.stringify(ctx.textPreview)}` : null,
    ctx.replacementKind ? `- Image replace mode: ${ctx.replacementKind}` : null,
    ctx.assetSrcHint ? `- Asset src hint: ${ctx.assetSrcHint}` : null,
    reactStack.length
      ? `- Scope: change only \`${reactStack[0]}\` (and its styles/imports) unless the user asks for more.`
      : `- Scope: prefer the smallest component file matching the selector above.`,
    ctx.replacementKind ? `- Target asset path: store under src/assets/ and update imports.` : null,
    "",
    "User request:",
  ];
  return lines.filter((x) => x != null).join("\n");
}

/** Full technical context for tooltips (no trailing “User request” line). */
export function formatPickedElementTooltipBody(ctx) {
  if (!ctx) return "";
  const base = formatPickedElementForPrompt(ctx)
    .replace(/\nUser request:\s*$/, "")
    .trim();
  const extras = [];
  if (ctx.outerHTML) extras.push(`HTML (truncated): ${ctx.outerHTML}`);
  if (ctx.computedStyles) {
    extras.push(`Computed styles: ${JSON.stringify(ctx.computedStyles)}`);
  }
  return extras.length ? `${base}\n\n${extras.join("\n")}` : base;
}

/**
 * Rebuild inspector fields from a stored `[Selected UI element…]` block (before user text).
 */
export function parseContextBlockToInspectorCtx(block) {
  if (typeof block !== "string" || !block.trim()) return null;
  const ctx = {
    path: "",
    selector: "",
    tag: "element",
    id: "",
    className: "",
    role: "",
    ariaLabel: "",
    href: "",
    componentHint: "",
    dataComponent: "",
    dataTestId: "",
    dataCy: "",
    textPreview: "",
    outerHTML: "",
    domPath: "",
    computedStyles: null,
    replacementKind: null,
    assetSrcHint: "",
    reactComponentStack: [],
    reactSourceFile: "",
    reactSourceLine: null,
    parentSummary: "",
  };
  const lines = block.split("\n");
  for (const line of lines) {
    if (!line.startsWith("- ")) continue;
    const rest = line.slice(2);
    const sep = rest.indexOf(": ");
    if (sep === -1) continue;
    const key = rest.slice(0, sep).trim();
    let val = rest.slice(sep + 2).trim();

    if (key.startsWith("React component stack")) {
      ctx.reactComponentStack = val
        .split("→")
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (key.startsWith("Likely source file")) {
      const loc = val.match(/^(.+):(\d+)$/);
      if (loc) {
        ctx.reactSourceFile = loc[1];
        ctx.reactSourceLine = Number(loc[2]);
      } else {
        ctx.reactSourceFile = val;
      }
    } else if (key.startsWith("Preview route") || key.startsWith("Preview URL path")) {
      ctx.path = val;
    } else if (key.startsWith("CSS selector")) ctx.selector = val;
    else if (key === "Tag") ctx.tag = val;
    else if (key === "id") ctx.id = val;
    else if (key === "class") ctx.className = val;
    else if (key === "role") ctx.role = val;
    else if (key === "aria-label") ctx.ariaLabel = val;
    else if (key === "href") ctx.href = val;
    else if (key === "Parent") ctx.parentSummary = val;
    else if (key.startsWith("Test/component hint") || key.startsWith("Component / test hint")) {
      ctx.componentHint = val;
    } else if (key === "data-component") ctx.dataComponent = val;
    else if (key === "data-testid") ctx.dataTestId = val;
    else if (key === "data-cy") ctx.dataCy = val;
    else if (key.startsWith("DOM path")) ctx.domPath = val;
    else if (key.startsWith("Visible text")) {
      try {
        ctx.textPreview = JSON.parse(val);
      } catch {
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          ctx.textPreview = val.slice(1, -1).replace(/\\"/g, '"');
        } else {
          ctx.textPreview = val;
        }
      }
    } else if (key.startsWith("HTML (truncated)")) ctx.outerHTML = val;
    else if (key.startsWith("Image replace mode")) ctx.replacementKind = val;
    else if (key.startsWith("Asset src hint") || key.startsWith("Preview asset URL hint")) {
      ctx.assetSrcHint = val;
    } else if (key.startsWith("Computed styles (snapshot)")) {
      try {
        ctx.computedStyles = JSON.parse(val);
      } catch {
        ctx.computedStyles = null;
      }
    }
  }
  return ctx;
}

/**
 * Split a sent follow-up that included element context from {@link formatPickedElementForPrompt}.
 * Tolerates older/alternate spacing around the "User request:" delimiter.
 */
export function splitFollowupWithElementContext(fullText) {
  if (typeof fullText !== "string") return null;
  const text = fullText.replace(/\r\n/g, "\n");
  const matchedPrefix = [SELECTED_UI_ELEMENT_PREFIX, SELECTED_UI_ELEMENT_PREFIX_LEGACY].find(
    (prefix) => text.startsWith(prefix),
  );
  if (!matchedPrefix) return null;

  let contextBlock = "";
  let userText = "";
  const canonical = text.indexOf(FOLLOWUP_ELEMENT_USER_SPLIT);
  if (canonical !== -1) {
    contextBlock = text.slice(0, canonical).trim();
    userText = text.slice(canonical + FOLLOWUP_ELEMENT_USER_SPLIT.length).trim();
  } else {
    const loose = text.match(/\n+User request:\s*\n*/);
    if (!loose || loose.index == null) return null;
    contextBlock = text.slice(0, loose.index).trim();
    userText = text.slice(loose.index + loose[0].length).trim();
  }

  const inspectorCtx = parseContextBlockToInspectorCtx(contextBlock);
  const stackTag = inspectorCtx?.reactComponentStack?.[0];
  const tagM = contextBlock.match(/- Tag:\s*(\S+)/);
  const tag = stackTag || (tagM ? tagM[1] : "element");
  return { contextBlock, userText, tag, inspectorCtx };
}

export function ClientLinkPreviewPicker({
  iframeRef,
  active,
  pinned,
  onPinnedChange,
  onReplaceImageResult,
  onReplacementStagedForRepo,
  clientLinkAiSvgContext = null,
  existingRevertSnapshot = null,
}) {
  const overlayRef = useRef(null);
  const [hoverBox, setHoverBox] = useState(null);
  const [hoverTag, setHoverTag] = useState("");
  const [pinnedBox, setPinnedBox] = useState(null);
  const rafRef = useRef(0);
  const pickSeqRef = useRef(0);

  /** Bridge rects are in the iframe viewport; map them onto the overlay. */
  const bridgeRectToOverlay = (iframe, overlay, rect) => {
    if (!rect || !iframe || !overlay) return null;
    const iframeRect = iframe.getBoundingClientRect();
    const overlayRect = overlay.getBoundingClientRect();
    return {
      left: iframeRect.left + iframe.clientLeft + rect.left - overlayRect.left,
      top: iframeRect.top + iframe.clientTop + rect.top - overlayRect.top,
      width: rect.width,
      height: rect.height,
    };
  };

  const updateHoverFromEvent = useCallback(
    (clientX, clientY) => {
      const iframe = iframeRef?.current;
      const overlay = overlayRef.current;
      if (!active || !iframe || !overlay) {
        setHoverBox(null);
        setHoverTag("");
        return;
      }
      const { x, y } = clientPointToIframeViewport(clientX, clientY, iframe);
      if (x < 0 || y < 0 || x > iframe.clientWidth || y > iframe.clientHeight) {
        setHoverBox(null);
        setHoverTag("");
        return;
      }
      if (canAccessIframeDocument(iframe)) {
        const picked = pickElementAtClientPoint(iframe, clientX, clientY);
        if (!picked) {
          setHoverBox(null);
          setHoverTag("");
          return;
        }
        const box = elementRectToOverlayLocal(picked.el, iframe, overlay);
        if (!box) {
          setHoverBox(null);
          setHoverTag("");
          return;
        }
        setHoverBox(box);
        setHoverTag(picked.el.tagName?.toLowerCase() || "");
        return;
      }
      if (!isPreviewBridgeFrame(iframe)) {
        setHoverBox(null);
        setHoverTag("");
        return;
      }
      const seq = ++pickSeqRef.current;
      callPreviewBridge(iframe, "pickAt", { x, y }, { timeoutMs: 800 })
        .then((result) => {
          if (seq !== pickSeqRef.current) return;
          const picked = result && typeof result === "object" ? result : null;
          const box = bridgeRectToOverlay(iframe, overlayRef.current, picked?.rect);
          if (!picked?.context || !box) {
            setHoverBox(null);
            setHoverTag("");
            return;
          }
          setHoverBox(box);
          setHoverTag(picked.context.tag || "");
        })
        .catch(() => {
          if (seq === pickSeqRef.current) {
            setHoverBox(null);
            setHoverTag("");
          }
        });
    },
    [active, iframeRef],
  );

  const scheduleHover = useCallback(
    (clientX, clientY) => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        updateHoverFromEvent(clientX, clientY);
      });
    },
    [updateHoverFromEvent],
  );

  useEffect(() => {
    if (!active) {
      setHoverBox(null);
      setHoverTag("");
    }
  }, [active]);

  const refreshPinnedBox = useCallback(() => {
    const iframe = iframeRef?.current;
    const overlay = overlayRef.current;
    if (!pinned?.selector?.trim() || !iframe || !overlay) {
      setPinnedBox(null);
      return;
    }
    if (canAccessIframeDocument(iframe)) {
      setPinnedBox(measurePinnedBox(iframe, overlay, pinned.selector));
      return;
    }
    if (!isPreviewBridgeFrame(iframe)) {
      setPinnedBox(null);
      return;
    }
    callPreviewBridge(iframe, "boxForSelector", { selector: pinned.selector }, { timeoutMs: 800 })
      .then((rect) => {
        setPinnedBox(bridgeRectToOverlay(iframe, overlayRef.current, rect));
      })
      .catch(() => setPinnedBox(null));
  }, [iframeRef, pinned?.selector]);

  useEffect(() => {
    refreshPinnedBox();
  }, [refreshPinnedBox, pinned]);

  useEffect(() => {
    const iframe = iframeRef?.current;
    const tracking = active || Boolean(pinned?.selector?.trim());
    if (!tracking || !iframe || !canAccessIframeDocument(iframe)) return;

    let win;
    try {
      win = iframe.contentWindow;
    } catch {
      return;
    }
    if (!win) return;

    const onScroll = () => {
      refreshPinnedBox();
      if (active) {
        const last = lastPointerRef.current;
        if (last) scheduleHover(last.x, last.y);
      }
    };

    win.addEventListener("scroll", onScroll, true);
    const onResize = () => {
      refreshPinnedBox();
      if (active) {
        const last = lastPointerRef.current;
        if (last) scheduleHover(last.x, last.y);
      }
    };
    win.addEventListener("resize", onResize);
    window.addEventListener("resize", onResize);
    return () => {
      removeIframeWindowListener(win, "scroll", onScroll, true);
      removeIframeWindowListener(win, "resize", onResize);
      window.removeEventListener("resize", onResize);
    };
  }, [active, pinned?.selector, iframeRef, scheduleHover, refreshPinnedBox]);

  const lastPointerRef = useRef(null);

  const handlePointerMove = (e) => {
    if (!active) return;
    lastPointerRef.current = { x: e.clientX, y: e.clientY };
    scheduleHover(e.clientX, e.clientY);
  };

  const handlePointerLeave = () => {
    lastPointerRef.current = null;
    setHoverBox(null);
    setHoverTag("");
  };

  const handleClick = (e) => {
    if (!active) return;
    e.preventDefault();
    e.stopPropagation();
    const iframe = iframeRef?.current;
    if (!iframe) return;

    if (canAccessIframeDocument(iframe)) {
      const picked = pickElementAtClientPoint(iframe, e.clientX, e.clientY);
      if (!picked) return;
      const serialized = serializePickedElement(picked.el, picked.win);
      if (serialized) onPinnedChange?.(serialized);
      return;
    }
    if (!isPreviewBridgeFrame(iframe)) return;
    const { x, y } = clientPointToIframeViewport(e.clientX, e.clientY, iframe);
    callPreviewBridge(iframe, "pickAt", { x, y })
      .then((result) => {
        const ctx = result && typeof result === "object" ? result.context : null;
        if (ctx) onPinnedChange?.(ctx);
      })
      .catch(() => {});
  };

  const showOverlay = active || Boolean(pinned?.selector?.trim());
  if (!showOverlay) return null;

  const iframe = iframeRef?.current;
  const iframeOk = iframe && canAccessIframeDocument(iframe);

  return (
    <div
      ref={overlayRef}
      role="presentation"
      className={cn(
        "absolute inset-0 z-[1000005]",
        active ? "pointer-events-auto cursor-crosshair" : "pointer-events-none",
      )}
      onPointerMove={active ? handlePointerMove : undefined}
      onPointerLeave={active ? handlePointerLeave : undefined}
      onClick={active ? handleClick : undefined}
    >
      {pinnedBox ? (
        <div
          className="pointer-events-none absolute rounded-sm border-2 border-emerald-400/90 bg-emerald-400/10 shadow-[0_0_0_1px_rgba(255,255,255,0.35)]"
          style={{
            left: pinnedBox.left,
            top: pinnedBox.top,
            width: Math.max(pinnedBox.width, 4),
            height: Math.max(pinnedBox.height, 4),
          }}
        />
      ) : null}
      {pinnedBox && pinned?.replacementKind && iframeOk ? (
        <div
          className="pointer-events-auto absolute z-[1000006]"
          style={{
            left: Math.max(0, pinnedBox.left + Math.max(pinnedBox.width, 4) - 280),
            top: pinnedBox.top + Math.max(pinnedBox.height, 4) + 8,
          }}
        >
          <PreviewReplaceImageButton
            iframeRef={iframeRef}
            context={pinned}
            onResult={onReplaceImageResult}
            onStagedForRepo={onReplacementStagedForRepo}
            clientLinkAiSvgContext={clientLinkAiSvgContext}
            existingRevertSnapshot={existingRevertSnapshot}
          />
        </div>
      ) : null}
      {hoverBox && (
        <>
          <div
            className="pointer-events-none absolute rounded-sm border-2 border-violet-500 bg-violet-500/10 shadow-[0_0_0_1px_rgba(255,255,255,0.4)]"
            style={{
              left: hoverBox.left,
              top: hoverBox.top,
              width: Math.max(hoverBox.width, 4),
              height: Math.max(hoverBox.height, 4),
            }}
          />
          {hoverTag ? (
            <div
              className="pointer-events-none absolute rounded-md border border-white/20 bg-linear-to-r from-violet-600/95 to-indigo-600/95 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow-lg"
              style={{
                left: hoverBox.left,
                top: Math.max(0, hoverBox.top - 24),
              }}
            >
              {hoverTag}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

export { applyPreviewImageReplacement } from "@/lib/previewImageReplace";
