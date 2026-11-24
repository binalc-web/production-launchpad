import React, { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  ChevronDown,
  Download,
  Ellipsis,
  Figma,
  FileText,
  Images,
  Laptop,
  Loader2,
  MessageSquare,
  PanelRight,
  ScrollText,
  Smartphone,
  Sparkles,
  Tablet,
  Video,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { BACKEND_PLAN_AGENT_CONTROLS_DISABLED_HINT } from "@/lib/backendAgentStatus";

const COLLAPSED_STORAGE_KEY = "client-link-tools-dock-collapsed";

const DEVICE_PRESETS = [
  { id: "desktop", label: "Desktop", icon: Laptop, shortcut: "1" },
  { id: "tablet", label: "Tablet", icon: Tablet, shortcut: "2" },
  { id: "mobile", label: "Mobile", icon: Smartphone, shortcut: "3" },
];

function readCollapsed() {
  try {
    return window.localStorage.getItem(COLLAPSED_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

/** Dock visibility, toggled from the top toolbar and remembered per browser. */
export function usePreviewToolsDockVisible() {
  const [visible, setVisible] = useState(() => !readCollapsed());
  const toggle = useCallback(() => {
    setVisible((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(COLLAPSED_STORAGE_KEY, next ? "0" : "1");
      } catch {
        /* private mode */
      }
      return next;
    });
  }, []);
  return [visible, toggle];
}

function isEditableTarget(target) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return Boolean(target.closest("input, textarea, select, [role='textbox'], [role='dialog']"));
}

function DockDivider() {
  return <div className="mx-0.5 h-6 w-px shrink-0 bg-border" aria-hidden />;
}

function DockTip({ label, shortcut, children }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {label}
        {shortcut ? (
          <kbd className="ml-2 rounded border border-border/60 px-1 font-mono text-[10px] opacity-80">
            {shortcut}
          </kbd>
        ) : null}
      </TooltipContent>
    </Tooltip>
  );
}

function DockIconButton({
  label,
  shortcut,
  icon: Icon,
  active,
  disabled,
  busy,
  className,
  ...props
}) {
  return (
    <DockTip label={label} shortcut={shortcut}>
      <span className="inline-flex">
        <Button
          type="button"
          variant={active ? "secondary" : "ghost"}
          size="icon-sm"
          aria-label={label}
          aria-pressed={active}
          disabled={disabled || busy}
          className={cn("h-8 w-8", active && "bg-background shadow-sm", className)}
          {...props}
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Icon className="size-4" />}
        </Button>
      </span>
    </DockTip>
  );
}

/** Text + chevron trigger for a dock menu. */
const DockMenuButton = React.forwardRef(function DockMenuButton(
  { icon: Icon, label, busy, className, ...props },
  ref,
) {
  return (
    <Button
      ref={ref}
      type="button"
      variant="ghost"
      size="sm"
      className={cn("h-8 gap-1.5 px-2.5 text-xs font-medium", className)}
      {...props}
    >
      {busy ? <Loader2 className="size-4 animate-spin" /> : <Icon className="size-4" />}
      {label}
      <ChevronDown className="size-3 opacity-60" />
    </Button>
  );
});

/**
 * Figma-style floating tools for the preview canvas: device width, comments, feedback,
 * export and rarely used extras. Shown/hidden from the top toolbar (`usePreviewToolsDockVisible`).
 */
