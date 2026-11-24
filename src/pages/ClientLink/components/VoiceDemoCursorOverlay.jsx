import React from "react";
import { createPortal } from "react-dom";
import { MousePointer2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Virtual cursor + highlight ring the voice agent uses to demo changes on the preview.
 * Coordinates are window-fixed (already offset by the iframe position).
 * @param {{ cursor: null | { left: number, top: number, width: number, height: number, label?: string, clicking?: boolean } }} props
 */
export function VoiceDemoCursorOverlay({ cursor }) {
  if (!cursor || typeof document === "undefined") return null;
  const { left, top, width, height, label, clicking } = cursor;
  const pointerX = left + width / 2;
  const pointerY = top + height / 2;

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[1000010]" aria-hidden>
      <div
        className="absolute rounded-lg ring-4 ring-violet-500/70 shadow-[0_0_0_9999px_rgba(15,23,42,0.18)] transition-all duration-500 ease-out"
        style={{ left: left - 6, top: top - 6, width: width + 12, height: height + 12 }}
      />
      <div
        className="absolute transition-all duration-700 ease-out"
        style={{ left: pointerX, top: pointerY }}
      >
        <span
          className={cn(
            "absolute -left-4 -top-4 size-8 rounded-full bg-violet-500/30",
            clicking ? "animate-ping" : "opacity-0",
          )}
        />
        <MousePointer2
          className={cn(
            "size-7 fill-violet-600 text-white drop-shadow-lg transition-transform duration-150",
            clicking && "scale-90",
          )}
        />
        {label ? (
          <span className="absolute left-7 top-6 max-w-[16rem] truncate rounded-md bg-violet-600 px-2 py-0.5 text-[11px] font-medium text-white shadow-md">
            {label}
          </span>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
