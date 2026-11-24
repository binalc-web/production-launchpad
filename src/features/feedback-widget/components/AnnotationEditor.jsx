import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Tldraw, exportToBlob } from "tldraw";
import { ArrowUp, Bug } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getClientLinkVerifiedEmail,
  isPlausibleClientLinkEmail,
} from "@/lib/clientLinkVerifiedEmail";
import { cn } from "@/lib/utils";
import { logger } from "@/utils/logger";
import {
  FeedbackComponentPicker,
  buildDescriptionWithComponentAnchor,
} from "./FeedbackComponentPicker";
import { ElementContextChip } from "@/components/ElementContextChip";
import {
  releaseTldrawKeyboardFocus,
  stopFormKeyboardPropagation,
} from "@/features/feedback-widget/lib/releaseTldrawKeyboardFocus.js";
import { FeedbackSpinner } from "./FeedbackSpinner";

const ISSUE_TYPE_OPTIONS = [
  {
    value: "Improvements",
    label: "Improvements",
    icon: ArrowUp,
    iconBg: "bg-green-100",
    iconColor: "text-green-500",
  },
  {
    value: "Bug",
    label: "Bug",
    icon: Bug,
    iconBg: "bg-red-100",
    iconColor: "text-red-500",
  },
];

const TLDRAW_COMPONENTS = {
  PageMenu: null,
  NavigationPanel: null,
};

const AnnotationTldrawPane = React.memo(function AnnotationTldrawPane({
  screenRecordingActive,
  isLoading,
  onMount,
  onCanvasActivate,
}) {
  return (
    <div className="relative flex min-h-[240px] min-w-0 flex-1 flex-col overflow-hidden md:min-h-0 md:flex-[1_1_65%]">
      {isLoading ? (
        <div
          className="absolute inset-0 z-[1000] rounded-lg bg-background p-2"
          role="status"
          aria-busy="true"
          aria-label="Loading screenshot"
        >
          <Skeleton className="h-full w-full rounded-lg" />
        </div>
      ) : null}

      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border-2 border-border bg-muted/30 [&_.tldraw]:relative [&_.tldraw]:h-full [&_.tldraw]:min-h-[220px] [&_.tldraw_.tl-container]:h-full [&_.tldraw]:rounded-lg [&_.tldraw_button[data-testid*='page']]:!hidden [&_.tldraw_.tlui-page-menu]:!hidden [&_.tldraw_.tlui-navigation-panel]:!hidden [&_.tldraw_[data-testid='tools.frame']]:!hidden",
          !screenRecordingActive &&
            "[&_.tldraw_[data-testid='tools.note']]:!hidden [&_.tldraw_[data-testid='tools.eraser']]:!hidden",
        )}
        onPointerDownCapture={onCanvasActivate}
      >
        <Tldraw onMount={onMount} components={TLDRAW_COMPONENTS} />
      </div>
    </div>
  );
});

