import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "lp-color-scheme";

function readStoredScheme() {
  if (typeof window === "undefined") return "light";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "dark" || stored === "light") return stored;
  } catch {
    /* ignore */
  }
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function applyScheme(scheme) {
  const dark = scheme === "dark";
  document.documentElement.classList.toggle("dark", dark);
  try {
    window.localStorage.setItem(STORAGE_KEY, scheme);
  } catch {
    /* ignore */
  }
}

/**
 * App-wide light/dark via `document.documentElement.classList` + localStorage.
 */
export function useDocumentTheme() {
  const [scheme, setScheme] = useState(readStoredScheme);

  useEffect(() => {
    applyScheme(scheme);
  }, [scheme]);

  useEffect(() => {
    const el = document.documentElement;
    const obs = new MutationObserver(() => {
      const next = el.classList.contains("dark") ? "dark" : "light";
      setScheme((prev) => (prev === next ? prev : next));
    });
    obs.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  const toggleTheme = useCallback(() => {
    setScheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  return {
    isDark: scheme === "dark",
    scheme,
    setScheme,
    toggleTheme,
  };
}
