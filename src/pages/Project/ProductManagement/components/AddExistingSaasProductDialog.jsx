import { useState } from "react";
import { addExistingSaasProductFromWebsite } from "@/api";
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

export function AddExistingSaasProductDialog({
  open,
  onOpenChange,
  projectId,
  onAdded,
}) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!url.trim()) return;
    setLoading(true);
    try {
      await addExistingSaasProductFromWebsite(projectId, { url: url.trim() });
      toast.success("Existing SaaS product added from website");
      setUrl("");
      onOpenChange(false);
      await onAdded?.();
    } catch (err) {
      toast.error(err?.error || "Failed to scan product website");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add existing SaaS product by website</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="existing-saas-product-url">Product page URL</Label>
          <Input
            id="existing-saas-product-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://company.com/products/analytics"
            type="url"
          />
          <p className="text-xs text-muted-foreground">
            Paste the product or solution page if auto-detect did not find it.
          </p>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !url.trim()}
          >
            {loading ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
            Scan &amp; add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
