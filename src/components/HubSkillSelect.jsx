import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getSkillDescription } from "@/api/hubAiSkillsLibrary";
import { useHubAiSkills } from "@/hooks/useHubAiSkills";

const NONE_SKILL = "__none__";

/**
 * Shared Hub AI skill picker for forms (automations, documents, etc.).
 */
export function HubSkillSelect({
  value = null,
  onChange,
  enabled = true,
  disabled = false,
  id = "hub-skill-select",
  label = "Skill (optional)",
  noneLabel = "None — use default prompt",
  showDescription = true,
  className,
}) {
  const selectValue = value ? value : NONE_SKILL;
  const { skills, loading: skillsLoading, error: skillsError } = useHubAiSkills({ enabled });

  const hasSkill = Boolean(value);
  const selectedSkillDescription =
    showDescription && hasSkill ? getSkillDescription(skills, value) : null;

  const handleChange = (next) => {
    onChange?.(next === NONE_SKILL ? null : next);
  };

  return (
    <div className={className}>
      {label ? (
        <Label htmlFor={id} className="mb-2 block">
          {label}
        </Label>
      ) : null}
      <Select value={selectValue} onValueChange={handleChange} disabled={disabled || skillsLoading}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue
            placeholder={skillsLoading ? "Loading skills…" : "Select a skill (optional)"}
          />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE_SKILL}>{noneLabel}</SelectItem>
          {skills.map((skill) => (
            <SelectItem key={skill.id} value={skill.id}>
              {skill.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {skillsError ? <p className="mt-1 text-xs text-destructive">{skillsError}</p> : null}
      {!skillsLoading && !skillsError && skills.length === 0 ? (
        <p className="mt-1 text-xs text-muted-foreground">No public skills available.</p>
      ) : null}
      {selectedSkillDescription ? (
        <p className="mt-1 text-xs text-muted-foreground">{selectedSkillDescription}</p>
      ) : null}
    </div>
  );
}
