import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { getSkillLabel } from "@/api/hubAiSkillsLibrary";
import { useHubAiSkills } from "@/hooks/useHubAiSkills";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function resolveSkillLabel(skills, skillId) {
  if (!skillId) return null;
  const label = getSkillLabel(skills, skillId);
  if (label && label !== skillId) return label;
  if (UUID_RE.test(skillId)) return label || "Unknown skill";
  return skillId;
}

export function PresentationSkillBar({
  presentation,
  saving,
  onSkillChange,
  className,
  compact = false,
}) {
  const [updating, setUpdating] = useState(false);
  const { skills, loading: skillsLoading, error: skillsError } = useHubAiSkills();
  const skillLabel = resolveSkillLabel(skills, presentation?.skillId);
  const hasSkill = Boolean(presentation?.skillId);

  const applyChange = async (skillId) => {
    if (!presentation?.id) return;
    setUpdating(true);
    try {
      await onSkillChange(presentation.id, { skillId: skillId || null });
    } finally {
      setUpdating(false);
    }
  };

  if (!presentation) return null;

  const disabled = updating || saving;

  return (
    <div className={cn("flex shrink-0 items-center gap-1.5", className)}>
      {!compact ? (
        <Sparkles className="hidden size-3.5 shrink-0 text-muted-foreground sm:block" />
      ) : null}
      <Badge
        variant={hasSkill ? "secondary" : "outline"}
        className={cn(
          "h-6 max-w-[9rem] truncate px-2 text-xs font-normal",
          compact && "hidden lg:inline-flex",
        )}
        title={skillLabel || "Default prompt"}
      >
        {skillLabel || "Default prompt"}
      </Badge>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 shrink-0 px-2 text-xs"
            disabled={disabled || skillsLoading}
          >
            {updating ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <>
                Skill
                <ChevronDown className="size-3.5 ml-1 opacity-60" />
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="max-h-72 overflow-y-auto">
          <DropdownMenuItem className="cursor-pointer" onClick={() => applyChange(null)}>
            None — default prompt
          </DropdownMenuItem>
          {skills.map((skill) => (
            <DropdownMenuItem
              key={skill.id}
              className="cursor-pointer"
              onClick={() => applyChange(skill.id)}
            >
              {skill.title}
            </DropdownMenuItem>
          ))}
          {skillsError ? (
            <DropdownMenuItem disabled className="text-destructive text-xs">
              {skillsError}
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
