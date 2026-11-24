import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Editor from "@/lib/monacoEditor";
import { Check, Loader2, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  createManagedPrompt,
  updateManagedPrompt,
  previewManagedPrompt,
  enhanceManagedPrompt,
  createProjectManagedPrompt,
  updateProjectManagedPrompt,
  previewProjectManagedPrompt,
  enhanceProjectManagedPrompt,
  createOnboardingManagedPrompt,
  enhanceOnboardingManagedPrompt,
} from "@/api";
import { getCategoryLabel, ORDERED_CATEGORY_SLUGS } from "./managedPromptUiLabels";
import { PromptCopyButton } from "./components/PromptCopyButton";

function extractVarsFromContent(text) {
  const s = String(text ?? "");
  const names = [];
  const seen = new Set();
  for (const m of s.matchAll(/\{\{(\w+)\}\}/g)) {
    if (!seen.has(m[1])) {
      seen.add(m[1]);
      names.push(m[1]);
    }
  }
  return names;
}

function buildSampleVarsJson(varNames) {
  if (!varNames.length) return "{}";
  const obj = {};
  for (const name of varNames) {
    obj[name] = "";
  }
  return JSON.stringify(obj, null, 2);
}

const EMPTY_ENHANCEMENT_STATE = {
  status: "idle",
  originalPrompt: "",
  enhancedPrompt: "",
};

const MONACO_HEIGHT = "min(52vh, 480px)";

/**
 * @param {object} props
 * @param {boolean} props.open
 * @param {(open: boolean) => void} props.onOpenChange
 * @param {boolean} props.canEdit
 * @param {object|null} props.row
 * @param {boolean} [props.isCreate]
 * @param {() => void} [props.onSaved]
 * @param {number|null} [props.projectId] — use project-scoped APIs (assigned users)
 * @param {boolean} [props.onboardingMode] — pre-project create flow
 */
