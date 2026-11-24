import { useNavigate } from "react-router-dom";
import { ExternalLink, Maximize2, Package, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { buildProjectDetailsPathWithResume } from "@/lib/projectJourneyResume";
import { buildReleaseManagementDetailsPath } from "@/lib/releaseNavigation";

const SHORTCUT_BUTTON_CLASS =
  "h-8 min-w-0 flex-1 basis-0 gap-1 rounded-none border-r border-border px-1.5 text-xs transition-colors duration-200 last:border-r-0 sm:gap-1.5 sm:px-2";

function ShortcutButton({ label, icon: Icon, disabled, title, onClick }) {
  const button = (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={SHORTCUT_BUTTON_CLASS}
      disabled={disabled}
      title={disabled ? undefined : title}
      aria-label={label}
      onClick={onClick}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      <span className="hidden min-w-0 truncate sm:inline">{label}</span>
    </Button>
  );

  const wrapped = <span className="flex min-w-0 flex-1 basis-0">{button}</span>;

  if (disabled && title) {
    return (
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>{wrapped}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs">
          {title}
        </TooltipContent>
      </Tooltip>
    );
  }

  return wrapped;
}

export function ProjectCardShortcuts({
  projectId,
  clientUrl,
  previewOnlyUrl,
  linksDisabledHint,
  className,
  onClickStop,
}) {
  const navigate = useNavigate();

  const stop = (e) => {
    e.stopPropagation();
    onClickStop?.(e);
  };

  const openDetails = () => navigate(buildProjectDetailsPathWithResume(projectId));
  const openReleases = () => {
    const path = buildReleaseManagementDetailsPath(projectId);
    if (path) navigate(path);
  };
  return (
    <div
      className={cn(
        "flex w-full flex-wrap overflow-hidden rounded-lg border border-border bg-background shadow-xs sm:flex-nowrap",
        className,
      )}
      onClick={stop}
      onKeyDown={stop}
      role="presentation"
    >
      <ShortcutButton label="Manage" icon={Settings2} onClick={openDetails} />
      <ShortcutButton
        label="Review"
        icon={ExternalLink}
        disabled={!clientUrl}
        title={!clientUrl ? linksDisabledHint : "Open the client review portal"}
        onClick={() => clientUrl && window.open(clientUrl, "_blank")}
      />
      <ShortcutButton
        label="Preview"
        icon={Maximize2}
        disabled={!previewOnlyUrl}
        title={!previewOnlyUrl ? linksDisabledHint : "Open preview without client link chrome"}
        onClick={() => previewOnlyUrl && window.open(previewOnlyUrl, "_blank")}
      />
      <ShortcutButton label="Releases" icon={Package} onClick={openReleases} />
    </div>
  );
}
