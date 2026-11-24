import { memo, useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { updateProject } from "@/api";
import { useAuth } from "@/context/AuthContext";
import {
  PROJECT_SETTINGS_ACCESS_HINT,
  userCanAccessProjectSettings,
} from "@/lib/releasePresentation";
import {
  getEmbedAutoCreateJiraTicket,
  normalizeFeedbackConfigurations,
} from "@/lib/feedbackConfigurations.js";
import { cn } from "@/lib/utils";

const TOGGLE_LABEL = "Create Jira ticket automatically";
const JIRA_DISCONNECTED_HINT = "Connect Jira to automatically create tickets.";

function EmbedSnippetJiraAutoCreateControl({ project, onSaved, className }) {
  const { user } = useAuth();
  const canEdit = userCanAccessProjectSettings(user, project);
  const jiraConnected = Boolean(project?.jiraConnectionId);

  const [enabled, setEnabled] = useState(() =>
    getEmbedAutoCreateJiraTicket(normalizeFeedbackConfigurations(project?.feedbackConfigurations)),
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setEnabled(
      getEmbedAutoCreateJiraTicket(normalizeFeedbackConfigurations(project?.feedbackConfigurations)),
    );
  }, [project?.id, project?.feedbackConfigurations]);

  const persist = useCallback(
    async (next) => {
      if (!project?.id) return;
      if (!canEdit) {
        toast.error(PROJECT_SETTINGS_ACCESS_HINT);
        return;
      }
      setSaving(true);
      try {
        const base = normalizeFeedbackConfigurations(project.feedbackConfigurations);
        const updated = await updateProject(project.id, {
          feedbackConfigurations: {
            ...base,
            autoCreateJiraTicket: next === true,
          },
        });
        setEnabled(getEmbedAutoCreateJiraTicket(updated?.feedbackConfigurations));
        onSaved?.(updated);
        toast.success(
          next
            ? "Jira tickets will be created automatically for new snippet reports."
            : "Automatic Jira ticket creation is off for this snippet.",
        );
      } catch (e) {
        const msg =
          e?.message || e?.error || (typeof e === "string" ? e : "Could not save Jira setting.");
        toast.error(String(msg));
        setEnabled(
          getEmbedAutoCreateJiraTicket(
            normalizeFeedbackConfigurations(project?.feedbackConfigurations),
          ),
        );
      } finally {
        setSaving(false);
      }
    },
    [canEdit, onSaved, project],
  );

  const handleCheckedChange = useCallback(
    (checked) => {
      if (!jiraConnected || saving) return;
      const next = checked === true;
      setEnabled(next);
      void persist(next);
    },
    [jiraConnected, persist, saving],
  );

  const switchDisabled = !canEdit || !jiraConnected || saving;

  return (
    <div
      className={cn(
        "flex max-w-full flex-wrap items-center justify-end gap-2 sm:gap-3",
        className,
      )}
    >
      <div className="min-w-0 text-right">
        <Label
          htmlFor="embed-auto-jira-toggle"
          className="cursor-pointer text-sm font-medium text-foreground"
        >
          {TOGGLE_LABEL}
        </Label>
        {!jiraConnected ? (
          <p id="embed-auto-jira-hint" className="mt-0.5 text-xs text-muted-foreground">
            {JIRA_DISCONNECTED_HINT}
          </p>
        ) : (
          <p className="mt-0.5 hidden text-xs text-muted-foreground sm:block">
            Applies to issue reports submitted from this code snippet.
          </p>
        )}
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex shrink-0 items-center">
            <Switch
              id="embed-auto-jira-toggle"
              checked={enabled}
              disabled={switchDisabled}
              onCheckedChange={handleCheckedChange}
              aria-describedby={!jiraConnected ? "embed-auto-jira-hint" : undefined}
              aria-label={TOGGLE_LABEL}
            />
            {saving ? (
              <Loader2 className="ml-2 size-4 animate-spin text-muted-foreground" aria-hidden />
            ) : null}
          </span>
        </TooltipTrigger>
        {!jiraConnected ? (
          <TooltipContent side="bottom" className="max-w-xs text-sm">
            {JIRA_DISCONNECTED_HINT}
          </TooltipContent>
        ) : null}
      </Tooltip>
    </div>
  );
}

export default memo(EmbedSnippetJiraAutoCreateControl);
