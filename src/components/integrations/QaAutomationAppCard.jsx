import { useEffect, useState } from "react";
import { fetchQaDesktopReleaseLatest } from "@/api";
import qaAppMarkPng from "@/assets/apps/QaApp.png";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatQaDesktopVersionLabel } from "@/pages/Integrations/qaDesktopRelease.util";
import { logger } from "@/utils/logger";
import { Download, Loader2 } from "lucide-react";

function DownloadButton({ href, loading }) {
  const label = (
    <>
      {loading ? (
        <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden />
      ) : (
        <Download className="mr-1 h-4 w-4" aria-hidden />
      )}
      Download for Mac
    </>
  );

  if (href) {
    return (
      <Button type="button" size="sm" className="shrink-0" asChild>
        <a href={href} download>
          {label}
        </a>
      </Button>
    );
  }

  return (
    <Button type="button" size="sm" className="shrink-0" disabled>
      {label}
    </Button>
  );
}

/**
 * Connected accounts card: download the latest QA Automation Mac app.
 */
export function QaAutomationAppCard() {
  const [release, setRelease] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(false);
      try {
        const data = await fetchQaDesktopReleaseLatest();
        if (!cancelled) setRelease(data);
      } catch (err) {
        logger.error("qa_desktop_release_latest_load", err);
        if (!cancelled) {
          setRelease(null);
          setError(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const versionLabel = formatQaDesktopVersionLabel(release?.version);
  const downloadHref = release?.downloadUrl || "";

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 space-y-0 pb-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <img
            src={qaAppMarkPng}
            alt=""
            aria-hidden
            draggable={false}
            className={cn("pointer-events-none size-6 shrink-0 rounded-md object-contain")}
          />
          <CardTitle className="truncate text-lg">QA Automation App</CardTitle>
        </div>
        <DownloadButton href={downloadHref} loading={loading} />
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          This app lives on your Mac. You tell it what to check on a website, it clicks around like
          a person, and then it shows you what passed and what broke.
        </p>
        {loading ? (
          <Skeleton
            className="h-5 w-36 rounded-full"
            role="status"
            aria-busy="true"
            aria-label="Checking the latest version"
          />
        ) : versionLabel ? (
          <Badge variant="secondary">Latest version {versionLabel}</Badge>
        ) : (
          <p className="text-xs text-destructive">
            {error
              ? "Could not load the latest QA App. Try refreshing this page."
              : "Latest version is not available yet."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
