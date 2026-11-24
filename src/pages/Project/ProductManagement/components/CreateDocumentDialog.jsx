import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Loader2, Presentation } from "lucide-react";
import { getSkillDescription } from "@/api/hubAiSkillsLibrary";
import { useHubAiSkills } from "@/hooks/useHubAiSkills";

const NONE_SKILL = "__none__";

export function CreateDocumentDialog({
  open,
  onOpenChange,
  defaultName = "Untitled",
  defaultDeckName = "Kickoff Presentation",
  canGenerate = true,
  onSubmit,
  validateName,
}) {
  const [itemType, setItemType] = useState("document");
  const [name, setName] = useState(defaultName);
  const [skillId, setSkillId] = useState(NONE_SKILL);
  const [autoUpdateOnCapture, setAutoUpdateOnCapture] = useState(false);
  const [loading, setLoading] = useState(false);
  const {
    skills,
    loading: skillsLoading,
    error: skillsError,
  } = useHubAiSkills({
    enabled: open,
  });
  const isDeck = itemType === "deck";
  const validationError = validateName?.(name, itemType) || null;
  const hasSkill = skillId !== NONE_SKILL;
  const deckBlocked = isDeck && !canGenerate;

  useEffect(() => {
    if (open) {
      setItemType("document");
      setName(defaultName);
      setSkillId(NONE_SKILL);
      setAutoUpdateOnCapture(false);
    }
  }, [open, defaultName]);

  useEffect(() => {
    if (!open) return;
    setName(isDeck ? defaultDeckName : defaultName);
  }, [open, isDeck, defaultName, defaultDeckName]);

  useEffect(() => {
    if (!hasSkill) setAutoUpdateOnCapture(false);
  }, [hasSkill]);

  useEffect(() => {
    if (!canGenerate && itemType === "deck") setItemType("document");
  }, [canGenerate, itemType]);

  const handleSubmit = async () => {
    if (!name.trim() || validationError || deckBlocked) return;
    setLoading(true);
    try {
      await onSubmit({
        itemType,
        name: name.trim(),
        skillId: hasSkill ? skillId : null,
        autoUpdateOnCapture: hasSkill ? autoUpdateOnCapture : false,
      });
      setName("");
      setSkillId(NONE_SKILL);
      setAutoUpdateOnCapture(false);
      setItemType("document");
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && name.trim() && !loading && !validationError && !deckBlocked) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const selectedSkillDescription = hasSkill ? getSkillDescription(skills, skillId) : null;
  const submitLabel = isDeck ? (loading ? "Generating…" : "Generate") : "Create";
  const dialogTitle = isDeck ? "New deck" : "New document";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Type</Label>
            <Tabs value={itemType} onValueChange={setItemType} className="w-full">
              <TabsList variant="segmented-compact" className="grid w-full grid-cols-2">
                <TabsTrigger value="document" className="gap-1.5 text-xs">
                  <FileText className="size-3.5" />
                  Document
                </TabsTrigger>
                <TabsTrigger value="deck" className="gap-1.5 text-xs" disabled={!canGenerate}>
                  <Presentation className="size-3.5" />
                  Deck
                </TabsTrigger>
              </TabsList>
            </Tabs>
            {!canGenerate ? (
              <p className="text-xs text-muted-foreground">
                Add discovery data before generating a deck.
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="doc-name-input">{isDeck ? "Deck name" : "Document name"}</Label>
            <Input
              id="doc-name-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              autoComplete="off"
              autoFocus
              aria-invalid={!!validationError}
            />
            {validationError ? <p className="text-xs text-destructive">{validationError}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="doc-skill-select">
              {isDeck ? "Skill (optional)" : "Document skill"}
            </Label>
            <Select value={skillId} onValueChange={setSkillId} disabled={skillsLoading}>
              <SelectTrigger id="doc-skill-select" className="w-full">
                <SelectValue placeholder={skillsLoading ? "" : "Select a skill (optional)"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_SKILL}>
                  {isDeck ? "None — use default prompt" : "None"}
                </SelectItem>
                {skills.map((skill) => (
                  <SelectItem key={skill.id} value={skill.id}>
                    {skill.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {skillsError ? <p className="text-xs text-destructive">{skillsError}</p> : null}
            {!skillsLoading && !skillsError && skills.length === 0 ? (
              <p className="text-xs text-muted-foreground">No public skills available.</p>
            ) : null}
            {selectedSkillDescription ? (
              <p className="text-xs text-muted-foreground">{selectedSkillDescription}</p>
            ) : null}
          </div>
          {!isDeck ? (
            <div className="flex items-center justify-between gap-4 rounded-lg border px-3 py-2.5">
              <div className="space-y-0.5">
                <Label htmlFor="doc-auto-update" className="text-sm font-medium">
                  Auto update on capture
                </Label>
                <p className="text-xs text-muted-foreground">
                  Regenerate this document when new captures are processed.
                </p>
              </div>
              <Switch
                id="doc-auto-update"
                checked={autoUpdateOnCapture}
                onCheckedChange={setAutoUpdateOnCapture}
                disabled={!hasSkill}
              />
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !name.trim() || !!validationError || deckBlocked}
          >
            {loading ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
