(function (w, d) {
  if (w.__LaunchpadFeedbackShim) return;
  w.__LaunchpadFeedbackShim = 1;
  // Early console capture for bug reports; same buffer shape as consoleCapture.service.js.
  (function () {
    var buf = w.__launchpadConsoleLogs;
    if (buf && buf.installed) return;
    buf = w.__launchpadConsoleLogs = { entries: (buf && buf.entries) || [], installed: true };
    function str(a) {
      if (typeof a == "string") return a;
      if (a instanceof Error) return a.stack || a.name + ": " + a.message;
      try {
        return JSON.stringify(a);
      } catch (e) {
        return String(a);
      }
    }
    function push(level, args) {
      try {
        var m = Array.prototype.map.call(args, str).join(" ").slice(0, 1000);
        if (!m || m.indexOf("[Launchpad feedback]") === 0 || m.indexOf("[feedback-widget]") === 0)
          return;
        buf.entries.push({ level: level, message: m, ts: new Date().toISOString() });
        if (buf.entries.length > 100) buf.entries.splice(0, buf.entries.length - 100);
      } catch (e) {}
    }
    if (typeof console == "undefined") return;
    ["log", "info", "warn", "error", "debug"].forEach(function (level) {
      var orig = console[level];
      if (typeof orig != "function") return;
      console[level] = function () {
        push(level, arguments);
        return orig.apply(this, arguments);
      };
    });
    w.addEventListener &&
      w.addEventListener("error", function (e) {
        var where = e.filename ? " (" + e.filename + ":" + e.lineno + ":" + e.colno + ")" : "";
        push("error", ["Uncaught " + ((e.error && e.error.stack) || e.message || "error") + where]);
      });
    w.addEventListener &&
      w.addEventListener("unhandledrejection", function (e) {
        push("error", ["Unhandled promise rejection:", e.reason]);
      });
  })();
  var C = w.launchpadFeedbackConfig || w.LaunchpadFeedbackConfig || {},
    project = String(C.project != null ? C.project : C.projectId || "").trim(),
    source = String(C.source || "snippet").trim(),
    apiBase = "http://localhost:5000".replace(/\/$/, ""),
    widgetBase = "";
  function trim(u) {
    return String(u || "")
      .trim()
      .replace(/\/$/, "");
  }
  try {
    var cs = d.currentScript;
    if (cs && cs.src) widgetBase = new URL(cs.src).origin;
  } catch (e) {
    widgetBase = "";
  }
  widgetBase = trim(widgetBase);
  if (!widgetBase) {
    typeof console != "undefined" &&
      console.warn &&
      console.warn("[Launchpad feedback] Could not resolve widget host from shim script URL.");
    return;
  }
  if (!project) {
    typeof console != "undefined" &&
      console.warn &&
      console.warn("[Launchpad feedback] Set launchpadFeedbackConfig.project.");
    return;
  }
  w.launchpadFeedbackConfig = {
    project: project,
    projectId: project,
    source: source,
    apiBaseUrl: apiBase,
    apiUrl: apiBase,
    widgetBaseUrl: widgetBase,
  };
  var s = d.createElement("script");
  s.async = 1;
  s.src = widgetBase + "/embed/feedback-embed.js";
  var first = d.getElementsByTagName("script")[0];
  if (first && first.parentNode) first.parentNode.insertBefore(s, first);
  else (d.body || d.documentElement).appendChild(s);
})(typeof window != "undefined" ? window : {}, typeof document != "undefined" ? document : {});
