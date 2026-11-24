import { useCallback, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Sparkles, FileCode, X } from "lucide-react";
import { ProjectCursorRulesDialogs } from "@/pages/Project/ProjectDetails/components/ProjectCursorRulesDialogs";
import { ProjectCursorSkillsDialogs } from "@/pages/Project/ProjectDetails/components/ProjectCursorSkillsDialogs";
import { useProjectCursorRules } from "@/pages/Project/ProjectDetails/hooks/useProjectCursorRules";
import { useProjectCursorSkills } from "@/pages/Project/ProjectDetails/hooks/useProjectCursorSkills";
import { EMPTY_PENDING_PACKS } from "@/pages/Project/ProjectDetails/hooks/mergePendingCursorPacks";

const EMPTY_FOLDERS = Object.freeze([]);

export const EMPTY_PROMPT_CONFIG = {
  frontendSkillFolders: null,
  frontendRuleFolders: null,
};

export function hasPromptConfigValues(config) {
  if (!config || typeof config !== "object") return false;
  const skills = Array.isArray(config.frontendSkillFolders) ? config.frontendSkillFolders : [];
  const rules = Array.isArray(config.frontendRuleFolders) ? config.frontendRuleFolders : [];
  return skills.length > 0 || rules.length > 0;
}

function folderList(value) {
  if (!Array.isArray(value) || value.length === 0) return EMPTY_FOLDERS;
  return value;
}

/** Displays selected folder chips; optional onRemove clears a single pack. */
function FolderChips({ items, emptyLabel, onRemove }) {
  const list = folderList(items);
  if (!list.length) return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {list.map((name) => (
        <Badge key={name} variant="secondary" className="gap-1 font-normal">
          {name}
          {onRemove ? (
            <button
              type="button"
              className="ml-0.5 rounded-sm opacity-70 hover:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              aria-label={`Remove ${name}`}
              onClick={() => onRemove(name)}
            >
              <X className="size-3" aria-hidden />
            </button>
          ) : null}
        </Badge>
      ))}
    </div>
  );
}

/**
 * Onboarding-only frontend skill/rule folder selection (no project prompts).
 */
export function OnboardingFrontendFoldersConfig({
  value,
  onChange,
  onSaveCustomSkillWithoutProject,
  onSaveCustomRuleWithoutProject,
  pendingCustomSkills = EMPTY_PENDING_PACKS,
  pendingCustomRules = EMPTY_PENDING_PACKS,
}) {
  const config = value ?? EMPTY_PROMPT_CONFIG;
  const skillFolders = useMemo(
    () => folderList(config.frontendSkillFolders),
    [config.frontendSkillFolders],
  );
  const ruleFolders = useMemo(
    () => folderList(config.frontendRuleFolders),
    [config.frontendRuleFolders],
  );

  /** Removes one skill folder from the onboarding selection. */
  const removeSkillFolder = useCallback(
    (name) => {
      const next = skillFolders.filter((folder) => folder !== name);
      onChange?.({
        ...config,
        frontendSkillFolders: next.length ? next : null,
      });
    },
    [config, onChange, skillFolders],
  );

  /** Removes one rule folder from the onboarding selection. */
  const removeRuleFolder = useCallback(
    (name) => {
      const next = ruleFolders.filter((folder) => folder !== name);
      onChange?.({
        ...config,
        frontendRuleFolders: next.length ? next : null,
      });
    },
    [config, onChange, ruleFolders],
  );

  /** Stores a new skill for post-create saving and selects it for this project. */
  const handleSaveCustomSkillWithoutProject = useCallback(
    (skill) => {
      onSaveCustomSkillWithoutProject?.(skill);
      onChange?.({
        ...config,
        frontendSkillFolders: [...new Set([...skillFolders, skill.folderName])],
      });
    },
    [config, onChange, onSaveCustomSkillWithoutProject, skillFolders],
  );

  /** Stores a new rule for post-create saving and selects it for this project. */
  const handleSaveCustomRuleWithoutProject = useCallback(
    (rule) => {
      onSaveCustomRuleWithoutProject?.(rule);
      onChange?.({
        ...config,
        frontendRuleFolders: [...new Set([...ruleFolders, rule.folderName])],
      });
    },
    [config, onChange, onSaveCustomRuleWithoutProject, ruleFolders],
  );

  const cursorSkills = useProjectCursorSkills({
    hasDeveloperRepo: true,
    canOpen: true,
    purpose: "select",
    initialSelectedFolders: skillFolders,
    pendingCustomPacks: pendingCustomSkills,
    onSaveCustomWithoutProject: handleSaveCustomSkillWithoutProject,
    onConfirmSelection: (folders) => {
      onChange?.({
        ...config,
        frontendSkillFolders: folders.length ? folders : null,
      });
    },
  });

  const cursorRules = useProjectCursorRules({
    hasDeveloperRepo: true,
    canOpen: true,
    purpose: "select",
    initialSelectedFolders: ruleFolders,
    pendingCustomPacks: pendingCustomRules,
    onSaveCustomWithoutProject: handleSaveCustomRuleWithoutProject,
    onConfirmSelection: (folders) => {
      onChange?.({
        ...config,
        frontendRuleFolders: folders.length ? folders : null,
      });
    },
  });

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Optionally choose frontend skill and rule packs for Client Link. Prompt overrides can be
        added later from the Web App section after the project is created.
      </p>

      <div className="space-y-3 rounded-xl border border-border bg-card p-4">
        <Label className="text-sm font-medium">Frontend skills</Label>
        <FolderChips
          items={config.frontendSkillFolders}
          emptyLabel="None selected."
          onRemove={removeSkillFolder}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={cursorSkills.openSelectCursorSkills}
        >
          <Sparkles className="size-4" aria-hidden />
          Select skills
        </Button>
      </div>

      <div className="space-y-3 rounded-xl border border-border bg-card p-4">
        <Label className="text-sm font-medium">Frontend rules</Label>
        <FolderChips
          items={config.frontendRuleFolders}
          emptyLabel="None selected."
          onRemove={removeRuleFolder}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={cursorRules.openSelectCursorRules}
        >
          <FileCode className="size-4" aria-hidden />
          Select rules
        </Button>
      </div>

      <ProjectCursorSkillsDialogs cursorSkills={cursorSkills} purpose={cursorSkills.purpose} />
      <ProjectCursorRulesDialogs cursorRules={cursorRules} purpose={cursorRules.purpose} />
    </div>
  );
}
