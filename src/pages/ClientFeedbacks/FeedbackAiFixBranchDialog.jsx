import React, { useEffect, useState } from "react";
import { fetchDeveloperRepoBranches, fetchProjectById } from "@/api";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { devRowsFromStored } from "@/utils/projectMultiRepoForm";
import { isDevRepoFeedbackSource } from "@/lib/feedbackAiFixLabels";

function preferredDevRefFromProject(developmentRepoUrl) {
  const rows = devRowsFromStored(developmentRepoUrl);
  if (rows?.[0]?.ref) return String(rows[0].ref).trim();
  return "";
}

export function FeedbackAiFixBranchDialog({
  open,
  onOpenChange,
  projectId,
  feedbackSource,
  qaSourceBranch,
  onConfirm,
  busy,
}) {
  const [branches, setBranches] = useState([]);
  const [defaultBranch, setDefaultBranch] = useState("main");
  const [sourceBranch, setSourceBranch] = useState("");
  const [targetBranch, setTargetBranch] = useState("main");
  const [loadingBranches, setLoadingBranches] = useState(false);

  const isQa = feedbackSource === "QA_REPORT";
  const picksSourceBranch =
    feedbackSource === "CODE_SNIPPET" ||
    feedbackSource === "SENTRY" ||
    feedbackSource === "VISUAL_TEST";
  const needsBranches = isDevRepoFeedbackSource(feedbackSource);

  useEffect(() => {
    if (!open || !projectId || !needsBranches) return;
    let cancelled = false;
    setLoadingBranches(true);
    void (async () => {
      try {
        const [project, data] = await Promise.all([
          fetchProjectById(projectId).catch(() => null),
          fetchDeveloperRepoBranches(projectId),
        ]);
        if (cancelled) return;
        const list = Array.isArray(data?.branches) ? data.branches : [];
        setBranches(list);
        const scmDefault = data?.defaultBranch || list[0] || "main";
        const configured = preferredDevRefFromProject(project?.developmentRepoUrl);
        const preferred =
          configured && (list.length === 0 || list.includes(configured)) ? configured : scmDefault;
        setDefaultBranch(preferred);
        if (picksSourceBranch) setSourceBranch(preferred);
        setTargetBranch(preferred);
      } finally {
        if (!cancelled) setLoadingBranches(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, projectId, picksSourceBranch, needsBranches]);

  useEffect(() => {
    if (isQa && qaSourceBranch) {
      setSourceBranch(qaSourceBranch);
    }
  }, [isQa, qaSourceBranch, open]);

  if (!needsBranches) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>AI fix branch settings</DialogTitle>
          <DialogDescription>
            Choose which branch to read code from and which branch to open the pull request against.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {picksSourceBranch ? (
            <div className="space-y-2">
              <Label>Read code from</Label>
              <Select
                value={sourceBranch || defaultBranch}
                onValueChange={setSourceBranch}
                disabled={loadingBranches || busy}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {isQa ? (
            <div className="space-y-2">
              <Label>Read code from (QA environment)</Label>
              <p className="rounded-md border border-border/60 bg-muted/20 px-3 py-2 font-mono text-sm">
                {qaSourceBranch || sourceBranch || defaultBranch}
              </p>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label>Create PR Into</Label>
            <Select
              value={targetBranch}
              onValueChange={setTargetBranch}
              disabled={loadingBranches || busy}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select branch" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={busy || loadingBranches}
            onClick={() =>
              onConfirm({
                sourceBranch: picksSourceBranch
                  ? sourceBranch || defaultBranch
                  : qaSourceBranch || sourceBranch,
                targetBranch,
              })
            }
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            Start AI fix
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
