import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchKickoffPresentation,
  fetchKickoffPresentations,
  generateKickoffPresentation,
  patchKickoffPresentation,
  regenerateKickoffPresentation,
} from "@/api";
import { toast } from "sonner";

const POLL_MS = 2000;
const SAVE_DEBOUNCE_MS = 2500;
const ACTIVE_STATUSES = new Set(["pending", "generating"]);

export function useKickoffPresentation(projectId, refresh) {
  const [presentations, setPresentations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const saveTimer = useRef(null);
  const pendingHtmlRef = useRef(null);
  const pollTimer = useRef(null);

  const activePresentation = presentations.find((p) => p.id === activeId) || null;

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const data = await fetchKickoffPresentations(projectId);
      const list = data.kickoffPresentations || [];
      setPresentations(list);
      setActiveId((prev) => {
        if (prev && list.some((p) => p.id === prev)) return prev;
        return list[0]?.id || null;
      });
    } catch (err) {
      toast.error(err?.error || "Failed to load presentations");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const pollPresentation = useCallback(
    async (presentationId) => {
      if (!projectId || !presentationId) return;
      try {
        const data = await fetchKickoffPresentation(projectId, presentationId);
        const presentation = data.presentation;
        if (!presentation) return;
        setPresentations((prev) => prev.map((p) => (p.id === presentationId ? presentation : p)));
        if (!ACTIVE_STATUSES.has(presentation.status)) {
          if (presentation.status === "completed") {
            toast.success("Presentation ready");
            await refresh?.();
          } else if (presentation.status === "failed") {
            toast.error(presentation.error || "Presentation generation failed");
          }
          if (pollTimer.current) {
            clearInterval(pollTimer.current);
            pollTimer.current = null;
          }
        }
      } catch (err) {
        toast.error(err?.error || "Failed to check presentation status");
      }
    },
    [projectId, refresh],
  );

  const startPolling = useCallback(
    (presentationId) => {
      if (pollTimer.current) clearInterval(pollTimer.current);
      pollPresentation(presentationId);
      pollTimer.current = setInterval(() => {
        pollPresentation(presentationId);
      }, POLL_MS);
    },
    [pollPresentation],
  );

  useEffect(
    () => () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
      if (saveTimer.current) clearTimeout(saveTimer.current);
    },
    [],
  );

  const handleGenerateSubmit = useCallback(
    async ({ name, skillId }) => {
      try {
        const data = await generateKickoffPresentation(projectId, {
          name,
          skillId,
        });
        const presentation = data?.presentation;
        if (!presentation?.id) {
          throw new Error("Invalid presentation response");
        }
        setPresentations((prev) => {
          const without = prev.filter((p) => p.id !== presentation.id);
          return [...without, presentation];
        });
        setActiveId(presentation.id);
        if (presentation.status === "failed") {
          toast.error(presentation.error || "Presentation generation failed");
        } else {
          await refresh?.();
          toast.success("Presentation ready");
        }
        return presentation.id;
      } catch (err) {
        const message =
          err?.error ||
          err?.message ||
          (typeof err === "string" ? err : "Failed to generate presentation");
        toast.error(message);
        throw err;
      }
    },
    [projectId, refresh],
  );

  const flushSave = useCallback(async () => {
    const html = pendingHtmlRef.current;
    if (!projectId || !activeId || html == null) return;
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    setSaving(true);
    try {
      const data = await patchKickoffPresentation(projectId, activeId, {
        html,
      });
      const updated = data.presentation;
      setPresentations((prev) => prev.map((p) => (p.id === activeId ? updated : p)));
      pendingHtmlRef.current = null;
    } catch (err) {
      toast.error(err?.error || "Failed to save presentation");
    } finally {
      setSaving(false);
    }
  }, [projectId, activeId]);

  const handleHtmlChange = useCallback(
    (html) => {
      setPresentations((prev) => prev.map((p) => (p.id === activeId ? { ...p, html } : p)));
      pendingHtmlRef.current = html;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        saveTimer.current = null;
        flushSave();
      }, SAVE_DEBOUNCE_MS);
    },
    [activeId, flushSave],
  );

  const handleSkillChange = useCallback(
    async (presentationId, patch) => {
      try {
        const data = await patchKickoffPresentation(projectId, presentationId, patch);
        const updated = data.presentation;
        setPresentations((prev) => prev.map((p) => (p.id === presentationId ? updated : p)));
      } catch (err) {
        toast.error(err?.error || "Failed to update skill");
        throw err;
      }
    },
    [projectId],
  );

  const handleRegenerate = useCallback(async () => {
    if (!activeId) return;
    try {
      const data = await regenerateKickoffPresentation(projectId, activeId);
      const presentation = data?.presentation;
      if (presentation) {
        setPresentations((prev) => prev.map((p) => (p.id === activeId ? presentation : p)));
      }
      if (presentation?.status === "failed") {
        toast.error(presentation.error || "Presentation generation failed");
      } else {
        await refresh?.();
        toast.success("Presentation updated");
      }
    } catch (err) {
      toast.error(err?.error || err?.message || "Failed to regenerate presentation");
    }
  }, [activeId, projectId, refresh]);

  const handleThemeChange = useCallback(
    async (theme) => {
      if (!activeId) return;
      const current = presentations.find((p) => p.id === activeId);
      let html = current?.html || "";
      html = html.replace(/class="theme-(light|dark)"/i, `class="theme-${theme}"`);
      try {
        const data = await patchKickoffPresentation(projectId, activeId, {
          theme,
          html,
        });
        const updated = data.presentation;
        setPresentations((prev) => prev.map((p) => (p.id === activeId ? updated : p)));
      } catch (err) {
        toast.error(err?.error || "Failed to update theme");
      }
    },
    [activeId, projectId, presentations],
  );

  const applyPresentation = useCallback((presentation) => {
    if (!presentation?.id) return;
    setPresentations((prev) => prev.map((p) => (p.id === presentation.id ? presentation : p)));
  }, []);

  return {
    presentations,
    activePresentation,
    activeId,
    setActiveId,
    loading,
    saving,
    generateOpen,
    setGenerateOpen,
    load,
    handleGenerateSubmit,
    handleHtmlChange,
    handleSkillChange,
    handleRegenerate,
    handleThemeChange,
    applyPresentation,
    flushSave,
  };
}
