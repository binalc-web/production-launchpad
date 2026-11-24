import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { qaSeverityClass } from "@/pages/QaAnalytics/qaAnalyticsDisplay.js";
import { cn } from "@/lib/utils";

/**
 * @param {{ items?: object[] }} props
 */
export function QaAnalyticsActionQueue({ items = [] }) {
  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Action queue</CardTitle>
          <CardDescription>No prioritized actions for this cohort.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Action queue</CardTitle>
        <CardDescription>
          Deterministic leadership actions ordered by severity. User data supports enablement, not
          performance scoring.
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Issue</TableHead>
              <TableHead>Evidence</TableHead>
              <TableHead>Metric</TableHead>
              <TableHead>Recommended action</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((row) => (
              <TableRow key={row.id} className={cn("border-l-4", qaSeverityClass(row.severity))}>
                <TableCell className="font-medium">{row.issue}</TableCell>
                <TableCell className="max-w-xs text-sm text-muted-foreground">
                  {row.evidence}
                </TableCell>
                <TableCell className="whitespace-nowrap tabular-nums">{row.metric}</TableCell>
                <TableCell className="text-sm">{row.recommendedAction}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{row.owner}</TableCell>
                <TableCell>
                  {row.href ? (
                    <Link className="text-sm text-primary hover:underline" to={row.href}>
                      Drill
                    </Link>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
