import { useMemo, forwardRef } from "react";
import FeedbackWidget from "./FeedbackWidget";
import config from "@/config";
import "tldraw/tldraw.css";

/** Resolve client-link slug from URL when not passed explicitly. */
function resolveFeedbackProjectSlug(explicitSlug) {
  const trimmed = String(explicitSlug || "").trim();
  if (trimmed) return trimmed;
  if (typeof window === "undefined") return null;
  const match = window.location.pathname.match(/^\/projects\/([^/]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

/** Fallback preview iframe ref for client-link (`#previewFrame`). */
function useResolvedPreviewIframeRef(previewIframeRef) {
  return useMemo(() => {
    if (previewIframeRef) return previewIframeRef;
    return {
      get current() {
        if (typeof document === "undefined") return null;
        const el = document.getElementById("previewFrame");
        return el instanceof HTMLIFrameElement ? el : null;
      },
    };
  }, [previewIframeRef]);
}

const EmbeddedFeedbackWidget = forwardRef(function EmbeddedFeedbackWidget(
  {
    projectId,
    releaseId = null,
    projectVersionId = null,
    /** Public project slug — used to load deploy environments for fix+deploy. */
    projectSlug = null,
    /** Preview iframe ref for component picker. */
    previewIframeRef = null,
    /** When set with projectId, issue submission sends this email for stakeholder checks (client link). */
    getClientEmail = null,
    captureTarget = null,
    /** When true, the Report Issue button is positioned in the bottom-right of its parent (e.g. preview panel), not the viewport. */
    anchorToPreview = false,
    /** When true, the default floating Report Issue control is not rendered (use ref `open()` from a custom trigger). */
    hideDefaultTrigger = false,
    /** `embed` uses public project id + pending_review flow for external sites. */
    mode = null,
    source = null,
    onCapturingChange,
    /** Called when screen recording starts or stops (for disabling toolbar buttons, etc.). */
    onScreenRecordingChange,
    onSuccess,
    onError,
  },
  ref,
) {
  const resolvedPreviewIframeRef = useResolvedPreviewIframeRef(previewIframeRef);
  const resolvedProjectSlug = resolveFeedbackProjectSlug(projectSlug);

  const widgetConfig = useMemo(
    () => ({
      projectId: String(projectId),
      releaseId,
      projectVersionId,
      projectSlug: resolvedProjectSlug,
      previewIframeRef: resolvedPreviewIframeRef,
      getClientEmail,
      apiUrl: config.API_URL,
      captureTarget,
      anchorToPreview,
      hideDefaultTrigger,
      ...(mode === "embed"
        ? {
            mode: "embed",
            source: String(source || "snippet").trim(),
          }
        : { source: "client_link" }),
      onCapturingChange,
      onScreenRecordingChange,
      onSuccess,
      onError,
    }),
    [
      projectId,
      releaseId,
      projectVersionId,
      projectSlug,
      previewIframeRef,
      getClientEmail,
      captureTarget,
      anchorToPreview,
      hideDefaultTrigger,
      mode,
      source,
      onCapturingChange,
      onScreenRecordingChange,
      onSuccess,
      onError,
    ],
  );

  if (!projectId) {
    return null;
  }

  return <FeedbackWidget ref={ref} config={widgetConfig} />;
});

export default EmbeddedFeedbackWidget;
