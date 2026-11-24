import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileCode, Loader2, Sparkles } from "lucide-react";
import { fetchProjectPromptConfig, updateProjectPromptConfig } from "@/api";
import { toast } from "sonner";
import { ProjectPromptsPanel } from "./ProjectPromptsPanel";
import { isBackendProjectPrompt, isWebAppProjectPrompt } from "../constants/projectPromptFilters";
import { ProjectCursorRulesDialogs } from "./ProjectCursorRulesDialogs";
import { ProjectCursorSkillsDialogs } from "./ProjectCursorSkillsDialogs";
import { useProjectCursorRules } from "../hooks/useProjectCursorRules";
import { useProjectCursorSkills } from "../hooks/useProjectCursorSkills";

const EMPTY_FOLDERS = Object.freeze([]);

function AgentConfigSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-busy="true" aria-label="Loading skills and rules">
      {Array.from({ length: 2 }).map((_, i) => (
        <Card key={i} className="border-border shadow-sm">
          <CardContent className="space-y-3 p-6">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-2/3" />
            <div className="flex flex-wrap gap-2 pt-1">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-28 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

const SIDE_CONFIG = {
  frontend: {
    skillKey: "frontendSkillFolders",
    ruleKey: "frontendRuleFolders",
    matchRow: isWebAppProjectPrompt,
    promptsDescription:
      "Overrides for Client Link agent system prompts. Skills and rules below are synced separately to the Launchpad repo.",
    promptsEmptyLabel: "No frontend project prompts yet — add one to override a system prompt.",
    skillsDescription:
      "Skill packs routed into Client Link agent prompts and pushed to the Launchpad repository.",
    rulesDescription:
      "Rule packs routed into Client Link agent prompts and pushed to the Launchpad repository.",
    saveLabel: "Save to Launchpad repo",
    repoMissingHint:
      "Configure the Launchpad repository (gitRepoPath) on this project before syncing frontend skills or rules.",
    loadError: "Failed to load Web App agent configuration",
  },
  backend: {
    skillKey: "backendSkillFolders",
    ruleKey: "backendRuleFolders",
    matchRow: isBackendProjectPrompt,
    promptsDescription:
      "Overrides for backend agent system prompts (code chat, release-lock plan, infra analysis, and related flows).",
    promptsEmptyLabel: "No backend project prompts yet — add one to override a system prompt.",
    skillsDescription:
      "Skill packs routed into backend agent prompts and pushed to the developer repository.",
    rulesDescription:
      "Rule packs routed into backend agent prompts and pushed to the developer repository.",
    saveLabel: "Save to developer repo",
    repoMissingHint:
      "Configure the development repository on this project before syncing backend skills or rules.",
    loadError: "Failed to load backend agent configuration",
  },
};

function folderList(value) {
  if (!Array.isArray(value) || value.length === 0) return EMPTY_FOLDERS;
  return value;
}

function describeSyncResult(sync, kind) {
  const result = kind === "skills" ? sync?.skills : sync?.rules;
  if (!result) return null;
  const repoUrl = result.developmentRepoUrl || result.launchpadRepoUrl || "the repository";
  if (result.skipped) {
    return `Already up to date in ${repoUrl} (${result.filesWritten} file(s)); no new commit.`;
  }
  if (result.pushed) {
    return `Pushed ${result.filesWritten} file(s) to ${repoUrl}.`;
  }
  return `Synced to ${repoUrl}.`;
}

function buildSaveToast(sync, kind) {
  const message = describeSyncResult(sync, kind);
  if (message) return message;
  return kind === "skills" ? "Project skills saved." : "Project rules saved.";
}

function SelectionChips({ items, emptyLabel }) {
  const list = folderList(items);
  if (!list.length) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {list.map((name) => (
        <Badge key={name} variant="secondary" className="font-normal">
          {name}
        </Badge>
      ))}
    </div>
  );
}

function CursorPackSection({
  title,
  description,
  icon: Icon,
  folders,
  canManage,
  hasRepo,
  repoMissingHint,
  saveLabel,
  onSelect,
  saving,
  onSave,
}) {
  return (
    <Card className="overflow-hidden border-border shadow-sm">
      <CardContent className="space-y-4 p-6">
        <div className="flex flex-col items-center text-center sm:block sm:text-left">
          <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary sm:mb-0 sm:inline-flex">
            <Icon className="size-5" aria-hidden />
          </div>
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
        </div>

        <SelectionChips items={folders} emptyLabel="None selected." />

        {canManage ? (
          <div className="flex flex-wrap gap-2">
            {hasRepo ? (
              <>
                <Button type="button" variant="outline" className="gap-2" onClick={onSelect}>
                  <Sparkles className="size-4" aria-hidden />
                  Select
                </Button>
                <Button type="button" className="gap-2" onClick={onSave} disabled={saving}>
                  {saving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                  {saveLabel}
                </Button>
              </>
            ) : (
              <Tooltip delayDuration={200}>
                <TooltipTrigger asChild>
                  <span className="inline-block">
                    <Button type="button" variant="outline" className="gap-2" disabled>
                      <Sparkles className="size-4" aria-hidden />
                      Select
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs text-xs">
                  {repoMissingHint}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

/**
 * Shared agent configuration: project prompts, skills, and rules.
 * @param {"frontend" | "backend"} side
 */
export function ProjectAgentConfigTabContent({
  side,
  project,
  hasRepo = false,
  canManage = false,
}) {
  const config = SIDE_CONFIG[side] ?? SIDE_CONFIG.frontend;
  const projectId = project?.id;

  const [configLoading, setConfigLoading] = useState(true);
  const [savingSkills, setSavingSkills] = useState(false);
  const [savingRules, setSavingRules] = useState(false);
  const [skillFolders, setSkillFolders] = useState(null);
  const [ruleFolders, setRuleFolders] = useState(null);

  const loadConfig = useCallback(async () => {
    if (!projectId) {
      setConfigLoading(false);
      return;
    }
    setConfigLoading(true);
    try {
      const data = await fetchProjectPromptConfig(projectId);
      setSkillFolders(data[config.skillKey] ?? null);
      setRuleFolders(data[config.ruleKey] ?? null);
    } catch (err) {
      toast.error(err.error || err.message || config.loadError);
    } finally {
      setConfigLoading(false);
    }
  }, [projectId, config.skillKey, config.ruleKey, config.loadError]);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  const skillFolderList = useMemo(() => folderList(skillFolders), [skillFolders]);
  const ruleFolderList = useMemo(() => folderList(ruleFolders), [ruleFolders]);

  const cursorSkills = useProjectCursorSkills({
    projectId,
    hasDeveloperRepo: hasRepo,
    canOpen: canManage,
    purpose: "select",
    initialSelectedFolders: skillFolderList,
    onConfirmSelection: (folders) => {
      setSkillFolders(folders.length ? folders : null);
    },
  });

  const cursorRules = useProjectCursorRules({
    projectId,
    hasDeveloperRepo: hasRepo,
    canOpen: canManage,
    purpose: "select",
    initialSelectedFolders: ruleFolderList,
    onConfirmSelection: (folders) => {
      setRuleFolders(folders.length ? folders : null);
    },
  });

  const saveFolders = useCallback(
    async (kind) => {
      if (!projectId) return;
      const setSaving = kind === "skills" ? setSavingSkills : setSavingRules;
      setSaving(true);
      try {
        const payload = {
          [config.skillKey]: skillFolders,
          [config.ruleKey]: ruleFolders,
        };
        const data = await updateProjectPromptConfig(projectId, payload);
        setSkillFolders(data[config.skillKey] ?? null);
        setRuleFolders(data[config.ruleKey] ?? null);
        toast.success(buildSaveToast(data.sync, kind));
      } catch (err) {
        toast.error(err.error || err.message || "Failed to save");
      } finally {
        setSaving(false);
      }
    },
    [projectId, config.skillKey, config.ruleKey, skillFolders, ruleFolders],
  );

  return (
    <div className="space-y-6 xl:grid xl:grid-cols-2 xl:gap-6 xl:space-y-0 xl:items-start">
      <div className="min-w-0">
        <ProjectPromptsPanel
          projectId={projectId}
          canManage={canManage}
          title="Project prompts"
          description={config.promptsDescription}
          matchRow={config.matchRow}
          emptyLabel={config.promptsEmptyLabel}
        />
      </div>

      <div className="min-w-0 space-y-6">
        {configLoading ? (
          <AgentConfigSkeleton />
        ) : (
          <>
            <CursorPackSection
              title="Project skills"
              description={config.skillsDescription}
              icon={Sparkles}
              folders={skillFolders}
              canManage={canManage}
              hasRepo={hasRepo}
              repoMissingHint={config.repoMissingHint}
              saveLabel={config.saveLabel}
              onSelect={cursorSkills.openSelectCursorSkills}
              saving={savingSkills}
              onSave={() => void saveFolders("skills")}
            />
            <CursorPackSection
              title="Project rules"
              description={config.rulesDescription}
              icon={FileCode}
              folders={ruleFolders}
              canManage={canManage}
              hasRepo={hasRepo}
              repoMissingHint={config.repoMissingHint}
              saveLabel={config.saveLabel}
              onSelect={cursorRules.openSelectCursorRules}
              saving={savingRules}
              onSave={() => void saveFolders("rules")}
            />
          </>
        )}

        <ProjectCursorSkillsDialogs
          cursorSkills={cursorSkills}
          hasDeveloperRepo={hasRepo}
          purpose={cursorSkills.purpose}
        />
        <ProjectCursorRulesDialogs
          cursorRules={cursorRules}
          hasDeveloperRepo={hasRepo}
          purpose={cursorRules.purpose}
        />
      </div>
    </div>
  );
}
