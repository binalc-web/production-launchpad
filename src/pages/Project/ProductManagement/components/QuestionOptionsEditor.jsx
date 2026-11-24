import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";

function normalizeOptions(options) {
  return Array.isArray(options) && options.length > 0 ? options.map((s) => String(s ?? "")) : [""];
}

/**
 * Editable list of choice options for singleselect / multiselect questions.
 * Draft rows stay focused while typing; values persist only on Enter, blur
 * outside the editor, or remove — never from a stale in-flight save.
 */
export function QuestionOptionsEditor({
  questionId,
  options = [],
  onChange,
  onPersist,
  onFocusEditing,
  onDoneEditing,
}) {
  const [localOptions, setLocalOptions] = useState(() => normalizeOptions(options));
  const localOptionsRef = useRef(localOptions);
  const focusIndexRef = useRef(null);
  const containerRef = useRef(null);
  const isEditingRef = useRef(false);
  const persistGenRef = useRef(0);

  localOptionsRef.current = localOptions;

  // Sync from parent only when no option input is focused (avoids clobber mid-type).
  useEffect(() => {
    if (isEditingRef.current) return;
    setLocalOptions(normalizeOptions(options));
  }, [options]);

  useEffect(() => {
    const idx = focusIndexRef.current;
    if (idx == null) return;
    const el = document.querySelector(`[data-question-option="${questionId}-${idx}"]`);
    if (el) {
      el.focus();
      focusIndexRef.current = null;
    }
  }, [localOptions.length, questionId]);

  const publishLocal = (next) => {
    localOptionsRef.current = next;
    setLocalOptions(next);
    onChange(next);
  };

  const persistClean = async (raw) => {
    const gen = ++persistGenRef.current;
    const cleaned = raw.map((s) => String(s).trim()).filter(Boolean);
    await onPersist(cleaned);
    // Ignore stale completions — a newer edit/persist may have started.
    if (gen !== persistGenRef.current) return;
    // Keep current drafts (including empties / in-progress text), not the
    // snapshot from when this persist started.
    const latest = localOptionsRef.current;
    const keep = latest.length > 0 ? latest : raw.length > 0 ? raw : [""];
    publishLocal(keep);
  };

  const beginEditing = () => {
    isEditingRef.current = true;
    onFocusEditing?.();
  };

  const endEditingIfLeftEditor = (relatedTarget) => {
    const staying =
      relatedTarget instanceof Node && containerRef.current?.contains(relatedTarget);
    if (staying) return false;
    isEditingRef.current = false;
    onDoneEditing?.();
    return true;
  };

  const updateAt = (index, value) => {
    const next = [...localOptionsRef.current];
    next[index] = value;
    publishLocal(next);
  };

  const removeAt = async (index) => {
    const next = localOptionsRef.current.filter((_, i) => i !== index);
    const withPlaceholder = next.length > 0 ? next : [""];
    publishLocal(withPlaceholder);
    beginEditing();
    try {
      await persistClean(withPlaceholder);
    } finally {
      isEditingRef.current = false;
      onDoneEditing?.();
    }
  };

  const addOption = () => {
    const next = [...localOptionsRef.current, ""];
    focusIndexRef.current = next.length - 1;
    publishLocal(next);
    beginEditing();
  };

  const commitRow = async (index, value, relatedTarget) => {
    const next = [...localOptionsRef.current];
    next[index] = value;
    publishLocal(next);
    try {
      await persistClean(next);
    } finally {
      endEditingIfLeftEditor(relatedTarget);
    }
  };

  return (
    <div ref={containerRef} className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Options</p>
      <ul className="space-y-2">
        {localOptions.map((opt, index) => (
          <li key={`${questionId}-opt-${index}`} className="flex gap-2 items-center">
            <Input
              data-question-option={`${questionId}-${index}`}
              value={opt}
              placeholder={`Option ${index + 1}`}
              onFocus={() => beginEditing()}
              onChange={(e) => updateAt(index, e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
                e.preventDefault();
                e.currentTarget.blur();
              }}
              onBlur={(e) => {
                void commitRow(index, e.target.value, e.relatedTarget);
              }}
              className="text-sm w-full"
              aria-label={`Option ${index + 1}`}
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-8 shrink-0 text-destructive"
              onMouseDown={(e) => {
                // Keep focus handling predictable; click still runs removeAt.
                e.preventDefault();
              }}
              onClick={() => removeAt(index)}
              disabled={localOptions.length <= 1 && !String(opt).trim()}
              aria-label={`Remove option ${index + 1}`}
            >
              <Trash2 className="size-4" />
            </Button>
          </li>
        ))}
      </ul>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onMouseDown={(e) => {
          // Prevent the active option input from blurring before addOption runs,
          // which used to start a stale persist that wiped the new draft row.
          e.preventDefault();
        }}
        onClick={addOption}
      >
        <Plus className="size-3.5 mr-1.5" />
        Add option
      </Button>
    </div>
  );
}
