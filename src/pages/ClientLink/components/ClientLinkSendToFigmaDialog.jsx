import { useEffect, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Names the current preview screen before it is captured and queued for the Figma plugin.
 */
export function ClientLinkSendToFigmaDialog({
  open,
  onOpenChange,
  defaultName,
  route,
  busy,
  onSend,
  downloadBusy,
  onDownload,
}) {
  const [name, setName] = useState(defaultName);
  const anyBusy = busy || downloadBusy;

  useEffect(() => {
    if (open) setName(defaultName);
  }, [open, defaultName]);

  const submit = (e) => {
    e.preventDefault();
    if (anyBusy) return;
    onSend(name.trim() || defaultName);
  };

  return (
    <Dialog open={open} onOpenChange={anyBusy ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Send screen to Figma</DialogTitle>
            <DialogDescription>
              Captures the full page at the current width. In Figma, open the LaunchPad plugin and
              choose <span className="font-medium text-foreground">Import from preview</span> to
              place it as a frame. Or just download the PNG.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-2">
            <Label htmlFor="send-to-figma-name">Frame name</Label>
            <Input
              id="send-to-figma-name"
              value={name}
              maxLength={120}
              autoFocus
              disabled={anyBusy}
              onChange={(e) => setName(e.target.value)}
            />
            {route ? (
              <p className="truncate text-xs text-muted-foreground">Route: {route}</p>
            ) : null}
          </div>
          <DialogFooter className="mt-6 gap-2 sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              disabled={anyBusy}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              {onDownload ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={anyBusy}
                  onClick={() => onDownload(name.trim() || defaultName)}
                >
                  {downloadBusy ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Download className="size-4" />
                  )}
                  {downloadBusy ? "Capturing…" : "Download PNG"}
                </Button>
              ) : null}
              <Button type="submit" disabled={anyBusy}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                {busy ? "Sending…" : "Send to Figma"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
