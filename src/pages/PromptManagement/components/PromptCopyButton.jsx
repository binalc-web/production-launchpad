import React, { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Copy full prompt text with a brief success affordance.
 * @param {object} props
 * @param {string} props.text
 * @param {string} [props.label]
 * @param {string} [props.className]
 * @param {boolean} [props.disabled]
 */
export function PromptCopyButton({ text, label = "Copy prompt", className, disabled = false }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef(null);
  const trimmed = typeof text === "string" ? text.trim() : "";
  const canCopy = !disabled && trimmed.length > 0;

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    setCopied(false);
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, [trimmed]);

  const handleCopy = useCallback(async () => {
    if (!canCopy) return;
    try {
      await navigator.clipboard.writeText(trimmed);
      setCopied(true);
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        setCopied(false);
        timerRef.current = null;
      }, 2000);
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  }, [canCopy, trimmed]);

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={!canCopy}
      onClick={() => void handleCopy()}
      className={cn(
        "h-8 gap-1.5 px-3 transition-colors duration-200",
        copied &&
          "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-400",
        className,
      )}
      aria-label={copied ? "Prompt copied" : label}
      title={copied ? "Copied" : label}
    >
      {copied ? (
        <>
          <Check className="size-3.5" aria-hidden />
          <span className="text-xs font-medium">Copied</span>
        </>
      ) : (
        <>
          <Copy className="size-3.5" aria-hidden />
          <span className="text-xs font-medium">{label}</span>
        </>
      )}
    </Button>
  );
}
