// Console Capture Service - keep recent host-page console output for bug reports.
// Keep the buffer shape in sync with public/launchpad-feedback-shim.source.js, which may install it first.

const GLOBAL_KEY = "__launchpadConsoleLogs";
const MAX_ENTRIES = 100;
const MAX_MESSAGE_CHARS = 1000;
const LEVELS = ["log", "info", "warn", "error", "debug"];
const OWN_PREFIXES = ["[Launchpad feedback]", "[feedback-widget]"];

function stringifyArg(arg) {
  if (typeof arg === "string") return arg;
  if (arg instanceof Error) return arg.stack || `${arg.name}: ${arg.message}`;
  try {
    return JSON.stringify(arg);
  } catch {
    return String(arg);
  }
}

function getBuffer() {
  if (typeof window === "undefined") return null;
  const existing = window[GLOBAL_KEY];
  if (existing && Array.isArray(existing.entries)) return existing;
  const buffer = { entries: [], installed: false };
  window[GLOBAL_KEY] = buffer;
  return buffer;
}

function push(buffer, level, args) {
  const message = Array.prototype.map
    .call(args, stringifyArg)
    .join(" ")
    .slice(0, MAX_MESSAGE_CHARS);
  if (!message || OWN_PREFIXES.some((p) => message.startsWith(p))) return;
  buffer.entries.push({ level, message, ts: new Date().toISOString() });
  if (buffer.entries.length > MAX_ENTRIES)
    buffer.entries.splice(0, buffer.entries.length - MAX_ENTRIES);
}

/** Idempotent: wraps console methods and window error events once per page. */
export function installConsoleCapture() {
  const buffer = getBuffer();
  if (!buffer || buffer.installed) return;
  buffer.installed = true;

  LEVELS.forEach((level) => {
    const original = console[level];
    if (typeof original !== "function") return;
    console[level] = function (...args) {
      try {
        push(buffer, level, args);
      } catch {
        // never break the host page's logging
      }
      return original.apply(this, args);
    };
  });

  window.addEventListener("error", (event) => {
    const where = event.filename ? ` (${event.filename}:${event.lineno}:${event.colno})` : "";
    push(buffer, "error", [`Uncaught ${event.error?.stack || event.message || "error"}${where}`]);
  });
  window.addEventListener("unhandledrejection", (event) => {
    push(buffer, "error", ["Unhandled promise rejection:", event.reason]);
  });
}

/** Snapshot of captured entries, oldest first. */
export function getCapturedConsoleLogs() {
  const buffer = getBuffer();
  return buffer ? buffer.entries.slice(-MAX_ENTRIES) : [];
}
