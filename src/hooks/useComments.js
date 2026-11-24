import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createComment,
  deleteComment,
  fetchComments,
  replyComment,
  updateCommentStatus,
} from "@/api";
import { previewRoutePathname, previewRoutesMatch } from "@/lib/clientLinkEmbeddedPreviewSrc";
import { normalizePreviewCommentCategory } from "@/lib/previewCommentCategory.util";
import { getClientLinkVerifiedEmail } from "@/lib/clientLinkVerifiedEmail";
import { buildUiPreferenceScope } from "@/lib/uiPreferences";
import { usePageUiPreferences } from "@/hooks/usePageUiPreferences";
import { PREVIEW_COMMENT_CATEGORIES } from "@/lib/previewCommentCategory.util";

const COMMENTS_UI_SCHEMA = {
  statusFilter: { defaultValue: "all", allowed: ["all", "open", "resolved"] },
  pageFilter: { defaultValue: "current", allowed: ["current", "all"] },
  categoryFilter: { defaultValue: "all", allowed: ["all", ...PREVIEW_COMMENT_CATEGORIES] },
};

/**
 * Load and mutate Client Link preview comments.
 * @param {{
 *   projectSlug: string | null | undefined,
 *   releaseId: number | null | undefined,
 *   previewPath: string,
 *   projectVersionId?: number | null,
 *   enabled?: boolean,
 * }} options
 */
export function useComments({
  projectSlug,
  releaseId,
  previewPath,
  projectVersionId = null,
  enabled = true,
}) {
  const [allComments, setAllComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const commentsScope = buildUiPreferenceScope({
    clientLinkSlug: projectSlug ? String(projectSlug).trim() : null,
  });
  const [prefs, setPref] = usePageUiPreferences(commentsScope, COMMENTS_UI_SCHEMA);
  const statusFilter = prefs.statusFilter;
  const pageFilter = prefs.pageFilter;
  const categoryFilter = prefs.categoryFilter;
  const setStatusFilter = useCallback((value) => setPref("statusFilter", value), [setPref]);
  const setPageFilter = useCallback((value) => setPref("pageFilter", value), [setPref]);
  const setCategoryFilter = useCallback((value) => setPref("categoryFilter", value), [setPref]);
  const [focusedCommentId, setFocusedCommentId] = useState(null);
  const [selectedThreadId, setSelectedThreadId] = useState(null);

  const clientEmail = getClientLinkVerifiedEmail()?.trim() || "";

  const normalizedPath = useMemo(() => previewRoutePathname(previewPath), [previewPath]);

  const refresh = useCallback(async () => {
    if (!projectSlug || releaseId == null || !enabled) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchComments(projectSlug, {
        releaseId,
        includeAllPaths: true,
        status: statusFilter === "all" ? undefined : statusFilter,
        clientEmail: clientEmail || undefined,
      });
      setAllComments(Array.isArray(res?.comments) ? res.comments : []);
    } catch (err) {
      const msg = err?.error || err?.message || "Could not load comments. Try again.";
      setError(typeof msg === "string" ? msg : "Could not load comments.");
    } finally {
      setLoading(false);
    }
  }, [projectSlug, releaseId, enabled, statusFilter, clientEmail]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filteredForSidebar = useMemo(() => {
    let rows = allComments;
    if (pageFilter === "current") {
      rows = rows.filter((c) => previewRoutesMatch(c.previewPath, normalizedPath));
    }
    if (categoryFilter !== "all") {
      rows = rows.filter((c) => normalizePreviewCommentCategory(c.category) === categoryFilter);
    }
    return rows;
  }, [allComments, pageFilter, categoryFilter, normalizedPath]);

  const pinsForCurrentPage = useMemo(
    () => allComments.filter((c) => previewRoutesMatch(c.previewPath, normalizedPath)),
    [allComments, normalizedPath],
  );

  const createCommentOnPage = useCallback(
    async ({ anchor, body = "", logicBody, category = "comments", previewPath: pathOverride }) => {
      if (!projectSlug || releaseId == null) return null;
      const res = await createComment(projectSlug, {
        releaseId,
        previewPath: pathOverride || normalizedPath,
        anchor,
        body,
        logicBody,
        category,
        projectVersionId: projectVersionId ?? undefined,
        clientEmail: clientEmail || undefined,
      });
      await refresh();
      return res?.comment ?? null;
    },
    [projectSlug, releaseId, normalizedPath, projectVersionId, clientEmail, refresh],
  );

  const replyToComment = useCallback(
    async (commentId, body) => {
      if (!projectSlug || !commentId) return null;
      const res = await replyComment(projectSlug, commentId, {
        body,
        clientEmail: clientEmail || undefined,
      });
      await refresh();
      return res?.comment ?? null;
    },
    [projectSlug, clientEmail, refresh],
  );

  const setCommentStatus = useCallback(
    async (commentId, status) => {
      if (!projectSlug || !commentId) return null;
      const res = await updateCommentStatus(projectSlug, commentId, {
        status,
        clientEmail: clientEmail || undefined,
      });
      await refresh();
      return res?.comment ?? null;
    },
    [projectSlug, clientEmail, refresh],
  );

  const updateCommentLogicBody = useCallback(
    async (commentId, logicBody) => {
      if (!projectSlug || !commentId) return null;
      const res = await updateCommentStatus(projectSlug, commentId, {
        logicBody,
        clientEmail: clientEmail || undefined,
      });
      await refresh();
      return res?.comment ?? null;
    },
    [projectSlug, clientEmail, refresh],
  );

  const removeComment = useCallback(
    async (commentId) => {
      if (!projectSlug || !commentId) return;
      await deleteComment(projectSlug, commentId, {
        clientEmail: clientEmail || undefined,
      });
      if (focusedCommentId === commentId) setFocusedCommentId(null);
      if (selectedThreadId === commentId) setSelectedThreadId(null);
      await refresh();
    },
    [projectSlug, clientEmail, refresh, focusedCommentId, selectedThreadId],
  );

  return {
    allComments,
    filteredForSidebar,
    pinsForCurrentPage,
    loading,
    error,
    refresh,
    statusFilter,
    setStatusFilter,
    pageFilter,
    setPageFilter,
    categoryFilter,
    setCategoryFilter,
    focusedCommentId,
    setFocusedCommentId,
    selectedThreadId,
    setSelectedThreadId,
    createComment: createCommentOnPage,
    replyToComment,
    setCommentStatus,
    updateCommentLogicBody,
    removeComment,
    normalizedPath,
    clientEmail,
  };
}
