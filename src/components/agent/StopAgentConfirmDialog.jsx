import React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Destructive confirmation before stopping an agent run (Cursor or OpenCode).
 */
export function StopAgentConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  confirming = false,
  title = "Stop agent and discard changes?",
  description,
  confirmLabel = "Stop and discard changes",
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="space-y-2 pt-1 text-left text-muted-foreground">
            {typeof description === "string" ? (
              <span className="block">{description}</span>
            ) : (
              (description ?? (
                <>
                  <span className="block">
                    This will stop the agent immediately. The workspace will be reset to how it was
                    before this run, and any commits on the agent branch may be lost.
                  </span>
                  <span className="block font-medium text-destructive">
                    If the agent pushed a branch, that remote branch may be deleted. This cannot be
                    undone.
                  </span>
                </>
              ))
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-lg transition-all duration-200"
            disabled={confirming}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="rounded-lg transition-all duration-200"
            disabled={confirming}
            onClick={() => void onConfirm?.()}
          >
            {confirming ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Stopping…
              </>
            ) : (
              confirmLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
