import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchPrd,
  putPrd,
  generatePrd,
  postPrdChat,
  regeneratePrd,
  fetchPrdRevisions,
  restorePrdRevision,
} from "@/api";
import { toast } from "sonner";
import { useProjectDiscoveryBridge } from "@/pages/Project/hooks/useProjectDiscoveryBridge";
import { hashTipTapContent } from "./editor/prdContentHash.js";

const SAVE_DEBOUNCE_MS = 2500;
const MIN_SAVE_INTERVAL_MS = 4000;

export function usePrdDocument(projectId) {
  const { registerPrdRefresh } = useProjectDiscoveryBridge();
  const [document, setDocument] = useState(null);
  const [revisionCount, setRevisionCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [syncKey, setSyncKey] = useState(0);

  const saveTimerRef = useRef(null);
  const skipNextSaveRef = useRef(false);
  const pendingDocRef = useRef(null);
  const lastSavedContentHashRef = useRef(null);
  const lastSaveAtRef = useRef(0);
  const saveInFlightRef = useRef(false);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const data = await fetchPrd(projectId);
      setDocument(data.document);
      setRevisionCount(data.revisionCount ?? 0);
      lastSavedContentHashRef.current = hashTipTapContent(data.document?.content);
      setDirty(false);
      setSyncKey((k) => k + 1);
    } catch (err) {
      toast.error(err?.error || "Failed to load PRD");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    return registerPrdRefresh(load);
  }, [registerPrdRefresh, load]);

  const applyServerDocument = useCallback((doc, count) => {
    skipNextSaveRef.current = true;
    pendingDocRef.current = null;
    setDocument(doc);
    if (count != null) setRevisionCount(count);
    lastSavedContentHashRef.current = hashTipTapContent(doc?.content);
    setDirty(false);
    setSyncKey((k) => k + 1);
  }, []);

  const flushSave = useCallback(async () => {
    const doc = pendingDocRef.current;
    if (!projectId || !doc || saveInFlightRef.current) return;

    const contentHash = hashTipTapContent(doc.content);
    if (contentHash === lastSavedContentHashRef.current) {
      pendingDocRef.current = null;
      setDirty(false);
      return;
    }

    const now = Date.now();
    if (now - lastSaveAtRef.current < MIN_SAVE_INTERVAL_MS && saveTimerRef.current) {
      saveTimerRef.current = setTimeout(flushSave, MIN_SAVE_INTERVAL_MS - (now - lastSaveAtRef.current));
      return;
    }

    saveInFlightRef.current = true;
    setSaving(true);
    try {
      const data = await putPrd(projectId, { document: doc, changeSummary: "Manual edit", source: "manual" });
      lastSaveAtRef.current = Date.now();
      lastSavedContentHashRef.current = hashTipTapContent(data.document?.content);
      pendingDocRef.current = null;
      applyServerDocument(data.document, data.revisionCount);
    } catch (err) {
      toast.error(err?.error || "Failed to save PRD");
    } finally {
      saveInFlightRef.current = false;
      setSaving(false);
    }
  }, [projectId, applyServerDocument]);

  const scheduleSave = useCallback(
    (doc) => {
      if (!projectId || !doc) return;
      if (skipNextSaveRef.current) {
        skipNextSaveRef.current = false;
        return;
      }

      const contentHash = hashTipTapContent(doc.content);
      if (contentHash === lastSavedContentHashRef.current) {
        setDirty(false);
        return;
      }

      pendingDocRef.current = doc;
      setDocument(doc);
      setDirty(true);

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(flushSave, SAVE_DEBOUNCE_MS);
    },
    [projectId, flushSave],
  );

  const saveNow = useCallback(
    async (doc, changeSummary = "Manual edit") => {
      if (!projectId || !doc) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      pendingDocRef.current = doc;
      saveInFlightRef.current = false;

      const contentHash = hashTipTapContent(doc.content);
      if (contentHash === lastSavedContentHashRef.current && changeSummary === "Manual edit") {
        setDirty(false);
        return;
      }

      setSaving(true);
      try {
        const data = await putPrd(projectId, { document: doc, changeSummary, source: "manual" });
        lastSaveAtRef.current = Date.now();
        lastSavedContentHashRef.current = hashTipTapContent(data.document?.content);
        pendingDocRef.current = null;
        applyServerDocument(data.document, data.revisionCount);
      } catch (err) {
        toast.error(err?.error || "Failed to save PRD");
      } finally {
        setSaving(false);
      }
    },
    [projectId, applyServerDocument],
  );

  const flushPendingSave = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    return flushSave();
  }, [flushSave]);

  const handleGenerate = useCallback(
    async (replace = false, sources) => {
      if (!projectId) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      setGenerating(true);
      try {
        const body = { replace };
        if (sources && typeof sources === "object") body.sources = sources;
        const data = await generatePrd(projectId, body);
        applyServerDocument(data.document, data.revisionCount);
        toast.success(replace ? "PRD regenerated" : "PRD generated");
      } catch (err) {
        toast.error(err?.error || "Failed to generate PRD");
      } finally {
        setGenerating(false);
      }
    },
    [projectId, applyServerDocument],
  );

  const handleChat = useCallback(
    async (body) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      const data = await postPrdChat(projectId, body);
      applyServerDocument(data.document, data.revisionCount);
      return data;
    },
    [projectId, applyServerDocument],
  );

  const handleRegenerate = useCallback(
    async (body) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      setGenerating(true);
      try {
        const data = await regeneratePrd(projectId, body);
        applyServerDocument(data.document, data.revisionCount);
        toast.success("PRD updated");
        return data;
      } catch (err) {
        toast.error(err?.error || "Regeneration failed");
        throw err;
      } finally {
        setGenerating(false);
      }
    },
    [projectId, applyServerDocument],
  );

  const loadRevisions = useCallback(async () => {
    const data = await fetchPrdRevisions(projectId);
    return data.revisions || [];
  }, [projectId]);

  const handleRestore = useCallback(
    async (revisionId) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      const data = await restorePrdRevision(projectId, revisionId);
      applyServerDocument(data.document, data.revisionCount);
      toast.success("Revision restored");
    },
    [projectId, applyServerDocument],
  );

  const acknowledgeHighlights = useCallback(() => {
    if (!document) return;
    const next = {
      ...document,
      highlightMarkIds: [],
      content: stripHighlightMarks(document.content),
    };
    saveNow(next, "Acknowledged AI changes");
  }, [document, saveNow]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  return {
    document,
    setDocument,
    revisionCount,
    loading,
    generating,
    saving,
    dirty,
    syncKey,
    load,
    scheduleSave,
    saveNow,
    flushPendingSave,
    handleGenerate,
    handleChat,
    handleRegenerate,
    loadRevisions,
    handleRestore,
    acknowledgeHighlights,
  };
}

function stripHighlightMarks(content) {
  if (!content || typeof content !== "object") return content;
  const walk = (node) => {
    if (!node || typeof node !== "object") return node;
    const out = { ...node };
    if (node.type === "text" && Array.isArray(node.marks)) {
      const marks = node.marks.filter((m) => m.type !== "highlight");
      if (marks.length) out.marks = marks;
      else delete out.marks;
    }
    if (Array.isArray(node.content)) out.content = node.content.map(walk);
    return out;
  };
  return walk(content);
}
