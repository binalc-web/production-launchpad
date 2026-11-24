import { Link } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PROJECT_LISTING_LABELS } from "@/pages/Project/Projects/projectListingDisplay";
import { INIT_OPTIONS } from "@/pages/Project/CreateProject/constants/constants";
import { cn } from "@/lib/utils";

const ONBOARDING_METHOD_META = Object.fromEntries(INIT_OPTIONS.map((o) => [o.id, o]));

function OnboardingMethodDisplay({ method }) {
  const key = typeof method === "string" ? method.trim().toLowerCase() : "";
  const meta = key ? ONBOARDING_METHOD_META[key] : null;
  const Icon = meta?.icon;

  if (!meta) return null;

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-muted/20 p-4",
        "transition-colors duration-200",
      )}
    >
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
        Initialization method
      </p>
      <div className="mt-3 flex items-center gap-3">
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-md border border-border/80",
            "bg-background shadow-sm",
          )}
          aria-hidden
        >
          {meta.iconSrc ? (
            <img src={meta.iconSrc} alt="" className="size-5 object-contain" />
          ) : Icon ? (
            <Icon className="size-5 text-foreground/80" />
          ) : null}
        </div>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <span className="text-sm font-medium leading-none text-foreground">{meta.label}</span>
          <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wide">
            {meta.id}
          </Badge>
        </div>
      </div>
    </div>
  );
}

export function EditProjectGeneralTab({
  project,
  projectName,
  onNameChange,
  projectDescription,
  onDescriptionChange,
  projectIsActive = true,
  onProjectIsActiveChange,
  canManageProjectStatus = false,
  onRequestDeleteProject,
  validationErrors = {},
}) {
  return (
    <div className="space-y-6 max-w-3xl">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">General</h2>
        <p className="text-sm text-muted-foreground">Basic workspace details for this project.</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="settings-project-name">Project name</Label>
          <Input
            id="settings-project-name"
            value={projectName}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Enter project name"
            aria-invalid={Boolean(validationErrors.projectName)}
          />
          {validationErrors.projectName ? (
            <p className="text-xs text-destructive">{validationErrors.projectName}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="settings-description">Description</Label>
          <Textarea
            id="settings-description"
            placeholder="What is this project about?"
            value={projectDescription}
            onChange={(e) => onDescriptionChange(e.target.value)}
            rows={5}
            className="resize-y min-h-[120px]"
          />
        </div>

        <OnboardingMethodDisplay method={project?.onboardingMethod} />

        {canManageProjectStatus ? (
          <>
            <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <Label htmlFor="settings-project-active" className="text-sm font-medium">
                    {PROJECT_LISTING_LABELS.projectStatusLabel}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {PROJECT_LISTING_LABELS.projectStatusHint}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Switch
                    id="settings-project-active"
                    checked={projectIsActive}
                    onCheckedChange={onProjectIsActiveChange}
                    aria-label={PROJECT_LISTING_LABELS.projectStatusLabel}
                  />
                  <span className="text-sm text-foreground">
                    {projectIsActive
                      ? PROJECT_LISTING_LABELS.projectStatusActive
                      : PROJECT_LISTING_LABELS.projectStatusInactive}
                  </span>
                </div>
              </div>
            </div>

            {typeof onRequestDeleteProject === "function" ? (
              <div className="rounded-lg border border-destructive bg-destructive/5 p-4 space-y-3">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-sm font-medium text-foreground">Delete project</p>
                    <p className="text-xs text-muted-foreground">
                      Permanently remove this project from Launchpad, including preview files and
                      nginx configuration. This cannot be undone.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 border-destructive/40 text-destructive transition-none hover:bg-background hover:text-destructive dark:hover:bg-background"
                    onClick={onRequestDeleteProject}
                  >
                    <Trash2 className="size-4" aria-hidden />
                    Delete project
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      <p className="text-sm text-muted-foreground border-t border-border pt-4">
        Client and competitor details are managed in{" "}
        <Link
          to={`/projects/details/${project?.id}?section=discovery&area=profiles`}
          className="text-primary font-medium hover:underline"
        >
          Discover → Profiles
        </Link>
        .
      </p>
    </div>
  );
}
