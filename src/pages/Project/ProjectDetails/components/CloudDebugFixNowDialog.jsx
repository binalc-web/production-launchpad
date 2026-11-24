import { useEffect, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Loader2, Wrench } from "lucide-react";

/**
 * Confirms a cloud-debug Fix now handoff and collects optional extra instructions + base branch.
 */
export function CloudDebugFixNowDialog({
  open,
  onOpenChange,
  fixActionLabel = "Fix",
  onConfirm,
  submitting = false,
  defaultBaseBranch = "",
}) {
  const [additionalPrompt, setAdditionalPrompt] = useState("");
  const [baseBranch, setBaseBranch] = useState("");

  useEffect(() => {
    if (!open) return;
    setAdditionalPrompt("");
    setBaseBranch(typeof defaultBaseBranch === "string" ? defaultBaseBranch : "");
  }, [open, defaultBaseBranch]);

  const handleConfirm = () => {
    if (submitting) return;
    onConfirm?.({
      additionalPrompt: additionalPrompt.trim(),
      baseBranch: baseBranch.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Start fix</DialogTitle>
          <DialogDescription>
            {fixActionLabel} — opens the Backend Code agent with the diagnosis from this chat.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cloud-debug-fix-base-branch">Base branch</Label>
            <Input
              id="cloud-debug-fix-base-branch"
              value={baseBranch}
              onChange={(e) => setBaseBranch(e.target.value)}
              placeholder="main (project default)"
              disabled={submitting}
              autoComplete="off"
              spellCheck={false}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Clone and merge/PR target for Fix + merge / Fix + PR / Fix + merge + deploy.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cloud-debug-fix-additional-prompt">
              Additional instructions (optional)
            </Label>
            <Textarea
              id="cloud-debug-fix-additional-prompt"
              value={additionalPrompt}
              onChange={(e) => setAdditionalPrompt(e.target.value)}
              placeholder="e.g. Focus on the auth middleware change only…"
              rows={4}
              className="resize-y text-sm min-h-[96px]"
              disabled={submitting}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleConfirm();
                }
              }}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={submitting}>
            {submitting ? (
              <Loader2 className="size-4 mr-2 animate-spin" />
            ) : (
              <Wrench className="size-4 mr-2" />
            )}
            Start
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
