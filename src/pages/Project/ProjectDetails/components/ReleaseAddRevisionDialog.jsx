import {
  createEmptyReactRevision,
  seedReleaseFromPrior,
  startFirstRevisionFromPrompt,
  uploadToRelease,
} from "@/api";
import { ReleaseSuggestionContextPanel } from "@/components/ReleaseSuggestions/ReleaseSuggestionContextPanel";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { RELEASE_LIFECYCLE } from "@/constants/releaseLifecycleGuide";
import { useReleaseSuggestionContext } from "@/hooks/useReleaseSuggestionContext";
import { getLatestPriorBaseline, normalizeReleaseStatus } from "@/lib/releaseLifecycle";
import { cn, formatProjectVersionLabel } from "@/lib/utils";
import { FileArchive, GitBranch, Sparkles, Upload } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

const COPY = RELEASE_LIFECYCLE.addRevision;

// Module scope so the guard survives the dialog unmounting while the copy request is still running.
const baselineCopiesInFlight = new Set();

function RevisionModeOption({ selected, onClick, disabled, icon: Icon, title, description }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-3 rounded-lg border px-3 py-3 text-left transition-all duration-200",
        selected
          ? "border-primary bg-primary/5 ring-1 ring-primary/30"
          : "border-border bg-card hover:border-slate-300 hover:bg-muted/40",
        disabled && "cursor-not-allowed opacity-50 hover:border-border hover:bg-card",
      )}
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-md",
          selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium leading-snug text-foreground">{title}</span>
        {description ? (
          <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
            {description}
          </span>
        ) : null}
      </span>
    </button>
  );
}

