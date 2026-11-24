import { useEffect, useRef, useState } from "react";
import { refreshCompetitorResearch, patchClientDetails } from "@/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { BarChart3, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useClientInfoContext } from "../hooks/useClientInfoContext";
import { AddCompetitorDialog } from "@/pages/Project/ProductManagement/components/AddCompetitorDialog";
import {
  COMPETITOR_INSIGHT_FIELDS,
  COMPETITOR_ITEM_FIELDS,
} from "@/pages/Project/ProductManagement/utils/profileFields";

const LEGACY_INSIGHT_MAP = {
  competitiveAdvantages: "differentiators",
  marketWhitespace: "opportunities",
  marketTrends: "trends",
  strategicImplications: "comparison",
};

const SOURCE_LABELS = {
  tavily_bulk: "Tavily",
  website_scan: "Website scan",
  manual: "Manual",
};

const SCAN_POLL_MS = 4000;

export function CompetitorsTab({ showRefresh = true }) {
  const { projectId, clientDetails, refresh } = useClientInfoContext();
  const [refreshing, setRefreshing] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const competitors = clientDetails?.competitors || [];
  const insights = clientDetails?.competitorInsights || {};
  const scanStatusRef = useRef(new Map());
  const hasScanning = competitors.some((c) => c.scanStatus === "scanning");

  useEffect(() => {
    const previous = scanStatusRef.current;
    for (const competitor of competitors) {
      const before = previous.get(competitor.id);
      if (before !== "scanning") continue;
      if (competitor.scanStatus === "failed") {
        toast.error(competitor.scanError || `Could not scan ${competitor.name}`);
      } else if (competitor.scanStatus !== "scanning") {
        toast.success(`${competitor.name} added from website`);
      }
    }
    const next = new Map();
    for (const competitor of competitors) {
      if (competitor.scanStatus) next.set(competitor.id, competitor.scanStatus);
    }
    scanStatusRef.current = next;
  }, [competitors]);

  useEffect(() => {
    if (!hasScanning || !projectId) return undefined;
    const id = setInterval(() => {
      refresh({ silent: true });
    }, SCAN_POLL_MS);
    return () => clearInterval(id);
  }, [hasScanning, projectId, refresh]);

  const insightValue = (key) => insights[key] || insights[LEGACY_INSIGHT_MAP[key]] || "";

  const persist = async (body) => {
    try {
      await patchClientDetails(projectId, body);
      await refresh();
    } catch (err) {
      toast.error(err?.error || "Save failed");
    }
  };

  const handleRefresh = () => {
    if (!projectId || refreshing) return;
    setRefreshing(true);
    toast.message("Updating competitor research… You can keep editing while this runs.");
    void (async () => {
      try {
        await refreshCompetitorResearch(projectId);
        await refresh({ silent: true });
        toast.success("Competitor research updated");
      } catch (err) {
        toast.error(err?.error || err?.message || "Refresh failed");
      } finally {
        setRefreshing(false);
      }
    })();
  };

  const updateCompetitor = (id, key, value) => {
    const next = competitors.map((c) => (c.id === id ? { ...c, [key]: value } : c));
    persist({ competitors: next });
  };

  const removeCompetitor = (id) => {
    persist({ competitors: competitors.filter((c) => c.id !== id) });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="size-4 text-primary" />
          <h3 className="font-semibold">Competitor research</h3>
          <Badge variant="outline">Tavily + OpenAI</Badge>
        </div>
        {showRefresh ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="size-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="size-4 mr-2" />
            )}
            Refresh research
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {competitors.map((c) => {
          const scanning = c.scanStatus === "scanning";
          return (
            <div key={c.id} className="rounded-xl border bg-card p-4 space-y-2 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <Input
                  value={c.name}
                  onChange={(e) => updateCompetitor(c.id, "name", e.target.value)}
                  placeholder="Competitor name"
                  disabled={scanning}
                  className="font-semibold border-0 px-0 h-auto focus-visible:ring-0"
                />
                <div className="flex items-center gap-1 shrink-0">
                  {scanning ? (
                    <Badge variant="outline" className="text-[10px]">
                      Scanning
                    </Badge>
                  ) : c.scanStatus === "failed" ? (
                    <Badge variant="outline" className="text-[10px]">
                      Scan failed
                    </Badge>
                  ) : c.source ? (
                    <Badge variant="outline" className="text-[10px]">
                      {SOURCE_LABELS[c.source] || c.source}
                    </Badge>
                  ) : null}
                  {c.badge ? <Badge variant="secondary">{c.badge}</Badge> : null}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => removeCompetitor(c.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
              <Input
                value={c.website || ""}
                onChange={(e) => updateCompetitor(c.id, "website", e.target.value)}
                placeholder="https://competitor.com"
                disabled={scanning}
                className="text-xs"
              />
              {scanning ? (
                <div className="space-y-2" aria-busy="true">
                  <Skeleton className="h-14 w-full rounded-md" />
                  <Skeleton className="h-9 w-full rounded-md" />
                  <Skeleton className="h-9 w-full rounded-md" />
                </div>
              ) : (
                <>
                  <Textarea
                    value={c.positioning}
                    onChange={(e) => updateCompetitor(c.id, "positioning", e.target.value)}
                    placeholder="Positioning summary"
                    rows={2}
                    className="text-sm"
                  />
                  <Input
                    value={c.strengths}
                    onChange={(e) => updateCompetitor(c.id, "strengths", e.target.value)}
                    placeholder="Strengths"
                    className="text-sm"
                  />
                  <Input
                    value={c.weaknesses}
                    onChange={(e) => updateCompetitor(c.id, "weaknesses", e.target.value)}
                    placeholder="Weaknesses"
                    className="text-sm"
                  />
                  {COMPETITOR_ITEM_FIELDS.map(({ key, placeholder }) => (
                    <Input
                      key={key}
                      value={c[key] || ""}
                      onChange={(e) => updateCompetitor(c.id, key, e.target.value)}
                      placeholder={placeholder}
                      className="text-sm"
                    />
                  ))}
                  {c.scanStatus === "failed" && c.scanError ? (
                    <p className="text-xs text-destructive">{c.scanError}</p>
                  ) : null}
                </>
              )}
            </div>
          );
        })}
      </div>

      <Button type="button" variant="outline" size="sm" onClick={() => setAddOpen(true)}>
        <Plus className="size-4 mr-1" /> Add competitor by website
      </Button>

      <AddCompetitorDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        projectId={projectId}
        onAdded={() => refresh({ silent: true })}
      />

      <div className="rounded-xl border bg-card p-4 space-y-4 shadow-sm">
        <h4 className="text-sm font-semibold">AI-generated insights</h4>
        {COMPETITOR_INSIGHT_FIELDS.map(({ key, label }) => (
          <div key={key} className="space-y-1">
            <Label className="text-xs">{label}</Label>
            <Textarea
              value={insightValue(key)}
              onChange={(e) =>
                persist({ competitorInsights: { ...insights, [key]: e.target.value } })
              }
              rows={3}
              className="text-sm resize-y"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
