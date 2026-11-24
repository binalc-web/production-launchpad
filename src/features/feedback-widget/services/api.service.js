// API Service - Handle communication with backend
import { logger } from "@/utils/logger";

export const fetchEmbedFeedbackConfig = async (apiUrl, projectRef) => {
  const base = String(apiUrl || "").replace(/\/$/, "");
  const res = await fetch(
    `${base}/api/client-feedbacks/embed/${encodeURIComponent(projectRef)}/config`,
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || "Failed to load embed config");
  }
  return data;
};

export const fetchEmbedJiraLabels = async (apiUrl, projectRef, q) => {
  const base = String(apiUrl || "").replace(/\/$/, "");
  const url = new URL(
    `${base}/api/client-feedbacks/embed/${encodeURIComponent(projectRef)}/jira-labels`,
  );
  if (q) url.searchParams.set("q", String(q));
  const res = await fetch(url.toString());
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || "Failed to fetch labels");
  }
  return Array.isArray(data.labels) ? data.labels : [];
};

export const improveFeedbackDescription = async (apiUrl, projectRef, description) => {
  const base = String(apiUrl || "").replace(/\/$/, "");
  const res = await fetch(
    `${base}/api/client-feedbacks/embed/${encodeURIComponent(projectRef)}/improve-description`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description }),
    },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok || typeof data.improvedDescription !== "string") {
    throw new Error(data.message || "Failed to improve description");
  }
  return data.improvedDescription;
};

export const submitFeedback = async (apiUrl, projectId, data) => {
  try {
    const formData = new FormData();

    formData.append("projectId", projectId);
    formData.append("description", data.description);
    formData.append("metadata", JSON.stringify(data.metadata));
    formData.append("screenshot", data.screenshot);
    if (data.issueType) formData.append("issueType", data.issueType);
    if (data.releaseId != null && data.releaseId !== "") {
      formData.append("releaseId", String(data.releaseId));
    }
    if (data.projectVersionId != null && data.projectVersionId !== "") {
      formData.append("projectVersionId", String(data.projectVersionId));
    }
    if (data.clientEmail) {
      formData.append("clientEmail", String(data.clientEmail).trim());
    }
    if (data.source) {
      formData.append("source", String(data.source));
    }
    if (data.recordingSessionId) {
      formData.append("recordingSessionId", String(data.recordingSessionId).trim());
    }
    if (data.recordingChunkCount != null && data.recordingChunkCount !== "") {
      formData.append("recordingChunkCount", String(data.recordingChunkCount));
    }
    if (data.priority) {
      formData.append("priority", String(data.priority));
    }
    if (data.labels && Array.isArray(data.labels) && data.labels.length) {
      formData.append("labels", JSON.stringify(data.labels));
    }
    if (data.postSubmitAction) {
      formData.append("postSubmitAction", String(data.postSubmitAction));
    }
    if (data.deployEnvironmentId) {
      formData.append("deployEnvironmentId", String(data.deployEnvironmentId));
    }
    if (data.pickedElementContext && typeof data.pickedElementContext === "object") {
      formData.append("pickedElementContext", JSON.stringify(data.pickedElementContext));
    }
    if (data.createJiraTicket === true) {
      formData.append("createJiraTicket", "true");
    }
    if (data.submitIdempotencyKey) {
      formData.append("submitIdempotencyKey", String(data.submitIdempotencyKey));
    }

    const response = await fetch(`${apiUrl}/api/client-feedbacks/submit`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      let message = "Failed to submit feedback";
      try {
        const body = await response.json();
        message = body.message || message;
      } catch {
        message = response.statusText || message;
      }
      throw new Error(message);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    logger.error("feedback_api_submit", error);
    throw error;
  }
};

export const fetchPublicDeployEnvironmentsForFeedback = async (
  apiUrl,
  projectSlug,
  clientEmail,
) => {
  const base = String(apiUrl || "").replace(/\/$/, "");
  const url = new URL(
    `${base}/api/projects/public/${encodeURIComponent(projectSlug)}/deploy-environments`,
  );
  url.searchParams.set("clientEmail", String(clientEmail || "").trim());
  const res = await fetch(url.toString());
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || data.error || "Could not load deploy environments");
  }
  return data;
};

export const validateConfig = (config) => {
  if (!config.projectId) {
    throw new Error("projectId is required");
  }

  if (!config.apiUrl) {
    throw new Error("apiUrl is required");
  }

  return true;
};