const AnnotationEditor = ({
  screenshot,
  metadata,
  onSave,
  requiresReporterEmail = false,
  screenRecordingActive = false,
  embedApi = false,
  previewIframeRef = null,
  pickedElementContext = null,
  onClearPickedElement,
  submitBusy = false,
  onSubmitStart,
  onImproveDescription,
}) => {
  const [editor, setEditor] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [description, setDescription] = useState("");
  const [improving, setImproving] = useState(false);
  const [improveError, setImproveError] = useState("");
  const [preImproveDescription, setPreImproveDescription] = useState(null);
  const descriptionRef = useRef(null);
  const [issueType, setIssueType] = useState("Bug");
  const [reporterEmail, setReporterEmail] = useState(() => getClientLinkVerifiedEmail());
  const [error, setError] = useState("");
  const [componentAnchor, setComponentAnchor] = useState(null);
  const submitIdempotencyKeyRef = useRef(null);

  const ensureSubmitIdempotencyKey = useCallback(() => {
    if (!submitIdempotencyKeyRef.current) {
      submitIdempotencyKeyRef.current =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `embed-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    }
    return submitIdempotencyKeyRef.current;
  }, []);

  const handleFormFieldFocus = useCallback(() => {
    releaseTldrawKeyboardFocus(editor);
  }, [editor]);

  const handleCanvasActivate = useCallback(() => {
    if (!editor) return;
    try {
      if (typeof editor.getIsFocused === "function" && editor.getIsFocused()) return;
      editor.focus?.({ focusContainer: false });
    } catch {
      /* ignore */
    }
  }, [editor]);

  const canSubmitFeedback = useMemo(() => {
    const emailNorm = reporterEmail.trim().toLowerCase();
    if (!requiresReporterEmail) {
      return !emailNorm || isPlausibleClientLinkEmail(emailNorm);
    }
    return Boolean(emailNorm && isPlausibleClientLinkEmail(emailNorm));
  }, [reporterEmail, requiresReporterEmail]);

  const canUseFixOptions = useMemo(() => {
    const emailNorm = reporterEmail.trim().toLowerCase();
    return Boolean(emailNorm && isPlausibleClientLinkEmail(emailNorm));
  }, [reporterEmail]);

  const canSubmitDescription = useMemo(() => {
    const text = description.trim();
    return text.length >= 10;
  }, [description]);

  const emailFieldError = useMemo(() => {
    const emailNorm = reporterEmail.trim().toLowerCase();
    if (!requiresReporterEmail) {
      if (emailNorm && !isPlausibleClientLinkEmail(emailNorm)) {
        return "Please enter a valid email address.";
      }
      return "";
    }
    if (!emailNorm) {
      return "Please enter your email address.";
    }
    if (!isPlausibleClientLinkEmail(emailNorm)) {
      return "Please enter a valid email address.";
    }
    return "";
  }, [reporterEmail, requiresReporterEmail]);

  useEffect(() => {
    const stored = getClientLinkVerifiedEmail();
    if (stored) {
      setReporterEmail((prev) => (prev.trim() ? prev : stored));
    }
  }, [screenshot]);

  useEffect(() => {
    if (!editor || !screenshot) {
      return;
    }

    let isMounted = true;

    const loadScreenshot = async () => {
      try {
        setIsLoading(true);

        const img = new Image();
        img.src = screenshot;

        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });

        if (!isMounted) return;

        const response = await fetch(screenshot);
        const blob = await response.blob();
        const file = new File([blob], "screenshot.png", { type: "image/png" });

        await editor.putExternalContent({
          type: "files",
          files: [file],
          point: { x: 0, y: 0 },
          ignoreParent: false,
        });

        if (!isMounted) return;

        const shapes = editor.getCurrentPageShapes();
        const imageShape = shapes[shapes.length - 1];

        if (imageShape && imageShape.type === "image") {
          editor.updateShape({
            ...imageShape,
            isLocked: true,
          });
        }

        setTimeout(() => {
          if (isMounted && editor) {
            editor.zoomToFit({ duration: 200 });
            setIsLoading(false);
          }
        }, 100);
      } catch (err) {
        logger.error("annotation_load_screenshot", err);
        setIsLoading(false);
      }
    };

    loadScreenshot();

    return () => {
      isMounted = false;
    };
  }, [editor, screenshot]);

  const focusDescriptionStart = () => {
    const el = descriptionRef.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(0, 0);
    el.scrollTop = 0;
  };

  const handleImprove = async () => {
    const text = description.trim();
    if (!text) {
      setImproveError("Please enter a description before improving it.");
      descriptionRef.current?.focus();
      return;
    }
    setImproveError("");
    setImproving(true);
    try {
      const improved = await onImproveDescription(text);
      setPreImproveDescription(descriptionRef.current?.value ?? description);
      setDescription(improved);
      setError("");
      requestAnimationFrame(focusDescriptionStart);
    } catch (err) {
      logger.error("feedback_improve_description", err);
      setImproveError(
        "We couldn't improve the description. Please try again or submit your original description.",
      );
    } finally {
      setImproving(false);
    }
  };

  const handleUndoImprove = () => {
    setDescription(preImproveDescription ?? "");
    setPreImproveDescription(null);
    setImproveError("");
    requestAnimationFrame(focusDescriptionStart);
  };

  const buildEmbedExtras = () => {
    if (!embedApi) return undefined;
    return { submitIdempotencyKey: ensureSubmitIdempotencyKey() };
  };

  const handleSave = async (postSubmitAction = null) => {
    const emailNorm = reporterEmail.trim().toLowerCase();
    if (requiresReporterEmail) {
      if (!emailNorm) {
        setError("Please enter your email address.");
        return;
      }
      if (!isPlausibleClientLinkEmail(emailNorm)) {
        setError("Please enter a valid email address.");
        return;
      }
    } else if (emailNorm && !isPlausibleClientLinkEmail(emailNorm)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (postSubmitAction && !emailNorm) {
      setError("Please enter your email address for fix options.");
      return;
    }

    if (!description.trim()) {
      setError("Please provide a description");
      return;
    }

    if (description.trim().length < 10) {
      setError("Description must be at least 10 characters");
      return;
    }

    onSubmitStart?.();

    const elementContext = pickedElementContext || componentAnchor;
    const descriptionForSubmit = buildDescriptionWithComponentAnchor(description, elementContext);
    const emailForSubmit = emailNorm;
    const embedExtras = buildEmbedExtras();
    const submitExtras = {
      ...embedExtras,
      componentAnchor,
      pickedElementContext: pickedElementContext || undefined,
      postSubmitAction: postSubmitAction || undefined,
    };

    const finishSave = (blob, dataUrl) => {
      onSave(blob, dataUrl, descriptionForSubmit, issueType, emailForSubmit, submitExtras);
    };

    if (!editor) {
      const response = await fetch(screenshot);
      const blob = await response.blob();
      finishSave(blob, screenshot);
      return;
    }

    try {
      const shapeIds = Array.from(editor.getCurrentPageShapeIds());

      if (shapeIds.length === 0) {
        const response = await fetch(screenshot);
        const blob = await response.blob();
        finishSave(blob, screenshot);
        return;
      }

      const blob = await exportToBlob({
        editor,
        ids: shapeIds,
        format: "png",
        opts: {
          background: true,
          bounds: editor.getCurrentPageBounds(),
          scale: 1,
        },
      });

      const reader = new FileReader();
      reader.onloadend = () => {
        finishSave(blob, reader.result);
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      logger.error("annotation_export", err);
      const response = await fetch(screenshot);
      const blob = await response.blob();
      finishSave(blob, screenshot);
    }
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-5 sm:flex-row md:items-stretch md:gap-6">
      <AnnotationTldrawPane
        screenRecordingActive={screenRecordingActive}
        isLoading={isLoading}
        onMount={setEditor}
        onCanvasActivate={handleCanvasActivate}
      />

      <div
        className={cn(
          "isolate flex min-h-0 w-full shrink-0 flex-col gap-4 overflow-y-auto overflow-x-hidden overscroll-y-contain text-foreground",
          "md:w-[min(100%,22rem)] md:flex-[0_0_34%] md:max-w-[min(100%,22rem)] sm:py-5 p-1",
          "max-h-[min(52vh,520px)] md:max-h-none",
        )}
        onKeyDownCapture={stopFormKeyboardPropagation}
        onKeyUpCapture={stopFormKeyboardPropagation}
        onPaste={stopFormKeyboardPropagation}
        onCopy={stopFormKeyboardPropagation}
        onCut={stopFormKeyboardPropagation}
        onFocusCapture={handleFormFieldFocus}
      >
        <div className="space-y-1.5">
          <h3 className="text-lg font-semibold leading-none tracking-tight text-foreground">
            Describe the Issue
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {screenRecordingActive ? (
              <>
                <span className="font-medium text-foreground">While recording</span>, use the
                drawing and eraser tools on the left to highlight the screenshot. The video captures
                your shared screen and microphone (and tab audio if you enabled it). Describe the
                issue below, then submit.
              </>
            ) : (
              <>
                Use the tools on the left to mark up the screenshot, then describe the issue below.
              </>
            )}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="feedback-issue-type">
            Issue type <span className="text-destructive">*</span>
          </Label>
          <Select value={issueType} onValueChange={setIssueType}>
            <SelectTrigger id="feedback-issue-type" className="w-full px-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[1000001]" position="popper">
              {ISSUE_TYPE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                return (
                  <SelectItem key={opt.value} value={opt.value}>
                    <span className="flex items-center gap-2">
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${opt?.iconBg}`}
                      >
                        <Icon className={`h-2 w-2 ${opt?.iconColor}`} />
                      </span>
                      {opt.label}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="feedback-reporter-email">
            Your email {requiresReporterEmail && <span className="text-destructive">*</span>}
          </Label>
          <Input
            id="feedback-reporter-email"
            type="email"
            name="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={reporterEmail}
            onChange={(e) => {
              setReporterEmail(e.target.value);
              setError("");
            }}
            onFocus={handleFormFieldFocus}
            aria-invalid={emailFieldError ? true : undefined}
            aria-describedby={emailFieldError ? "feedback-reporter-email-error" : undefined}
            className={cn(
              "w-full text-foreground placeholder:text-muted-foreground",
              emailFieldError && "border-destructive",
            )}
          />
          {emailFieldError ? (
            <p
              id="feedback-reporter-email-error"
              className="text-xs text-destructive"
              role="alert"
              aria-live="polite"
            >
              {emailFieldError}
            </p>
          ) : null}
        </div>

        {previewIframeRef ? (
          <FeedbackComponentPicker
            iframeRef={previewIframeRef}
            disabled={submitBusy}
            value={componentAnchor}
            onChange={setComponentAnchor}
          />
        ) : null}

        {pickedElementContext ? (
          <div className="space-y-1.5">
            <Label>Selected element</Label>
            <ElementContextChip
              tag={
                pickedElementContext.reactComponentStack?.[0] ||
                pickedElementContext.componentHint ||
                pickedElementContext.tag ||
                "element"
              }
              inspectorCtx={pickedElementContext}
              onRemove={onClearPickedElement}
            />
          </div>
        ) : null}

        <div className="flex flex-col space-y-2">
          <Label htmlFor="feedback-description">
            Description <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="feedback-description"
            ref={descriptionRef}
            placeholder="Please describe what you're seeing, what you expected, or any feedback you have..."
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              setError("");
              setImproveError("");
            }}
            onFocus={handleFormFieldFocus}
            maxLength={2000}
            aria-invalid={error || improveError ? true : undefined}
            aria-describedby={
              [
                error && "feedback-description-error",
                improveError && "feedback-description-improve-error",
              ]
                .filter(Boolean)
                .join(" ") || undefined
            }
            className="min-h-[200px] resize-none text-foreground placeholder:text-muted-foreground md:min-h-[260px]"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              {error && (
                <span id="feedback-description-error" className="text-destructive">
                  {error}
                </span>
              )}
            </span>
            <span>{description.length}/2000</span>
          </div>
          {improveError ? (
            <p
              id="feedback-description-improve-error"
              className="text-xs text-destructive"
              role="alert"
            >
              Error: {improveError}
            </p>
          ) : null}
          {preImproveDescription !== null && !improving ? (
            <button
              type="button"
              onClick={handleUndoImprove}
              className="w-fit text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              Undo improvement
            </button>
          ) : null}
          <span className="sr-only" role="status" aria-live="polite">
            {improving
              ? "Improving description…"
              : preImproveDescription !== null
                ? "Description improved. You can edit it before submitting."
                : ""}
          </span>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {onImproveDescription ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleImprove()}
              disabled={improving || submitBusy}
              aria-busy={improving || undefined}
              className="h-auto min-h-9 w-fit whitespace-normal"
            >
              {improving ? (
                <>
                  <FeedbackSpinner size={16} className="mr-2" />
                  Improving…
                </>
              ) : (
                "Improve description"
              )}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="default"
            onClick={() => void handleSave(null)}
            disabled={!canSubmitFeedback || submitBusy || improving}
            title={
              !canSubmitFeedback
                ? requiresReporterEmail
                  ? "Add a valid email address to submit."
                  : "Enter a valid email address or clear the field."
                : undefined
            }
            style={{ backgroundColor: "#00b48a", color: "#ffffff" }}
            className="w-fit border-0 hover:brightness-95"
          >
            {submitBusy ? (
              <>
                <FeedbackSpinner size={16} className="mr-2 text-white" />
                Submitting...
              </>
            ) : (
              "Submit Feedback"
            )}
          </Button>
        </div>

        <div className="space-y-2 border-t border-border/60 pt-3">
          <p className="text-xs text-muted-foreground">
            Fix options need a stakeholder email (same as AI chat).
          </p>
          {error ? (
            <p className="text-xs text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              title="Applies the fix to a preview for review — no merge."
              disabled={!canUseFixOptions || !canSubmitDescription || submitBusy || improving}
              onClick={() => void handleSave("fix_only")}
            >
              Fix
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              title="Applies the fix and merges it into the preview."
              disabled={!canUseFixOptions || !canSubmitDescription || submitBusy || improving}
              onClick={() => void handleSave("fix_and_merge")}
            >
              Fix &amp; merge
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnnotationEditor;