export function ReleaseAddRevisionDialog({
  open,
  onOpenChange,
  release,
  releases = [],
  project,
  projectId,
  jiraEpicsStoriesReady = false,
  onCompleted,
  onAgentStarted,
}) {
  const [mode, setMode] = useState("upload");
  const [submitting, setSubmitting] = useState(false);
  const [busyAction, setBusyAction] = useState(null);
  const [agentPrompt, setAgentPrompt] = useState("");
  const [firstPromptOpen, setFirstPromptOpen] = useState(false);
  const [firstPrompt, setFirstPrompt] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragActive, setIsDragActive] = useState(false);
  const uploadFileInputRef = useRef(null);

  const status = release ? normalizeReleaseStatus(release) : "draft";
  const isLocked = status === "locked";
  const isDraft = status === "draft";
  const isActive = status === "active";

  const prior = useMemo(
    () => (release ? getLatestPriorBaseline(releases, { excludeReleaseId: release.id }) : null),
    [releases, release?.id],
  );

  const hubProjectId = project?.projectId != null ? String(project.projectId).trim() : null;

  const suggestionCtx = useReleaseSuggestionContext({
    platformProjectId: projectId,
    hubProjectId: hubProjectId || null,
    isActive: open && mode === "agent",
    resetScopeKey: projectId,
    jiraBacklogEnabled: jiraEpicsStoriesReady,
    repoScanEnabled: false,
  });

  const resetUpload = useCallback(() => {
    setUploadFile(null);
    setUploadProgress(0);
    if (uploadFileInputRef.current) uploadFileInputRef.current.value = "";
  }, []);

  const handleClose = useCallback(
    (nextOpen) => {
      if (submitting) return;
      onOpenChange(nextOpen);
      if (!nextOpen) {
        setMode("upload");
        setAgentPrompt("");
        setFirstPromptOpen(false);
        setFirstPrompt("");
        setBusyAction(null);
        resetUpload();
      }
    },
    [submitting, onOpenChange, resetUpload],
  );

  const validateAndSetFile = (file) => {
    if (!file) return;
    if (!file.name.endsWith(".zip")) {
      toast.error("Please select a ZIP file");
      return;
    }
    if (file.size > 500 * 1024 * 1024) {
      toast.error("File size must be less than 500MB");
      return;
    }
    setUploadFile(file);
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!release?.id || !uploadFile) return;
    try {
      setSubmitting(true);
      setBusyAction("upload");
      setUploadProgress(0);
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => (prev >= 90 ? prev : prev + 10));
      }, 500);
      const result = await uploadToRelease(String(release.id), uploadFile);
      clearInterval(progressInterval);
      setUploadProgress(100);
      toast.success(
        result?.message || `ZIP uploaded. Revision: ${formatProjectVersionLabel(result?.version)}.`,
      );
      handleClose(false);
      await onCompleted?.();
    } catch (err) {
      toast.error(err?.error || err?.message || "Upload failed");
    } finally {
      setSubmitting(false);
      setBusyAction(null);
    }
  };

  const handleBaselineCopy = async () => {
    if (!release?.id || !isActive || !prior) return;
    const releaseKey = String(release.id);
    if (baselineCopiesInFlight.has(releaseKey)) {
      toast.info(COPY.baselineAlreadyRunning);
      handleClose(false);
      return;
    }
    baselineCopiesInFlight.add(releaseKey);
    const toastId = toast.loading(
      COPY.baselineInProgress(
        prior.priorReleaseName,
        formatProjectVersionLabel(prior.baselineVersionLabel),
        release.name,
      ),
    );
    handleClose(false);
    try {
      const result = await seedReleaseFromPrior(projectId, release.id, {
        mode: "baseline_copy",
      });
      const label = result?.versionLabel || result?.version;
      toast.success(
        result?.message ||
          (label
            ? `Baseline copied. Revision ${formatProjectVersionLabel(label)} is building.`
            : "Baseline copied. A new revision is building."),
        { id: toastId },
      );
      await onCompleted?.();
    } catch (err) {
      toast.error(err?.error || err?.message || "Could not copy baseline", { id: toastId });
    } finally {
      baselineCopiesInFlight.delete(releaseKey);
    }
  };

  const handleAgentSubmit = async () => {
    if (!release?.id || !isActive || !prior) return;
    const prompt = agentPrompt.trim();
    if (!prompt) {
      toast.error(COPY.agentPromptRequired);
      return;
    }
    try {
      setSubmitting(true);
      const suggestionBody = suggestionCtx.buildSuggestionRequestBody?.() ?? {};
      const data = await seedReleaseFromPrior(projectId, release.id, {
        mode: "agent",
        promptText: prompt,
        selectedJiraIssues: suggestionBody.selectedJiraIssues ?? [],
      });
      const agentId = data?.agentId;
      if (agentId) {
        onAgentStarted?.({ releaseId: release.id, agentId });
      }
      toast.success("Agent started. Revision will publish when the run completes.");
      handleClose(false);
      await onCompleted?.();
    } catch (err) {
      toast.error(err?.error || err?.message || "Could not start agent");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFirstPromptSubmit = async () => {
    if (!release?.id || !isActive) return;
    const prompt = firstPrompt.trim();
    if (!prompt) {
      toast.error(COPY.startWithPromptRequired);
      return;
    }
    try {
      setSubmitting(true);
      setBusyAction("prompt");
      const data = await startFirstRevisionFromPrompt(projectId, release.id, prompt);
      const agentId = data?.agentId;
      if (agentId) {
        onAgentStarted?.({ releaseId: release.id, agentId });
      }
      toast.success("Agent started. Revision will publish when the run completes.");
      handleClose(false);
      await onCompleted?.();
    } catch (err) {
      toast.error(err?.error || err?.message || "Could not start agent");
    } finally {
      setSubmitting(false);
      setBusyAction(null);
    }
  };

  const handleEmptyReact = async () => {
    if (!release?.id) return;
    try {
      setSubmitting(true);
      setBusyAction("empty");
      const result = await createEmptyReactRevision(projectId, release.id);
      toast.success(
        result?.message ||
          `Empty React project created. Revision: ${formatProjectVersionLabel(result?.version)}.`,
      );
      handleClose(false);
      await onCompleted?.();
    } catch (err) {
      toast.error(err?.error || err?.message || "Could not create the empty React project");
    } finally {
      setSubmitting(false);
      setBusyAction(null);
    }
  };

  if (!release) return null;

  const isFirstRevision =
    !prior && (!Array.isArray(release.versions) || release.versions.length === 0);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{COPY.dialogTitle}</DialogTitle>
          <DialogDescription>
            Release <span className="font-medium text-foreground">{release.name}</span>
          </DialogDescription>
        </DialogHeader>

        {isLocked ? (
          <Alert variant="destructive">
            <AlertDescription>{COPY.lockedBlocker}</AlertDescription>
          </Alert>
        ) : null}

        {isDraft && !isLocked ? (
          <Alert>
            <AlertDescription>{COPY.draftBlocker}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-col gap-2" role="radiogroup" aria-label="How to add a revision">
          <RevisionModeOption
            selected={mode === "upload"}
            onClick={() => setMode("upload")}
            disabled={isLocked}
            icon={Upload}
            title={COPY.upload}
            description={COPY.uploadOptionHint}
          />
          {prior ? (
            <>
              <RevisionModeOption
                selected={mode === "baseline"}
                onClick={() => setMode("baseline")}
                disabled={isLocked || isDraft}
                icon={GitBranch}
                title={COPY.baselineCopy}
                description={COPY.baselineCopyOptionHint}
              />
              <RevisionModeOption
                selected={mode === "agent"}
                onClick={() => setMode("agent")}
                disabled={isLocked || isDraft}
                icon={Sparkles}
                title={COPY.agent}
                description={COPY.agentOptionHint}
              />
            </>
          ) : null}
        </div>

        {isFirstRevision && !isLocked ? (
          <p className="text-xs text-muted-foreground">{COPY.noPrior}</p>
        ) : null}

        {mode === "upload" && !isLocked ? (
          <form onSubmit={handleUploadSubmit} className="space-y-4">
            <input
              ref={uploadFileInputRef}
              type="file"
              accept=".zip,application/zip"
              className="sr-only"
              onChange={(e) => validateAndSetFile(e.target.files?.[0])}
            />
            <label
              className={`flex min-h-[120px] cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 text-center text-sm transition-colors ${
                isDragActive ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragActive(true);
              }}
              onDragLeave={() => setIsDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragActive(false);
                validateAndSetFile(e.dataTransfer.files?.[0]);
              }}
              onClick={() => uploadFileInputRef.current?.click()}
            >
              {uploadFile ? (
                <>
                  <FileArchive className="size-8 text-primary" />
                  <span className="font-medium">{uploadFile.name}</span>
                </>
              ) : (
                <>
                  <Upload className="size-8 text-muted-foreground" />
                  <span>{COPY.dropzone}</span>
                  <span className="text-xs text-muted-foreground">{COPY.dropzoneHint}</span>
                </>
              )}
            </label>
            {isFirstRevision ? (
              <div className="space-y-3 rounded-lg border bg-muted/30 px-3 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{COPY.firstRevisionHeading}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {COPY.firstRevisionBody}
                  </p>
                </div>
                {firstPromptOpen ? (
                  <div className="space-y-2">
                    <Label htmlFor="first-revision-prompt">{COPY.startWithPromptLabel}</Label>
                    <Textarea
                      id="first-revision-prompt"
                      rows={4}
                      value={firstPrompt}
                      onChange={(e) => setFirstPrompt(e.target.value)}
                      placeholder={COPY.startWithPromptPlaceholder}
                      disabled={submitting}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void handleFirstPromptSubmit()}
                      disabled={submitting || !isActive || !firstPrompt.trim()}
                    >
                      {busyAction === "prompt" ? (
                        <>
                          <Spinner className="size-4" /> {COPY.startWithPromptSubmitting}
                        </>
                      ) : (
                        COPY.startWithPromptAction
                      )}
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setFirstPromptOpen(true)}
                    disabled={submitting}
                  >
                    {COPY.startWithPrompt}
                  </Button>
                )}
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">{COPY.emptyReactHint}</p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void handleEmptyReact()}
                    disabled={submitting}
                  >
                    {busyAction === "empty" ? (
                      <>
                        <Spinner className="size-4" /> {COPY.emptyReactSubmitting}
                      </>
                    ) : (
                      COPY.emptyReactAction
                    )}
                  </Button>
                </div>
              </div>
            ) : null}
            {uploadingProgressBar(uploadProgress, submitting)}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleClose(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || !uploadFile}>
                {busyAction === "upload" ? (
                  <>
                    <Spinner className="size-4" /> Uploading…
                  </>
                ) : (
                  COPY.upload
                )}
              </Button>
            </DialogFooter>
          </form>
        ) : null}

        {mode === "baseline" && prior && !isLocked ? (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">{COPY.baselineCopyHint}</p>
            <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm font-medium">
              {COPY.priorLabel(
                prior.priorReleaseName,
                formatProjectVersionLabel(prior.baselineVersionLabel),
              )}
            </p>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleClose(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => void handleBaselineCopy()}
                disabled={submitting || !isActive}
              >
                {submitting ? (
                  <>
                    <Spinner className="size-4" /> {COPY.baselineSubmitting}
                  </>
                ) : (
                  COPY.baselineCopy
                )}
              </Button>
            </DialogFooter>
          </div>
        ) : null}

        {mode === "agent" && prior && !isLocked ? (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">{COPY.agentHint}</p>
            <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm font-medium">
              {COPY.priorLabel(
                prior.priorReleaseName,
                formatProjectVersionLabel(prior.baselineVersionLabel),
              )}
            </p>
            <div className="space-y-2">
              <Label htmlFor="seed-agent-prompt">Instructions</Label>
              <Textarea
                id="seed-agent-prompt"
                rows={4}
                value={agentPrompt}
                onChange={(e) => setAgentPrompt(e.target.value)}
                placeholder={COPY.agentPromptPlaceholder}
                disabled={submitting}
              />
            </div>
            {jiraEpicsStoriesReady ? (
              <ReleaseSuggestionContextPanel
                sourcesLoading={suggestionCtx.sourcesLoading}
                meetingNotes={suggestionCtx.meetingNotes}
                jiraBacklog={suggestionCtx.jiraBacklog}
              />
            ) : null}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleClose(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => void handleAgentSubmit()}
                disabled={submitting || !isActive}
              >
                {submitting ? (
                  <>
                    <Spinner className="size-4" /> {COPY.agentSubmitting}
                  </>
                ) : (
                  COPY.agent
                )}
              </Button>
            </DialogFooter>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function uploadingProgressBar(progress, uploading) {
  if (!uploading || progress <= 0) return null;
  return <div className="text-xs text-muted-foreground">Uploading… {progress}%</div>;
}
