import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchProjectTeamDigest } from "@/api";

/**
 * RAG-powered "what is everyone doing" summary.
 * @param {{ projectId: number, refreshSignal?: number }} props
 */
export function TeamDigestCard({ projectId, refreshSignal = 0 }) {
  const [digest, setDigest] = useState(null);
  const [generatedAt, setGeneratedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (refresh) => {
      if (!Number(projectId)) return;
      refresh ? setRefreshing(true) : setLoading(true);
      try {
        const res = await fetchProjectTeamDigest(projectId, { refresh });
        setDigest(res?.data?.digest ?? null);
        setGeneratedAt(res?.data?.generatedAt ?? null);
      } catch {
        setDigest(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [projectId],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  // Regenerate when activity meaningfully changes (debounced server-side).
  useEffect(() => {
    if (refreshSignal > 0) void load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshSignal]);

  const hasContent =
    digest &&
    (digest.headline ||
      digest.perPerson?.length ||
      digest.risks?.length ||
      digest.recommendations?.length);

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4 text-primary" aria-hidden />
            What everyone&apos;s doing
          </CardTitle>
          <CardDescription>
            AI summary of recent activity, presence, and conflicts.
            {generatedAt ? (
              <span className="ml-1">Updated {new Date(generatedAt).toLocaleTimeString()}.</span>
            ) : null}
          </CardDescription>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => load(true)}
          disabled={loading || refreshing}
          className="gap-1.5"
        >
          <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} aria-hidden />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div
            className="space-y-2"
            role="status"
            aria-busy="true"
            aria-label="Loading team digest"
          >
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : !hasContent ? (
          <p className="text-sm text-muted-foreground">
            Nothing to summarize yet. Activity will appear here as the team and agents work.
          </p>
        ) : (
          <>
            {digest.headline ? <p className="text-sm font-medium">{digest.headline}</p> : null}

            {digest.perPerson?.length ? (
              <ul className="space-y-1.5">
                {digest.perPerson.map((p, i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <span className="font-medium text-foreground">{p.who}:</span>
                    <span className="text-muted-foreground">{p.doing}</span>
                  </li>
                ))}
              </ul>
            ) : null}

            {digest.risks?.length ? (
              <div className="rounded-md border border-amber-500/30 bg-amber-50 p-3 dark:bg-amber-950/20">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                  Risks
                </p>
                <ul className="list-disc space-y-1 pl-4 text-sm text-amber-900 dark:text-amber-200">
                  {digest.risks.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {digest.recommendations?.length ? (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Suggestions
                </p>
                <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                  {digest.recommendations.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
