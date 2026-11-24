import React, { useCallback, useRef, useState } from "react";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PromptCopyButton } from "./components/PromptCopyButton";

const HOVER_CLOSE_DELAY_MS = 120;

/**
 * @param {object} props
 * @param {object} props.row
 * @param {(row: object) => void} props.onOpenFullPreview
 */
export function PromptPreviewButton({ row, onOpenFullPreview }) {
  const [hoverOpen, setHoverOpen] = useState(false);
  const closeTimerRef = useRef(null);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const openHover = useCallback(() => {
    clearCloseTimer();
    setHoverOpen(true);
  }, [clearCloseTimer]);

  const scheduleCloseHover = useCallback(() => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      setHoverOpen(false);
      closeTimerRef.current = null;
    }, HOVER_CLOSE_DELAY_MS);
  }, [clearCloseTimer]);

  const previewText = String(row?.contentPreview ?? "").trim();
  const contentLength =
    typeof row?.contentLength === "number" ? row.contentLength : previewText.length;
  const isTruncated =
    contentLength > previewText.length || (previewText.endsWith("…") && contentLength > 0);

  const handleClick = () => {
    clearCloseTimer();
    setHoverOpen(false);
    onOpenFullPreview(row);
  };

  return (
    <Popover open={hoverOpen} onOpenChange={setHoverOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 shrink-0 gap-2 rounded-md border-border bg-background px-3 text-sm font-semibold text-foreground shadow-none hover:bg-muted/60"
          onMouseEnter={openHover}
          onMouseLeave={scheduleCloseHover}
          onClick={handleClick}
        >
          <Eye className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          Preview
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        className="w-[min(24rem,calc(100vw-2rem))] p-3"
        onMouseEnter={openHover}
        onMouseLeave={scheduleCloseHover}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-foreground">Prompt preview</p>
          {!isTruncated && previewText ? <PromptCopyButton text={previewText} /> : null}
        </div>
        {previewText ? (
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded border border-border bg-muted/30 p-2 font-mono text-[11px] leading-relaxed text-foreground">
            {previewText}
          </pre>
        ) : (
          <p className="text-xs text-muted-foreground">No prompt content.</p>
        )}
        {isTruncated ? (
          <p className="mt-2 text-[11px] text-muted-foreground">
            Click to view full prompt ({contentLength.toLocaleString()} characters), then copy.
          </p>
        ) : contentLength > 0 ? (
          <p className="mt-2 text-[11px] text-muted-foreground">
            {contentLength.toLocaleString()} characters
          </p>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
