import { useCallback, useEffect, useRef, useState } from "react";
import { readUiPreference, validatePreference, writeUiPreference } from "@/lib/uiPreferences";

const DEFAULT_DEBOUNCE_MS = 150;

/**
 * Drop-in replacement for useState on durable UI choices stored in localStorage.
 * @param {{
 *   scope: string,
 *   key: string,
 *   defaultValue: unknown,
 *   allowed?: readonly unknown[],
 *   type?: "string" | "number" | "boolean",
 *   min?: number,
 *   max?: number,
 *   debounceMs?: number,
 * }} options
 */
export function usePersistedUiState({
  scope,
  key,
  defaultValue,
  allowed,
  type,
  min,
  max,
  debounceMs = 0,
}) {
  const fieldSchema = { defaultValue, allowed, type, min, max };

  const [value, setValueState] = useState(() => readUiPreference(scope, key, fieldSchema));

  const debounceRef = useRef(null);
  const schemaRef = useRef(fieldSchema);
  schemaRef.current = fieldSchema;

  useEffect(() => {
    setValueState(readUiPreference(scope, key, schemaRef.current));
  }, [scope, key]);

  const persist = useCallback(
    (nextValue) => {
      const validated = validatePreference(nextValue, schemaRef.current);
      if (debounceMs > 0) {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
          writeUiPreference(scope, key, validated);
        }, debounceMs);
      } else {
        writeUiPreference(scope, key, validated);
      }
      return validated;
    },
    [scope, key, debounceMs],
  );

  const setValue = useCallback(
    (next) => {
      setValueState((prev) => {
        const resolved = typeof next === "function" ? next(prev) : next;
        return persist(resolved);
      });
    },
    [persist],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return [value, setValue];
}

export { DEFAULT_DEBOUNCE_MS as PERSISTED_UI_DEBOUNCE_MS };
