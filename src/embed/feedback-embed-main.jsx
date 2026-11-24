import React from "react";
import { createRoot } from "react-dom/client";
import FeedbackWidget from "@/features/feedback-widget/FeedbackWidget";
import { installConsoleCapture } from "@/features/feedback-widget/services/consoleCapture.service";
import { EmbedPortalContainerProvider } from "@/embed/EmbedPortalContainerContext.jsx";
import { ensureEmbedShadowHostReady } from "@/embed/embedShadowHost.js";
import "@/embed/feedback-embed-styles.css";

function readConfig() {
  const c = window.launchpadFeedbackConfig || window.LaunchpadFeedbackConfig || {};
  const project = String(c.project != null ? c.project : c.projectId || "").trim();
  const apiUrl = String(c.apiBaseUrl || c.apiUrl || "").replace(/\/$/, "");
  const source = String(c.source || "snippet").trim();
  return { ...c, project, projectId: project, apiUrl, source };
}

async function mount() {
  const cfg = readConfig();
  if (!cfg.project || !cfg.apiUrl) {
    // eslint-disable-next-line no-console
    console.warn(
      "[Launchpad feedback] Missing launchpadFeedbackConfig.project or API URL (set by shim).",
    );
    return;
  }
  if (!document.body) {
    document.addEventListener("DOMContentLoaded", () => void mount(), { once: true });
    return;
  }

  let shadowHost;
  try {
    shadowHost = await ensureEmbedShadowHostReady();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn(
      "[Launchpad feedback] Could not load widget styles.",
      error instanceof Error ? error.message : error,
    );
    return;
  }

  const { mountEl, overlayRoot } = shadowHost;
  const root = createRoot(mountEl);
  root.render(
    <EmbedPortalContainerProvider container={overlayRoot ?? mountEl}>
      <FeedbackWidget
        config={{
          apiUrl: cfg.apiUrl,
          projectId: cfg.project,
          source: cfg.source,
          mode: "embed",
          screenRecording: cfg.screenRecording !== false,
          anchorToPreview: false,
          hideDefaultTrigger: Boolean(cfg.hideDefaultTrigger),
        }}
      />
    </EmbedPortalContainerProvider>,
  );
}

installConsoleCapture();

if (document.readyState === "loading" && !document.body) {
  document.addEventListener("DOMContentLoaded", () => void mount(), { once: true });
} else {
  void mount();
}
