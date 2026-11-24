import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createProjectCustomCursorRule,
  fetchCursorRulesCatalog,
  fetchProjectCustomCursorRules,
  fetchWorkspaceCursorRulesCatalog,
  fetchWorkspaceCustomCursorRules,
  importCursorRulesFolders,
} from "@/api";
import { toast } from "sonner";
import {
  EMPTY_PENDING_PACKS,
  EMPTY_SELECTED_FOLDERS,
  mergePendingCursorPacks,
  mergePendingFolderNames,
} from "./mergePendingCursorPacks";

/**
 * Cursor Rules catalog import + custom rule editor state for a project.
 * Used by ReleaseManagement and BackendCodeTabContent (separate instances).
 */
export function useProjectCursorRules({
  projectId,
  hasDeveloperRepo = false,
  canOpen = true,
  purpose = "import",
  initialSelectedFolders = EMPTY_SELECTED_FOLDERS,
  onConfirmSelection,
  onSaveCustomWithoutProject,
  pendingCustomPacks = EMPTY_PENDING_PACKS,
}) {
  const pendingCustomPacksRef = useRef(pendingCustomPacks);
  pendingCustomPacksRef.current = pendingCustomPacks;
  const [cursorRulesOpen, setCursorRulesOpen] = useState(false);
  const cursorRulesOpenRef = useRef(false);
  const [cursorRulesFolders, setCursorRulesFolders] = useState([]);
  const [cursorRulesLoading, setCursorRulesLoading] = useState(false);
  const [cursorRulesSearch, setCursorRulesSearch] = useState("");
  const [selectedCursorFolders, setSelectedCursorFolders] = useState(() => new Set());
  const [cursorRulesImporting, setCursorRulesImporting] = useState(false);
  const [customRuleFolderName, setCustomRuleFolderName] = useState("");
  const [customRuleBody, setCustomRuleBody] = useState("");
  const [customRuleSaving, setCustomRuleSaving] = useState(false);
  const [cursorRulesMainStep, setCursorRulesMainStep] = useState("choose");
  const [cursorRulesCreateOwnOpen, setCursorRulesCreateOwnOpen] = useState(false);
  const [customRulesSavedList, setCustomRulesSavedList] = useState([]);
  const [customRulesSavedLoading, setCustomRulesSavedLoading] = useState(false);
  const [editingCustomTitle, setEditingCustomTitle] = useState(null);

  const filteredCursorFolders = useMemo(() => {
    const q = cursorRulesSearch.trim().toLowerCase();
    if (!q) return cursorRulesFolders;
    return cursorRulesFolders.filter((f) => String(f).toLowerCase().includes(q));
  }, [cursorRulesFolders, cursorRulesSearch]);

  const toggleCursorFolder = useCallback((name) => {
    setSelectedCursorFolders((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const loadCursorRulesCatalog = useCallback(async () => {
    setCursorRulesLoading(true);
    try {
      const data = projectId
        ? await fetchCursorRulesCatalog(projectId)
        : await fetchWorkspaceCursorRulesCatalog();
      let folders = Array.isArray(data?.folders) ? data.folders : [];
      if (!projectId) {
        folders = mergePendingFolderNames(folders, pendingCustomPacksRef.current);
      }
      setCursorRulesFolders(folders);
    } catch (err) {
      toast.error(err.error || err.message || "Failed to load catalog");
      setCursorRulesFolders([]);
    } finally {
      setCursorRulesLoading(false);
    }
  }, [projectId]);

  const loadCustomRulesSavedList = useCallback(async () => {
    setCustomRulesSavedLoading(true);
    const pending = pendingCustomPacksRef.current;
    try {
      const data = projectId
        ? await fetchProjectCustomCursorRules(projectId)
        : await fetchWorkspaceCustomCursorRules();
      const rules = Array.isArray(data?.rules) ? data.rules : [];
      setCustomRulesSavedList(projectId ? rules : mergePendingCursorPacks(rules, pending));
    } catch (err) {
      toast.error(err.error || err.message || "Failed to load saved rules");
      setCustomRulesSavedList(projectId ? [] : mergePendingCursorPacks([], pending));
    } finally {
      setCustomRulesSavedLoading(false);
    }
  }, [projectId]);

  const handleImportCursorRules = useCallback(async () => {
    if (purpose === "select") {
      onConfirmSelection?.([...selectedCursorFolders]);
      setCursorRulesOpen(false);
      setCursorRulesSearch("");
      return;
    }
    if (selectedCursorFolders.size === 0) {
      toast.error("Select at least one rules pack");
      return;
    }
    setCursorRulesImporting(true);
    try {
      const result = await importCursorRulesFolders(projectId, [...selectedCursorFolders]);
      if (result.skipped) {
        toast.success(
          `Rules already matched the repo (${result.filesWritten} file(s)); no new commit.`,
        );
      } else {
        toast.success(
          `Pushed ${result.filesWritten} file(s) to ${result.developmentRepoUrl ?? "the developer repository"}.`,
        );
      }
      setCursorRulesOpen(false);
      setSelectedCursorFolders(new Set());
      setCursorRulesSearch("");
    } catch (err) {
      toast.error(err.error || err.message || "Import failed");
    } finally {
      setCursorRulesImporting(false);
    }
  }, [purpose, onConfirmSelection, projectId, selectedCursorFolders]);

  const handleSaveCustomCursorRule = useCallback(async () => {
    const name = customRuleFolderName.trim();
    if (!name) {
      toast.error("Enter a title");
      return;
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(name)) {
      toast.error(
        "Title may only use letters, numbers, dots, underscores, and hyphens (used as the repo folder name).",
      );
      return;
    }
    setCustomRuleSaving(true);
    try {
      if (projectId) {
        await createProjectCustomCursorRule(projectId, {
          folderName: name,
          body: customRuleBody,
        });
      } else if (onSaveCustomWithoutProject) {
        const pendingRule = {
          id: `pending-${name}`,
          folderName: name,
          body: customRuleBody,
          updatedAt: new Date().toISOString(),
        };
        onSaveCustomWithoutProject(pendingRule);
        setCustomRulesSavedList((prev) => [
          pendingRule,
          ...prev.filter((rule) => rule.folderName !== name),
        ]);
        setCursorRulesFolders((prev) => [...new Set([...prev, name])]);
        setSelectedCursorFolders((prev) => new Set([...prev, name]));
      } else {
        toast.error("Open a saved project before creating custom rules");
        return;
      }
      const wasEdit = editingCustomTitle !== null;
      toast.success(
        !projectId
          ? "Rule will be saved after project creation."
          : wasEdit
            ? "Rule updated. Select it under “Add from catalog” and click Add to push."
            : "Rule saved. Select your pack under “Add from catalog” and click Add to push.",
      );
      if (!wasEdit) {
        setCustomRuleFolderName("");
        setCustomRuleBody("");
        setEditingCustomTitle(null);
      }
      if (projectId) {
        await loadCustomRulesSavedList();
        await loadCursorRulesCatalog();
      }
    } catch (err) {
      toast.error(err.error || err.message || "Failed to save");
    } finally {
      setCustomRuleSaving(false);
    }
  }, [
    projectId,
    customRuleFolderName,
    customRuleBody,
    editingCustomTitle,
    onSaveCustomWithoutProject,
    loadCustomRulesSavedList,
    loadCursorRulesCatalog,
  ]);

  const startEditCustomRule = useCallback((rule) => {
    setEditingCustomTitle(rule.folderName);
    setCustomRuleFolderName(rule.folderName);
    setCustomRuleBody(rule.body ?? "");
  }, []);

  const startNewCustomRule = useCallback(() => {
    setEditingCustomTitle(null);
    setCustomRuleFolderName("");
    setCustomRuleBody("");
  }, []);

  const openAddCursorRules = useCallback(() => {
    if (!canOpen) return;
    if (purpose === "import" && !hasDeveloperRepo) return;
    if (purpose === "select") {
      setSelectedCursorFolders(new Set(initialSelectedFolders));
      setCursorRulesMainStep("catalog");
    } else {
      setCursorRulesMainStep("choose");
    }
    setCursorRulesOpen(true);
  }, [canOpen, hasDeveloperRepo, purpose, initialSelectedFolders]);

  const openSelectCursorRules = openAddCursorRules;

  const handleMainDialogOpenChange = useCallback(
    (open) => {
      if (!open && !cursorRulesOpenRef.current) return;
      setCursorRulesOpen(open);
      if (open) {
        if (purpose === "select") {
          setSelectedCursorFolders(new Set(initialSelectedFolders));
          setCursorRulesMainStep("catalog");
        } else {
          setCursorRulesMainStep("choose");
        }
      } else {
        setCursorRulesSearch("");
        setSelectedCursorFolders(new Set());
        setCustomRuleFolderName("");
        setCustomRuleBody("");
        setCursorRulesMainStep("choose");
        setCursorRulesCreateOwnOpen(false);
      }
    },
    [purpose, initialSelectedFolders],
  );

  useEffect(() => {
    cursorRulesOpenRef.current = cursorRulesOpen;
  }, [cursorRulesOpen]);

  const handleCreateOwnDialogOpenChange = useCallback((open) => {
    setCursorRulesCreateOwnOpen(open);
    if (!open) {
      setCustomRuleFolderName("");
      setCustomRuleBody("");
      setEditingCustomTitle(null);
    }
  }, []);

  useEffect(() => {
    if (!cursorRulesOpen) return;
    loadCursorRulesCatalog();
  }, [cursorRulesOpen, projectId, loadCursorRulesCatalog]);

  useEffect(() => {
    if (!cursorRulesCreateOwnOpen) return;
    loadCustomRulesSavedList();
  }, [cursorRulesCreateOwnOpen, projectId, loadCustomRulesSavedList]);

  useEffect(() => {
    if (!cursorRulesOpen) return;
    if (purpose === "select" || cursorRulesMainStep === "catalog") {
      loadCustomRulesSavedList();
    }
  }, [cursorRulesOpen, cursorRulesMainStep, purpose, projectId, loadCustomRulesSavedList]);

  return {
    cursorRulesOpen,
    setCursorRulesOpen,
    cursorRulesFolders,
    cursorRulesLoading,
    cursorRulesSearch,
    setCursorRulesSearch,
    selectedCursorFolders,
    cursorRulesImporting,
    customRuleFolderName,
    setCustomRuleFolderName,
    customRuleBody,
    setCustomRuleBody,
    customRuleSaving,
    cursorRulesMainStep,
    setCursorRulesMainStep,
    cursorRulesCreateOwnOpen,
    setCursorRulesCreateOwnOpen,
    customRulesSavedList,
    customRulesSavedLoading,
    editingCustomTitle,
    filteredCursorFolders,
    toggleCursorFolder,
    handleImportCursorRules,
    handleSaveCustomCursorRule,
    startEditCustomRule,
    startNewCustomRule,
    openAddCursorRules,
    openSelectCursorRules,
    handleMainDialogOpenChange,
    handleCreateOwnDialogOpenChange,
    purpose,
  };
}
