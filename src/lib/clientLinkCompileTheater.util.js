/**
 * Compile theater: merge forward-only progress and format overlay/chip copy.
 */

/** @typedef {{
 *   stage: string,
 *   file: string,
 *   done: number,
 *   total: number | null,
 *   route: string,
 *   startedAt: number,
 *   quiet: boolean,
 * }} CompileTheaterProgress */

export const COMPILE_THEATER_ELAPSED = {
  /** Hide determinate bar until this many ms (avoid flashing 0%). */
  showBarAfterMs: 8_000,
  /** First-compile expectation helper. */
  expectationAfterMs: 45_000,
  /** “Still compiling” helper. */
  stillCompilingAfterMs: 120_000,
};

/**
 * @returns {CompileTheaterProgress}
 */
export function createEmptyCompileProgress(now = Date.now()) {
  return {
    stage: "transform",
    file: "",
    done: 0,
    total: null,
    route: "",
    startedAt: now,
    quiet: false,
  };
}

/**
 * Merge a progress patch. `done` / `total` never go backward.
 * `total` is ignored unless it is greater than `done`.
 *
 * @param {CompileTheaterProgress | null | undefined} prev
 * @param {{
 *   stage?: string,
 *   file?: string,
 *   done?: number,
 *   total?: number | null,
 *   route?: string,
 *   quiet?: boolean,
 *   reset?: boolean,
 * } | null | undefined} next
 * @param {number} [now]
 * @returns {CompileTheaterProgress}
 */
export function mergeCompileProgress(prev, next, now = Date.now()) {
  if (next?.reset) {
    return {
      ...createEmptyCompileProgress(now),
      quiet: Boolean(next.quiet),
      route: typeof next.route === "string" ? next.route : "",
    };
  }

  const base = prev && typeof prev === "object" ? prev : createEmptyCompileProgress(now);
  if (!next || typeof next !== "object") return base;

  const nextDone = Math.max(
    0,
    Math.floor(Number.isFinite(Number(next.done)) ? Number(next.done) : base.done),
  );
  const done = Math.max(base.done, nextDone);

  let total = base.total;
  if (next.total != null && Number.isFinite(Number(next.total))) {
    const t = Math.floor(Number(next.total));
    if (t > done) {
      total = total == null ? t : Math.max(total, t);
    }
  }
  // Determinate bar needs total > done; otherwise drop denominator.
  if (total != null && total <= done) {
    total = null;
  }

  const file = typeof next.file === "string" && next.file.trim() ? next.file.trim() : base.file;
  const stage =
    typeof next.stage === "string" && next.stage.trim() ? next.stage.trim() : base.stage;
  const route =
    typeof next.route === "string" && next.route.trim() ? next.route.trim() : base.route;

  return {
    stage,
    file,
    done,
    total,
    route,
    startedAt: base.startedAt || now,
    quiet: next.quiet != null ? Boolean(next.quiet) : Boolean(base.quiet),
  };
}

/**
 * @param {CompileTheaterProgress | null | undefined} progress
 * @returns {boolean}
 */
export function hasCompileTheaterProgress(progress) {
  return Boolean(progress && (progress.done > 0 || progress.file || progress.total != null));
}

/**
 * @param {CompileTheaterProgress | null | undefined} progress
 * @param {number} [elapsedMs]
 * @returns {boolean}
 */
export function shouldShowCompileTheaterBar(progress, elapsedMs = 0) {
  if (!progress || progress.total == null || progress.total <= progress.done) return false;
  if (elapsedMs < COMPILE_THEATER_ELAPSED.showBarAfterMs && progress.done < 3) return false;
  return progress.total > progress.done;
}

/**
 * @param {CompileTheaterProgress | null | undefined} progress
 * @returns {number | null} 0–100, or null when indeterminate
 */
export function compileTheaterBarPercent(progress) {
  if (!progress || progress.total == null || progress.total <= 0) return null;
  if (progress.total <= progress.done) return null;
  return Math.min(99, Math.max(1, Math.round((progress.done / progress.total) * 100)));
}

/**
 * @param {{
 *   progress: CompileTheaterProgress | null | undefined,
 *   elapsedMs?: number,
 *   variant?: "overlay" | "chip" | "quiet",
 * }} opts
 * @returns {{
 *   title: string,
 *   fileLine: string,
 *   helper: string,
 *   showBar: boolean,
 *   percent: number | null,
 * }}
 */
export function formatCompileTheaterCopy({ progress, elapsedMs = 0, variant = "overlay" }) {
  const quiet = variant === "quiet" || Boolean(progress?.quiet);
  const done = progress?.done ?? 0;
  const total = progress?.total != null && progress.total > done ? progress.total : null;
  const file = String(progress?.file || "").trim();
  const route = String(progress?.route || "").trim();

  let countPart =
    total != null
      ? `Compiling modules ${done} / ${total}`
      : done > 0
        ? `Compiling modules ${done}`
        : "Compiling modules…";

  if (quiet) {
    const routeLabel = route && route !== "/" ? route : "";
    if (routeLabel && done > 0) {
      countPart =
        total != null
          ? `Compiling ${routeLabel} · ${done} / ${total}`
          : `Compiling ${routeLabel} · ${done}`;
    } else if (routeLabel) {
      countPart = `Compiling ${routeLabel}`;
    } else if (done > 0) {
      countPart = total != null ? `Compiling ${done} / ${total}` : `Compiling ${done}`;
    } else {
      countPart = "Compiling…";
    }
  }

  const fileLine = quiet ? "" : file;
  let title = countPart;
  if (variant === "chip" && file && !quiet) {
    title = `${countPart} · ${file}`;
  }

  let helper = "";
  if (!quiet && variant === "overlay") {
    if (elapsedMs >= COMPILE_THEATER_ELAPSED.stillCompilingAfterMs) {
      helper = "Still compiling · first compile can take a few minutes.";
    } else if (elapsedMs >= COMPILE_THEATER_ELAPSED.expectationAfterMs) {
      helper = "First compile usually 2–3 minutes. Later loads are much faster.";
    }
  }

  const showBar = shouldShowCompileTheaterBar(progress, elapsedMs);
  const percent = showBar ? compileTheaterBarPercent(progress) : null;

  return { title, fileLine, helper, showBar, percent };
}
