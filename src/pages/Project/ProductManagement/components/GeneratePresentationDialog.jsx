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
import { Loader2 } from "lucide-react";
import { getSkillDescription } from "@/api/hubAiSkillsLibrary";
import { useHubAiSkills } from "@/hooks/useHubAiSkills";

const NONE_SKILL = "__none__";

export function GeneratePresentationDialog({
  open,
  onOpenChange,
  defaultName = "Kickoff Presentation",
  onSubmit,
}) {
  const [name, setName] = useState(defaultName);
  const [skillId, setSkillId] = useState(NONE_SKILL);
  const [loading, setLoading] = useState(false);
  const { skills, loading: skillsLoading, error: skillsError } = useHubAiSkills({ enabled: open });
  const hasSkill = skillId !== NONE_SKILL;

  useEffect(() => {
    if (open) {
      setName(defaultName);
      setSkillId(NONE_SKILL);
    }
  }, [open, defaultName]);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      await onSubmit({
        name: name.trim(),
        skillId: hasSkill ? skillId : null,
      });
      setName("");
      setSkillId(NONE_SKILL);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const selectedSkillDescription = hasSkill ? getSkillDescription(skills, skillId) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92vh,900px)] w-[calc(100%-1.5rem)] max-w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="space-y-1.5 px-5 pt-5 text-left sm:px-6">
          <DialogTitle>Generate presentation</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 px-5 sm:px-6">
          <div className="space-y-2">
            <Label htmlFor="presentation-name-input">Presentation name</Label>
            <Input
              id="presentation-name-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="off"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="presentation-skill-select">Skill (optional)</Label>
            <Select value={skillId} onValueChange={setSkillId} disabled={skillsLoading}>
              <SelectTrigger id="presentation-skill-select" className="w-full">
                <SelectValue placeholder={skillsLoading ? "" : "Select a skill (optional)"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_SKILL}>None — use default prompt</SelectItem>
                {skills.map((skill) => (
                  <SelectItem key={skill.id} value={skill.id}>
                    {skill.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {skillsError ? <p className="text-xs text-destructive">{skillsError}</p> : null}
            {selectedSkillDescription ? (
              <p className="text-xs text-muted-foreground">{selectedSkillDescription}</p>
            ) : null}
          </div>
        </div>
        <DialogFooter className="gap-2 border-t border-border px-5 py-4 sm:px-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={loading || !name.trim()}>
            {loading ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
            {loading ? "Generating…" : "Generate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