export function ClientLinkPreviewToolsDock({
  previewIframeAccessible,
  responsivePreset,
  onResponsivePresetChange,
  hasActiveVersion,
  backendPlanAgentRunning,
  commentMode,
  commentSidebarOpen,
  openPreviewCommentCount = 0,
  onToggleCommentMode,
  onToggleCommentSidebar,
  feedbackCapturing,
  feedbackRecording,
  onOpenRecordFeedback,
  onOpenReportFeedback,
  onCaptureFullPage,
  fullPageCaptureBusy,
  onSendToFigma,
  sendToFigmaBusy,
  onExportScreens,
  exportScreensBusy,
  onOpenReleaseDetails,
  releaseDetailsHighlighted,
  onOpenPreviewLogs,
}) {
  const live = previewIframeAccessible === true;
  const showComments = Boolean(hasActiveVersion);
  const commentsDisabled = backendPlanAgentRunning || (!commentMode && !live);
  const feedbackDisabled = backendPlanAgentRunning || feedbackCapturing || feedbackRecording;
  const exportBusy = fullPageCaptureBusy || sendToFigmaBusy || exportScreensBusy;
  const showExport = Boolean(onCaptureFullPage || onSendToFigma || onExportScreens);
  const showMore = Boolean(onOpenReleaseDetails || onOpenPreviewLogs);

  useEffect(() => {
    const onKey = (e) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || isEditableTarget(e.target)) {
        return;
      }
      const preset = DEVICE_PRESETS.find((p) => p.shortcut === e.key);
      if (preset) {
        onResponsivePresetChange?.(preset.id);
        return;
      }
      if ((e.key === "c" || e.key === "C") && showComments && !commentsDisabled) {
        onToggleCommentMode?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onResponsivePresetChange, onToggleCommentMode, showComments, commentsDisabled]);

  const dockShell = cn(
    "pointer-events-auto flex items-center rounded-xl border border-border bg-background/95 p-1 shadow-lg backdrop-blur",
    "opacity-80 transition-opacity duration-200 hover:opacity-100 focus-within:opacity-100",
  );

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-3 z-30 flex justify-center px-3"
      data-html2canvas-ignore="true"
    >
      <div
        className={cn(dockShell, "max-w-full gap-0.5 overflow-x-auto scrollbar-none")}
        role="toolbar"
        aria-label="Preview tools"
      >
        <div className="flex items-center gap-0.5 rounded-lg bg-muted/60 p-0.5">
          {DEVICE_PRESETS.map((p) => (
            <DockIconButton
              key={p.id}
              label={p.label}
              shortcut={p.shortcut}
              icon={p.icon}
              active={responsivePreset === p.id}
              className="h-7 w-7"
              onClick={() => onResponsivePresetChange?.(p.id)}
            />
          ))}
        </div>

        {showComments ? (
          <>
            <DockDivider />
            <DockTip
              label={
                backendPlanAgentRunning
                  ? BACKEND_PLAN_AGENT_CONTROLS_DISABLED_HINT
                  : commentMode
                    ? "Exit comment mode"
                    : live
                      ? "Click part of the page to leave a comment"
                      : "Comments need a live preview connection"
              }
              shortcut="C"
            >
              <span className="inline-flex">
                <Button
                  type="button"
                  variant={commentMode ? "default" : "ghost"}
                  size="sm"
                  disabled={commentsDisabled}
                  aria-pressed={commentMode}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    onToggleCommentMode?.();
                  }}
                  className="h-8 gap-1.5 px-2.5 text-xs font-medium"
                >
                  <MessageSquare className="size-4" />
                  Comment
                  {openPreviewCommentCount > 0 ? (
                    <Badge
                      variant={commentMode ? "outline" : "secondary"}
                      className="h-4 min-w-4 justify-center px-1 text-[10px] leading-none"
                    >
                      {openPreviewCommentCount}
                    </Badge>
                  ) : null}
                </Button>
              </span>
            </DockTip>
            <DockIconButton
              label="All feedback"
              icon={PanelRight}
              active={commentSidebarOpen}
              disabled={backendPlanAgentRunning}
              onPointerDown={(e) => {
                e.preventDefault();
                onToggleCommentSidebar?.();
              }}
            />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <DockMenuButton
                  icon={feedbackRecording ? Video : AlertCircle}
                  label={feedbackRecording ? "Recording…" : "Feedback"}
                  busy={feedbackCapturing}
                  disabled={feedbackDisabled}
                  className={feedbackRecording ? "text-destructive" : undefined}
                />
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="center" className="w-56">
                <DropdownMenuItem onSelect={onOpenRecordFeedback}>
                  <Video className="size-4 text-destructive" />
                  Record screen
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={onOpenReportFeedback}>
                  <AlertCircle className="size-4" />
                  Report an issue
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : null}

        {showExport ? (
          <>
            <DockDivider />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <DockMenuButton
                  icon={Download}
                  label={exportBusy ? "Exporting…" : "Export"}
                  busy={exportBusy}
                  disabled={!live || exportBusy}
                  title={live ? undefined : "Export needs a live preview connection"}
                />
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="center" className="w-64">
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  This screen
                </DropdownMenuLabel>
                {onCaptureFullPage ? (
                  <DropdownMenuItem onSelect={onCaptureFullPage}>
                    <Download className="size-4" />
                    Download full-page PNG
                  </DropdownMenuItem>
                ) : null}
                {onSendToFigma ? (
                  <DropdownMenuItem onSelect={onSendToFigma}>
                    <Figma className="size-4" />
                    Send to Figma…
                  </DropdownMenuItem>
                ) : null}
                {onExportScreens ? (
                  <>
                    <DropdownMenuLabel className="text-xs text-muted-foreground">
                      Several screens
                    </DropdownMenuLabel>
                    <DropdownMenuItem onSelect={onExportScreens}>
                      <Images className="size-4" />
                      Export screens…
                      <DropdownMenuShortcut>ZIP · Figma</DropdownMenuShortcut>
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : null}

        {showMore ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="More tools"
                className="relative h-8 w-8"
              >
                <Ellipsis className="size-4" />
                {releaseDetailsHighlighted ? (
                  <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-primary" />
                ) : null}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="end" className="w-52">
              {onOpenReleaseDetails ? (
                <DropdownMenuItem onSelect={onOpenReleaseDetails}>
                  {releaseDetailsHighlighted ? (
                    <Sparkles className="size-4 text-primary" />
                  ) : (
                    <FileText className="size-4" />
                  )}
                  Release details
                </DropdownMenuItem>
              ) : null}
              {onOpenPreviewLogs ? (
                <DropdownMenuItem onSelect={onOpenPreviewLogs}>
                  <ScrollText className="size-4" />
                  Preview logs
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </div>
  );
}
