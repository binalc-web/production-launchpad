import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createProjectCustomCursorSkill,
  fetchCursorSkillsCatalog,
  fetchProjectCustomCursorSkills,
  fetchWorkspaceCursorSkillsCatalog,
  fetchWorkspaceCustomCursorSkills,
  importCursorSkillsFolders,
} from "@/api";
import { getHubAccessTokenForApi } from "@/api/hubAiSkillsLibrary";
import { toast } from "sonner";
import {
  EMPTY_PENDING_PACKS,
  EMPTY_SELECTED_FOLDERS,
  mergePendingCursorPacks,
  mergePendingFolderNames,
} from "./mergePendingCursorPacks";

/**
 * Split stored folder names into workspace custom packs vs Hub skill IDs.
 * Select mode persists Hub picks as folderName only; reopen must rematch by name.
 */
export function partitionSelectedSkillFolders(folderNames, hubSkills) {
  const list = Array.isArray(folderNames) ? folderNames : [];
  const hubByFolder = new Map();
  for (const skill of Array.isArray(hubSkills) ? hubSkills : []) {
    const folderName = skill?.folderName != null ? String(skill.folderName) : "";
    const id = skill?.id != null ? String(skill.id) : "";
    if (folderName && id) hubByFolder.set(folderName, id);
  }
  const customFolders = [];
  const hubSkillIds = [];
  for (const name of list) {
    const folder = name != null ? String(name) : "";
    if (!folder) continue;
    const hubId = hubByFolder.get(folder);
    if (hubId) hubSkillIds.push(hubId);
    else customFolders.push(folder);
  }
  return { customFolders, hubSkillIds };
}

/**
 * Cursor Skills catalog import + custom skill editor state for a project.
 * Catalog merges workspace custom packs with Hub public AI skills.
 */
