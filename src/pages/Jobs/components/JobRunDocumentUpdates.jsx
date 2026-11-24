import React from "react";
import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/**
 * @param {{ updates: unknown }} props
 */
export function JobRunDocumentUpdates({ updates }) {
  const rows = Array.isArray(updates) ? updates : [];
  if (!rows.length) return null;

  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-2">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
        Document updates
      </p>
      <ul className="space-y-2">
        {rows.map((row, idx) => {
          const status = String(row?.status ?? "unknown");
          const docId = String(row?.documentId ?? "").slice(0, 8);
          const sections = Array.isArray(row?.sectionsTouched) ? row.sectionsTouched : [];
          const reason = row?.skippedReason ? String(row.skippedReason) : "";
          return (
            <li
              key={`${row?.documentId ?? idx}`}
              className="rounded-md border border-border/60 bg-muted/20 px-2.5 py-2 text-xs"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-foreground">
                  {row?.documentName || `Document ${docId}…`}
                </span>
                <Badge
                  variant="outline"
                  className={
                    status === "updated"
                      ? "border-emerald-300 text-emerald-800 dark:text-emerald-200"
                      : status === "failed"
                        ? "border-destructive/40 text-destructive"
                        : ""
                  }
                >
                  {status}
                </Badge>
              </div>
              {sections.length > 0 ? (
                <p className="mt-1 text-muted-foreground">Sections: {sections.join(", ")}</p>
              ) : null}
              {reason ? <p className="mt-1 text-muted-foreground">{reason}</p> : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
