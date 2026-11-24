import { useState } from "react";
import { enrichClientDetails } from "@/api";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

function enrichErrorMessage(err) {
  const msg = err?.error || "Enrich failed";
  if (msg.includes("updating from new capture") || msg.includes("Profiles are updating")) {
    return "Profiles are updating from new capture — try again shortly.";
  }
  return msg;
}

export function WebsiteEnrichDialog({ open, onOpenChange, projectId, onSaved }) {
  const [url, setUrl] = useState("");
  const [scope, setScope] = useState("company");
  const [enriching, setEnriching] = useState(false);

  const handleEnrich = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setEnriching(true);
    try {
      await enrichClientDetails(projectId, {
        socials: { website: trimmed },
        scope,
      });
      toast.success("Website enriched — added to timeline");
      setUrl("");
      onOpenChange(false);
      onSaved?.();
    } catch (err) {
      toast.error(enrichErrorMessage(err));
    } finally {
      setEnriching(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Enrich from website</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="website-url">Website URL</Label>
            <Input
              id="website-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://acme.com"
            />
          </div>
          <div className="space-y-1">
            <Label>Profile</Label>
            <Select value={scope} onValueChange={setScope}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="company">Company</SelectItem>
                <SelectItem value="client">Client</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleEnrich} disabled={enriching || !url.trim()}>
            {enriching ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
            Enrich
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
