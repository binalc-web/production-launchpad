import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatQaDateTime,
  formatQaDuration,
  formatQaRate,
} from "@/pages/QaAnalytics/qaAnalyticsDisplay.js";

/**
 * @param {{ items?: object[] }} props
 */
export function QaAnalyticsExceptionQueue({ items = [] }) {
  if (!items.length) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Exception queue</CardTitle>
        <CardDescription>Data quality and operational exceptions.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Issue</TableHead>
              <TableHead className="text-right">Count</TableHead>
              <TableHead>Severity</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.type}>
                <TableCell>{item.label}</TableCell>
                <TableCell className="text-right tabular-nums">{item.count}</TableCell>
                <TableCell>{item.severity}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/**
 * @param {{ items?: object[] }} props
 */
export function QaAnalyticsTestCasePriorities({ items = [] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Test-case priorities</CardTitle>
        <CardDescription>Top failing tests in the selected cohort.</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No failing tests in this period.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Test</TableHead>
                <TableHead className="text-right">Failures</TableHead>
                <TableHead className="text-right">Share</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((row) => (
                <TableRow key={row.testCaseKey}>
                  <TableCell>
                    <div className="font-medium">{row.testCaseKey}</div>
                    <div className="max-w-md truncate text-xs text-muted-foreground">
                      {row.title}
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{row.failureCount}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.share != null ? formatQaRate(row.share) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * @param {{
 *   projectId?: number|string,
 *   users?: object[],
 *   runs?: object[],
 *   usersNextCursor?: string|null,
 *   runsNextCursor?: string|null,
 *   onLoadMoreUsers?: () => void,
 *   onLoadMoreRuns?: () => void,
 *   loadingMore?: boolean,
 * }} props
 */
export function QaAnalyticsRosterTables({
  projectId,
  users = [],
  runs = [],
  usersNextCursor,
  runsNextCursor,
  onLoadMoreUsers,
  onLoadMoreRuns,
  loadingMore = false,
}) {
  const reportsHref = projectId ? `/projects/details/${projectId}?section=qa-reports` : null;

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Users</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead className="text-right">Runs</TableHead>
                <TableHead className="text-right">Test-case pass rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.userId}>
                  <TableCell>{u.name || u.email || u.userId}</TableCell>
                  <TableCell className="text-right tabular-nums">{u.runs}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {u.insufficientSample
                      ? "Insufficient sample"
                      : formatQaRate(u.testCasePassRate ?? u.passRate)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {usersNextCursor && onLoadMoreUsers ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loadingMore}
              onClick={onLoadMoreUsers}
            >
              Load more users
            </Button>
          ) : null}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">Runs</CardTitle>
          {reportsHref ? (
            <Link className="text-xs text-primary hover:underline" to={reportsHref}>
              Open QA reports
            </Link>
          ) : null}
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Run</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((r) => (
                <TableRow key={r.id || r.runId}>
                  <TableCell>
                    {reportsHref ? (
                      <Link className="hover:underline" to={reportsHref}>
                        <div className="font-mono text-xs">
                          {r.runId?.slice(0, 8) ?? r.id?.slice(0, 8)}
                        </div>
                      </Link>
                    ) : (
                      <div className="font-mono text-xs">
                        {r.runId?.slice(0, 8) ?? r.id?.slice(0, 8)}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      {formatQaDateTime(r.startedAt)}
                    </div>
                  </TableCell>
                  <TableCell>{r.status}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatQaDuration(r.executionTimeMs)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {runsNextCursor && onLoadMoreRuns ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loadingMore}
              onClick={onLoadMoreRuns}
            >
              Load more runs
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
