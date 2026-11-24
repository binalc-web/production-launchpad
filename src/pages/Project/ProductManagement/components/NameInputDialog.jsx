import { useEffect, useState } from "react";
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

export function NameInputDialog({
  open,
  onOpenChange,
  dialogTitle,
  label,
  defaultValue = "",
  submitLabel = "Create",
  onSubmit,
  validateName,
}) {
  const [name, setName] = useState(defaultValue);
  const [loading, setLoading] = useState(false);
  const validationError = validateName?.(name) || null;

  useEffect(() => {
    if (open) setName(defaultValue);
  }, [open, defaultValue]);

  const handleSubmit = async () => {
    if (!name.trim() || validationError) return;
    setLoading(true);
    try {
      await onSubmit(name.trim());
      setName("");
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && name.trim() && !loading && !validationError) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="name-input">{label}</Label>
          <Input
            id="name-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            autoFocus
            aria-invalid={!!validationError}
          />
          {validationError ? (
            <p className="text-xs text-destructive">{validationError}</p>
          ) : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={loading || !name.trim() || !!validationError}>
            {loading ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
