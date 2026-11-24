import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchAdminProjectCostDetail, patchProjectBudget } from "@/api";
import { PROJECT_BUDGET_EXCEEDED_MESSAGE } from "@/constants/projectBudget";
import { formatBudgetUsd } from "@/pages/CostAnalytics/costAnalyticsDisplay";
import { DailySpendComboChart } from "@/pages/CostAnalytics/components/DailySpendComboChart";
import { SpendBySourceBarChart } from "@/pages/CostAnalytics/components/SpendBySourceBarChart";

/**
 * Admin budget controls and materialized spend breakdown for one project.
 */
export function ProjectBudgetAdminCard({ project, onBudgetUpdated }) {
  const projectId = project?.id;
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [budgetInput, setBudgetInput] = useState("");
  const [saving, setSaving] = useState(false);

  const loadDetail = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const data = await fetchAdminProjectCostDetail(projectId, { limit: 20 });
      setDetail(data);
    } catch (error) {
      toast.error(error?.message || "Could not load cost details.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const budget = detail?.project ?? project;
  const daily = useMemo(() => (Array.isArray(detail?.daily) ? detail.daily : []), [detail?.daily]);
  const bySource = useMemo(
    () => (Array.isArray(detail?.bySource) ? detail.bySource : []),
    [detail?.bySource],
  );

  const openDialog = () => {
    setBudgetInput(String(budget?.budgetUsd ?? project?.budgetUsd ?? ""));
    setDialogOpen(true);
  };

  const saveBudget = async () => {
    const nextBudget = Number(budgetInput);
    if (!Number.isFinite(nextBudget) || nextBudget <= 0) {
      toast.error("Enter a budget greater than zero.");
      return;
    }
    setSaving(true);
    try {
      await patchProjectBudget(projectId, nextBudget);
      toast.success("Budget updated.");
      setDialogOpen(false);
      onBudgetUpdated?.();
      await loadDetail();
    } catch (error) {
      toast.error(error?.message || "Could not update budget.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-3">
          <div>
            <CardTitle className="text-base">AI budget</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Estimated Cursor agent spend materialized in LaunchPad.
            </p>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={openDialog}>
            Increase budget
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <Skeleton
              className="h-20 w-full rounded-md"
              role="status"
              aria-busy="true"
              aria-label="Loading project budget"
            />
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Budget</p>
                  <p className="text-lg font-semibold tabular-nums">
                    {formatBudgetUsd(budget?.budgetUsd ?? 0)}
                  </p>
                </div>
                <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Spent</p>
                  <p className="text-lg font-semibold tabular-nums">
                    {formatBudgetUsd(budget?.totalSpendUsd ?? 0)}
                  </p>
                </div>
                <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Remaining</p>
                  <p
                    className={
                      budget?.isOverBudget
                        ? "text-lg font-semibold tabular-nums text-amber-700 dark:text-amber-300"
                        : "text-lg font-semibold tabular-nums"
                    }
                  >
                    {formatBudgetUsd(budget?.remainingUsd ?? 0)}
                  </p>
                </div>
              </div>

              {budget?.isOverBudget ? (
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  {PROJECT_BUDGET_EXCEEDED_MESSAGE}
                </p>
              ) : null}

              {daily.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Daily spend</p>
                  <DailySpendComboChart daily={daily} limitDays={30} className="h-[220px] w-full" />
                </div>
              ) : null}

              {bySource.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Spend by source</p>
                  <SpendBySourceBarChart bySource={bySource} className="h-[240px] w-full" />
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Increase AI budget</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="project-budget-usd">New budget (USD)</Label>
            <Input
              id="project-budget-usd"
              type="number"
              min="0.01"
              step="0.01"
              value={budgetInput}
              onChange={(event) => setBudgetInput(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void saveBudget()} disabled={saving}>
              {saving ? "Saving…" : "Save budget"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
