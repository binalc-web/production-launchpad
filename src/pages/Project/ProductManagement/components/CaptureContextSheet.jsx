import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { CaptureContextPicker } from "@/components/BacklogSuggestions/CaptureContextPicker";
import { useBacklogSuggestionContext } from "@/hooks/useBacklogSuggestionContext";
import { useHubAiSkills } from "@/hooks/useHubAiSkills";
import { getSkillDescription } from "@/api/hubAiSkillsLibrary";
import { FileInput, Loader2, Sparkles, Wand2 } from "lucide-react";

const NONE_SKILL = "__none__";

/** @typedef {'as_is' | 'rewrite' | 'regenerate'} CaptureImportMode */

const MODE_META = {
  as_is: {
    label: "Import as-is",
    shortLabel: "As-is",
    description:
      "Insert the selected capture text into the document without changes.",
    action: "Insert capture",
    icon: FileInput,
  },
  rewrite: {
    label: "Rewrite then import",
    shortLabel: "Rewrite",
    description:
      "Use AI to rewrite the selected capture with your prompt, then insert the result at the cursor.",
    action: "Rewrite & insert",
    icon: Wand2,
  },
  regenerate: {
    label: "Regenerate document",
    shortLabel: "Regenerate",
    description:
      "Replace the entire document using a skill (or default prompt) and the selected capture as context.",
    action: "Regenerate document",
    icon: Sparkles,
  },
};

export function CaptureContextSheet({
  open,
  onOpenChange,
  projectId,
  defaultSkillId,
  defaultMode = "as_is",
  onSubmit,
  loading = false,
}) {
  /** @type {[CaptureImportMode, Function]} */
  const [mode, setMode] = useState(defaultMode);
  const [skillId, setSkillId] = useState(NONE_SKILL);
  const [userInstruction, setUserInstruction] = useState("");
  const rewriteRef = useRef(null);

  const {
    skills,
    loading: skillsLoading,
    error: skillsError,
  } = useHubAiSkills({
    enabled: open,
  });

  const { captureContext, sourcesLoading } = useBacklogSuggestionContext({
    platformProjectId: projectId,
    isActive: open,
    resetScopeKey: open ? "document-capture-sheet" : "",
    jiraBacklogEnabled: false,
  });

  const selectedCount = captureContext.multiSelect.selectedIds.length;
  const meta = MODE_META[mode];

  const canSubmit = useMemo(() => {
    if (selectedCount === 0 || loading) return false;
    if (mode === "rewrite") return userInstruction.trim().length > 0;
    return true;
  }, [selectedCount, loading, mode, userInstruction]);

  useEffect(() => {
    if (!open) return;
    setMode(defaultMode);
    setSkillId(defaultSkillId || NONE_SKILL);
    setUserInstruction("");
  }, [open, defaultSkillId, defaultMode]);

  useEffect(() => {
    if (!open || mode !== "rewrite") return;
    const timer = window.setTimeout(() => rewriteRef.current?.focus(), 100);
    return () => window.clearTimeout(timer);
  }, [open, mode]);

  const skillDescription = useMemo(() => {
    if (skillId === NONE_SKILL) return null;
    return getSkillDescription(skills, skillId);
  }, [skillId, skills]);

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      mode,
      selectedCaptureEntryIds: captureContext.multiSelect.selectedIds,
      captureContextText:
        captureContext.textareaProps.value?.trim() || undefined,
      skillId: mode === "regenerate" && skillId !== NONE_SKILL ? skillId : null,
      userInstruction:
        mode === "rewrite" || mode === "regenerate"
          ? userInstruction.trim() || undefined
          : undefined,
      replace: mode === "regenerate",
    });
  };

  const ActionIcon = meta.icon;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex h-full w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <SheetHeader className="shrink-0 border-b border-border px-6 py-5 pr-12">
          <SheetTitle>Import from capture</SheetTitle>
          <SheetDescription>
            Choose how to bring discovery capture into this document.
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-6">
            <Tabs
              value={mode}
              onValueChange={(value) => setMode(value)}
              className="w-full"
            >
              <TabsList variant="segmented" className="w-full">
                {Object.keys(MODE_META).map((key) => {
                  const item = MODE_META[key];
                  return (
                    <TabsTrigger
                      key={key}
                      value={key}
                      className="flex-1 px-2 py-2 text-xs sm:text-sm"
                    >
                      {item.shortLabel}
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {Object.keys(MODE_META).map((key) => {
                const item = MODE_META[key];
                return (
                  <TabsContent key={key} value={key} className="mt-3">
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {item.description}
                    </p>
                  </TabsContent>
                );
              })}
            </Tabs>

            <CaptureContextPicker
              captureContext={captureContext}
              sourcesLoading={sourcesLoading}
              embedded
            />

            {mode === "rewrite" ? (
              <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-4">
                <Label
                  htmlFor="doc-capture-rewrite"
                  className="text-sm font-medium"
                >
                  Rewrite prompt
                </Label>
                <Textarea
                  ref={rewriteRef}
                  id="doc-capture-rewrite"
                  value={userInstruction}
                  onChange={(e) => setUserInstruction(e.target.value)}
                  placeholder="Summarize as bullet points, rewrite for executives, extract requirements only…"
                  rows={3}
                  className="min-h-[88px] resize-y bg-background text-sm"
                  disabled={loading}
                />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Required — how the AI should rewrite the capture before
                  inserting.
                </p>
              </div>
            ) : null}

            {mode === "regenerate" ? (
              <div className="space-y-4 rounded-lg border border-border/60 bg-muted/20 p-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="doc-regen-skill"
                    className="text-sm font-medium"
                  >
                    Skill
                  </Label>
                  <Select
                    value={skillId}
                    onValueChange={setSkillId}
                    disabled={skillsLoading || loading}
                  >
                    <SelectTrigger
                      id="doc-regen-skill"
                      className="bg-background"
                    >
                      <SelectValue placeholder="Select a skill (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_SKILL}>
                        Default (managed prompt)
                      </SelectItem>
                      {skills.map((skill) => (
                        <SelectItem key={skill.id} value={skill.id}>
                          {skill.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {skillsError ? (
                    <p className="text-xs text-destructive">{skillsError}</p>
                  ) : null}
                  {skillDescription ? (
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {skillDescription}
                    </p>
                  ) : null}
                  {skillId !== NONE_SKILL ? (
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      Skill-based regeneration requires a Hub access token.
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2 border-t border-border/50 pt-4">
                  <Label
                    htmlFor="doc-regen-instructions"
                    className="text-sm font-medium"
                  >
                    Additional instructions
                  </Label>
                  <Textarea
                    id="doc-regen-instructions"
                    value={userInstruction}
                    onChange={(e) => setUserInstruction(e.target.value)}
                    placeholder="Optional: emphasize risks, focus on mobile users…"
                    rows={3}
                    className="min-h-[88px] resize-y bg-background text-sm"
                    disabled={loading}
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <SheetFooter className="shrink-0 border-t border-border p-0">
          <div className="flex w-full flex-col-reverse gap-3 px-6 py-5 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="w-full sm:w-auto"
              onClick={handleSubmit}
              disabled={!canSubmit}
            >
              {loading ? (
                <Loader2 className="size-4 mr-2 animate-spin" />
              ) : (
                <ActionIcon className="size-4 mr-2" />
              )}
              {meta.action}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
