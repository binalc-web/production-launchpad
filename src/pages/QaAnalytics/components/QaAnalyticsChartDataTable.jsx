import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * Expandable semantic data table for chart accessibility (screen readers + keyboard users).
 */
export function QaAnalyticsChartDataTable({ caption, columns = [], rows = [], className = "" }) {
  if (rows.length === 0) return null;

  return (
    <details className={`rounded-lg border border-border/60 bg-muted/10 ${className}`}>
      <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-muted-foreground">
        View chart data table{caption ? `: ${caption}` : ""}
      </summary>
      <div className="overflow-x-auto px-2 pb-2">
        <Table>
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.key} className={col.className}>
                  {col.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow key={row.id ?? index}>
                {columns.map((col) => (
                  <TableCell key={col.key} className={col.className}>
                    {col.render ? col.render(row) : row[col.key]}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </details>
  );
}
