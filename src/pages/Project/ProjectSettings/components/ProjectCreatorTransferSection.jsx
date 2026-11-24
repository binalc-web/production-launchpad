import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { AlertCircle, Info, UserRoundCog } from "lucide-react";
import { transferProjectCreator } from "@/api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  selectTriggerWrap,
} from "@/components/ui/select";
import {
  PROJECT_CREATOR_TRANSFER_CONFIRM,
  PROJECT_CREATOR_TRANSFER_NEXT_STEPS,
} from "@/constants/projectCreatorTransferGuide";
import { buildProjectSettingsPath } from "@/pages/Project/ProjectSettings/constants";

function creatorLabel(project) {
  const name = project?.createdBy?.name?.trim();
  const email = project?.createdBy?.email?.trim();
  if (name && email) return `${name} (${email})`;
  return name || email || "—";
}

function resolveTransferCreatorErrorMessage(error) {
  const apiMessage =
    (typeof error?.response?.data?.error === "string" && error.response.data.error.trim()) ||
    (typeof error?.error === "string" && error.error.trim()) ||
    "";
  if (apiMessage) return apiMessage;
  if (typeof error?.message === "string" && error.message.trim()) {
    return error.message.trim();
  }
  return "Could not change the project creator. Try again or contact support.";
}

/**
 * Project creator transfer — admin or current project creator only.
 */
export function ProjectCreatorTransferSection({
  project,
  assignedUserEmailTags = [],
  onProjectUpdated,
}) {
  const projectId = project?.id;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [showNextSteps, setShowNextSteps] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const creatorEmail = useMemo(() => {
    const email = project?.createdBy?.email?.trim().toLowerCase();
    return email || "";
  }, [project?.createdBy?.email]);

  const assigneeOptions = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const raw of assignedUserEmailTags) {
      const email = typeof raw === "string" ? raw.trim() : "";
      if (!email) continue;
      const key = email.toLowerCase();
      if (key === creatorEmail || seen.has(key)) continue;
      seen.add(key);
      out.push(email);
    }
    return out;
  }, [assignedUserEmailTags, creatorEmail]);

  const integrationsPath = useMemo(
    () => (projectId ? buildProjectSettingsPath(projectId, "integrations") : "#"),
    [projectId],
  );

  const openDialog = useCallback(() => {
    setSelectedEmail(assigneeOptions[0] ?? "");
    setSubmitError("");
    setDialogOpen(true);
  }, [assigneeOptions]);

  const handleSelectedEmailChange = useCallback((email) => {
    setSelectedEmail(email);
    setSubmitError("");
  }, []);

  const submitTransfer = useCallback(async () => {
    const email = selectedEmail.trim();
    if (!email) {
      setSubmitError("Select an assigned user to become the new creator.");
      return;
    }
    setSaving(true);
    setSubmitError("");
    try {
      await transferProjectCreator(projectId, { newCreatorEmail: email });
      toast.success("Project creator updated.");
      setDialogOpen(false);
      setShowNextSteps(true);
      onProjectUpdated?.();
    } catch (error) {
      const message = resolveTransferCreatorErrorMessage(error);
      setSubmitError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }, [selectedEmail, onProjectUpdated, projectId]);

  return (
    <>
      <Card className="gap-2 border-border py-4 shadow-sm overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 px-4 pb-0">
          <Label className="mb-0">Project creator</Label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="shrink-0"
            onClick={openDialog}
          >
            Change creator
          </Button>
        </CardHeader>
        <CardContent className="space-y-1 px-4 pt-0">
          <p className="text-xs text-muted-foreground">Transfer ownership to an assigned user.</p>
          <p id="project-creator-transfer" className="text-sm text-foreground">
            {creatorLabel(project)}
          </p>

          {showNextSteps ? (
            <Alert className="border-primary/20 bg-primary/5">
              <Info className="size-4 text-primary" />
              <AlertTitle>{PROJECT_CREATOR_TRANSFER_NEXT_STEPS.title}</AlertTitle>
              <AlertDescription className="space-y-3 text-foreground/90">
                <p>{PROJECT_CREATOR_TRANSFER_NEXT_STEPS.description}</p>
                <ol className="list-decimal space-y-2 pl-5 text-sm">
                  {PROJECT_CREATOR_TRANSFER_NEXT_STEPS.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button type="button" size="sm" variant="secondary" asChild>
                    <Link to={integrationsPath}>Open Integrations</Link>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowNextSteps(false)}
                  >
                    Got it
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserRoundCog className="size-4" aria-hidden />
              {PROJECT_CREATOR_TRANSFER_CONFIRM.title}
            </DialogTitle>
            <DialogDescription>{PROJECT_CREATOR_TRANSFER_CONFIRM.description}</DialogDescription>
          </DialogHeader>

          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {PROJECT_CREATOR_TRANSFER_CONFIRM.bullets.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          <div className="space-y-2">
            <Label htmlFor="new-creator-select">New creator</Label>
            {assigneeOptions.length > 0 ? (
              <Select value={selectedEmail} onValueChange={handleSelectedEmailChange}>
                <SelectTrigger
                  id="new-creator-select"
                  className={selectTriggerWrap}
                  aria-invalid={Boolean(submitError)}
                >
                  <SelectValue placeholder="Select an assigned user" />
                </SelectTrigger>
                <SelectContent>
                  {assigneeOptions.map((email) => (
                    <SelectItem key={email} value={email}>
                      {email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="space-y-2 rounded-md border border-dashed border-amber-300/70 bg-amber-50/80 px-3 py-3 text-sm text-amber-950 dark:border-amber-500/40 dark:bg-amber-950/20 dark:text-amber-100">
                <p className="font-medium">No assigned users available</p>
                <p className="text-amber-900/90 dark:text-amber-100/90">
                  Add team members under Assigned users above and save your team changes, then try
                  again.
                </p>
              </div>
            )}
            {submitError ? (
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertTitle>Could not transfer creator</AlertTitle>
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={saving || assigneeOptions.length === 0}
              onClick={() => void submitTransfer()}
            >
              {saving ? "Transferring…" : "Transfer creator"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
