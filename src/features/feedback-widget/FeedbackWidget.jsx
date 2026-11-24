import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import Lottie from "lottie-react";
import Modal from "./components/Modal";
import AnnotationEditor from "./components/AnnotationEditor";
import { FeedbackSpinner } from "./components/FeedbackSpinner";
import { collectMetadata } from "./services/metadata.service";
import { getCapturedConsoleLogs } from "./services/consoleCapture.service";
import {
  getClientLinkVerifiedEmail,
  isPlausibleClientLinkEmail,
  setClientLinkVerifiedEmail,
} from "@/lib/clientLinkVerifiedEmail";
import { logger } from "@/utils/logger";
import {
  submitFeedback,
  fetchEmbedFeedbackConfig,
  improveFeedbackDescription,
} from "./services/api.service";
import { captureFeedbackScreenshot } from "./services/clientLinkPreviewCapture";
import {
  blobToFile,
  buildCompositeRecordingStream,
  captureFrameFromMediaStream,
  captureTargetArea,
  captureViewport,
  canvasToDataURL,
} from "./services/screenshot.service";
import { startChunkedScreenRecording } from "./services/screenRecording.service";
import {
  stopHostOverlayDismissOnPointer,
  waitForCaptureUiSettle,
} from "./services/embedCaptureSettle.js";
import successAnimation from "@/assets/animations/success.json";
import errorAnimation from "@/assets/animations/error.json";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Circle, Loader2, Pencil, Square, SquareMousePointer } from "lucide-react";
import { useEmbedPageVisibility } from "./hooks/useEmbedPageVisibility.js";
import { FeedbackDocumentPickerOverlay } from "./components/FeedbackDocumentPickerOverlay";
import { ElementContextChip } from "@/components/ElementContextChip";
import { resolveFeedbackDescriptionDisplay } from "@/lib/feedbackElementContextDisplay.util";

const lottieRenderer = { preserveAspectRatio: "xMidYMid meet" };

/** True when API returned a non-empty jiraError (feedback saved but Jira step failed). */
function responseIncludesJiraFailure(res) {
  if (!res || typeof res !== "object") return false;
  const e = res.jiraError;
  if (e === undefined || e === null) return false;
  return String(e).trim().length > 0;
}

function responseIsPendingReview(res) {
  if (!res || typeof res !== "object") return false;
  return (
    String(res.status || "")
      .trim()
      .toLowerCase() === "pending_review"
  );
}

function discardActiveScreenRecording(ref, pendingRecordingPayloadRef) {
  if (ref.current) {
    try {
      ref.current.discard();
    } catch {
      /* ignore */
    }
    ref.current = null;
  }
  if (pendingRecordingPayloadRef) {
    pendingRecordingPayloadRef.current = null;
  }
}

const STEPS = {
  CAPTURE: "capture",
  ANNOTATE: "annotate",
  SUBMITTING: "submitting",
  SUCCESS: "success",
};

