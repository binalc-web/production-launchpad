import { EmailMultiSelect } from "@/pages/Project/CreateProject/components/EmailMultiSelect";
import { Label } from "@/components/ui/label";
import { ProjectCreatorTransferSection } from "./ProjectCreatorTransferSection";

export function EditProjectTeamTab({
  project,
  assignedUserEmailTags,
  onAssignedUserEmailTagsChange,
  stakeholderEmailTags,
  onStakeholderEmailTagsChange,
  settingsAccessEmailTags,
  onSettingsAccessEmailTagsChange,
  assignedHubSuggestions,
  validationErrors,
  canManageProjectCreator = false,
  onProjectCreatorTransferred,
}) {
  return (
    <div className="space-y-6 max-w-3xl">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Team</h2>
        <p className="text-sm text-muted-foreground">
          Control who works on this project and who can access client-facing features.
        </p>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="settings-assigned-user-emails">Assigned users</Label>
          <p className="text-xs text-muted-foreground">Team members who work on this project.</p>
          <EmailMultiSelect
            id="settings-assigned-user-emails"
            value={assignedUserEmailTags}
            onChange={onAssignedUserEmailTagsChange}
            suggestions={assignedHubSuggestions}
            error={validationErrors.assignedUserEmails}
          />
          {validationErrors.assignedUserEmails ? (
            <p className="text-sm text-destructive mt-1">{validationErrors.assignedUserEmails}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="settings-access-emails">Project settings access</Label>
          <p className="text-xs text-muted-foreground">
            LaunchPad admins and the project creator always have access. Add emails here to grant it
            to others.
          </p>
          <EmailMultiSelect
            id="settings-access-emails"
            value={settingsAccessEmailTags}
            onChange={onSettingsAccessEmailTagsChange}
            suggestions={assignedHubSuggestions}
            error={validationErrors.settingsAccessEmails}
          />
          {validationErrors.settingsAccessEmails ? (
            <p className="text-sm text-destructive mt-1">{validationErrors.settingsAccessEmails}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="settings-stakeholder-emails">Stakeholders</Label>
          <p className="text-xs text-muted-foreground">
            Can use lock release, report issues, and AI chat.
          </p>
          <EmailMultiSelect
            id="settings-stakeholder-emails"
            value={stakeholderEmailTags}
            onChange={onStakeholderEmailTagsChange}
            suggestions={[]}
            error={validationErrors.stakeholderEmails}
          />
          {validationErrors.stakeholderEmails ? (
            <p className="text-sm text-destructive mt-1">{validationErrors.stakeholderEmails}</p>
          ) : null}
        </div>

        {canManageProjectCreator ? (
          <ProjectCreatorTransferSection
            project={project}
            assignedUserEmailTags={assignedUserEmailTags}
            onProjectUpdated={onProjectCreatorTransferred}
          />
        ) : null}
      </div>
    </div>
  );
}
