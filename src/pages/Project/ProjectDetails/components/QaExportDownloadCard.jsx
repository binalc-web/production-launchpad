import { AlertCircle, Download, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

/**
 * @param {{
 *   loading?: boolean,
 *   progressMessage?: string,
 *   error?: string,
 *   disabled?: boolean,
 *   onDownload: () => void | Promise<void>,
 * }} props
 */
export function QaExportDownloadCard({
  loading = false,
  progressMessage = "",
  error = "",
  disabled = false,
  onDownload,
}) {
  const buttonLabel = loading ? progressMessage || "Preparing…" : "Download ZIP";

  return (
    <div className="min-w-0 rounded-xl border border-border/60 bg-card p-4 shadow-sm sm:p-6">
      <h2 className="text-lg font-semibold text-foreground">Download test cases</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Download the test cases generated using the{" "}
        <span className="font-medium text-foreground">QA App</span> for this project — Playwright
        specs, inventory files, helpers, mock data, and platform configs packaged as a ZIP.
      </p>

      {error ? (
        <Alert variant="destructive" className="mt-4 border-destructive/30 bg-destructive/5">
          <AlertCircle className="size-4" aria-hidden />
          <AlertTitle>Download failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {loading ? (
          <p
            className="min-w-48 flex-1 text-sm text-muted-foreground"
            aria-live="polite"
            title={buttonLabel}
          >
            <span className="inline-flex min-w-0 items-center gap-2">
              <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
              <span>{buttonLabel}</span>
            </span>
          </p>
        ) : null}
        <Button
          type="button"
          disabled={loading || disabled}
          className="shrink-0"
          onClick={() => void onDownload()}
        >
          <Download className="size-4" aria-hidden />
          Download ZIP
        </Button>
      </div>
    </div>
  );
}
