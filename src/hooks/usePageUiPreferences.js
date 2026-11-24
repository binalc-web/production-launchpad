import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { readUiPreferences, validatePreference, writeUiPreferences } from "@/lib/uiPreferences";
import { PERSISTED_UI_DEBOUNCE_MS } from "@/hooks/usePersistedUiState";

/**
 * Multi-field page preferences stored as one JSON blob per scope.
 * @param {string} scope
 * @param {Record<string, object>} schema keyed field definitions
 * @param {{ debouncedKeys?: string[], debounceMs?: number }} [opts]
 * @returns {[Record<string, unknown>, (key: string, value: unknown) => void]}
 */
export function usePageUiPreferences(scope, schema, opts = {}) {
  const { debouncedKeys = [], debounceMs = PERSISTED_UI_DEBOUNCE_MS } = opts;
  const debouncedKeySet = useMemo(() => new Set(debouncedKeys), [debouncedKeys]);
  const schemaRef = useRef(schema);
  schemaRef.current = schema;

  const [prefs, setPrefsState] = useState(() => readUiPreferences(scope, schema));

  const debounceTimersRef = useRef(new Map());

  useEffect(() => {
    setPrefsState(readUiPreferences(scope, schemaRef.current));
  }, [scope]);

  const persistField = useCallback(
    (fieldKey, value) => {
      const fieldSchema = schemaRef.current[fieldKey];
      if (!fieldSchema) return value;
      const validated = validatePreference(value, fieldSchema);

      if (debouncedKeySet.has(fieldKey)) {
        const existing = debounceTimersRef.current.get(fieldKey);
        if (existing) clearTimeout(existing);
        debounceTimersRef.current.set(
          fieldKey,
          setTimeout(() => {
            writeUiPreferences(scope, { [fieldKey]: validated });
            debounceTimersRef.current.delete(fieldKey);
          }, debounceMs),
        );
      } else {
        writeUiPreferences(scope, { [fieldKey]: validated });
      }

      return validated;
    },
    [scope, debouncedKeySet, debounceMs],
  );

  const setPref = useCallback(
    (fieldKey, value) => {
      setPrefsState((prev) => {
        const resolved = typeof value === "function" ? value(prev[fieldKey]) : value;
        const validated = persistField(fieldKey, resolved);
        return { ...prev, [fieldKey]: validated };
      });
    },
    [persistField],
  );

  useEffect(() => {
    const timers = debounceTimersRef.current;
    return () => {
      for (const timer of timers.values()) {
        clearTimeout(timer);
      }
      timers.clear();
    };
  }, []);

  return [prefs, setPref];
}
