import { useCallback, useEffect, useRef, useState } from "react";
import {
  createWorkspaceDocument,
  deleteWorkspaceDocument,
  fetchWorkspaceDocuments,
  patchWorkspaceDocument,
} from "@/api";
import { toast } from "sonner";
import { useProjectDiscoveryBridge } from "@/pages/Project/hooks/useProjectDiscoveryBridge";
import { hashTipTapContent } from "@/pages/Project/PrdWorkspace/editor/prdContentHash.js";
import { normalizeWorkspaceDocName, workspaceDocNameExists } from "../utils/workspaceDocumentNames";

const SAVE_DEBOUNCE_MS = 2500;
const MIN_SAVE_INTERVAL_MS = 4000;

export function useWorkspaceDocuments(projectId, refresh) {
  const { registerDocumentsRefresh } = useProjectDiscoveryBridge();
  const [docs, setDocs] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const saveTimer = useRef(null);
  const docsRef = useRef(docs);
  const activeIdRef = useRef(activeId);
  const pendingDocRef = useRef(null);
  const skipNextSaveRef = useRef(false);
  const lastSavedContentHashRef = useRef(new Map());
  const saveInFlightRef = useRef(false);
  const lastSaveAtRef = useRef(0);
  const flushSaveRef = useRef(async () => {});

  const activeDoc = docs.find((d) => d.id === activeId) || null;

  useEffect(() => {
    docsRef.current = docs;
  }, [docs]);

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  const rememberServerHashes = useCallback((list) => {
    const hashes = new Map();
    for (const doc of list) {
      if (doc?.id) hashes.set(doc.id, hashTipTapContent(doc.content));
    }
    lastSavedContentHashRef.current = hashes;
  }, []);

  const loadRef = useRef(async () => {});

  const load = useCallback(async () => {
    if (!projectId) return;
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    pendingDocRef.current = null;
    setLoading(true);
    try {
      const data = await fetchWorkspaceDocuments(projectId);
      const list = data.workspaceDocuments || [];
      rememberServerHashes(list);
      skipNextSaveRef.current = true;
      setDocs(list);
      setActiveId((prev) => {
        if (prev && list.some((d) => d.id === prev)) return prev;
        return list[0]?.id || null;
      });
    } catch (err) {
      toast.error(err?.error || "Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, [projectId, rememberServerHashes]);

  loadRef.current = load;

  const flushSave = useCallback(async () => {
    const doc = pendingDocRef.current;
    if (!projectId || !doc?.id || saveInFlightRef.current) return;

    const contentHash = hashTipTapContent(doc.content);
    if (contentHash === lastSavedContentHashRef.current.get(doc.id)) {
      pendingDocRef.current = null;
      return;
    }

    const current = docsRef.current.find((d) => d.id === doc.id);
    if (current?.updatedAt && doc.updatedAt && current.updatedAt !== doc.updatedAt) {
      const currentHash = hashTipTapContent(current.content);
      if (currentHash !== contentHash) {
        pendingDocRef.current = null;
        return;
      }
    }

    const now = Date.now();
    if (now - lastSaveAtRef.current < MIN_SAVE_INTERVAL_MS) {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(
        () => {
          saveTimer.current = null;
          flushSaveRef.current();
        },
        MIN_SAVE_INTERVAL_MS - (now - lastSaveAtRef.current),
      );
      return;
    }

    saveInFlightRef.current = true;
    setSaving(true);
    try {
      if (workspaceDocNameExists(docsRef.current, doc.name, doc.id)) {
        toast.error("A document with this name already exists");
        await loadRef.current();
        return;
      }
      const data = await patchWorkspaceDocument(projectId, doc.id, {
        name: doc.name,
        content: doc.content,
      });
      if (data.document) {
        lastSaveAtRef.current = Date.now();
        const savedHash = hashTipTapContent(data.document.content);
        lastSavedContentHashRef.current.set(doc.id, savedHash);
        setDocs((prev) => prev.map((d) => (d.id === doc.id ? { ...d, ...data.document } : d)));
      }
      pendingDocRef.current = null;
    } catch (err) {
      toast.error(err?.error || "Save failed");
      await loadRef.current();
    } finally {
      saveInFlightRef.current = false;
      setSaving(false);
    }
  }, [projectId]);

  flushSaveRef.current = flushSave;

  const flushPendingSave = useCallback(() => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    return flushSaveRef.current();
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    return registerDocumentsRefresh(load);
  }, [registerDocumentsRefresh, load]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      void flushSaveRef.current();
    };
  }, []);

  const scheduleSave = useCallback((doc, { updateLocalState = false } = {}) => {
    if (!doc?.id) return;
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }

    const contentHash = hashTipTapContent(doc.content);
    if (contentHash === lastSavedContentHashRef.current.get(doc.id)) {
      if (updateLocalState) {
        setDocs((prev) => prev.map((d) => (d.id === doc.id ? doc : d)));
      }
      return;
    }

    pendingDocRef.current = doc;
    if (updateLocalState) {
      setDocs((prev) => prev.map((d) => (d.id === doc.id ? doc : d)));
    }

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null;
      flushSaveRef.current();
    }, SAVE_DEBOUNCE_MS);
  }, []);

  const handleCreateSubmit = async ({ name, skillId, autoUpdateOnCapture }) => {
    const trimmed = normalizeWorkspaceDocName(name);
    if (workspaceDocNameExists(docs, trimmed)) {
      toast.error("A document with this name already exists");
      throw new Error("duplicate_document_name");
    }
    try {
      const body = { name: trimmed };
      if (skillId) {
        body.skillId = skillId;
        body.autoUpdateOnCapture = Boolean(autoUpdateOnCapture);
      }
      const data = await createWorkspaceDocument(projectId, body);
      await load();
      if (data.document?.id) setActiveId(data.document.id);
      await refresh?.();
      toast.success("Document created");
      return data.document?.id || null;
    } catch (err) {
      toast.error(err?.error || "Failed to create document");
      throw err;
    }
  };

  const handleSkillChange = async (docId, patch) => {
    const doc = docsRef.current.find((d) => d.id === docId);
    if (!doc) return;
    const updated = { ...doc, ...patch };
    setDocs((prev) => prev.map((d) => (d.id === docId ? updated : d)));
    try {
      const data = await patchWorkspaceDocument(projectId, docId, patch);
      if (data.document) {
        const savedHash = hashTipTapContent(data.document.content);
        lastSavedContentHashRef.current.set(docId, savedHash);
        setDocs((prev) => prev.map((d) => (d.id === docId ? { ...d, ...data.document } : d)));
      }
      await refresh?.({ silent: true });
    } catch (err) {
      toast.error(err?.error || "Failed to update document settings");
      await load();
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteWorkspaceDocument(projectId, deleteTarget);
      if (activeId === deleteTarget) setActiveId(null);
      await load();
      await refresh?.();
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err?.error || "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const handleEditorUpdate = (content) => {
    const doc = docsRef.current.find((d) => d.id === activeIdRef.current);
    if (!doc) return;
    scheduleSave({ ...doc, content });
  };

  const handleRename = async (name) => {
    const doc = docsRef.current.find((d) => d.id === activeIdRef.current);
    if (!doc) return;
    const trimmed = normalizeWorkspaceDocName(name);
    const savedName = normalizeWorkspaceDocName(doc.name);
    if (trimmed === savedName) {
      setDocs((prev) => prev.map((d) => (d.id === doc.id ? { ...d, name: trimmed } : d)));
      return;
    }
    if (workspaceDocNameExists(docsRef.current, trimmed, doc.id)) {
      throw { error: "A document with this name already exists" };
    }
    setDocs((prev) => prev.map((d) => (d.id === doc.id ? { ...d, name: trimmed } : d)));
    try {
      const data = await patchWorkspaceDocument(projectId, doc.id, { name: trimmed });
      if (data.document) {
        setDocs((prev) => prev.map((d) => (d.id === doc.id ? { ...d, ...data.document } : d)));
      }
      await refresh?.({ silent: true });
    } catch (err) {
      await loadRef.current();
      throw err;
    }
  };

  const applyDocument = (doc) => {
    if (!doc?.id) return;
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    pendingDocRef.current = null;
    const savedHash = hashTipTapContent(doc.content);
    lastSavedContentHashRef.current.set(doc.id, savedHash);
    skipNextSaveRef.current = true;
    setDocs((prev) => prev.map((d) => (d.id === doc.id ? { ...d, ...doc } : d)));
    setActiveId(doc.id);
  };

  const setActiveDocumentId = useCallback(
    (nextId) => {
      void flushPendingSave().finally(() => {
        setActiveId(nextId);
      });
    },
    [flushPendingSave],
  );

  return {
    docs,
    activeDoc,
    activeId,
    setActiveId: setActiveDocumentId,
    loading,
    saving,
    createOpen,
    setCreateOpen,
    deleteTarget,
    setDeleteTarget,
    deleting,
    load,
    handleCreateSubmit,
    handleDeleteConfirm,
    handleEditorUpdate,
    handleRename,
    handleSkillChange,
    applyDocument,
    flushPendingSave,
  };
}
