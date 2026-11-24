import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  canAccessIframeDocument,
  pickElementAtClientPoint,
  serializePickedElement,
} from "@/lib/previewElementAnchor.util";
import { formatPickedElementForPrompt } from "@/pages/ClientLink/components/ClientLinkPreviewPicker";
import { Crosshair, Loader2, X } from "lucide-react";

/**
 * Visual component picker for Send Feedback — reuses preview iframe element serialization.
 */
export function FeedbackComponentPicker({
  iframeRef,
  disabled = false,
  value = null,
  onChange,
  className,
}) {
  const [picking, setPicking] = useState(false);
  const [hoverBox, setHoverBox] = useState(null);
  const overlayRef = useRef(null);
  const rafRef = useRef(0);

  const iframeAccessible = canAccessIframeDocument(iframeRef?.current);

  const stopPicking = useCallback(() => {
    setPicking(false);
    setHoverBox(null);
  }, []);

  useEffect(() => {
    if (!picking) return undefined;

    const onKey = (e) => {
      if (e.key === "Escape") stopPicking();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [picking, stopPicking]);

  const scheduleHover = useCallback(
    (clientX, clientY) => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        const iframe = iframeRef?.current;
        if (!picking || !iframe) {
          setHoverBox(null);
          return;
        }
        const picked = pickElementAtClientPoint(iframe, clientX, clientY);
        if (!picked?.el) {
          setHoverBox(null);
          return;
        }
        const iframeRect = iframe.getBoundingClientRect();
        const er = picked.el.getBoundingClientRect();
        setHoverBox({
          left: iframeRect.left + er.left,
          top: iframeRect.top + er.top,
          width: er.width,
          height: er.height,
        });
      });
    },
    [iframeRef, picking],
  );

  const handlePointerMove = useCallback(
    (e) => {
      if (!picking) return;
      scheduleHover(e.clientX, e.clientY);
    },
    [picking, scheduleHover],
  );

  const handlePointerDown = useCallback(
    (e) => {
      if (!picking) return;
      e.preventDefault();
      e.stopPropagation();
      const iframe = iframeRef?.current;
      if (!iframe) return;
      const picked = pickElementAtClientPoint(iframe, e.clientX, e.clientY);
      if (!picked?.el) return;
      let win;
      try {
        win = iframe.contentWindow;
      } catch {
        win = undefined;
      }
      const serialized = serializePickedElement(picked.el, win);
      if (serialized) onChange?.(serialized);
      stopPicking();
    },
    [iframeRef, onChange, picking, stopPicking],
  );

  const primaryLabel =
    value?.reactComponentStack?.[0] || value?.componentHint || value?.tag || "Component";

  if (!iframeAccessible) {
    return (
      <p className={cn("text-xs text-muted-foreground", className)}>
        Component pick needs a live preview connection on the same page.
      </p>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant={picking ? "default" : "outline"}
          size="sm"
          className="gap-1.5"
          disabled={disabled}
          onClick={() => setPicking((p) => !p)}
        >
          {picking ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <Crosshair className="size-3.5" aria-hidden />
          )}
          {picking ? "Click a component…" : "Pick component on page"}
        </Button>
        {value ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-muted-foreground"
            disabled={disabled}
            onClick={() => onChange?.(null)}
          >
            <X className="size-3.5" aria-hidden />
            Clear
          </Button>
        ) : null}
      </div>

      {value ? (
        <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
          <p className="font-medium text-foreground">{primaryLabel}</p>
          {value.reactSourceFile ? (
            <p className="mt-1 font-mono text-[11px]">
              {value.reactSourceFile}
              {value.reactSourceLine != null ? `:${value.reactSourceLine}` : ""}
            </p>
          ) : null}
          {value.selector ? (
            <p className="mt-1 truncate font-mono text-[11px]" title={value.selector}>
              {value.selector}
            </p>
          ) : null}
          {value.textPreview ? (
            <p className="mt-1 line-clamp-2 text-[11px]">&ldquo;{value.textPreview}&rdquo;</p>
          ) : null}
        </div>
      ) : null}

      {picking ? (
        <div
          ref={overlayRef}
          className="fixed inset-0 z-[2147483002] cursor-crosshair"
          role="presentation"
          onPointerMove={handlePointerMove}
          onPointerDown={handlePointerDown}
        >
          {hoverBox ? (
            <div
              className="pointer-events-none fixed rounded-sm border-2 border-primary bg-primary/10"
              style={{
                left: hoverBox.left,
                top: hoverBox.top,
                width: hoverBox.width,
                height: hoverBox.height,
              }}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** Build description with component context block prepended once. */
export function buildDescriptionWithComponentAnchor(userDescription, componentAnchor) {
  const body = String(userDescription || "").trim();
  if (!componentAnchor) return body;
  const block = formatPickedElementForPrompt(componentAnchor);
  if (!block) return body;
  if (body.includes(block)) return body;
  return body ? `${block}\n\n${body}` : block;
}
