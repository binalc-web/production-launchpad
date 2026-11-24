import React, { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { PageHeader } from "@/components/common/PageHeader";
import { PageShell } from "@/components/common/PageShell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/context/AuthContext";
import { fetchAppDeployments } from "@/api";
import { isLaunchpadAdmin } from "@/utils/launchpadRole";
import { cn } from "@/lib/utils";
import {
  deploymentStatusBadgeClass,
  formatDeployedAt,
  formatDeploymentType,
  truncateSummary,
} from "./deploymentDisplay";
import { PlatformDeployModePanel } from "./PlatformDeployModePanel";
import { usePersistedUiState } from "@/hooks/usePersistedUiState";

const PAGE_SIZE = 25;

function DeploymentsTableSkeleton() {
  return (
    <div className="space-y-3 p-4" role="status" aria-busy="true" aria-label="Loading deployments">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full rounded-md" />
      ))}
    </div>
  );
}

function SummaryCell({ summary }) {
  const text = String(summary || "").trim();
  if (!text) {
    return <span className="text-muted-foreground">—</span>;
  }

  const truncated = truncateSummary(text);
  if (truncated === text) {
    return <span className="text-sm text-foreground">{text}</span>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="max-w-[280px] truncate text-left text-sm text-foreground underline-offset-2 hover:underline"
        >
          {truncated}
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-sm whitespace-normal text-left">{text}</TooltipContent>
    </Tooltip>
  );
}

export default function DeploymentsPage() {
  const { user, loading: authBootLoading, launchpadRoleLoading, checkAuth } = useAuth();
  const canAccess = isLaunchpadAdmin(user?.role);

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = usePersistedUiState({
    scope: "global",
    key: "deployments.page",
    defaultValue: 1,
    type: "number",
    min: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!canAccess) return;
    setError(null);
    setLoading(true);
    try {
      const data = await fetchAppDeployments({ page, limit: PAGE_SIZE });
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (e) {
      setItems([]);
      setTotal(0);
      setError(typeof e?.error === "string" ? e.error : "Failed to load deployments");
    } finally {
      setLoading(false);
    }
  }, [canAccess, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!user || user.role || authBootLoading || launchpadRoleLoading) return;
    void checkAuth();
  }, [user, authBootLoading, launchpadRoleLoading, checkAuth]);

  if (authBootLoading || launchpadRoleLoading) {
    return (
      <PageShell>
        <DeploymentsTableSkeleton />
      </PageShell>
    );
  }

  if (!canAccess) {
    return <Navigate to="/projects" replace />;
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <PageShell>
      <PageHeader
        title="Deployments"
        description="Application version history and deployment outcomes for this environment."
      />

      <PlatformDeployModePanel />

      <Card className="border-border/60 shadow-sm">
        <CardContent className="p-0">
          {error ? (
            <div className="p-6 text-sm text-destructive">{error}</div>
          ) : loading ? (
            <DeploymentsTableSkeleton />
          ) : items.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              No deployments recorded yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Version</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Deployed By</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="min-w-[200px]">Summary</TableHead>
                  <TableHead>Deployed At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium tabular-nums">{row.version}</TableCell>
                    <TableCell>{formatDeploymentType(row.deploymentType)}</TableCell>
                    <TableCell className="max-w-[160px] truncate">{row.deployedBy}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "min-w-[72px] justify-center capitalize",
                          deploymentStatusBadgeClass(row.status),
                        )}
                      >
                        {row.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <SummaryCell summary={row.summary} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDeployedAt(row.deployedAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {page} of {totalPages} ({total} total)
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-md border px-3 py-1 disabled:opacity-50"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <button
              type="button"
              className="rounded-md border px-3 py-1 disabled:opacity-50"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}
