import { useState } from "react";
import { addTimelineNote } from "@/api";
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
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export function WriteNoteDialog({ open, onOpenChange, projectId, onSaved }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim() || !body.trim()) return;
    setSaving(true);
    try {
      await addTimelineNote(projectId, { title: title.trim(), body: body.trim() });
      toast.success("Note saved — profiles updating in background");
      setTitle("");
      setBody("");
      onOpenChange(false);
      onSaved?.();
    } catch (err) {
      toast.error(err?.error || "Failed to save note");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Write meeting note</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="note-title">Title</Label>
            <Input id="note-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="First discovery call" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="note-body">Notes</Label>
            <Textarea
              id="note-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              placeholder="Key discussion points, needs, decisions…"
              // Fixed height + scroll: default Textarea uses field-sizing-content and grows unbounded.
              className="max-h-48 min-h-48 overflow-y-auto field-sizing-fixed resize-none"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" onClick={handleSave} disabled={saving || !title.trim() || !body.trim()}>
            {saving ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
            Save to timeline
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
