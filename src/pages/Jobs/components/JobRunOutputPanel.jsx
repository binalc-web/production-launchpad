import React from "react";

/**
 * @param {unknown} parsed
 * @returns {Record<string, unknown> | null}
 */
function pickTavilyBlock(parsed) {
  if (!parsed || typeof parsed !== "object") return null;
  const o = /** @type {Record<string, unknown>} */ (parsed);
  if (o.tool === "tavily") return o;
  const raw = o.raw;
  if (raw && typeof raw === "object") {
    const r = /** @type {Record<string, unknown>} */ (raw);
    if (r.tool === "tavily") return r;
  }
  return null;
}

/**
 * Tavily tool payload from job output (`{ summary, raw }` or raw at top level).
 * @param {unknown} parsed
 * @returns {{
 *   query: string,
 *   answer: string | null,
 *   results: Array<{ title: string, url: string, content: string }>,
 *   error?: string,
 * } | null}
 */
function parseTavilySearchFromOutput(parsed) {
  const block = pickTavilyBlock(parsed);
  if (!block || block.tool !== "tavily") return null;
  const rawR = Array.isArray(block.results) ? block.results : [];
  const results = [];
  for (const item of rawR) {
    if (!item || typeof item !== "object") continue;
    const it = /** @type {Record<string, unknown>} */ (item);
    if (typeof it.title !== "string" || typeof it.url !== "string") continue;
    results.push({
      title: it.title,
      url: it.url,
      content: typeof it.content === "string" ? it.content : "",
    });
  }
  const query = typeof block.query === "string" ? block.query : "";
  const answer =
    typeof block.answer === "string" && block.answer.trim() ? block.answer.trim() : null;
  const error =
    typeof block.error === "string" && block.error.trim() ? block.error.trim() : undefined;
  return { query, answer, results, error };
}

/**
 * @param {string|null|undefined} output
 * @param {unknown} outputJson
 */
function resolveParsed(output, outputJson) {
  if (outputJson != null && typeof outputJson === "object" && !Array.isArray(outputJson)) {
    return outputJson;
  }
  if (typeof outputJson === "string" && outputJson.trim()) {
    try {
      return JSON.parse(outputJson);
    } catch {
      /* fall through */
    }
  }
  if (output && String(output).trim()) {
    try {
      return JSON.parse(output);
    } catch {
      return { __rawOutputString: output };
    }
  }
  return null;
}

function RawLogsBlock({ filteredLogs, rawOutput }) {
  const preferred = String(filteredLogs ?? "").trim();
  const fallbackRaw = String(rawOutput ?? "").trim();
  const display = preferred || fallbackRaw;
  if (!display) return null;
  return (
    <details className="mt-4 rounded-md border border-border bg-muted/30 px-3 py-2">
      <summary className="cursor-pointer text-sm font-medium text-foreground">
        Execution logs
      </summary>
      <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-words text-xs text-muted-foreground">
        {display.slice(0, 120_000)}
      </pre>
    </details>
  );
}

/** Summary line when there is no separate report (avoids duplicating the long run summary). */
function RunOutputSummaryLine({ text, hasReport }) {
  const t = typeof text === "string" ? text.trim() : "";
  if (!t || hasReport) return null;
  return (
    <div className="rounded-md border border-border bg-background/80 px-3 py-2 text-sm leading-relaxed text-foreground whitespace-pre-wrap">
      {t}
    </div>
  );
}

/** On-demand AI report — see JobRunReportBlock.jsx */
export { JobRunReportBlock } from "./JobRunReportBlock";

/**
 * @param {{
 *   output: string|null,
 *   outputJson?: unknown,
 *   rawOutput?: string|null,
 *   error: string|null,
 *   status: string,
 *   report?: string|null,
 * }}
 */
