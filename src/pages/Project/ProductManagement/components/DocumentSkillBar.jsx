import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChevronDown, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { getSkillLabel } from "@/api/hubAiSkillsLibrary";
import { useHubAiSkills } from "@/hooks/useHubAiSkills";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function resolveSkillLabel(skills, skillId) {
  if (!skillId) return null;
  const label = getSkillLabel(skills, skillId);
  if (label && label !== skillId) return label;
  if (UUID_RE.test(skillId)) return label || "Unknown skill";
  return skillId;
}

export function DocumentSkillBar({ doc, saving, onSkillChange, className }) {
  const [updating, setUpdating] = useState(false);
  const {
    skills,
    loading: skillsLoading,
    error: skillsError,
  } = useHubAiSkills();
  const skillLabel = resolveSkillLabel(skills, doc?.skillId);
  const hasSkill = Boolean(doc?.skillId);

  const applyChange = async (patch) => {
    if (!doc?.id) return;
    setUpdating(true);
    try {
      await onSkillChange(doc.id, patch);
    } finally {
      setUpdating(false);
    }
  };

  const handleSkillSelect = (skillId) => {
    applyChange({
      skillId: skillId || null,
      autoUpdateOnCapture: skillId ? doc?.autoUpdateOnCapture : false,
    });
  };

  const handleAutoUpdateToggle = (checked) => {
    applyChange({ autoUpdateOnCapture: checked });
  };

  if (!doc) return null;

  const disabled = updating || saving;

  return (
    <div className={cn("flex items-center gap-1.5 shrink-0", className)}>
      <Sparkles className="size-3.5 shrink-0 text-muted-foreground hidden sm:block" />
      <Badge
        variant={hasSkill ? "secondary" : "outline"}
        className="h-6 font-normal text-xs px-2"
      >
        {skillLabel || "No skill"}
      </Badge>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 gap-0.5 px-2 text-xs"
            disabled={disabled || skillsLoading}
          >
            {updating || skillsLoading ? (
              <Loader2 className="size-3 animate-spin" />
            ) : null}
            Skill
            <ChevronDown className="size-3 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {skillsError ? (
            <DropdownMenuItem disabled className="text-xs text-destructive">
              {skillsError}
            </DropdownMenuItem>
          ) : null}
          {!skillsLoading && !skillsError && skills.length === 0 ? (
            <DropdownMenuItem
              disabled
              className="text-xs text-muted-foreground"
            >
              No public skills available
            </DropdownMenuItem>
          ) : null}
          {skills.map((skill) => (
            <DropdownMenuItem
              key={skill.id}
              onSelect={() => handleSkillSelect(skill.id)}
              className={doc.skillId === skill.id ? "bg-muted" : ""}
            >
              <div>
                <div className="font-medium">{skill.title}</div>
                {skill.description ? (
                  <div className="text-xs text-muted-foreground">
                    {skill.description}
                  </div>
                ) : null}
              </div>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => handleSkillSelect(null)}
            disabled={!hasSkill}
            className="text-muted-foreground"
          >
            Remove skill
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5">
            <Switch
              id={`auto-update-${doc.id}`}
              checked={Boolean(doc.autoUpdateOnCapture)}
              onCheckedChange={handleAutoUpdateToggle}
              disabled={!hasSkill || disabled}
              className="scale-90"
            />
            <Label
              htmlFor={`auto-update-${doc.id}`}
              className="text-xs text-muted-foreground font-normal whitespace-nowrap hidden lg:inline"
            >
              Auto on capture
            </Label>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">Auto update on capture</TooltipContent>
      </Tooltip>
    </div>
  );
}
