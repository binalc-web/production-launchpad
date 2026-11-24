import { useCallback } from "react";
import { Globe, Loader2 } from "lucide-react";
import { createQaLiveLoginViewerToken } from "@/api";
import { QaBrowserViewer } from "@/components/qa/QaBrowserViewer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Shown the moment Link session is clicked, while the runner launches the browser. */
export function QaLinkSessionStarting({ className }) {
  return (
    <div
      className={cn("relative aspect-video w-full overflow-hidden rounded-lg border", className)}
      role="status"
      aria-live="polite"
      aria-label="Starting the browser"
    >
      <Skeleton className="absolute inset-0 rounded-none" />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
        <span className="relative flex size-12 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
          <span className="relative flex size-12 items-center justify-center rounded-full bg-background shadow-sm ring-1 ring-border">
            <Globe className="size-6 text-primary" aria-hidden />
          </span>
        </span>
        <p className="text-sm font-medium">Starting the browser…</p>
        <p className="max-w-xs text-xs text-muted-foreground">
          Opening your app in a fresh browser. This takes a few seconds.
        </p>
      </div>
    </div>
  );
}

/**
 * Link session UI: the same live browser QA Chat shows (`QaBrowserViewer`), plus Done / Cancel.
 * Before the runner answers (`session` is null) it shows the starting animation instead.
 *
 * @param {{
 *   projectId: number | string,
 *   session: { loginId: string, targetUrl?: string } | null,
 *   finishing?: boolean,
 *   onFinish: () => void,
 *   onCancel: () => void,
 *   onClosed?: (reason: string | null) => void,
 *   className?: string,
 * }} props
 */
export function QaLinkSessionBrowser({
  projectId,
  session,
  finishing = false,
  onFinish,
  onCancel,
  onClosed,
  className,
}) {
  const loginId = session?.loginId ?? null;
  const getViewerToken = useCallback(
    (mode) => createQaLiveLoginViewerToken(projectId, loginId, mode),
    [projectId, loginId],
  );

  return (
    <div className={cn("space-y-3", className)}>
      <p className="text-xs text-muted-foreground">
        {session
          ? "Sign in to the app in the browser below, then press Done to save the session."
          : "Getting a browser ready…"}
        {session?.targetUrl ? (
          <>
            {" "}
            <span className="break-all font-mono">{session.targetUrl}</span>
          </>
        ) : null}
      </p>

      {session ? (
        <QaBrowserViewer
          sessionKey={session.loginId}
          getViewerToken={getViewerToken}
          live
          onClosed={onClosed}
        />
      ) : (
        <QaLinkSessionStarting />
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={onFinish} disabled={!session || finishing}>
          {finishing ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Saving session…
            </>
          ) : (
            "Done — save session"
          )}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={finishing}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
