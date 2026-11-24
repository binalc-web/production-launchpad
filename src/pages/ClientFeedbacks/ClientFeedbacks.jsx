import React, { useCallback, useEffect, useMemo, useState } from "react";
import { fetchReportedIssuesOverview } from "@/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FolderKanban, Inbox, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { logger } from "@/utils/logger";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/common/PageHeader";
import { ProjectClientFeedbackPanel } from "./ProjectClientFeedbackPanel";
import { usePersistedUiState } from "@/hooks/usePersistedUiState";

const ClientFeedbacksPage = () => {
  const [overview, setOverview] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = usePersistedUiState({
    scope: "global",
    key: "clientFeedbacks.selectedProjectId",
    defaultValue: "",
    type: "string",
  });
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reloadSignal, setReloadSignal] = useState(0);

  const loadOverview = useCallback(async () => {
    setLoadingOverview(true);
    try {
      const data = await fetchReportedIssuesOverview();
      const list = Array.isArray(data?.projects) ? data.projects : [];
      setOverview(list);
      setSelectedProjectId((prev) => {
        if (prev && list.some((p) => String(p.projectId) === String(prev))) {
          return prev;
        }
        return list[0]?.projectId ? String(list[0].projectId) : "";
      });
    } catch (err) {
      logger.error("reported_issues_overview", err);
      toast.error(err?.error || "Failed to load reported issues overview");
      setOverview([]);
      setSelectedProjectId("");
    } finally {
      setLoadingOverview(false);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadOverview();
      setReloadSignal((n) => n + 1);
    } finally {
      setRefreshing(false);
    }
  }, [loadOverview]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const selectedProject = useMemo(
    () => overview.find((x) => String(x.projectId) === String(selectedProjectId)) || null,
    [overview, selectedProjectId],
  );

  const totalPendingAll = useMemo(
    () => overview.reduce((acc, p) => acc + Number(p.totalPending || 0), 0),
    [overview],
  );

  return (
    <div className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col min-h-0 pb-16 lg:overflow-hidden lg:pb-4">
      <div
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-none opacity-40 dark:opacity-25"
        aria-hidden
      >
        <div className="absolute -right-24 -top-24 h-[420px] w-[420px] rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -left-32 top-1/3 h-72 w-72 rounded-full bg-foreground/4 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.45] dark:opacity-[0.2]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, color-mix(in oklch, var(--foreground) 8%, transparent) 1px, transparent 0)`,
            backgroundSize: "22px 22px",
          }}
        />
      </div>

      <div className="shrink-0">
        <PageHeader
          title="Client feedbacks"
          description="Issues reported from client links. Open a card for the full screenshot and context, then approve to create a Jira ticket or discard noise."
        >
          <Badge variant="outline" className="gap-1.5 px-3 py-1 text-xs">
            <Inbox className="size-3.5 opacity-80" aria-hidden />
            {loadingOverview ? "…" : `${totalPendingAll} open`}
          </Badge>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={refreshing || loadingOverview}
            onClick={() => void handleRefresh()}
          >
            <RefreshCw className={cn("size-3.5", refreshing && "animate-spin")} aria-hidden />
            Refresh
          </Button>
        </PageHeader>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-8 lg:flex-row lg:items-stretch">
        <div className="flex shrink-0 flex-col space-y-4 lg:w-[260px] lg:max-w-[260px]">
          <div className="lg:hidden">
            <Label className="text-xs font-medium text-muted-foreground">Project</Label>
            <Select
              value={selectedProjectId || undefined}
              onValueChange={setSelectedProjectId}
              disabled={loadingOverview || overview.length === 0}
            >
              <SelectTrigger className="mt-1.5 h-11 rounded-xl border-border/80 bg-card shadow-sm">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {overview.map((p) => (
                  <SelectItem key={p.projectId} value={String(p.projectId)}>
                    {p.projectName} ({p.totalPending})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card className="hidden overflow-hidden border-border/80 bg-card/80 shadow-md backdrop-blur-sm lg:block">
            <CardHeader className="border-b border-border/60 bg-muted/20 pb-4">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <FolderKanban className="size-4 text-primary" aria-hidden />
                Projects
              </CardTitle>
              <CardDescription className="text-xs leading-relaxed">
                Choose a workspace. Counts are pending items only.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-1 p-3 pt-3 lg:overflow-visible">
              {loadingOverview ? (
                <div
                  className="space-y-2 p-1"
                  role="status"
                  aria-busy="true"
                  aria-label="Loading feedback queue"
                >
                  <Skeleton className="h-14 w-full rounded-xl" />
                  <Skeleton className="h-14 w-full rounded-xl" />
                </div>
              ) : overview.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/80 bg-muted/10 px-4 py-8 text-center text-sm text-muted-foreground">
                  Nothing in the queue right now.
                </div>
              ) : (
                overview.map((p) => {
                  const active = String(p.projectId) === String(selectedProjectId);
                  return (
                    <button
                      key={p.projectId}
                      type="button"
                      onClick={() => setSelectedProjectId(String(p.projectId))}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left text-sm transition-all duration-200",
                        active
                          ? "border-primary/45 bg-primary/8 shadow-sm ring-1 ring-primary/15"
                          : "border-transparent bg-transparent hover:border-border hover:bg-muted/40",
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "truncate font-medium leading-snug",
                            active ? "text-foreground" : "text-foreground/90",
                          )}
                        >
                          {p.projectName}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          Project #{p.projectId}
                        </p>
                      </div>
                      <Badge
                        variant={active ? "default" : "secondary"}
                        className="shrink-0 tabular-nums"
                      >
                        {p.totalPending}
                      </Badge>
                    </button>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        <ProjectClientFeedbackPanel
          projectId={selectedProjectId}
          projectSummary={selectedProject}
          waitingForProject={loadingOverview}
          onQueueChange={loadOverview}
          reloadSignal={reloadSignal}
        />
      </div>
    </div>
  );
};

export default ClientFeedbacksPage;