function formatRecordingDuration(totalSec) {
  const s = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

const FeedbackWidget = forwardRef(function FeedbackWidget({ config }, ref) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(STEPS.CAPTURE);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureError, setCaptureError] = useState(null);
  const [screenshotCanvas, setScreenshotCanvas] = useState(null);
  const [screenshotDataUrl, setScreenshotDataUrl] = useState(null);
  const [annotatedBlob, setAnnotatedBlob] = useState(null);
  const [annotatedDataUrl, setAnnotatedDataUrl] = useState(null);
  const [metadata] = useState(collectMetadata());
  const [embedJiraConfig, setEmbedJiraConfig] = useState(null);
  const [result, setResult] = useState(null);
  const [submittedDescription, setSubmittedDescription] = useState(null);
  /** Structured pick kept for success UI chip (API description may include prompt text). */
  const [submittedPickedElement, setSubmittedPickedElement] = useState(null);
  const [error, setError] = useState(null);
  const [isScreenRecording, setIsScreenRecording] = useState(false);
  const [recordingElapsedSec, setRecordingElapsedSec] = useState(0);
  const [headerRecordStarting, setHeaderRecordStarting] = useState(false);
  const [submitBusy, setSubmitBusy] = useState(false);
  /** Embed visual pick: host-page element pinned before screenshot capture. */
  const [visualPickMode, setVisualPickMode] = useState(false);
  const [pickedElementContext, setPickedElementContext] = useState(null);
  const successRef = useRef(false);
  const screenRecordingRef = useRef(null);
  /** Set when user stops recording before submit (finalize uploads + /complete). */
  const pendingRecordingPayloadRef = useRef(null);
  const displayStreamRef = useRef(null);
  /** "header" = record started before modal; "form" = record started inside Send Feedback. */
  const recordingEntryRef = useRef("form");
  /** Mic / AudioContext cleanup after composite recording stream. */
  const recordingStreamReleaseRef = useRef(null);

  useEffect(() => {
    if (config.mode !== "embed") {
      setEmbedJiraConfig(null);
      return;
    }
    const pid = config.projectId;
    const apiUrl = config.apiUrl;
    if (!pid || !apiUrl) {
      setEmbedJiraConfig(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const c = await fetchEmbedFeedbackConfig(apiUrl, pid);
        if (!cancelled) setEmbedJiraConfig(c);
      } catch (e) {
        logger.error("embed_feedback_config", e);
        if (!cancelled) {
          const msg = e?.message || "";
          const disabled = /not enabled/i.test(msg) || /embed feedback is not enabled/i.test(msg);
          setEmbedJiraConfig({
            embedEnabled: !disabled,
            allowedDomains: [],
            priorities: [],
            jiraConfigured: false,
            message: disabled ? undefined : msg || "Could not load embed config.",
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [config.mode, config.projectId, config.apiUrl]);

  const handleImproveDescription = useCallback(
    (description) => improveFeedbackDescription(config.apiUrl, config.projectId, description),
    [config.apiUrl, config.projectId],
  );
  const canImproveDescription = Boolean(
    config.mode === "embed" && config.projectId && config.apiUrl,
  );

  const runRecordingStreamRelease = useCallback(() => {
    try {
      const fn = recordingStreamReleaseRef.current;
      if (typeof fn === "function") {
        void Promise.resolve(fn()).catch(() => {});
      }
    } catch {
      /* ignore */
    }
    recordingStreamReleaseRef.current = null;
  }, []);

  const openWidget = useCallback(() => {
    setCaptureError(null);
    setIsCapturing(true);
  }, []);

  const handleClearPickedElement = useCallback(() => {
    setPickedElementContext(null);
  }, []);

  const handleCancelVisualPick = useCallback(() => {
    setVisualPickMode(false);
  }, []);

  const handleVisualPickPinned = useCallback((ctx) => {
    setPickedElementContext(ctx);
    setVisualPickMode(false);
    setCaptureError(null);
    setIsCapturing(true);
  }, []);

  const handleToggleVisualPick = useCallback(() => {
    if (isScreenRecording || isCapturing || isOpen) return;
    setVisualPickMode((mode) => !mode);
  }, [isCapturing, isOpen, isScreenRecording]);

  useEffect(() => {
    config.onCapturingChange?.(isCapturing);
  }, [isCapturing, config.onCapturingChange]);

  const stopIdleDisplayCapture = useCallback(() => {
    if (pendingRecordingPayloadRef.current?.deferredController) {
      pendingRecordingPayloadRef.current.deferredController.discard();
      pendingRecordingPayloadRef.current = null;
    }
    discardActiveScreenRecording(screenRecordingRef, pendingRecordingPayloadRef);
    setIsScreenRecording(false);
    runRecordingStreamRelease();
    if (displayStreamRef.current) {
      displayStreamRef.current.getTracks().forEach((t) => t.stop());
      displayStreamRef.current = null;
    }
  }, [runRecordingStreamRelease]);

  const handleEnableScreenRecording = useCallback(
    async (email, entry = "form", options = {}) => {
      recordingEntryRef.current = entry;
      const deferSession = options.deferSession === true;
      const norm = String(email || "")
        .trim()
        .toLowerCase();
      const isEmbed = config.mode === "embed";
      if (!deferSession) {
        if (!isEmbed && (!norm || !isPlausibleClientLinkEmail(norm))) {
          throw new Error("Enter a valid stakeholder email to enable recording.");
        }
        if (isEmbed && (!norm || !isPlausibleClientLinkEmail(norm))) {
          throw new Error("Please enter a valid email address.");
        }
      }
      const recordingEmail = norm;

      const hadPriorDisplay = Boolean(displayStreamRef.current);
      let compositeCreated = false;

      try {
        const { stream: recStream, release } = await buildCompositeRecordingStream(
          hadPriorDisplay ? displayStreamRef.current : null,
        );
        compositeCreated = true;
        displayStreamRef.current = recStream;
        recordingStreamReleaseRef.current = release;

        const controller = startChunkedScreenRecording({
          apiUrl: config.apiUrl,
          projectId: config.projectId,
          clientEmail: recordingEmail,
          ...(config.source ? { source: config.source } : {}),
          stream: recStream,
          deferSession,
        });
        await controller.start();
        pendingRecordingPayloadRef.current = null;
        screenRecordingRef.current = controller;
        setIsScreenRecording(true);
      } catch (err) {
        runRecordingStreamRelease();
        if (compositeCreated) {
          displayStreamRef.current = null;
        }
        throw err;
      }
    },
    [config.apiUrl, config.projectId, config.source, config.mode, runRecordingStreamRelease],
  );

  const handleDisableScreenRecording = useCallback(async () => {
    const ctrl = screenRecordingRef.current;
    screenRecordingRef.current = null;
    setIsScreenRecording(false);

    if (ctrl) {
      try {
        const storedEmail = getClientLinkVerifiedEmail();
        const canFinalizeNow =
          !ctrl.deferSession || (storedEmail && isPlausibleClientLinkEmail(storedEmail));

        if (canFinalizeNow) {
          const { sessionId, chunkCount } = await ctrl.stop({
            clientEmail: storedEmail,
            finalizeSession: true,
            stopStream: true,
          });
          pendingRecordingPayloadRef.current =
            sessionId && chunkCount > 0 ? { sessionId, chunkCount } : null;
        } else {
          const { deferred } = await ctrl.stop({ finalizeSession: false, stopStream: true });
          pendingRecordingPayloadRef.current = deferred ? { deferredController: ctrl } : null;
        }
      } catch (recErr) {
        pendingRecordingPayloadRef.current = null;
        throw recErr instanceof Error
          ? recErr
          : new Error(
              String(recErr?.message || "") ||
                "Could not finalize screen recording. Try recording again or submit without video.",
            );
      }
    } else {
      pendingRecordingPayloadRef.current = null;
    }

    runRecordingStreamRelease();
    displayStreamRef.current = null;
  }, [runRecordingStreamRelease]);

  const discardRecordingOnly = useCallback(() => {
    if (pendingRecordingPayloadRef.current?.deferredController) {
      pendingRecordingPayloadRef.current.deferredController.discard();
      pendingRecordingPayloadRef.current = null;
    }
    discardActiveScreenRecording(screenRecordingRef, pendingRecordingPayloadRef);
    setIsScreenRecording(false);
    if (displayStreamRef.current) {
      displayStreamRef.current.getTracks().forEach((t) => t.stop());
      displayStreamRef.current = null;
    }
    runRecordingStreamRelease();
    recordingEntryRef.current = "form";
  }, [runRecordingStreamRelease]);

  const finalizeHeaderRecordingAndOpenModal = useCallback(async () => {
    const stream = displayStreamRef.current;
    const ctrl = screenRecordingRef.current;
    if (!ctrl || !stream) {
      return;
    }
    let canvas;
    try {
      canvas = await captureFrameFromMediaStream(stream);
    } catch {
      canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
    }
    const dataUrl = canvasToDataURL(canvas);
    screenRecordingRef.current = null;
    setIsScreenRecording(false);
    try {
      const storedEmail = getClientLinkVerifiedEmail();
      const canFinalizeNow =
        !ctrl.deferSession || (storedEmail && isPlausibleClientLinkEmail(storedEmail));

      if (canFinalizeNow) {
        const { sessionId, chunkCount } = await ctrl.stop({
          clientEmail: storedEmail,
          finalizeSession: true,
          stopStream: true,
        });
        pendingRecordingPayloadRef.current =
          sessionId && chunkCount > 0 ? { sessionId, chunkCount } : null;
      } else {
        const { deferred } = await ctrl.stop({ finalizeSession: false, stopStream: true });
        pendingRecordingPayloadRef.current = deferred ? { deferredController: ctrl } : null;
      }
    } catch (recErr) {
      pendingRecordingPayloadRef.current = null;
      setCaptureError(
        recErr instanceof Error ? recErr.message : "Could not finalize screen recording.",
      );
      displayStreamRef.current = null;
      recordingEntryRef.current = "form";
      runRecordingStreamRelease();
      return;
    }
    displayStreamRef.current = null;
    recordingEntryRef.current = "form";
    runRecordingStreamRelease();
    setScreenshotCanvas(canvas);
    setScreenshotDataUrl(dataUrl);
    setStep(STEPS.ANNOTATE);
    setIsOpen(true);
  }, [runRecordingStreamRelease]);

  const startRecordFromHeader = useCallback(async () => {
    const projectRecordingAllowed = Boolean(config.projectId && config.screenRecording !== false);
    if (!projectRecordingAllowed) {
      return;
    }

    let email = "";
    if (config.mode === "embed") {
      email = getClientLinkVerifiedEmail();
    } else if (typeof config.getClientEmail === "function") {
      email = String(config.getClientEmail() || "")
        .trim()
        .toLowerCase();
    }

    const deferSession = config.mode === "embed" && (!email || !isPlausibleClientLinkEmail(email));

    if (config.mode !== "embed" && (!email || !isPlausibleClientLinkEmail(email))) {
      setCaptureError(
        "Verify your stakeholder email (e.g. in the chat sidebar) before recording, then try again.",
      );
      return;
    }

    setCaptureError(null);
    setHeaderRecordStarting(true);
    try {
      await handleEnableScreenRecording(email, "header", { deferSession });
    } catch (err) {
      recordingEntryRef.current = "form";
      setCaptureError(err?.message || "Could not start screen recording. Try again.");
    } finally {
      setHeaderRecordStarting(false);
    }
  }, [
    config.mode,
    config.projectId,
    config.screenRecording,
    config.getClientEmail,
    handleEnableScreenRecording,
  ]);

  useImperativeHandle(ref, () => ({ open: openWidget, openRecordFirst: startRecordFromHeader }), [
    openWidget,
    startRecordFromHeader,
  ]);

  useEffect(() => {
    config.onScreenRecordingChange?.(isScreenRecording);
  }, [isScreenRecording, config.onScreenRecordingChange]);

  useEffect(() => {
    if (!isScreenRecording) {
      setRecordingElapsedSec(0);
      return;
    }
    setRecordingElapsedSec(0);
    const id = setInterval(() => setRecordingElapsedSec((sec) => sec + 1), 1000);
    return () => clearInterval(id);
  }, [isScreenRecording]);

  const closeWidget = () => {
    stopIdleDisplayCapture();
    setVisualPickMode(false);
    setPickedElementContext(null);
    setIsOpen(false);
    successRef.current = false;
    setTimeout(() => {
      setStep(STEPS.CAPTURE);
      setScreenshotCanvas(null);
      setScreenshotDataUrl(null);
      setAnnotatedBlob(null);
      setAnnotatedDataUrl(null);
      setResult(null);
      setSubmittedDescription(null);
      setSubmittedPickedElement(null);
      setError(null);
      setCaptureError(null);
    }, 300);
  };

  const handleBack = () => {
    if (step === STEPS.ANNOTATE) {
      stopIdleDisplayCapture();
      setPickedElementContext(null);
      setStep(STEPS.CAPTURE);
      setScreenshotCanvas(null);
      setScreenshotDataUrl(null);
      setIsOpen(false);
    }
  };

  // Run capture when user clicked Report Issue (modal not open yet — so it never appears in the shot)
  React.useEffect(() => {
    if (!isCapturing) return;
    let cancelled = false;

    const runCapture = async () => {
      try {
        await waitForCaptureUiSettle();
        let canvas;
        displayStreamRef.current = null;
        const previewIframe = config.previewIframeRef?.current ?? null;
        if (previewIframe) {
          canvas = await captureFeedbackScreenshot({
            previewIframe,
            captureTarget: config.captureTarget,
          });
        } else if (config.captureTarget) {
          canvas = await captureTargetArea(config.captureTarget);
        } else {
          canvas = await captureViewport();
        }

        if (cancelled) {
          return;
        }

        const dataUrl = canvasToDataURL(canvas);
        if (cancelled) {
          return;
        }

        setScreenshotCanvas(canvas);
        setScreenshotDataUrl(dataUrl);
        setStep(STEPS.ANNOTATE);
        setIsOpen(true);
      } catch (err) {
        if (!cancelled) {
          setCaptureError(err?.message || "Capture failed");
          setPickedElementContext(null);
        }
      } finally {
        if (!cancelled) {
          setIsCapturing(false);
        }
      }
    };

    runCapture();
    return () => {
      cancelled = true;
    };
  }, [isCapturing]);

  const handleAnnotationSave = (
    blob,
    dataUrl,
    description,
    issueType = "Bug",
    reporterEmail = "",
    extras = {},
  ) => {
    setAnnotatedBlob(blob);
    setAnnotatedDataUrl(dataUrl);
    void handleSubmit(description, blob, issueType, reporterEmail, extras);
  };

  const handleSubmitStart = () => {
    setStep(STEPS.SUBMITTING);
    setSubmitBusy(true);
    setError(null);
  };

  const handleSubmit = async (
    description,
    blobToSubmit,
    issueType = "Bug",
    reporterEmail = "",
    extras = {},
  ) => {
    setStep(STEPS.SUBMITTING);
    setSubmitBusy(true);
    setError(null);

    try {
      const screenshotFile = blobToFile(blobToSubmit, "screenshot.png");

      let clientEmail = String(reporterEmail || "")
        .trim()
        .toLowerCase();
      if (!clientEmail && config.projectId && typeof config.getClientEmail === "function") {
        clientEmail = String(config.getClientEmail() || "")
          .trim()
          .toLowerCase();
      }

      if (config.mode === "embed") {
        if (clientEmail && !isPlausibleClientLinkEmail(clientEmail)) {
          throw new Error("Please enter a valid email address.");
        }
      } else if (config.projectId) {
        if (clientEmail && !isPlausibleClientLinkEmail(clientEmail)) {
          throw new Error("Please enter a valid email address.");
        }
      }

      const postSubmitAction = extras?.postSubmitAction || null;
      if (postSubmitAction && (!clientEmail || !isPlausibleClientLinkEmail(clientEmail))) {
        throw new Error("Enter a valid email for fix options.");
      }

      let recordingPayload = {};
      if (pendingRecordingPayloadRef.current?.deferredController) {
        const deferredCtrl = pendingRecordingPayloadRef.current.deferredController;
        pendingRecordingPayloadRef.current = null;
        try {
          const { sessionId, chunkCount } = await deferredCtrl.stop({
            clientEmail,
            finalizeSession: true,
            stopStream: false,
          });
          if (sessionId && chunkCount > 0) {
            recordingPayload = {
              recordingSessionId: sessionId,
              recordingChunkCount: chunkCount,
            };
          }
        } catch (recErr) {
          throw new Error(recErr?.message || "Could not finalize screen recording.");
        }
      } else if (screenRecordingRef.current) {
        try {
          const { sessionId, chunkCount } = await screenRecordingRef.current.stop({
            clientEmail,
            finalizeSession: true,
            stopStream: true,
          });
          screenRecordingRef.current = null;
          setIsScreenRecording(false);
          runRecordingStreamRelease();
          displayStreamRef.current = null;
          if (sessionId && chunkCount > 0) {
            recordingPayload = {
              recordingSessionId: sessionId,
              recordingChunkCount: chunkCount,
            };
          } else if (sessionId && chunkCount === 0 && import.meta.env.DEV) {
            logger.debug(
              "[feedback-widget] Recording produced no chunks (nothing reached S3). Check S3 bucket CORS for PUT from this origin and Network tab for failed presigned uploads.",
            );
          }
        } catch (recErr) {
          screenRecordingRef.current = null;
          setIsScreenRecording(false);
          runRecordingStreamRelease();
          throw new Error(recErr?.message || "Could not finalize screen recording.");
        }
      } else if (pendingRecordingPayloadRef.current) {
        const p = pendingRecordingPayloadRef.current;
        if (p.sessionId && p.chunkCount > 0) {
          recordingPayload = {
            recordingSessionId: p.sessionId,
            recordingChunkCount: p.chunkCount,
          };
        }
      } else if (displayStreamRef.current) {
        displayStreamRef.current.getTracks().forEach((t) => t.stop());
        displayStreamRef.current = null;
      }

      const submitMetadata =
        config.mode === "embed"
          ? { ...metadata, source: config.source || "snippet" }
          : { ...metadata };

      if (extras?.componentAnchor && typeof extras.componentAnchor === "object") {
        submitMetadata.componentAnchor = extras.componentAnchor;
      }
      if (config.mode === "embed") {
        const consoleLogs = getCapturedConsoleLogs();
        if (consoleLogs.length) submitMetadata.consoleLogs = consoleLogs;
      }

      const data = {
        description,
        metadata: submitMetadata,
        screenshot: screenshotFile,
        issueType,
        ...(extras?.pickedElementContext && typeof extras.pickedElementContext === "object"
          ? { pickedElementContext: extras.pickedElementContext }
          : {}),
        ...(config.releaseId != null && config.releaseId !== ""
          ? { releaseId: config.releaseId }
          : {}),
        ...(config.projectVersionId != null && config.projectVersionId !== ""
          ? { projectVersionId: config.projectVersionId }
          : {}),
        ...(clientEmail ? { clientEmail } : {}),
        ...recordingPayload,
        ...(config.source ? { source: config.source } : {}),
        ...(extras?.priority ? { priority: String(extras.priority).trim() } : {}),
        ...(extras?.labels?.length ? { labels: extras.labels } : {}),
        ...(extras?.createJiraTicket === true ? { createJiraTicket: true } : {}),
        ...(extras?.submitIdempotencyKey
          ? { submitIdempotencyKey: String(extras.submitIdempotencyKey) }
          : {}),
        ...(postSubmitAction ? { postSubmitAction } : {}),
      };

      const response = await submitFeedback(config.apiUrl, config.projectId, data);

      pendingRecordingPayloadRef.current = null;

      if (clientEmail && config.projectId) {
        setClientLinkVerifiedEmail(clientEmail);
      }

      // Set ref immediately so overlay/ESC cannot close before React re-renders
      successRef.current = true;
      setSubmittedPickedElement(
        extras?.pickedElementContext || extras?.componentAnchor || pickedElementContext || null,
      );
      setPickedElementContext(null);
      setResult(response);
      setSubmittedDescription(description);
      setStep(STEPS.SUCCESS);

      const jiraFailed = responseIncludesJiraFailure(response);
      const fixDenied =
        typeof response?.fixError === "string" && String(response.fixError).trim().length > 0;

      if (jiraFailed) {
        const msg =
          typeof response.jiraError === "string"
            ? response.jiraError.trim()
            : "Jira ticket could not be created";
        if (config.onError) {
          config.onError(new Error(msg));
        }
      } else if (fixDenied) {
        if (config.onError) {
          config.onError(new Error(String(response.fixError).trim()));
        }
      } else if (config.onSuccess) {
        config.onSuccess(response);
      }
    } catch (err) {
      setError(err.message);
      setStep(STEPS.ANNOTATE);

      if (config.onError) {
        config.onError(err);
      }
    } finally {
      setSubmitBusy(false);
    }
  };

  const anchorToPreview = Boolean(config.anchorToPreview);
  const isEmbedLauncher = config.mode === "embed";
  const projectRecordingAllowed = Boolean(config.projectId && config.screenRecording !== false);
  const embedAllowedDomains = embedJiraConfig?.allowedDomains ?? [];
  const embedPageVisible = useEmbedPageVisibility(isEmbedLauncher ? embedAllowedDomains : []);

  if (config.mode === "embed") {
    if (embedJiraConfig === null || embedJiraConfig.embedEnabled === false) {
      return null;
    }
    if (!embedPageVisible) {
      return null;
    }
  }

  return (
    <div
      className={cn("box-border [&_*]:box-border", anchorToPreview && "relative")}
      data-capturing={isCapturing ? "" : undefined}
    >
      {isEmbedLauncher ? (
        <FeedbackDocumentPickerOverlay
          active={visualPickMode}
          onPinned={handleVisualPickPinned}
          onCancel={handleCancelVisualPick}
        />
      ) : null}
      {/* Record-first: timer + stop (opens Send Feedback) / cancel while modal is closed */}
      {isScreenRecording && !isOpen && !isEmbedLauncher ? (
        <div
          className="fixed left-0 right-0 top-0 z-[2147483000] flex flex-wrap items-center justify-center gap-3 border-b border-slate-200 bg-slate-900 px-4 py-3 font-sans text-sm text-white shadow-[0_4px_24px_rgba(0,0,0,0.35)]"
          role="region"
          aria-label="Screen recording in progress"
        >
          <div className="flex items-center gap-2 font-mono text-base tabular-nums">
            <span
              className="inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-red-500"
              aria-hidden
            />
            <span aria-live="polite">{formatRecordingDuration(recordingElapsedSec)}</span>
          </div>
          <p className="w-full max-w-xl text-center text-xs text-slate-300">
            Mic + optional tab audio are included when you allow them in the browser prompts. After
            stop, mark up the screenshot and submit.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              className="rounded-lg border-0 bg-[#00b48a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#009a78]"
              onClick={() => finalizeHeaderRecordingAndOpenModal()}
            >
              Stop &amp; report issue
            </button>
            <button
              type="button"
              className="rounded-lg border border-white/30 bg-transparent px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
              onClick={discardRecordingOnly}
            >
              Cancel recording
            </button>
          </div>
        </div>
      ) : null}

      {/* Floating actions — hide while modal is open so the tab does not block the form panel */}
      {!config.hideDefaultTrigger && !isOpen && !visualPickMode ? (
        <div
          className={cn(
            isEmbedLauncher ? "flex flex-col gap-0" : "flex flex-col gap-2",
            anchorToPreview
              ? "absolute bottom-5 right-5 z-20"
              : isEmbedLauncher
                ? "pointer-events-auto fixed right-0 top-1/2 z-[2147483000] -translate-y-1/2 items-end sm:right-0"
                : "fixed bottom-0 right-0 z-[999999]",
          )}
        >
          {isEmbedLauncher ? (
            <>
              <button
                type="button"
                data-feedback-widget-button
                className={cn(
                  "flex h-[128px] w-9 shrink-0 flex-col items-stretch rounded-tl-xl border-2 border-red-900/20 bg-[#dc2626] py-2 shadow-none transition-colors duration-200 ease-out hover:bg-[#b91c1c] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60",
                  "border-b border-b-white/20",
                )}
                onPointerDownCapture={stopHostOverlayDismissOnPointer}
                onClick={(e) => {
                  e.stopPropagation();
                  openWidget();
                }}
                disabled={isScreenRecording}
                title="Report an issue or provide feedback"
                aria-label="Report Issue"
              >
                <span className="flex min-h-0 flex-1 items-center justify-center px-0.5">
                  <span className="select-none text-center text-[11px] font-semibold leading-tight tracking-wide text-white [text-orientation:mixed] [writing-mode:vertical-rl] rotate-180">
                    Report Issue
                  </span>
                </span>
                <span className="flex shrink-0 justify-center pb-1 pt-1">
                  <span className="flex size-6 items-center justify-center rounded-md text-white">
                    {isCapturing ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : (
                      <Pencil className="size-4" strokeWidth={2.25} aria-hidden />
                    )}
                  </span>
                </span>
              </button>
              {projectRecordingAllowed ? (
                <div className="flex w-9 flex-col items-stretch gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        data-feedback-widget-record-button
                        className="inline-flex h-11 w-9 shrink-0 items-center justify-center border-2 border-t-0 border-red-900/20 bg-[#dc2626] shadow-none transition-colors duration-200 ease-out hover:bg-[#b91c1c] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                        onPointerDownCapture={stopHostOverlayDismissOnPointer}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isScreenRecording) {
                            void finalizeHeaderRecordingAndOpenModal();
                          } else {
                            void startRecordFromHeader();
                          }
                        }}
                        disabled={headerRecordStarting && !isScreenRecording}
                        aria-label={
                          isScreenRecording
                            ? "Stop recording and report issue"
                            : "Record screen for feedback"
                        }
                      >
                        {headerRecordStarting ? (
                          <span className="h-4 w-4 animate-[spin_0.8s_linear_infinite] rounded-full border-2 border-red-900/40 border-t-white" />
                        ) : isScreenRecording ? (
                          <Square
                            className="size-4 shrink-0 text-white"
                            fill="currentColor"
                            strokeWidth={0}
                            aria-hidden
                          />
                        ) : (
                          <Circle
                            className="size-4 shrink-0 text-white"
                            fill="currentColor"
                            strokeWidth={0}
                            aria-hidden
                          />
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="left" sideOffset={8} className="z-[2147482998]">
                      {isScreenRecording ? "Stop and report issue" : "Record screen"}
                    </TooltipContent>
                  </Tooltip>
                  {isScreenRecording && !isOpen ? (
                    <div className="flex w-full min-w-0 flex-col items-stretch gap-0.5">
                      <span
                        className="w-full rounded-md border border-slate-200/90 bg-white/95 px-0.5 py-0.5 text-center font-mono text-[10px] tabular-nums leading-none tracking-tight text-slate-900 backdrop-blur-sm"
                        aria-live="polite"
                      >
                        {formatRecordingDuration(recordingElapsedSec)}
                      </span>
                      <button
                        type="button"
                        className="w-full border-0 bg-transparent p-0 text-center text-[9px] font-medium leading-tight text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline"
                        onClick={discardRecordingOnly}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    data-feedback-widget-pick-button
                    className={cn(
                      "inline-flex h-11 w-9 shrink-0 items-center justify-center rounded-bl-xl border-2 border-t-0 border-red-900/20 bg-[#dc2626] shadow-none transition-colors duration-200 ease-out hover:bg-[#b91c1c] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60",
                      visualPickMode && "ring-2 ring-white/40",
                    )}
                    onPointerDownCapture={stopHostOverlayDismissOnPointer}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleVisualPick();
                    }}
                    disabled={isScreenRecording || isCapturing}
                    aria-pressed={visualPickMode}
                    aria-label={visualPickMode ? "Exit pick element mode" : "Pick element on page"}
                  >
                    <SquareMousePointer className="size-4 shrink-0 text-white" aria-hidden />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left" sideOffset={8} className="z-[2147482998]">
                  Turn this on and select the part of the UI you&apos;d like to edit
                </TooltipContent>
              </Tooltip>
            </>
          ) : (
            <>
              <button
                type="button"
                data-feedback-widget-button
                className="inline-flex items-center justify-center gap-2 rounded-lg border-0 bg-[#dc2626] px-5 py-3 font-sans text-sm font-semibold text-white shadow-[0_4px_12px_rgba(220,38,38,0.3)] transition-all duration-300 ease-in-out hover:-translate-y-0.5 hover:bg-[#b91c1c] hover:shadow-[0_6px_20px_rgba(220,38,38,0.4)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 max-md:px-4 max-md:py-2.5 max-md:text-[13px] [&_svg]:h-5 [&_svg]:w-5 [&_svg]:fill-white max-md:[&_svg]:h-[18px] max-md:[&_svg]:w-[18px]"
                onClick={openWidget}
                disabled={isScreenRecording}
                title="Report an issue or provide feedback"
                aria-label="Report Issue"
              >
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                </svg>
                <span className="whitespace-nowrap">Report Issue</span>
              </button>
              {projectRecordingAllowed ? (
                <button
                  type="button"
                  data-feedback-widget-record-button
                  className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-slate-300 bg-white px-5 py-3 font-sans text-sm font-semibold text-slate-800 shadow-md transition-all hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 max-md:px-4 max-md:py-2.5 max-md:text-[13px]"
                  onClick={startRecordFromHeader}
                  disabled={isScreenRecording || headerRecordStarting}
                  title="Record your screen, then open Send Feedback with the video attached"
                  aria-label="Record screen for feedback"
                >
                  {headerRecordStarting ? (
                    <span className="m-0 h-[18px] w-[18px] shrink-0 animate-[spin_0.8s_linear_infinite] rounded-full border-2 border-slate-200 border-t-[#00b48a]" />
                  ) : (
                    <svg
                      className="h-5 w-5 shrink-0 text-red-600"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden
                    >
                      <circle cx="12" cy="12" r="8" />
                    </svg>
                  )}
                  <span className="whitespace-nowrap">Record screen</span>
                </button>
              ) : null}
            </>
          )}
        </div>
      ) : null}

      {/* Capture error toast */}
      {captureError && !isCapturing && !isOpen && (
        <div
          className={cn(
            "flex max-w-[320px] items-center gap-3 rounded-lg bg-[#fef2f2] px-4 py-3 font-sans text-[13px] text-[#991b1b] shadow-[0_4px_12px_rgba(0,0,0,0.15)]",
            anchorToPreview
              ? "absolute bottom-[72px] right-5 z-[21] max-md:bottom-16 max-md:right-4"
              : config.mode === "embed"
                ? "pointer-events-auto fixed right-[4.75rem] top-1/2 z-[2147482999] max-w-[min(100vw-6rem,320px)] -translate-y-1/2 max-md:right-[3.75rem]"
                : "fixed bottom-[72px] right-5 z-[999998] max-md:bottom-16 max-md:right-4",
          )}
          role="alert"
        >
          <span>{captureError}</span>
          <button
            type="button"
            className="cursor-pointer border-0 bg-transparent px-1 text-lg leading-none text-[#991b1b] opacity-80 hover:opacity-100"
            onClick={() => setCaptureError(null)}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {/* Modal — only open after screenshot is taken, so it never appears in the shot */}
      <Modal
        isOpen={isOpen}
        onClose={closeWidget}
        elevatedLayer={isEmbedLauncher}
        allowOverlayClose={() => !successRef.current && step !== STEPS.SUCCESS}
      >
        {/* Header — recording timer + stop / cancel while capturing video */}
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 px-4 py-2 sm:px-6 sm:py-[5px]">
          <h2 className="m-0 min-w-0 flex-1 font-sans text-lg font-semibold text-gray-900">
            Send Feedback
          </h2>
          {isScreenRecording ? (
            <div
              className="flex items-center gap-2 font-mono text-sm tabular-nums text-gray-800"
              aria-live="polite"
            >
              <span
                className="inline-flex h-2 w-2 animate-pulse rounded-full bg-red-600"
                aria-hidden
              />
              {formatRecordingDuration(recordingElapsedSec)}
            </div>
          ) : null}
          <div className="ml-auto flex shrink-0 items-center gap-1">
            {isScreenRecording ? (
              <>
                <button
                  type="button"
                  className="cursor-pointer rounded-md border-0 bg-[#00b48a] px-3 py-1.5 font-sans text-xs font-semibold text-white hover:bg-[#009a78] sm:text-sm"
                  onClick={() => {
                    void handleDisableScreenRecording().catch((e) => {
                      setError(e instanceof Error ? e.message : "Could not finalize recording.");
                    });
                  }}
                >
                  Stop
                </button>
                <button
                  type="button"
                  className="cursor-pointer rounded-md border border-gray-300 bg-white px-3 py-1.5 font-sans text-xs font-medium text-gray-700 hover:bg-gray-50 sm:text-sm"
                  onClick={discardRecordingOnly}
                >
                  Cancel
                </button>
              </>
            ) : null}
            <button
              type="button"
              className="cursor-pointer rounded-md border-0 bg-transparent p-2 transition-colors hover:bg-gray-100"
              onClick={closeWidget}
              aria-label="Close"
            >
              <svg
                className="h-5 w-5 fill-gray-500"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        {step === STEPS.ANNOTATE ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 pb-6 pt-2">
            {error && (
              <div className="mb-4 shrink-0 text-center">
                <div className="mx-auto mb-2.5 h-[120px] w-[120px] overflow-hidden" aria-hidden>
                  <Lottie
                    key={error}
                    animationData={errorAnimation}
                    loop={false}
                    className="h-full w-full [&_svg]:!h-full [&_svg]:!w-full [&_svg]:max-h-full"
                    rendererSettings={lottieRenderer}
                  />
                </div>
                <div
                  className="rounded-lg bg-[#fee2e2] px-[14px] py-3 text-left font-sans text-sm text-[#991b1b]"
                  role="alert"
                >
                  {error}
                </div>
              </div>
            )}
            {isScreenRecording && (
              <div
                className="mb-4 shrink-0 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 font-sans text-[13px] text-amber-950"
                role="status"
              >
                Recording{" "}
                <span className="font-mono font-semibold tabular-nums">
                  {formatRecordingDuration(recordingElapsedSec)}
                </span>
                — screen, mic, and optional tab audio upload in the background. Highlight the
                screenshot with the tools on the left. Use <strong>Stop</strong> in the header when
                finished, then submit.
              </div>
            )}
            <div className="min-h-0 flex-1 overflow-hidden">
              <AnnotationEditor
                screenshot={screenshotDataUrl}
                metadata={metadata}
                requiresReporterEmail={Boolean(config.projectId) && config.mode === "embed"}
                embedApi={config.mode === "embed"}
                onSave={handleAnnotationSave}
                onSubmitStart={handleSubmitStart}
                onBack={handleBack}
                screenRecordingActive={isScreenRecording}
                previewIframeRef={config.previewIframeRef}
                pickedElementContext={pickedElementContext}
                onClearPickedElement={handleClearPickedElement}
                submitBusy={submitBusy}
                onImproveDescription={canImproveDescription ? handleImproveDescription : undefined}
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6">
            {step === STEPS.SUBMITTING && (
              <div className="px-5 py-10 text-center">
                <FeedbackSpinner size={48} className="mx-auto mb-5" />
                <h3 className="m-0 mb-2 font-sans text-lg font-semibold text-gray-900">
                  Submitting Feedback...
                </h3>
                <p className="m-0 font-sans text-sm text-gray-500">
                  Please wait while we process your feedback
                </p>
              </div>
            )}

            {step === STEPS.SUCCESS && result && (
              <div className="max-w-full px-5 py-6 text-center">
                <div className="mx-auto mb-2 h-[168px] w-[168px] overflow-hidden" aria-hidden>
                  <Lottie
                    key={responseIncludesJiraFailure(result) ? "outcome-err" : "outcome-ok"}
                    animationData={
                      responseIncludesJiraFailure(result) ? errorAnimation : successAnimation
                    }
                    loop={false}
                    className="h-full w-full [&_svg]:!h-full [&_svg]:!w-full [&_svg]:max-h-full"
                    rendererSettings={lottieRenderer}
                  />
                </div>
                <h3
                  className={cn(
                    "m-0 mb-2 font-sans text-[22px] font-semibold text-gray-900",
                    responseIncludesJiraFailure(result) && "text-[#b45309]",
                  )}
                >
                  {responseIncludesJiraFailure(result)
                    ? "Couldn't create Jira ticket"
                    : result?.fixError
                      ? "Feedback saved"
                      : result?.fixStarted
                        ? "Feedback saved — fix started"
                        : "Feedback Submitted!"}
                </h3>
                {typeof result?.fixError === "string" && result.fixError.trim() ? (
                  <p
                    className="m-0 mb-4 rounded-lg border border-amber-200 bg-amber-50 px-[14px] py-3 text-left font-sans text-sm text-amber-950"
                    role="alert"
                  >
                    {result.fixError.trim()}
                  </p>
                ) : null}
                {result?.fixStarted ? (
                  <p
                    className="m-0 mb-4 rounded-lg border border-sky-200 bg-sky-50 px-[14px] py-3 text-left font-sans text-sm text-sky-950"
                    role="status"
                  >
                    AI fix is running. Track progress in Feedbacks.
                  </p>
                ) : null}
                {responseIncludesJiraFailure(result) ? (
                  <p
                    className="mb-2 rounded-lg border border-[#fcd34d] bg-[#fffbeb] px-[14px] py-3 text-left font-sans text-sm !text-[#92400e]"
                    role="alert"
                  >
                    {typeof result.jiraError === "string"
                      ? result.jiraError.trim()
                      : "Something went wrong while creating the ticket."}
                  </p>
                ) : (
                  <>
                    {typeof result?.jiraTicket === "string" && result.jiraTicket.trim() ? (
                      <p
                        className="m-0 mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-[14px] py-3 text-left font-sans text-sm text-emerald-950"
                        role="status"
                      >
                        Jira ticket{" "}
                        {typeof result.jiraUrl === "string" && result.jiraUrl.trim() ? (
                          <a
                            href={result.jiraUrl.trim()}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-emerald-900 underline-offset-2 hover:underline"
                          >
                            {result.jiraTicket.trim()}
                          </a>
                        ) : (
                          <span className="font-semibold">{result.jiraTicket.trim()}</span>
                        )}{" "}
                        created.
                      </p>
                    ) : null}
                    {result?.recordingStatus === "processing" && (
                      <p
                        className="m-0 mb-4 rounded-lg border border-sky-200 bg-sky-50 px-[14px] py-3 text-left font-sans text-sm text-sky-950"
                        role="status"
                      >
                        Screen recording is processing and will be attached to the Jira issue
                        shortly.
                      </p>
                    )}
                    {typeof result?.recordingError === "string" &&
                      result.recordingError.trim().length > 0 && (
                        <p
                          className="m-0 mb-4 rounded-lg border border-amber-200 bg-amber-50 px-[14px] py-3 text-left font-sans text-sm text-amber-950"
                          role="alert"
                        >
                          {result.recordingError.trim()}
                        </p>
                      )}
                  </>
                )}

                <div className="mt-5 flex flex-col gap-4 border-t border-gray-200 pt-5 text-left sm:flex-row sm:items-stretch sm:gap-5">
                  {annotatedDataUrl && (
                    <div className="min-w-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 px-4 py-3.5 sm:flex-[1.55]">
                      <label className="mb-2 block font-sans text-xs font-semibold uppercase tracking-wider text-gray-500">
                        screenshot
                      </label>
                      <img
                        src={annotatedDataUrl}
                        alt="Submitted screenshot"
                        className="mx-auto block w-full max-h-[220px] object-contain sm:max-h-[340px]"
                      />
                    </div>
                  )}
                  {submittedDescription && (
                    <div className="flex min-w-0 flex-col rounded-lg border border-gray-200 bg-gray-50 px-4 py-3.5 sm:flex-1 sm:max-h-[400px]">
                      <label className="mb-2 block shrink-0 font-sans text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Description
                      </label>
                      {(() => {
                        const display = resolveFeedbackDescriptionDisplay(
                          submittedDescription,
                          submittedPickedElement,
                        );
                        return (
                          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
                            {display.inspectorCtx || display.contextBlock ? (
                              <div className="shrink-0">
                                <ElementContextChip
                                  tag={display.tag}
                                  inspectorCtx={display.inspectorCtx}
                                  contextBlock={display.contextBlock}
                                />
                              </div>
                            ) : null}
                            {display.userText ? (
                              <div className="whitespace-pre-wrap break-words font-sans text-sm leading-normal text-gray-700">
                                {display.userText}
                              </div>
                            ) : null}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer - only show for success (Close button) */}
        {step === STEPS.SUCCESS && (
          <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4 max-md:flex-col">
            <button
              type="button"
              className="ml-auto cursor-pointer rounded-lg border-0 bg-[#00b48a] px-6 py-3 font-sans text-sm font-medium text-white transition-all duration-200 hover:bg-[#00b48a] max-md:ml-0 max-md:w-full"
              onClick={closeWidget}
            >
              Close
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
});

export default FeedbackWidget;
