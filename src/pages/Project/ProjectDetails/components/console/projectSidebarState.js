import { useEffect, useState } from "react";

export const SIDEBAR_OPEN_STORAGE_KEY = "lp-project-sidebar-open";

/** Switcher trigger horizontal inset (`px-3`) — aligns dropdown with sidebar edge. */
export const PROJECT_CONSOLE_SWITCHER_INSET_PX = 12;

function prefersMobileConsoleLayout() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 1023px)").matches;
}

export function readSidebarOpen(defaultOpen = true) {
  if (typeof window === "undefined") return defaultOpen;
  try {
    const raw = window.localStorage.getItem(SIDEBAR_OPEN_STORAGE_KEY);
    if (raw === "0" || raw === "false") return false;
    if (raw === "1" || raw === "true") return true;
  } catch {
    /* ignore */
  }
  if (prefersMobileConsoleLayout()) return false;
  return defaultOpen;
}

export function writeSidebarOpen(open) {
  try {
    window.localStorage.setItem(SIDEBAR_OPEN_STORAGE_KEY, open ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export function useProjectSidebarOpen(defaultOpen = true) {
  const [open, setOpen] = useState(() => readSidebarOpen(defaultOpen));

  useEffect(() => {
    writeSidebarOpen(open);
  }, [open]);

  return [open, setOpen];
}
