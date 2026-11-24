import React, { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

let mermaidInitPromise = null;

/** Fixed font stack — avoids inherit leaking report typography into/out of charts. */
const MERMAID_FONT_FAMILY =
  'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

/** Host styles injected into each chart shadow root. */
const SHADOW_HOST_STYLES = `
  :host {
    display: block;
    contain: layout style paint;
    isolation: isolate;
  }
  .mermaid-chart-root {
    display: flex;
    justify-content: center;
    overflow-x: auto;
    width: 100%;
  }
`;

/** Lazy-init mermaid once with theme from document class. */
async function getMermaid() {
  if (!mermaidInitPromise) {
    mermaidInitPromise = import("mermaid").then(({ default: mermaid }) => {
      const isDark =
        typeof document !== "undefined" && document.documentElement.classList.contains("dark");
      mermaid.initialize({
        startOnLoad: false,
        theme: isDark ? "dark" : "default",
        securityLevel: "strict",
        fontFamily: MERMAID_FONT_FAMILY,
      });
      return mermaid;
    });
  }
  return mermaidInitPromise;
}

/** Remove Mermaid measurement nodes that can affect page layout outside the chart. */
function cleanupMermaidTempNodes(diagramId) {
  if (typeof document === "undefined") return;
  const tempId = `d${diagramId}`;
  document.getElementById(tempId)?.remove();
  document.querySelector(`[id="${diagramId}"]`)?.remove();
}

/**
 * Renders a mermaid diagram from fenced markdown source inside an isolated shadow root.
 * @param {{ source: string, className?: string }} props
 */
export function MermaidDiagram({ source, className }) {
  const hostRef = useRef(null);
  const shadowRef = useRef(null);
  const reactId = useId();
  const diagramId = `mermaid-${reactId.replace(/:/g, "")}`;
  const [failed, setFailed] = useState(false);
  const chartText = String(source ?? "").trim();

  useEffect(() => {
    if (!chartText || !hostRef.current) return undefined;
    let cancelled = false;

    const render = async () => {
      try {
        const mermaid = await getMermaid();
        if (cancelled || !hostRef.current) return;

        const { svg } = await mermaid.render(diagramId, chartText);
        cleanupMermaidTempNodes(diagramId);

        if (cancelled || !hostRef.current) return;

        if (!shadowRef.current) {
          shadowRef.current = hostRef.current.attachShadow({ mode: "open" });
        }

        const shadow = shadowRef.current;
        shadow.innerHTML = `<style>${SHADOW_HOST_STYLES}</style><div class="mermaid-chart-root">${svg}</div>`;
        setFailed(false);
      } catch {
        cleanupMermaidTempNodes(diagramId);
        if (!cancelled) setFailed(true);
      }
    };

    void render();
    return () => {
      cancelled = true;
      cleanupMermaidTempNodes(diagramId);
    };
  }, [chartText, diagramId]);

  if (!chartText) return null;

  if (failed) {
    return (
      <pre
        className={cn(
          "my-3 overflow-x-auto rounded-md border border-border bg-muted/30 p-3 text-xs",
          className,
        )}
      >
        <code>{chartText}</code>
      </pre>
    );
  }

  return (
    <div
      ref={hostRef}
      className={cn("my-3 isolate contain-layout overflow-x-auto", className)}
      aria-label="Diagram"
    />
  );
}
