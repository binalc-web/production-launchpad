import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { PERSONA_TABS } from "../constants";
import {
  buildProfileTipTapContent,
  getProfileFieldOptions,
} from "../utils/profileInsertContent";

export function ProfileInsertSheet({ open, onOpenChange, personas, onInsert }) {
  const [personaType, setPersonaType] = useState("client");
  const [selectedIds, setSelectedIds] = useState([]);

  const persona = personas?.[personaType];
  const fieldOptions = useMemo(
    () => getProfileFieldOptions(personaType, persona),
    [personaType, persona],
  );

  useEffect(() => {
    if (!open) return;
    setPersonaType("client");
    setSelectedIds([]);
  }, [open]);

  useEffect(() => {
    setSelectedIds(fieldOptions.filter((f) => f.hasValue).map((f) => f.id));
  }, [personaType, fieldOptions]);

  const toggleField = (id, checked) => {
    setSelectedIds((prev) =>
      checked ? [...new Set([...prev, id])] : prev.filter((x) => x !== id),
    );
  };

  const handleInsert = () => {
    const content = buildProfileTipTapContent(personaType, selectedIds, personas);
    onInsert?.(content);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Insert from profile</SheetTitle>
          <SheetDescription>
            Choose a profile and the fields to insert at the cursor.
          </SheetDescription>
        </SheetHeader>
        <div className="px-4 space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {PERSONA_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setPersonaType(tab.id)}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                  personaType === tab.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background hover:bg-muted/50",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <ul className="space-y-2 max-h-[50vh] overflow-y-auto">
            {fieldOptions.map((field) => (
              <li key={field.id} className="flex items-start gap-2 rounded-lg border px-3 py-2">
                <Checkbox
                  id={`profile-field-${field.id}`}
                  checked={selectedIds.includes(field.id)}
                  onCheckedChange={(c) => toggleField(field.id, Boolean(c))}
                />
                <Label
                  htmlFor={`profile-field-${field.id}`}
                  className="text-sm font-normal leading-snug cursor-pointer"
                >
                  {field.label}
                  {!field.hasValue ? (
                    <span className="block text-xs text-muted-foreground">No data yet</span>
                  ) : null}
                </Label>
              </li>
            ))}
          </ul>
        </div>
        <SheetFooter className="px-4 pb-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleInsert} disabled={!selectedIds.length}>
            Insert
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