export function JobRunOutputPanel({ output, outputJson, rawOutput, error, status, report }) {
  const st = String(status || "").toUpperCase();
  const hasReport = report != null && String(report).trim() !== "";

  if (st === "FAILED" && error) {
    const failParsed =
      outputJson != null && typeof outputJson === "object" && !Array.isArray(outputJson)
        ? /** @type {Record<string, unknown>} */ (outputJson)
        : null;
    const suggestions = Array.isArray(failParsed?.suggestions)
      ? failParsed.suggestions.map((x) => String(x)).filter(Boolean)
      : [];
    const suggestionSource =
      typeof failParsed?.suggestionSource === "string" ? failParsed.suggestionSource : null;
    const filteredLogs =
      typeof failParsed?.executionLogsFiltered === "string" ? failParsed.executionLogsFiltered : "";
    const errorLogTail =
      typeof failParsed?.errorLogTail === "string" ? failParsed.errorLogTail : "";

    return (
      <div className="space-y-3">
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
        {suggestions.length > 0 ? (
          <div className="rounded-md border border-amber-200/70 bg-amber-50/50 px-3 py-2 dark:border-amber-900/40 dark:bg-amber-950/20">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-900 dark:text-amber-200">
              Suggestions
              {suggestionSource === "ai" ? (
                <span className="ml-1 font-normal normal-case text-muted-foreground">(AI)</span>
              ) : suggestionSource === "patterns" ? (
                <span className="ml-1 font-normal normal-case text-muted-foreground">
                  (detected)
                </span>
              ) : null}
            </p>
            <ul className="mt-2 list-disc space-y-1.5 pl-4 text-sm text-foreground">
              {suggestions.map((line, i) => (
                <li key={i} className="break-words leading-snug">
                  {line}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {errorLogTail ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-destructive">
              Error section (last 25 lines)
            </p>
            <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-words text-xs text-destructive">
              {errorLogTail}
            </pre>
          </div>
        ) : null}
        <RawLogsBlock filteredLogs={filteredLogs} rawOutput={rawOutput} />
      </div>
    );
  }

  const hasTextOut = output && String(output).trim();
  const hasJsonCol = outputJson != null && outputJson !== "";
  const hasRaw = rawOutput && String(rawOutput).trim();

  if (!hasTextOut && !hasJsonCol && !hasRaw) {
    return <p className="text-sm text-muted-foreground">No output for this run.</p>;
  }

  const parsed = resolveParsed(output, outputJson);
  const filteredLogs =
    parsed && typeof parsed === "object" && typeof parsed.executionLogsFiltered === "string"
      ? parsed.executionLogsFiltered
      : "";

  if (parsed && typeof parsed === "object" && parsed.__rawOutputString) {
    return (
      <div className="space-y-2">
        <pre className="max-h-80 overflow-auto rounded-md bg-muted/50 p-3 text-xs text-foreground">
          {parsed.__rawOutputString}
        </pre>
        <RawLogsBlock filteredLogs={filteredLogs} rawOutput={rawOutput} />
      </div>
    );
  }

  if (!parsed || typeof parsed !== "object") {
    return (
      <div className="space-y-2">
        {hasTextOut ? (
          <pre className="max-h-80 overflow-auto rounded-md bg-muted/50 p-3 text-xs text-foreground">
            {output}
          </pre>
        ) : null}
        <RawLogsBlock filteredLogs={filteredLogs} rawOutput={rawOutput} />
      </div>
    );
  }

  const summaryText =
    typeof parsed.summary === "string" && parsed.summary.trim() ? parsed.summary.trim() : "";

  const outputWarning =
    typeof parsed?.outputWarning === "string" ? parsed.outputWarning.trim() : "";
  const runner = parsed?.runner;
  const inferredRt =
    runner && typeof runner === "object" && typeof runner.inferredRuntime === "string"
      ? runner.inferredRuntime.trim()
      : "";

  const tavily = parseTavilySearchFromOutput(parsed);

  if (tavily) {
    return (
      <div className="space-y-4">
        <RunOutputSummaryLine text={summaryText} hasReport={hasReport} />
        <div className="rounded-md border border-border bg-muted/20 px-3 py-2">
          <p className="text-sm font-semibold text-foreground">Web search (Tavily)</p>
          {tavily.query ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Query: <span className="font-medium text-foreground">{tavily.query}</span>
            </p>
          ) : null}
          {tavily.error ? <p className="mt-2 text-sm text-destructive">{tavily.error}</p> : null}
        </div>
        {tavily.answer ? (
          <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-sm leading-relaxed text-foreground">
            {tavily.answer}
          </div>
        ) : null}
        {tavily.results.length > 0 ? (
          <ul className="space-y-5">
            {tavily.results.map((item, i) => (
              <li
                key={`${item.url}-${i}`}
                className="border-b border-border pb-5 last:border-0 last:pb-0"
              >
                <p className="line-clamp-2 font-semibold leading-snug text-foreground">
                  {item.title}
                </p>
                {item.content ? (
                  <p className="mt-1 line-clamp-4 text-sm text-muted-foreground">{item.content}</p>
                ) : null}
                {item.url ? (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-sm text-primary underline-offset-4 transition-colors hover:underline"
                  >
                    Open source →
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        ) : !tavily.error ? (
          <p className="text-sm text-muted-foreground">No search results.</p>
        ) : null}
        <RawLogsBlock filteredLogs={filteredLogs} rawOutput={rawOutput} />
      </div>
    );
  }

  if (summaryText || outputWarning || inferredRt) {
    return (
      <div className="space-y-2">
        <RunOutputSummaryLine text={summaryText} hasReport={hasReport} />
        {outputWarning ? (
          <div className="rounded-md border border-amber-200/70 bg-amber-50/50 px-3 py-2 text-sm dark:border-amber-900/40 dark:bg-amber-950/25">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-900 dark:text-amber-200">
              Notice
            </p>
            <p className="mt-1 text-amber-950/90 dark:text-amber-50/90">{outputWarning}</p>
          </div>
        ) : null}
        {inferredRt ? (
          <p className="text-xs text-muted-foreground">
            Inferred runtime: <span className="font-medium text-foreground">{inferredRt}</span>
          </p>
        ) : null}
        <RawLogsBlock filteredLogs={filteredLogs} rawOutput={rawOutput} />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <pre className="max-h-80 overflow-x-auto overflow-y-auto rounded-md bg-muted/50 p-3 text-xs text-foreground">
        {typeof parsed === "string" ? parsed : JSON.stringify(parsed, null, 2)}
      </pre>
      <RawLogsBlock filteredLogs={filteredLogs} rawOutput={rawOutput} />
    </div>
  );
}