export function PromptEditorDialog({
  open,
  onOpenChange,
  canEdit,
  row,
  isCreate = false,
  onSaved,
  projectId = null,
  onboardingMode = false,
}) {
  const [activeTab, setActiveTab] = useState("edit");
  const [technicalKeyDisplay, setTechnicalKeyDisplay] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("openai_chat");
  const [content, setContent] = useState("");
  const [previewVarsJson, setPreviewVarsJson] = useState("{}");
  const [previewVarsTouched, setPreviewVarsTouched] = useState(false);
  const [previewResult, setPreviewResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [enhancementState, setEnhancementState] = useState(EMPTY_ENHANCEMENT_STATE);
  const enhanceRequestRef = useRef(0);
  const enhanceInFlightRef = useRef(false);

  const promptApi = useMemo(() => {
    if (projectId) {
      return {
        create: (body) => createProjectManagedPrompt(projectId, body),
        update: (id, body) => updateProjectManagedPrompt(projectId, id, body),
        preview: (id, body) => previewProjectManagedPrompt(projectId, id, body),
        enhance: (body) => enhanceProjectManagedPrompt(projectId, body),
      };
    }
    if (onboardingMode) {
      return {
        create: createOnboardingManagedPrompt,
        update: null,
        preview: null,
        enhance: enhanceOnboardingManagedPrompt,
      };
    }
    return {
      create: createManagedPrompt,
      update: updateManagedPrompt,
      preview: previewManagedPrompt,
      enhance: enhanceManagedPrompt,
    };
  }, [projectId, onboardingMode]);

  const resetEnhancementState = useCallback(() => {
    enhanceRequestRef.current += 1;
    setEnhancementState(EMPTY_ENHANCEMENT_STATE);
  }, []);

  const enhancementStatus = enhancementState.status;
  const enhancementPending = enhancementStatus === "pending";
  const enhancementLoading = enhancementStatus === "loading";

  useEffect(() => {
    if (!open) {
      resetEnhancementState();
      setActiveTab("edit");
      return;
    }
    if (isCreate) {
      setTechnicalKeyDisplay("");
      setName("");
      setDescription("");
      setCategory("openai_chat");
      setContent("");
      setPreviewResult(null);
      setPreviewVarsJson("{}");
      setPreviewVarsTouched(false);
      setActiveTab("edit");
      resetEnhancementState();
      return;
    }
    if (!row) return;
    setTechnicalKeyDisplay(row.key || "");
    setName(row.name || "");
    setDescription(row.description || "");
    setCategory(row.category || "openai_chat");
    setContent(row.content || "");
    setPreviewResult(null);
    setPreviewVarsJson("{}");
    setPreviewVarsTouched(false);
    setActiveTab("edit");
    resetEnhancementState();
  }, [open, isCreate, row, resetEnhancementState]);

  const derivedVars = useMemo(() => extractVarsFromContent(content), [content]);
  const contentCharCount = content.length;
  const categoryLabel = getCategoryLabel(category);

  useEffect(() => {
    if (previewVarsTouched) return;
    setPreviewVarsJson(buildSampleVarsJson(derivedVars));
  }, [derivedVars, previewVarsTouched]);

  const handleContentChange = useCallback(
    (nextValue) => {
      if (enhancementPending) return;
      const next = nextValue ?? "";
      setContent(next);
      if (enhancementStatus !== "idle") {
        resetEnhancementState();
      }
    },
    [enhancementPending, enhancementStatus, resetEnhancementState],
  );

  useEffect(() => {
    if (!enhancementPending) return;
    if (content === enhancementState.enhancedPrompt) return;
    resetEnhancementState();
  }, [content, enhancementPending, enhancementState.enhancedPrompt, resetEnhancementState]);

  const handleEnhancePrompt = useCallback(async () => {
    const promptSnapshot = String(content || "");
    const prompt = promptSnapshot.trim();
    if (
      !prompt ||
      !canEdit ||
      enhancementLoading ||
      enhancementPending ||
      enhanceInFlightRef.current
    ) {
      return;
    }

    enhanceInFlightRef.current = true;
    const requestId = enhanceRequestRef.current + 1;
    enhanceRequestRef.current = requestId;

    setEnhancementState({
      status: "loading",
      originalPrompt: promptSnapshot,
      enhancedPrompt: "",
    });

    try {
      const data = await promptApi.enhance({ prompt });
      const enhancedPrompt =
        typeof data?.enhancedPrompt === "string" ? data.enhancedPrompt.trim() : "";
      if (enhanceRequestRef.current !== requestId) return;
      if (!enhancedPrompt) {
        throw new Error("Empty enhanced prompt");
      }
      setContent(enhancedPrompt);
      setEnhancementState({
        status: "pending",
        originalPrompt: promptSnapshot,
        enhancedPrompt,
      });
    } catch (e) {
      if (enhanceRequestRef.current !== requestId) return;
      resetEnhancementState();
      toast.error(typeof e?.error === "string" ? e.error : "Failed to enhance prompt");
    } finally {
      if (enhanceRequestRef.current === requestId) {
        enhanceInFlightRef.current = false;
      }
    }
  }, [content, canEdit, enhancementLoading, enhancementPending, resetEnhancementState, promptApi]);

  const handleAcceptEnhancement = useCallback(() => {
    if (!enhancementPending) return;
    resetEnhancementState();
  }, [enhancementPending, resetEnhancementState]);

  const handleUndoEnhancement = useCallback(() => {
    if (!enhancementPending) return;
    setContent(enhancementState.originalPrompt);
    resetEnhancementState();
  }, [enhancementPending, enhancementState.originalPrompt, resetEnhancementState]);

  const canEnhancePrompt =
    canEdit && content.trim().length > 0 && !enhancementLoading && !enhancementPending;

  const handlePreview = async () => {
    if (isCreate || !row?.id) return;
    let variables = {};
    try {
      variables = JSON.parse(previewVarsJson || "{}");
      if (typeof variables !== "object" || Array.isArray(variables)) {
        throw new Error("object");
      }
    } catch {
      toast.error('Preview variables must be a JSON object, e.g. {"projectName":"Demo"}');
      return;
    }
    try {
      const previewFn = promptApi.preview ?? previewManagedPrompt;
      const data = await previewFn(row.id, { variables, strict: false });
      setPreviewResult(data);
    } catch (e) {
      toast.error(typeof e?.error === "string" ? e.error : "Preview failed");
    }
  };

  const handleSave = async () => {
    if (!canEdit) return;
    if (!isCreate && !row?.id) return;
    setSaving(true);
    try {
      if (isCreate) {
        const key = technicalKeyDisplay.trim();
        const nameTrim = name.trim();
        if (!key) {
          toast.error("Technical key is required");
          setSaving(false);
          return;
        }
        if (!nameTrim) {
          toast.error("Display name is required");
          setSaving(false);
          return;
        }
        const created = await promptApi.create({
          key,
          name: nameTrim,
          description: description.trim() || null,
          category,
          content,
          variables: derivedVars,
        });
        toast.success("Prompt created — it is available across the app");
        onSaved?.(created);
      } else {
        const nameTrim = name.trim();
        if (!nameTrim) {
          toast.error("Display name is required");
          setSaving(false);
          return;
        }
        const updateFn = promptApi.update ?? updateManagedPrompt;
        const updated = await updateFn(row.id, {
          name: nameTrim,
          description: description.trim() || null,
          category,
          content,
          variables: derivedVars,
        });
        toast.success("Saved — updates apply immediately across the app");
        onSaved?.(updated);
      }
      onOpenChange(false);
    } catch (e) {
      toast.error(typeof e?.error === "string" ? e.error : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const dialogTitle = isCreate ? "Add prompt" : name.trim() || row?.name || "Edit prompt";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[960px]">
        <DialogHeader className="shrink-0 space-y-2 border-b px-6 py-4 text-left">
          <div className="flex flex-wrap items-start gap-2 pr-6">
            <DialogTitle className="min-w-0 flex-1 text-left leading-tight">
              {dialogTitle}
            </DialogTitle>
            <Badge variant="secondary" className="shrink-0 font-normal text-muted-foreground">
              {categoryLabel.title}
            </Badge>
          </div>
          {technicalKeyDisplay ? (
            <p className="font-mono text-xs text-muted-foreground">{technicalKeyDisplay}</p>
          ) : isCreate ? (
            <p className="text-xs text-muted-foreground">New managed prompt</p>
          ) : null}
        </DialogHeader>

        {(isCreate || row?.id) && (
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex min-h-0 flex-1 flex-col gap-0"
          >
            <div className="shrink-0 border-b px-6">
              <TabsList variant="underline" className="h-auto w-full justify-start">
                <TabsTrigger value="edit">Edit</TabsTrigger>
                <TabsTrigger value="preview" disabled={isCreate}>
                  Preview
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
              <TabsContent value="edit" className="mt-0 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="mp-key-display">
                      Technical key{isCreate ? "" : " (read-only)"}
                    </Label>
                    <Input
                      id="mp-key-display"
                      readOnly={!isCreate}
                      value={technicalKeyDisplay}
                      onChange={(e) => setTechnicalKeyDisplay(e.target.value)}
                      className="bg-muted/40 font-mono text-sm"
                      placeholder="e.g. custom.my_feature.system"
                      title={
                        isCreate
                          ? "Unique id for this prompt; use dot-separated segments"
                          : "Set at creation time"
                      }
                    />
                    {isCreate ? (
                      <p className="text-xs text-muted-foreground">
                        Must be unique. Use a stable dot-separated key (letters, numbers,
                        underscores).
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mp-name">Display name</Label>
                    <Input
                      id="mp-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Short title shown in the list"
                      disabled={!canEdit}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={category} onValueChange={setCategory} disabled={!canEdit}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose category" />
                      </SelectTrigger>
                      <SelectContent>
                        {ORDERED_CATEGORY_SLUGS.map((c) => {
                          const lab = getCategoryLabel(c);
                          return (
                            <SelectItem key={c} value={c} title={`${c}: ${lab.summary}`}>
                              <span className="font-medium">{lab.title}</span>
                              <span className="block text-xs text-muted-foreground">
                                {c} — {lab.summary}
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="mp-desc">Description (optional)</Label>
                    <Textarea
                      id="mp-desc"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={2}
                      placeholder="What this prompt is for"
                      disabled={!canEdit}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label>Prompt body</Label>
                    <PromptCopyButton text={content} />
                  </div>
                  <div className="overflow-hidden rounded-md border border-border">
                    <Editor
                      height={MONACO_HEIGHT}
                      defaultLanguage="markdown"
                      theme="vs"
                      value={content}
                      onChange={handleContentChange}
                      options={{
                        minimap: { enabled: false },
                        wordWrap: "on",
                        scrollBeyondLastLine: false,
                        readOnly: !canEdit,
                        occurrencesHighlight: "off",
                        selectionHighlight: false,
                        renderLineHighlight: "none",
                      }}
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                      <p className="text-xs text-muted-foreground">
                        {contentCharCount.toLocaleString()} characters
                      </p>
                      {derivedVars.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {derivedVars.map((v) => (
                            <Badge
                              key={v}
                              variant="outline"
                              className="font-mono text-[10px] font-normal"
                            >
                              {`{{${v}}}`}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">No placeholders</span>
                      )}
                    </div>
                    {canEdit ? (
                      <div className="flex shrink-0 items-center gap-2">
                        {enhancementPending ? (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              variant="default"
                              className="h-8 gap-1.5 px-3"
                              onClick={handleAcceptEnhancement}
                            >
                              <Check className="h-3.5 w-3.5" aria-hidden />
                              Accept
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8 px-3"
                              onClick={handleUndoEnhancement}
                            >
                              Undo
                            </Button>
                          </>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1.5 px-3"
                            disabled={!canEnhancePrompt}
                            onClick={handleEnhancePrompt}
                          >
                            {enhancementLoading ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                            ) : (
                              <Sparkles className="h-3.5 w-3.5" aria-hidden />
                            )}
                            Enhance Prompt
                          </Button>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="preview" className="mt-0 space-y-4">
                {isCreate ? (
                  <p className="text-sm text-muted-foreground">
                    Save the prompt first, then you can preview it with sample variables.
                  </p>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="mp-prev-json">Sample variables (JSON)</Label>
                      <Textarea
                        id="mp-prev-json"
                        value={previewVarsJson}
                        onChange={(e) => {
                          setPreviewVarsTouched(true);
                          setPreviewVarsJson(e.target.value);
                        }}
                        rows={6}
                        className="font-mono text-xs"
                        placeholder='{"projectName":"Demo"}'
                      />
                      <p className="text-xs text-muted-foreground">
                        Placeholders are auto-filled from the prompt body. Edit values before
                        running preview.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={handlePreview}
                    >
                      Run preview
                    </Button>
                    {previewResult?.rendered != null && (
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs font-medium text-muted-foreground">
                            Rendered output
                          </p>
                          <PromptCopyButton
                            text={String(previewResult.rendered ?? "")}
                            label="Copy output"
                          />
                        </div>
                        <pre className="max-h-[min(40vh,360px)] overflow-auto whitespace-pre-wrap rounded-md border border-border bg-muted/20 p-3 text-xs leading-relaxed">
                          {previewResult.rendered}
                        </pre>
                        {previewResult.unresolved?.length > 0 && (
                          <p className="text-xs text-amber-700 dark:text-amber-500">
                            Unresolved: {previewResult.unresolved.join(", ")}
                          </p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </TabsContent>
            </div>
          </Tabs>
        )}

        <DialogFooter className="shrink-0 gap-2 border-t px-6 py-4 sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {canEdit && (isCreate || row?.id) ? (
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving
                ? isCreate
                  ? "Creating…"
                  : "Saving…"
                : isCreate
                  ? "Create prompt"
                  : "Save changes"}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
