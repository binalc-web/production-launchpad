import React, { useCallback, useState } from "react";
import { ArrowUp, CircleAlert, LoaderCircle, MonitorOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  appendPreviewDiagnosisToAgentPrompt,
  CLIENT_LINK_PREVIEW_LOADING_TROUBLE,
} from "../clientLinkPreviewRecovery.constants";

const TROUBLE_COPY = CLIENT_LINK_PREVIEW_LOADING_TROUBLE;

/**
 * Drop-up menu for reporting preview loading issues from the chat composer.
 * Preset options prefill the composer; "Other" sends a custom prompt to the agent.
 * @param {{
 *   disabled?: boolean,
 *   diagnosis?: { kind?: string, summary?: string, detail?: string, consoleLines?: string[] } | null,
 *   consoleLines?: string[] | null,
 *   onPrefillPrompt?: (text: string) => void,
 *   onSendCustom?: (text: string) => void,
 *   triggerClassName?: string,
 * }} props
 */
export function PreviewLoadingTroubleMenu({
  disabled = false,
  diagnosis = null,
  consoleLines = null,
  onPrefillPrompt,
  onSendCustom,
  triggerClassName,
}) {
  const [open, setOpen] = useState(false);
  const [otherDetail, setOtherDetail] = useState("");

  const withDiagnosis = useCallback(
    (prompt) => appendPreviewDiagnosisToAgentPrompt(prompt, diagnosis, consoleLines),
    [diagnosis, consoleLines],
  );

  const handlePrefill = useCallback(
    (prompt) => {
      onPrefillPrompt?.(withDiagnosis(prompt));
      setOpen(false);
    },
    [onPrefillPrompt, withDiagnosis],
  );

  const handleSendOther = useCallback(() => {
    const detail = otherDetail.trim();
    if (!detail) return;
    const prompt = withDiagnosis(TROUBLE_COPY.options.other.buildPrompt(detail));
    onSendCustom?.(prompt);
    setOtherDetail("");
    setOpen(false);
  }, [otherDetail, onSendCustom, withDiagnosis]);

  const handleOpenChange = useCallback((nextOpen) => {
    setOpen(nextOpen);
    if (!nextOpen) setOtherDetail("");
  }, []);

  const otherSendDisabled = disabled || !otherDetail.trim();

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant="secondary"
              disabled={disabled}
              className={cn(
                triggerClassName ?? "h-9 w-9 shrink-0 rounded-full disabled:opacity-40",
                open && "bg-accent text-accent-foreground",
              )}
              aria-label={TROUBLE_COPY.triggerAriaLabel}
              aria-haspopup="menu"
              aria-expanded={open}
            >
              <CircleAlert className="size-4 shrink-0" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[260px] text-xs leading-relaxed">
          {TROUBLE_COPY.triggerTooltip}
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent
        align="start"
        side="top"
        sideOffset={6}
        className="w-64 rounded-lg border bg-popover p-0.5 shadow-lg"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <DropdownMenuLabel className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          {TROUBLE_COPY.menuTitle}
        </DropdownMenuLabel>
        <DropdownMenuItem
          className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm"
          onSelect={() => handlePrefill(TROUBLE_COPY.options.errorOrLoading.composerPrompt)}
        >
          <LoaderCircle className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          {TROUBLE_COPY.options.errorOrLoading.label}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm"
          onSelect={() => handlePrefill(TROUBLE_COPY.options.flickering.composerPrompt)}
        >
          <RefreshCw className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          {TROUBLE_COPY.options.flickering.label}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm"
          onSelect={() => handlePrefill(TROUBLE_COPY.options.whiteScreen.composerPrompt)}
        >
          <MonitorOff className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          {TROUBLE_COPY.options.whiteScreen.label}
        </DropdownMenuItem>
        <DropdownMenuSeparator className="my-1" />
        <div
          className="flex flex-col gap-1.5 px-2 py-1.5"
          onPointerDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <p className="text-xs font-medium text-foreground">{TROUBLE_COPY.options.other.label}</p>
          <Textarea
            value={otherDetail}
            onChange={(e) => setOtherDetail(e.target.value)}
            placeholder={TROUBLE_COPY.options.other.placeholder}
            disabled={disabled}
            rows={2}
            className="min-h-[52px] resize-none text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (!otherSendDisabled) handleSendOther();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                setOtherDetail("");
                setOpen(false);
              }
            }}
          />
          <Button
            type="button"
            size="sm"
            className="h-7 gap-1 self-end rounded-md px-2.5 text-xs"
            disabled={otherSendDisabled}
            onClick={handleSendOther}
          >
            <ArrowUp className="size-3.5" aria-hidden />
            Send to agent
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