export function useProjectCursorSkills({
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
  /** Ensures select-mode remapping from folder names → Hub IDs runs once per dialog open. */
  const selectHydratedRef = useRef(false);
  const [cursorSkillsOpen, setCursorSkillsOpen] = useState(false);
  const cursorSkillsOpenRef = useRef(false);
  const [cursorSkillsFolders, setCursorSkillsFolders] = useState([]);
  const [hubSkills, setHubSkills] = useState([]);
  const [cursorSkillsLoading, setCursorSkillsLoading] = useState(false);
  const [cursorSkillsSearch, setCursorSkillsSearch] = useState("");
  const [selectedCursorFolders, setSelectedCursorFolders] = useState(() => new Set());
  const [selectedHubSkillIds, setSelectedHubSkillIds] = useState(() => new Set());
  const [cursorSkillsImporting, setCursorSkillsImporting] = useState(false);
  const [customSkillFolderName, setCustomSkillFolderName] = useState("");
  const [customSkillBody, setCustomSkillBody] = useState("");
  const [customSkillSaving, setCustomSkillSaving] = useState(false);
  const [cursorSkillsMainStep, setCursorSkillsMainStep] = useState("choose");
  const [cursorSkillsCreateOwnOpen, setCursorSkillsCreateOwnOpen] = useState(false);
  const [customSkillsSavedList, setCustomSkillsSavedList] = useState([]);
  const [customSkillsSavedLoading, setCustomSkillsSavedLoading] = useState(false);
  const [editingCustomTitle, setEditingCustomTitle] = useState(null);
  /** Folder name of the pack shown in the catalog read-only preview dialog. */
  const [skillPreviewFolderName, setSkillPreviewFolderName] = useState(null);

  const hasHubSession = Boolean(getHubAccessTokenForApi());

  const filteredCursorFolders = useMemo(() => {
    const q = cursorSkillsSearch.trim().toLowerCase();
    if (!q) return cursorSkillsFolders;
    return cursorSkillsFolders.filter((f) => String(f).toLowerCase().includes(q));
  }, [cursorSkillsFolders, cursorSkillsSearch]);

  const filteredHubSkills = useMemo(() => {
    const q = cursorSkillsSearch.trim().toLowerCase();
    if (!q) return hubSkills;
    return hubSkills.filter((skill) => {
      const title = String(skill?.title ?? "").toLowerCase();
      const description = String(skill?.description ?? "").toLowerCase();
      const folderName = String(skill?.folderName ?? "").toLowerCase();
      return title.includes(q) || description.includes(q) || folderName.includes(q);
    });
  }, [hubSkills, cursorSkillsSearch]);

  const totalSelectedCount = selectedCursorFolders.size + selectedHubSkillIds.size;

  const skillPreviewBody = useMemo(() => {
    if (!skillPreviewFolderName) return "";
    const skill = customSkillsSavedList.find((s) => s.folderName === skillPreviewFolderName);
    return skill?.body ?? "";
  }, [customSkillsSavedList, skillPreviewFolderName]);

  const openSkillPreview = useCallback((folderName) => {
    setSkillPreviewFolderName(folderName);
  }, []);

  const closeSkillPreview = useCallback(() => {
    setSkillPreviewFolderName(null);
  }, []);

  const toggleCursorFolder = useCallback((name) => {
    setSelectedCursorFolders((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const toggleHubSkill = useCallback((skillId) => {
    setSelectedHubSkillIds((prev) => {
      const next = new Set(prev);
      if (next.has(skillId)) next.delete(skillId);
      else next.add(skillId);
      return next;
    });
  }, []);

  const loadCursorSkillsCatalog = useCallback(async () => {
    setCursorSkillsLoading(true);
    try {
      const data = projectId
        ? await fetchCursorSkillsCatalog(projectId)
        : await fetchWorkspaceCursorSkillsCatalog();
      let folders = [];
      if (Array.isArray(data?.customFolders)) {
        folders = data.customFolders;
      } else if (Array.isArray(data?.folders)) {
        folders = data.folders;
      }
      if (!projectId) {
        folders = mergePendingFolderNames(folders, pendingCustomPacksRef.current);
      }
      setCursorSkillsFolders(folders);
      setHubSkills(Array.isArray(data?.hubSkills) ? data.hubSkills : []);
    } catch (err) {
      toast.error(err.error || err.message || "Failed to load catalog");
      setCursorSkillsFolders([]);
      setHubSkills([]);
    } finally {
      setCursorSkillsLoading(false);
    }
  }, [projectId]);

  const loadCustomSkillsSavedList = useCallback(async () => {
    setCustomSkillsSavedLoading(true);
    const pending = pendingCustomPacksRef.current;
    try {
      const data = projectId
        ? await fetchProjectCustomCursorSkills(projectId)
        : await fetchWorkspaceCustomCursorSkills();
      const skills = Array.isArray(data?.skills) ? data.skills : [];
      setCustomSkillsSavedList(projectId ? skills : mergePendingCursorPacks(skills, pending));
    } catch (err) {
      toast.error(err.error || err.message || "Failed to load saved skills");
      setCustomSkillsSavedList(projectId ? [] : mergePendingCursorPacks([], pending));
    } finally {
      setCustomSkillsSavedLoading(false);
    }
  }, [projectId]);

  const handleImportCursorSkills = useCallback(async () => {
    if (purpose === "select") {
      const hubFolderNames = hubSkills
        .filter((skill) => selectedHubSkillIds.has(skill.id))
        .map((skill) => skill.folderName)
        .filter(Boolean);
      const folders = [...new Set([...selectedCursorFolders, ...hubFolderNames])];
      onConfirmSelection?.(folders);
      setCursorSkillsOpen(false);
      setCursorSkillsSearch("");
      return;
    }
    if (totalSelectedCount === 0) {
      toast.error("Select at least one skills pack");
      return;
    }
    setCursorSkillsImporting(true);
    try {
      const result = await importCursorSkillsFolders(projectId, {
        folders: [...selectedCursorFolders],
        hubSkillIds: [...selectedHubSkillIds],
      });
      if (result.skipped) {
        toast.success(
          `Skills already matched the repo (${result.filesWritten} file(s)); no new commit.`,
        );
      } else {
        toast.success(
          `Pushed ${result.filesWritten} file(s) to ${result.developmentRepoUrl ?? "the developer repository"}.`,
        );
      }
      setCursorSkillsOpen(false);
      setSelectedCursorFolders(new Set());
      setSelectedHubSkillIds(new Set());
      setCursorSkillsSearch("");
    } catch (err) {
      toast.error(err.error || err.message || "Import failed");
    } finally {
      setCursorSkillsImporting(false);
    }
  }, [
    purpose,
    hubSkills,
    onConfirmSelection,
    projectId,
    selectedCursorFolders,
    selectedHubSkillIds,
    totalSelectedCount,
  ]);

  const handleSaveCustomCursorSkill = useCallback(async () => {
    const name = customSkillFolderName.trim();
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
    setCustomSkillSaving(true);
    try {
      if (projectId) {
        await createProjectCustomCursorSkill(projectId, {
          folderName: name,
          body: customSkillBody,
        });
      } else if (onSaveCustomWithoutProject) {
        const pendingSkill = {
          id: `pending-${name}`,
          folderName: name,
          body: customSkillBody,
          updatedAt: new Date().toISOString(),
        };
        onSaveCustomWithoutProject(pendingSkill);
        setCustomSkillsSavedList((prev) => [
          pendingSkill,
          ...prev.filter((skill) => skill.folderName !== name),
        ]);
        setCursorSkillsFolders((prev) => [...new Set([...prev, name])]);
        setSelectedCursorFolders((prev) => new Set([...prev, name]));
      } else {
        toast.error("Open a saved project before creating custom skills");
        return;
      }
      const wasEdit = editingCustomTitle !== null;
      toast.success(
        !projectId
          ? "Skill will be saved after project creation."
          : wasEdit
            ? "Skill updated. Select it under “Add from catalog” and click Add to push."
            : "Skill saved. Select your pack under “Add from catalog” and click Add to push.",
      );
      if (!wasEdit) {
        setCustomSkillFolderName("");
        setCustomSkillBody("");
        setEditingCustomTitle(null);
      }
      if (projectId) {
        await loadCustomSkillsSavedList();
        await loadCursorSkillsCatalog();
      }
    } catch (err) {
      toast.error(err.error || err.message || "Failed to save");
    } finally {
      setCustomSkillSaving(false);
    }
  }, [
    projectId,
    customSkillFolderName,
    customSkillBody,
    editingCustomTitle,
    onSaveCustomWithoutProject,
    loadCustomSkillsSavedList,
    loadCursorSkillsCatalog,
  ]);

  const startEditCustomSkill = useCallback((skill) => {
    setEditingCustomTitle(skill.folderName);
    setCustomSkillFolderName(skill.folderName);
    setCustomSkillBody(skill.body ?? "");
  }, []);

  const startNewCustomSkill = useCallback(() => {
    setEditingCustomTitle(null);
    setCustomSkillFolderName("");
    setCustomSkillBody("");
  }, []);

  const openAddCursorSkills = useCallback(() => {
    if (!canOpen) return;
    if (purpose === "import" && !hasDeveloperRepo) return;
    if (purpose === "select") {
      selectHydratedRef.current = false;
      setCursorSkillsLoading(true);
      setSelectedCursorFolders(new Set(initialSelectedFolders));
      setSelectedHubSkillIds(new Set());
      setCursorSkillsMainStep("catalog");
    } else {
      setCursorSkillsMainStep("choose");
    }
    setCursorSkillsOpen(true);
  }, [canOpen, hasDeveloperRepo, purpose, initialSelectedFolders]);

  const openSelectCursorSkills = openAddCursorSkills;

  const handleMainDialogOpenChange = useCallback(
    (open) => {
      if (!open && !cursorSkillsOpenRef.current) return;
      setCursorSkillsOpen(open);
      if (open) {
        if (purpose === "select") {
          selectHydratedRef.current = false;
          setCursorSkillsLoading(true);
          setSelectedCursorFolders(new Set(initialSelectedFolders));
          setSelectedHubSkillIds(new Set());
          setCursorSkillsMainStep("catalog");
        } else {
          setCursorSkillsMainStep("choose");
        }
      } else {
        selectHydratedRef.current = false;
        setCursorSkillsSearch("");
        setSelectedCursorFolders(new Set());
        setSelectedHubSkillIds(new Set());
        setCustomSkillFolderName("");
        setCustomSkillBody("");
        setCursorSkillsMainStep("choose");
        setCursorSkillsCreateOwnOpen(false);
        setSkillPreviewFolderName(null);
      }
    },
    [purpose, initialSelectedFolders],
  );

  useEffect(() => {
    cursorSkillsOpenRef.current = cursorSkillsOpen;
  }, [cursorSkillsOpen]);

  const handleCreateOwnDialogOpenChange = useCallback((open) => {
    setCursorSkillsCreateOwnOpen(open);
    if (!open) {
      setCustomSkillFolderName("");
      setCustomSkillBody("");
      setEditingCustomTitle(null);
    }
  }, []);

  useEffect(() => {
    if (!cursorSkillsOpen) return;
    loadCursorSkillsCatalog();
  }, [cursorSkillsOpen, projectId, loadCursorSkillsCatalog]);

  /** After catalog loads in select mode, rematch stored folder names to Hub skill IDs once. */
  useEffect(() => {
    if (!cursorSkillsOpen || purpose !== "select") return;
    if (cursorSkillsLoading || selectHydratedRef.current) return;
    const { customFolders, hubSkillIds } = partitionSelectedSkillFolders(
      initialSelectedFolders,
      hubSkills,
    );
    setSelectedCursorFolders(new Set(customFolders));
    setSelectedHubSkillIds(new Set(hubSkillIds));
    selectHydratedRef.current = true;
  }, [cursorSkillsOpen, purpose, cursorSkillsLoading, hubSkills, initialSelectedFolders]);

  useEffect(() => {
    if (!cursorSkillsCreateOwnOpen) return;
    loadCustomSkillsSavedList();
  }, [cursorSkillsCreateOwnOpen, projectId, loadCustomSkillsSavedList]);

  useEffect(() => {
    if (!cursorSkillsOpen) return;
    if (purpose === "select" || cursorSkillsMainStep === "catalog") {
      loadCustomSkillsSavedList();
    }
  }, [cursorSkillsOpen, cursorSkillsMainStep, purpose, projectId, loadCustomSkillsSavedList]);

  return {
    cursorSkillsOpen,
    setCursorSkillsOpen,
    cursorSkillsFolders,
    hubSkills,
    hasHubSession,
    cursorSkillsLoading,
    cursorSkillsSearch,
    setCursorSkillsSearch,
    selectedCursorFolders,
    selectedHubSkillIds,
    totalSelectedCount,
    cursorSkillsImporting,
    customSkillFolderName,
    setCustomSkillFolderName,
    customSkillBody,
    setCustomSkillBody,
    customSkillSaving,
    cursorSkillsMainStep,
    setCursorSkillsMainStep,
    cursorSkillsCreateOwnOpen,
    setCursorSkillsCreateOwnOpen,
    customSkillsSavedList,
    customSkillsSavedLoading,
    editingCustomTitle,
    filteredCursorFolders,
    filteredHubSkills,
    toggleCursorFolder,
    toggleHubSkill,
    handleImportCursorSkills,
    handleSaveCustomCursorSkill,
    startEditCustomSkill,
    startNewCustomSkill,
    openAddCursorSkills,
    openSelectCursorSkills,
    handleMainDialogOpenChange,
    handleCreateOwnDialogOpenChange,
    skillPreviewFolderName,
    skillPreviewBody,
    openSkillPreview,
    closeSkillPreview,
    purpose,
  };
}
