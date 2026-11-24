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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

const LAYER_OPTIONS = [
  { value: "backend", label: "Backend" },
  { value: "frontend", label: "Frontend" },
  { value: "shared", label: "Shared (backend + frontend)" },
  { value: "infrastructure", label: "Infrastructure" },
];

const ENV_KEY_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * Dialog to add a deploy environment variable manually (written to repo on deploy).
 */
export function AddEnvironmentVariableDialog({
  open,
  onOpenChange,
  environmentId,
  environmentName,
  onSubmit,
  saving,
}) {
  const [label, setLabel] = useState("");
  const [envKey, setEnvKey] = useState("");
  const [description, setDescription] = useState("");
  const [layer, setLayer] = useState("backend");
  const [value, setValue] = useState("");

  useEffect(() => {
    if (!open) {
      setLabel("");
      setEnvKey("");
      setDescription("");
      setLayer("backend");
      setValue("");
    }
  }, [open]);

  const trimmedKey = envKey.trim();
  const keyValid = !trimmedKey || ENV_KEY_RE.test(trimmedKey);
  const canSubmit = label.trim().length > 0 && trimmedKey.length > 0 && keyValid && environmentId;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      label: label.trim(),
      envKey: trimmedKey,
      description: description.trim(),
      layer,
      environmentId,
      ...(value.trim() ? { value: value.trim() } : {}),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add environment variable</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Add a variable the scan missed. It is saved for deploy and written to your repository when
          you deploy
          {environmentName ? ` to ${environmentName}` : ""}.
        </p>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="manual-var-label">Display name</Label>
            <Input
              id="manual-var-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Slack app client secret"
              disabled={saving}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="manual-var-key">Variable name</Label>
            <Input
              id="manual-var-key"
              value={envKey}
              onChange={(e) => setEnvKey(e.target.value.toUpperCase())}
              placeholder="SLACK_CLIENT_SECRET"
              className="font-mono text-xs"
              disabled={saving}
            />
            {!keyValid ? (
              <p className="text-xs text-destructive">
                Use letters, numbers, and underscores only.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Same name as in your .env file (e.g. SLACK_CLIENT_ID).
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="manual-var-layer">Used by</Label>
            <Select value={layer} onValueChange={setLayer} disabled={saving}>
              <SelectTrigger id="manual-var-layer">
                <SelectValue placeholder="Choose layer" />
              </SelectTrigger>
              <SelectContent>
                {LAYER_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="manual-var-description">
              Description <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="manual-var-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this value is for"
              disabled={saving}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="manual-var-value">
              Value <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="manual-var-value"
              type="password"
              autoComplete="off"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Paste value now or add later"
              className="font-mono text-xs"
              disabled={saving}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit || saving}
            className="gap-2"
          >
            {saving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            Add variable
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
