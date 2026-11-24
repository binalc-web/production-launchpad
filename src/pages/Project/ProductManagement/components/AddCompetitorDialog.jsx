import { useState } from "react";
import { addCompetitorFromWebsite } from "@/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export function AddCompetitorDialog({ open, onOpenChange, projectId, onAdded }) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!url.trim()) return;
    setLoading(true);
    try {
      await addCompetitorFromWebsite(projectId, { url: url.trim() });
      toast.success("Scanning the website in the background. You can keep working.");
      setUrl("");
      onOpenChange(false);
      await onAdded?.();
    } catch (err) {
      toast.error(err?.error || "Failed to scan website");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add competitor by website</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="competitor-url">Website URL</Label>
          <Input
            id="competitor-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://competitor.com"
            type="url"
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={loading || !url.trim()}>
            {loading ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
            Scan &amp; add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
