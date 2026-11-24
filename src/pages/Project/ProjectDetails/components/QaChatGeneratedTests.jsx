import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Circle,
  CircleSlash,
  FlaskConical,
  Globe,
  Loader2,
  Play,
  Sparkles,
  Square,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  cancelQaChatTestRun,
  fetchActiveQaChatTestRun,
  fetchQaChatTestRun,
  runQaChatTests,
} from "@/api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  describeAutoHealOutcome,
  describeRunProgress,
  describeRunStatus,
  describeRunTotals,
  getCreatedTests,
  toggleCaseId,
} from "@/lib/qaChat.util";

/** Poll rate while the live stream is down, and the safety-net rate while it is up. */
const RUN_POLL_MS = 3000;
const RUN_POLL_STREAMING_MS = 20_000;

function errorText(err, fallback) {
  return (typeof err?.error === "string" && err.error) || fallback;
}

const caseKey = (id) => String(id || "").toUpperCase();

function formatDuration(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n) || n <= 0) return "";
  return n < 1000 ? `${Math.round(n)}ms` : `${(n / 1000).toFixed(1)}s`;
}

function CaseStatusIcon({ status, live = false }) {
  if (status === "running")
    return <Loader2 className="size-3.5 animate-spin text-primary" aria-label="Running" />;
  if (live && !status)
    return <Circle className="size-3 text-muted-foreground/40" aria-label="Waiting" />;
  if (status === "passed")
    return <CheckCircle2 className="size-4 text-emerald-600" aria-label="Passed" />;
  if (status === "failed")
    return <XCircle className="size-4 text-destructive" aria-label="Failed" />;
  return <CircleSlash className="size-4 text-muted-foreground" aria-label={status || "Not run"} />;
}

/**
 * Tests a "create tests" turn saved (specs + inventory, uploaded to S3 like the Mac app) with a
 * button that runs them through the qa-runner headless pipeline and shows the result in place.
 * `runEvent` is the live state the chat's SSE stream pushes for a run; polling is only a safety net.
 * `onBrowserStarted` is called once a run in the browser has started it, so the page can show it.
 * @param {{ chatId: string, message: object, runEvent?: object | null, streamUp?: boolean, onBrowserStarted?: () => void }} props
 */
