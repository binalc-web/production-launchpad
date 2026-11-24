import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Pencil, Plus, Search } from "lucide-react";
import {
  createProjectManagedPrompt,
  fetchProjectPromptConfig,
  fetchProjectPromptConfigSystemBases,
  updateProjectManagedPrompt,
} from "@/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { getCategoryLabel } from "@/pages/PromptManagement/managedPromptUiLabels";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { DiffView } from "./promptDiff";
import { buildUiPreferenceScope } from "@/lib/uiPreferences";
import { usePageUiPreferences } from "@/hooks/usePageUiPreferences";

const PROJECT_PROMPTS_UI_SCHEMA = {
  compareTab: { defaultValue: "modified", allowed: ["original", "modified", "difference"] },
  baseSearch: { defaultValue: "", type: "string" },
};

function matchesBaseSearch(base, query) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [base?.name, base?.key, base?.description, base?.content]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(q);
}

function PromptListSkeleton() {
  return (
    <div className="space-y-3" role="status" aria-busy="true" aria-label="Loading prompts">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-2 rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ))}
    </div>
  );
}

export function ProjectPromptsPanel({
  projectId,
  canManage = true,
  title = "Project prompts",
  description = "Overrides for system prompts on this project. System defaults appear only when adding or editing.",
  matchRow = () => true,
  emptyLabel = "No project prompts yet — add one to override a system prompt.",
}) {
  const promptsScope = buildUiPreferenceScope({ projectId });
  const [prefs, setPref] = usePageUiPreferences(promptsScope, PROJECT_PROMPTS_UI_SCHEMA, {
    debouncedKeys: ["baseSearch"],
  });
  const compareTab = prefs.compareTab;
  const baseSearch = prefs.baseSearch;
  const setCompareTab = useCallback((value) => setPref("compareTab", value), [setPref]);
  const setBaseSearch = useCallback((value) => setPref("baseSearch", value), [setPref]);
  const [loading, setLoading] = useState(true);
  const [projectPrompts, setProjectPrompts] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [basesLoading, setBasesLoading] = useState(false);
  const [systemBases, setSystemBases] = useState([]);
  const [editingPrompt, setEditingPrompt] = useState(null);
  const [selectedBaseId, setSelectedBaseId] = useState(null);
  const [draftContent, setDraftContent] = useState("");

  const load = useCallback(async () => {
    if (!projectId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchProjectPromptConfig(projectId);
      setProjectPrompts(Array.isArray(data?.projectPrompts) ? data.projectPrompts : []);
    } catch (err) {
      toast.error(err.error || err.message || "Failed to load project prompts");
      setProjectPrompts([]);
    } finally {
      setLoading(false);
    }
  }, [projectId, matchRow]);

  useEffect(() => {
    void load();
  }, [load]);

  const visiblePrompts = useMemo(
    () => projectPrompts.filter((row) => matchRow(row)),
    [projectPrompts, matchRow],
  );

  const filteredBases = useMemo(
    () => systemBases.filter((base) => matchesBaseSearch(base, baseSearch) && matchRow(base)),
    [systemBases, baseSearch, matchRow],
  );

  const selectedBase = useMemo(
    () => systemBases.find((b) => b.id === selectedBaseId) ?? null,
    [systemBases, selectedBaseId],
  );

  const openCreate = useCallback(async () => {
    setEditingPrompt(null);
    setSelectedBaseId(null);
    setDraftContent("");
    setBaseSearch("");
    setCompareTab("modified");
    setDialogOpen(true);
    setBasesLoading(true);
    try {
      const data = await fetchProjectPromptConfigSystemBases(projectId);
      const bases = Array.isArray(data?.systemBases) ? data.systemBases.filter(matchRow) : [];
      setSystemBases(bases);
    } catch (err) {
      toast.error(err.error || err.message || "Failed to load system prompts");
      setSystemBases([]);
    } finally {
      setBasesLoading(false);
    }
  }, [projectId, matchRow]);

  const openEdit = useCallback(
    async (prompt) => {
      setEditingPrompt(prompt);
      setSelectedBaseId(prompt.basePromptId ?? null);
      setDraftContent(prompt.content ?? "");
      setBaseSearch("");
      setCompareTab("modified");
      setDialogOpen(true);
      setBasesLoading(true);
      try {
        const data = await fetchProjectPromptConfigSystemBases(projectId);
        const bases = Array.isArray(data?.systemBases) ? data.systemBases.filter(matchRow) : [];
        setSystemBases(bases);
        if (!prompt.basePromptId) {
          const match = bases.find((b) => b.key === prompt.key);
          if (match) setSelectedBaseId(match.id);
        }
      } catch (err) {
        toast.error(err.error || err.message || "Failed to load system prompts");
        setSystemBases([]);
      } finally {
        setBasesLoading(false);
      }
    },
    [projectId, matchRow],
  );

  const handleBaseSelect = useCallback(
    (base) => {
      setSelectedBaseId(base.id);
      if (!editingPrompt) {
        setDraftContent(base.content ?? "");
      }
    },
    [editingPrompt],
  );

  const handleSave = useCallback(async () => {
    if (!selectedBase) {
      toast.error("Select a system prompt to override");
      return;
    }
    const content = draftContent.trim();
    if (!content) {
      toast.error("Prompt content cannot be empty");
      return;
    }

    setSaving(true);
    try {
      if (editingPrompt?.id) {
        await updateProjectManagedPrompt(projectId, editingPrompt.id, { content });
        toast.success("Project prompt updated");
      } else {
        await createProjectManagedPrompt(projectId, {
          key: selectedBase.key,
          basePromptId: selectedBase.id,
          content,
        });
        toast.success("Project prompt created");
      }
      setDialogOpen(false);
      await load();
    } catch (err) {
      toast.error(err.error || err.message || "Failed to save project prompt");
    } finally {
      setSaving(false);
    }
  }, [selectedBase, draftContent, editingPrompt, projectId, load]);

  return (
    <Card className="overflow-hidden border-border shadow-sm">
      <CardContent className="space-y-4 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-foreground">{title}</h3>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
          </div>
          {canManage ? (
            <Button type="button" className="gap-2" onClick={() => void openCreate()}>
              <Plus className="size-4" aria-hidden />
              Add prompt
            </Button>
          ) : null}
        </div>

        {loading ? (
          <PromptListSkeleton />
        ) : visiblePrompts.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
        ) : (
          <div className="space-y-3">
            {visiblePrompts.map((prompt) => {
              const category = getCategoryLabel(prompt.category);
              return (
                <div
                  key={prompt.id}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border bg-card p-4"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-foreground">{prompt.name}</p>
                      <Badge variant="secondary" className="font-normal">
                        {category.title}
                      </Badge>
                      {!prompt.isActive ? (
                        <Badge variant="outline" className="font-normal">
                          Inactive
                        </Badge>
                      ) : null}
                    </div>
                    <p className="font-mono text-xs text-muted-foreground">{prompt.key}</p>
                    {prompt.description ? (
                      <p className="text-sm text-muted-foreground">{prompt.description}</p>
                    ) : null}
                  </div>
                  {canManage ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => void openEdit(prompt)}
                    >
                      <Pencil className="size-4" aria-hidden />
                      Edit
                    </Button>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="flex h-[min(92vh,960px)] max-h-[92vh] w-[min(1280px,calc(100vw-2rem))] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-none">
          <DialogHeader className="shrink-0 space-y-1 border-b px-6 py-4 text-left">
            <DialogTitle>
              {editingPrompt ? "Edit project prompt" : "Add project prompt"}
            </DialogTitle>
            <DialogDescription>
              {editingPrompt
                ? "Compare the system default with your project override, then save changes."
                : "Pick a system prompt to override, then customize the content for this project."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
            <aside
              className={cn(
                "flex shrink-0 flex-col border-b lg:w-72 lg:border-b-0 lg:border-r xl:w-80",
                editingPrompt ? "p-4" : "min-h-0 p-4 lg:max-h-none",
              )}
            >
              <Label className="shrink-0 text-sm font-medium">
                {editingPrompt ? "Base system prompt" : "Choose base prompt"}
              </Label>

              {editingPrompt && selectedBase ? (
                <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <p className="font-medium text-foreground">{selectedBase.name}</p>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">{selectedBase.key}</p>
                  {selectedBase.description ? (
                    <p className="mt-2 text-sm text-muted-foreground">{selectedBase.description}</p>
                  ) : null}
                </div>
              ) : editingPrompt && basesLoading ? (
                <div
                  className="mt-3 space-y-2 rounded-lg border border-border p-3"
                  role="status"
                  aria-busy="true"
                  aria-label="Loading base prompt"
                >
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ) : editingPrompt ? (
                <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <p className="font-medium text-foreground">{editingPrompt.name}</p>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    {editingPrompt.key}
                  </p>
                </div>
              ) : (
                <>
                  <div className="relative mt-3 shrink-0">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={baseSearch}
                      onChange={(e) => setBaseSearch(e.target.value)}
                      placeholder="Search by name, key, or description…"
                      className="pl-9"
                      disabled={basesLoading}
                    />
                  </div>
                  <div className="mt-3 flex min-h-[140px] flex-1 flex-col overflow-hidden rounded-lg border lg:min-h-0">
                    {basesLoading ? (
                      <div
                        className="space-y-1 p-2"
                        role="status"
                        aria-busy="true"
                        aria-label="Loading system prompts"
                      >
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div key={i} className="space-y-1.5 px-3 py-2.5">
                            <Skeleton className="h-4 w-2/3" />
                            <Skeleton className="h-3 w-1/2" />
                          </div>
                        ))}
                      </div>
                    ) : filteredBases.length === 0 ? (
                      <p className="px-3 py-6 text-sm text-muted-foreground">
                        No matching system prompts.
                      </p>
                    ) : (
                      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
                        {filteredBases.map((base) => (
                          <button
                            key={base.id}
                            type="button"
                            onClick={() => handleBaseSelect(base)}
                            className={cn(
                              "flex w-full flex-col rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                              selectedBaseId === base.id
                                ? "border-primary bg-primary/5"
                                : "border-transparent hover:bg-muted/50",
                            )}
                          >
                            <span className="font-medium">{base.name}</span>
                            <span className="mt-0.5 font-mono text-xs text-muted-foreground">
                              {base.key}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </aside>

            <div className="flex min-h-0 min-w-0 flex-1 flex-col p-4 lg:p-5">
              {basesLoading && editingPrompt ? (
                <div
                  className="flex min-h-0 flex-1 flex-col gap-3"
                  role="status"
                  aria-busy="true"
                  aria-label="Loading prompt content"
                >
                  <Skeleton className="h-9 w-72 max-w-full" />
                  <Skeleton className="min-h-[min(52vh,560px)] w-full flex-1 rounded-md lg:min-h-0" />
                </div>
              ) : selectedBase ? (
                <Tabs
                  value={compareTab}
                  onValueChange={setCompareTab}
                  className="flex min-h-0 flex-1 flex-col"
                >
                  <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
                    <TabsList className="h-9">
                      <TabsTrigger value="original">Original</TabsTrigger>
                      <TabsTrigger value="modified">Modified</TabsTrigger>
                      <TabsTrigger value="difference">Difference</TabsTrigger>
                    </TabsList>
                    <p className="text-xs text-muted-foreground">
                      {compareTab === "original"
                        ? "Read-only system default"
                        : compareTab === "modified"
                          ? "Editable project override"
                          : "Line-by-line changes"}
                    </p>
                  </div>

                  <TabsContent
                    value="original"
                    className="mt-3 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
                  >
                    <Textarea
                      readOnly
                      value={selectedBase.content ?? ""}
                      className="field-sizing-fixed h-full max-h-none min-h-[min(52vh,560px)] flex-1 resize-none font-mono text-sm leading-relaxed lg:min-h-0"
                    />
                  </TabsContent>
                  <TabsContent
                    value="modified"
                    className="mt-3 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
                  >
                    <Textarea
                      value={draftContent}
                      onChange={(e) => setDraftContent(e.target.value)}
                      disabled={!canManage}
                      className="field-sizing-fixed h-full max-h-none min-h-[min(52vh,560px)] flex-1 resize-none font-mono text-sm leading-relaxed lg:min-h-0"
                    />
                  </TabsContent>
                  <TabsContent
                    value="difference"
                    className="mt-3 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
                  >
                    <div className="min-h-[min(52vh,560px)] flex-1 overflow-hidden lg:min-h-0">
                      <DiffView original={selectedBase.content} modified={draftContent} />
                    </div>
                  </TabsContent>
                </Tabs>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed bg-muted/10 px-6 py-12 text-center">
                  <p className="text-sm font-medium text-foreground">Select a system prompt</p>
                  <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                    Choose a base prompt on the left to compare and edit your project override.
                  </p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="shrink-0 border-t px-6 py-4">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleSave()}
              disabled={!canManage || saving || !selectedBase}
            >
              {saving ? <Loader2 className="mr-2 size-4 animate-spin" aria-hidden /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
