import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

/** Local draft value while focused; persists to server on blur. */
export function useBlurredField({ entityId, serverValue, onSave, saveErrorMessage }) {
  const [value, setValue] = useState(serverValue);
  const savedRef = useRef(serverValue);
  const focusedRef = useRef(false);
  const entityIdRef = useRef(entityId);
  const valueRef = useRef(serverValue);
  const onSaveRef = useRef(onSave);
  valueRef.current = value;
  onSaveRef.current = onSave;

  useEffect(() => {
    if (entityIdRef.current !== entityId) {
      entityIdRef.current = entityId;
      savedRef.current = serverValue;
      setValue(serverValue);
      focusedRef.current = false;
      return;
    }
    if (!focusedRef.current) {
      savedRef.current = serverValue;
      setValue(serverValue);
    }
  }, [entityId, serverValue]);

  const persistIfDirty = useCallback(async () => {
    if (valueRef.current === savedRef.current) return;
    const next = valueRef.current;
    savedRef.current = next;
    try {
      await onSaveRef.current(next);
    } catch (err) {
      savedRef.current = serverValue;
      setValue(serverValue);
      toast.error(typeof err?.error === "string" ? err.error : saveErrorMessage);
    }
  }, [saveErrorMessage, serverValue]);

  useEffect(() => {
    return () => {
      if (valueRef.current === savedRef.current) return;
      const next = valueRef.current;
      savedRef.current = next;
      void onSaveRef.current(next);
    };
  }, [entityId]);

  return {
    value,
    onChange: (e) => setValue(e.target.value),
    onFocus: () => {
      focusedRef.current = true;
    },
    onBlur: () => {
      focusedRef.current = false;
      void persistIfDirty();
    },
    /** Apply AI or external updates without waiting for server round-trip. */
    syncValue: (next) => {
      const text = next == null ? "" : String(next);
      savedRef.current = text;
      setValue(text);
    },
  };
}
