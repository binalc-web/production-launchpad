import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, Loader2, Mail, MoreVertical, OctagonAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  AUTOMATION_LABELS,
  formatLastRunDisplay,
  formatNextRunRelative,
  formatScheduleCardLine,
  getAutomationTypeMeta,
  formatTargetSummary,
  isNextRunApplicable,
} from "../automationDisplay";

const LAST_RUN_BADGE_CLASS = {
  success:
    "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200",
  error: "border-destructive/30 bg-destructive/10 text-destructive",
  running:
    "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-200",
  muted: "border-border bg-muted/40 text-muted-foreground",
};

const RUN_TRIGGER_LABEL = {
  MANUAL: "Manual",
  SCHEDULED: "Scheduled",
};

function formatRunTrigger(trigger) {
  const key = String(trigger ?? "")
    .trim()
    .toUpperCase();
  return RUN_TRIGGER_LABEL[key] ?? null;
}

export function AutomationCard({
  job,
  projectId,
  toggling,
  running,
  deleting = false,
  manualRunBlocked = false,
  onToggleEnabled,
  onRunNow,
  onDelete,
}) {
  const navigate = useNavigate();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const isActive = job.enabled !== false;
  const { Icon, pill } = getAutomationTypeMeta(job);
  const scheduleLine = formatScheduleCardLine(job);
  const lastRun = formatLastRunDisplay(job.latestRun);
  const showNextRun = isNextRunApplicable(job);
  const nextRun = showNextRun ? formatNextRunRelative(job) : null;
  const busy = running || deleting;
  const timezone = String(job.timezone ?? "").trim();
  const emailAlerts = job.reportEmailNotificationsEnabled !== false;
  const lastRunTrigger = formatRunTrigger(job.latestRun?.trigger);
  const targetSummary = formatTargetSummary(job, { projectId });
  const subtitle = targetSummary === "No targets" ? pill : `${pill} · ${targetSummary}`;
  const scheduleBadgeText = timezone ? `${scheduleLine} · ${timezone}` : scheduleLine;

  const nextRunDisplay = !isActive ? AUTOMATION_LABELS.pausedBadge : (nextRun ?? "—");
  const lastRunBadgeText = lastRun.ago ? `${lastRun.status} · ${lastRun.ago}` : lastRun.status;

  const openDetails = () => navigate(`/jobs/${job.id}`);
  const openLogs = () => navigate(`/jobs/${job.id}#runs`);
  const openEdit = () => navigate(`/jobs/${job.id}/edit`);

  const stopCardNav = (e) => {
    e.stopPropagation();
  };

  const handleConfirmDelete = async () => {
    if (!onDelete || deleting) return;
    try {
      await onDelete(job);
      setDeleteDialogOpen(false);
    } catch {
      /* parent already toasts; keep dialog open */
    }
  };

  return (
    <>
      <article
        role="button"
        tabIndex={0}
        onClick={openDetails}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openDetails();
          }
        }}
        className={cn(
          "group @container/automation-card flex h-full cursor-pointer flex-col gap-3 overflow-hidden rounded-xl border p-4 transition-colors duration-200",
          isActive
            ? "border-primary/30 bg-card shadow-sm ring-1 ring-primary/10 hover:border-primary/45 hover:bg-muted/10"
            : "border-dashed border-border/70 bg-muted/25 opacity-80 saturate-[0.9] hover:border-border hover:bg-muted/35 hover:opacity-95",
        )}
      >
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
              isActive ? "bg-primary/10 text-primary" : "bg-muted/80 text-muted-foreground",
            )}
            aria-hidden
          >
            <Icon className="h-4 w-4" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-1.5">
              <div className="min-w-0 flex-1">
                <h2
                  className={cn(
                    "line-clamp-2 break-words text-base font-semibold text-foreground group-hover:text-primary",
                    !isActive && "text-muted-foreground",
                  )}
                  title={job.name}
                >
                  {job.name}
                </h2>
                <p className="mt-1.5 truncate text-xs text-muted-foreground" title={subtitle}>
                  {subtitle}
                </p>
              </div>

              <div
                className="flex shrink-0 items-center"
                onClick={stopCardNav}
                onKeyDown={stopCardNav}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                      aria-label={`Actions for ${job.name}`}
                      disabled={busy}
                    >
                      {busy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <MoreVertical className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-[11rem]">
                    <DropdownMenuItem className="cursor-pointer" onClick={openEdit}>
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer"
                      disabled={manualRunBlocked}
                      onClick={() => onRunNow(job)}
                    >
                      Run now
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer" onClick={openLogs}>
                      View logs
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={() => onToggleEnabled(job, !isActive)}
                    >
                      {isActive
                        ? AUTOMATION_LABELS.pauseSchedule
                        : AUTOMATION_LABELS.resumeSchedule}
                    </DropdownMenuItem>
                    {onDelete ? (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          className="cursor-pointer"
                          onClick={() => setDeleteDialogOpen(true)}
                        >
                          {AUTOMATION_LABELS.deleteAutomation}
                        </DropdownMenuItem>
                      </>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-border/50 pt-3">
          <Badge
            variant="secondary"
            className="h-6 max-w-full gap-1 px-2 text-[11px] font-normal text-muted-foreground"
            title={scheduleBadgeText}
          >
            <Clock className="h-3 w-3 shrink-0" aria-hidden />
            <span className="truncate">{scheduleBadgeText}</span>
          </Badge>
          {emailAlerts ? (
            <Badge
              variant="outline"
              className="h-6 gap-1 px-2 text-[11px] font-normal text-muted-foreground"
            >
              <Mail className="h-3 w-3 shrink-0" aria-hidden />
              Email alerts
            </Badge>
          ) : null}
        </div>

        <div
          className="mt-auto grid grid-cols-1 divide-y divide-border/50 rounded-lg border border-border/40 bg-muted/15 @md/automation-card:grid-cols-3 @md/automation-card:divide-x @md/automation-card:divide-y-0"
          onClick={stopCardNav}
          onKeyDown={stopCardNav}
        >
          <div className="min-w-0 px-3.5 py-3">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {AUTOMATION_LABELS.scheduleLabel}
            </p>
            <div className="mt-1.5 flex items-center gap-1.5">
              <Switch
                checked={isActive}
                disabled={toggling}
                className="h-5 w-9 shrink-0 [&_[data-slot=switch-thumb]]:size-4 [&_[data-slot=switch-thumb]]:data-[state=checked]:translate-x-4"
                aria-label={
                  isActive ? AUTOMATION_LABELS.pauseSchedule : AUTOMATION_LABELS.resumeSchedule
                }
                onCheckedChange={(checked) => onToggleEnabled(job, checked)}
              />
              <span
                className={cn(
                  "text-xs font-medium leading-none",
                  isActive ? "text-foreground" : "text-amber-800 dark:text-amber-200",
                )}
              >
                {isActive ? AUTOMATION_LABELS.scheduleActive : AUTOMATION_LABELS.pausedBadge}
              </span>
              {toggling ? (
                <Loader2 className="h-3 w-3 shrink-0 animate-spin text-muted-foreground" />
              ) : null}
            </div>
          </div>

          <div className="min-w-0 px-3.5 py-3">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {AUTOMATION_LABELS.lastRunLabel}
            </p>
            <div className="mt-1.5 flex flex-col items-start gap-1">
              <Badge
                variant="outline"
                title={lastRunBadgeText}
                className={cn(
                  "h-auto max-w-full gap-0.5 px-1.5 py-0.5 text-[10px] font-medium",
                  LAST_RUN_BADGE_CLASS[lastRun.tone] ?? LAST_RUN_BADGE_CLASS.muted,
                )}
              >
                {lastRun.tone === "running" ? (
                  <Loader2 className="h-2.5 w-2.5 shrink-0 animate-spin" aria-hidden />
                ) : null}
                {lastRun.tone === "error" ? (
                  <OctagonAlert className="h-2.5 w-2.5 shrink-0" aria-hidden />
                ) : null}
                <span className="truncate">{lastRunBadgeText}</span>
              </Badge>
              {lastRunTrigger ? (
                <span className="text-[10px] leading-snug text-muted-foreground">
                  {lastRunTrigger}
                </span>
              ) : null}
            </div>
          </div>

          <div className="min-w-0 px-3.5 py-3">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {AUTOMATION_LABELS.nextRunLabel}
            </p>
            <p
              className={cn(
                "mt-1.5 text-xs font-semibold leading-snug",
                !isActive ? "text-amber-800 dark:text-amber-200" : "text-foreground",
              )}
            >
              {nextRunDisplay}
            </p>
          </div>
        </div>
      </article>

      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (!open && deleting) return;
          setDeleteDialogOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton={!deleting}>
          <DialogHeader>
            <DialogTitle>{AUTOMATION_LABELS.deleteConfirmTitle}</DialogTitle>
            <DialogDescription>
              {AUTOMATION_LABELS.deleteConfirmDescription}
              {job.name ? (
                <span className="mt-2 block font-medium text-foreground">{job.name}</span>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={deleting}
              onClick={() => setDeleteDialogOpen(false)}
            >
              {AUTOMATION_LABELS.cancel}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting}
              onClick={() => void handleConfirmDelete()}
            >
              {deleting ? <Loader2 className="mr-2 size-4 animate-spin" aria-hidden /> : null}
              {AUTOMATION_LABELS.deleteAutomation}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
