import { useEffect, useRef } from "react";
import { useNodes, useReactFlow } from "@xyflow/react";

/**
 * Pans and zooms the graph to fit tour-highlighted nodes after layout completes.
 * @param {string[]} tourResolvedNodeIds — canvas-visible node ids for the active step
 */
export function ArchitectureTourFitView({ tourResolvedNodeIds }) {
  const { fitView, getInternalNode } = useReactFlow();
  const nodes = useNodes();
  const fittedKeyRef = useRef("");
  const fallbackKeyRef = useRef("");

  useEffect(() => {
    const targetKey = tourResolvedNodeIds.join("\n");
    if (targetKey === "") {
      fittedKeyRef.current = "";
      fallbackKeyRef.current = "";
      return undefined;
    }
    if (targetKey === fittedKeyRef.current) return undefined;

    const maxFrames = 240;
    let frame = 0;
    let cancelled = false;
    let rafId = 0;

    const tick = () => {
      if (cancelled) return;

      let ready = true;
      for (const id of tourResolvedNodeIds) {
        const internal = getInternalNode(id);
        if (!internal?.measured?.width || !internal?.measured?.height) {
          ready = false;
          break;
        }
      }

      if (ready) {
        fitView({
          nodes: tourResolvedNodeIds.map((id) => ({ id })),
          duration: 500,
          padding: 0.3,
          maxZoom: 1.2,
          minZoom: 0.4,
        });
        fittedKeyRef.current = targetKey;
        fallbackKeyRef.current = "";
        return;
      }

      if (++frame < maxFrames) {
        rafId = requestAnimationFrame(tick);
        return;
      }

      if (fallbackKeyRef.current !== targetKey) {
        fitView({ duration: 500, padding: 0.3 });
        fallbackKeyRef.current = targetKey;
      }
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, [tourResolvedNodeIds, fitView, getInternalNode, nodes]);

  return null;
}