export function QaChatGeneratedTests({
  chatId,
  message,
  runEvent = null,
  streamUp = false,
  onBrowserStarted,
}) {
  const [run, setRun] = useState(null);
  // Auto-heal sets the message back to "generating" while the agent fixes tests; keep the card up.
  const created = useMemo(
    () => getCreatedTests(message, { keepWhileBusy: Boolean(run && !run.done) }),
    [message, run],
  );
  const caseIds = useMemo(() => (created?.cases || []).map((c) => c.id).filter(Boolean), [created]);
  const [selected, setSelected] = useState(caseIds);
  const [autoHeal, setAutoHeal] = useState(true);
  /** Which run button was clicked while the run is starting: "headless" | "browser" | null. */
  const [starting, setStarting] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // A new turn's inventory resets the selection to "all".
  useEffect(() => setSelected(caseIds), [caseIds]);

  // After a reload: resume the run that is still going (progress, auto-heal), else show the last
  // finished run of this message. The runner may have dropped that one, which is fine.
  const lastRunId = message?.testRunId || null;
  const messageId = message?.id || null;
  useEffect(() => {
    if (!chatId || !messageId) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const active = await fetchActiveQaChatTestRun(chatId, messageId);
        if (cancelled) return;
        if (active?.run) {
          setRun(active.run);
          return;
        }
      } catch {
        /* fall back to the last run */
      }
      if (!lastRunId) return;
      try {
        const res = await fetchQaChatTestRun(chatId, lastRunId);
        // Never replace a run that started (or resumed) in the meantime.
        if (!cancelled && res?.run) setRun((prev) => prev ?? res.run);
      } catch {
        /* nothing to show */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chatId, messageId, lastRunId]);

  // Live state pushed over SSE. Ignore events of another message, and stale events of an older run.
  useEffect(() => {
    if (!runEvent || runEvent.messageId !== message?.id) return;
    setRun((prev) => (!prev || prev.runId === runEvent.runId || prev.done ? runEvent : prev));
  }, [runEvent, message?.id]);

  // Safety net: poll until the run settles (rarely while the live stream is up).
  const activeRunId = run && !run.done ? run.runId : null;
  const pollMs = streamUp ? RUN_POLL_STREAMING_MS : RUN_POLL_MS;
  useEffect(() => {
    if (!activeRunId) return undefined;
    const t = window.setInterval(async () => {
      try {
        const res = await fetchQaChatTestRun(chatId, activeRunId);
        if (mountedRef.current && res?.run) setRun(res.run);
      } catch {
        /* transient; the next tick retries */
      }
    }, pollMs);
    return () => window.clearInterval(t);
  }, [chatId, activeRunId, pollMs]);

  const handleRun = useCallback(
    async (mode) => {
      setStarting(mode);
      try {
        const subset =
          caseIds.length > 0 && selected.length > 0 && selected.length < caseIds.length
            ? { testCaseIds: selected }
            : {};
        const res = await runQaChatTests(chatId, message.id, {
          ...subset,
          ...(mode === "browser" ? { mode: "browser" } : {}),
          ...(autoHeal ? { autoHeal: true } : {}),
        });
        setRun(res.run || null);
        // The backend opens the chat's browser for a browser run: show it right away.
        if (mode === "browser") onBrowserStarted?.();
      } catch (err) {
        // The browser may have opened before the run was refused.
        if (mode === "browser") onBrowserStarted?.();
        toast.error(errorText(err, "Could not start the test run"));
      } finally {
        setStarting(null);
      }
    },
    [chatId, message?.id, caseIds, selected, autoHeal, onBrowserStarted],
  );

  const handleCancel = useCallback(async () => {
    if (!run?.runId) return;
    setCancelling(true);
    try {
      const res = await cancelQaChatTestRun(chatId, run.runId);
      if (res?.run) setRun(res.run);
    } catch (err) {
      toast.error(errorText(err, "Could not cancel the test run"));
    } finally {
      setCancelling(false);
    }
  }, [chatId, run?.runId]);

  if (!created) return null;

  const running = Boolean(run && !run.done);
  const resultByCase = new Map((run?.cases || []).map((c) => [caseKey(c.id), c]));
  const progress = describeRunProgress(run);
  const noneSelected = caseIds.length > 0 && selected.length === 0;
  const subsetSelected = caseIds.length > 0 && selected.length < caseIds.length && !noneSelected;
  const selectedSuffix = subsetSelected ? ` (${selected.length})` : "";
  const totalsLine = run?.done ? describeRunTotals(run) : "";
  const healOutcome = run?.done ? describeAutoHealOutcome(run) : "";
  const appBugs = run?.autoHeal?.appBugs || [];

  return (
    <section
      className="max-w-[95%] space-y-2 rounded-lg border bg-card px-3 py-2"
      aria-label="Created tests"
    >
      <header className="flex flex-wrap items-center gap-2">
        <FlaskConical className="size-4 text-muted-foreground" aria-hidden />
        <h4 className="text-sm font-semibold">
          {created.cases.length || created.specCount}{" "}
          {(created.cases.length || created.specCount) === 1 ? "test" : "tests"} created
        </h4>
        <Badge variant="secondary">Saved to project tests</Badge>
        <div className="ml-auto flex flex-wrap gap-2">
          {running ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={cancelling}
              onClick={handleCancel}
            >
              <Square className="size-4" />
              {cancelling ? "Cancelling…" : "Cancel run"}
            </Button>
          ) : (
            <>
              <Button
                type="button"
                size="sm"
                // The console theme forces an !important background on outline buttons, so the
                // "on" state uses the default variant (not overridden) to show green.
                variant={autoHeal ? "default" : "outline"}
                className={cn(
                  autoHeal && "bg-emerald-600 text-white hover:bg-emerald-700 hover:text-white",
                )}
                aria-pressed={autoHeal}
                title={
                  autoHeal
                    ? "Auto-heal is on: if a test fails, the agent works out why, fixes it and re-runs it (up to 3 rounds). Click to turn it off."
                    : "Auto-heal is off. Click to let the agent fix failing tests and re-run them."
                }
                onClick={() => setAutoHeal((v) => !v)}
              >
                <Sparkles className="size-4" aria-hidden />
                Auto-heal {autoHeal ? "on" : "off"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={Boolean(starting) || noneSelected}
                title="Run the tests in the QA browser with the saved login, one step at a time"
                onClick={() => handleRun("browser")}
              >
                {starting === "browser" ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Globe className="size-4" aria-hidden />
                )}
                {starting === "browser" ? "Opening browser…" : `Run in browser${selectedSuffix}`}
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={Boolean(starting) || noneSelected}
                title="Run the tests in the background with the saved login"
                onClick={() => handleRun("headless")}
              >
                {starting === "headless" ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Play className="size-4" aria-hidden />
                )}
                {starting === "headless" ? "Starting…" : `Run headless${selectedSuffix}`}
              </Button>
            </>
          )}
        </div>
      </header>

      {created.cases.length ? (
        <ul className="space-y-1">
          {created.cases.map((c, i) => {
            const result = c.id ? resultByCase.get(caseKey(c.id)) : null;
            return (
              <li key={c.id || `${c.title}-${i}`} className="flex items-start gap-2 text-sm">
                {c.id && caseIds.length > 1 && !running ? (
                  <Checkbox
                    className="mt-0.5"
                    checked={selected.includes(c.id)}
                    onCheckedChange={() => setSelected((prev) => toggleCaseId(prev, c.id))}
                    aria-label={`Run ${c.title}`}
                  />
                ) : (
                  <span className="mt-0.5 flex size-4 items-center justify-center">
                    <CaseStatusIcon status={result?.status} live={running} />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p
                    className={cn("truncate", result?.status === "failed" && "text-destructive")}
                    title={c.title}
                  >
                    {c.id ? (
                      <span className="mr-1 text-xs text-muted-foreground">{c.id}</span>
                    ) : null}
                    {c.title}
                  </p>
                  {result?.error ? (
                    <p className="line-clamp-3 whitespace-pre-wrap text-xs text-destructive">
                      {result.error}
                    </p>
                  ) : null}
                </div>
                {result && !running && caseIds.length > 1 ? (
                  <CaseStatusIcon status={result.status} />
                ) : result?.durationMs && result.status !== "running" ? (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDuration(result.durationMs)}
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">
          {created.specCount} spec {created.specCount === 1 ? "file" : "files"} saved.
        </p>
      )}

      {run ? (
        <div className="space-y-1 border-t pt-2" role="status">
          <p className="flex items-center gap-2 text-sm">
            {running ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            <span
              className={cn(
                "font-medium",
                run.done && run.status === "passed" && "text-emerald-600",
                run.done &&
                  run.status !== "passed" &&
                  run.status !== "cancelled" &&
                  "text-destructive",
              )}
            >
              {describeRunStatus(run)}
            </span>
            {totalsLine ? (
              <span className="text-xs text-muted-foreground">{totalsLine}</span>
            ) : null}
          </p>
          {progress ? (
            <div className="space-y-1">
              <div
                className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-label="Test run progress"
                aria-valuemin={0}
                aria-valuemax={progress.total}
                aria-valuenow={progress.finished}
              >
                <div
                  className={cn(
                    "h-full rounded-full transition-[width] duration-300",
                    progress.failed > 0 ? "bg-destructive" : "bg-primary",
                  )}
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
              {progress.current ? (
                <p className="truncate text-xs text-muted-foreground" title={progress.current}>
                  Now running {progress.current}
                  {progress.failed > 0 ? ` · ${progress.failed} failed so far` : ""}
                </p>
              ) : progress.failed > 0 ? (
                <p className="text-xs text-muted-foreground">{progress.failed} failed so far</p>
              ) : null}
            </div>
          ) : null}
          {healOutcome ? (
            <p
              className={cn(
                "text-xs",
                run.autoHeal?.outcome === "passed" ? "text-emerald-600" : "text-muted-foreground",
              )}
            >
              {healOutcome}
            </p>
          ) : null}
          {run.done && appBugs.length > 0 ? (
            <Alert>
              <AlertTitle>Looks like app bugs</AlertTitle>
              <AlertDescription>
                <ul className="list-disc space-y-0.5 pl-4">
                  {appBugs.map((b, i) => (
                    <li key={b.id || `${b.title}-${i}`}>
                      {b.id ? <span className="mr-1 text-xs">{b.id}</span> : null}
                      {b.title}
                      {b.reason ? ` — ${b.reason}` : ""}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          ) : null}
          {(run.warnings || []).map((w) => (
            <p key={w} className="text-xs text-muted-foreground">
              {w}
            </p>
          ))}
          {run.done && run.status === "error" && run.errors?.length > 1 ? (
            <Alert variant="destructive">
              <AlertTitle>Run problems</AlertTitle>
              <AlertDescription>{run.errors.map((e) => e.message).join(" ")}</AlertDescription>
            </Alert>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
