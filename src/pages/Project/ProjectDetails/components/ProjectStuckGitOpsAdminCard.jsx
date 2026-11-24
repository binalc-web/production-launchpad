import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { failStuckDevRepoGitOps } from "@/api";

/**
 * Admin recovery card: clear stuck git locks (active/queued DevRepoGitOperation rows).
 */
export function ProjectStuckGitOpsAdminCard({ project }) {
  const projectId = project?.id;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [clearing, setClearing] = useState(false);

  /** Call the fail-stuck admin API and toast the result. */
  const clearStuckGitOps = async () => {
    if (!projectId) return;
    setClearing(true);
    try {
      const data = await failStuckDevRepoGitOps(projectId);
      toast.success(data?.message || "Stuck git operations cleared.");
      setDialogOpen(false);
    } catch (error) {
      toast.error(error?.message || "Could not clear stuck git operations.");
    } finally {
      setClearing(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-3">
          <div>
            <CardTitle className="text-base">Stuck git locks</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Clears git locks stuck as active or queued so work can continue.
            </p>
          </div>
          <Button type="button" size="sm" variant="destructive" onClick={() => setDialogOpen(true)}>
            Clear stuck locks
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Use when an agent did not finish and Backend Code, deploy, or other git work stays
            blocked.
          </p>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Clear stuck git locks?</DialogTitle>
            <DialogDescription>
              This marks active and queued git operations for this project as failed so new work can
              start. Linked Cursor agents are stopped when possible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void clearStuckGitOps()}
              disabled={clearing}
            >
              {clearing ? "Clearing…" : "Clear stuck locks"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
