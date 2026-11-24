import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const LABELS = {
  manual: "Manual",
  smart_field: "Smart field",
  ai_scraped: "AI scraped",
  merged: "Merged",
  tavily_enriched: "Enriched",
  document_extracted: "From timeline",
  assumption: "Assumption",
  inferred: "Inferred",
  validated: "Validated",
  confirmed: "Confirmed",
};

export function EvidenceBadge({ source, className }) {
  if (!source) return null;
  const label = LABELS[source] || source;
  const variant =
    source === "confirmed" || source === "validated"
      ? "default"
      : source === "document_extracted" || source === "tavily_enriched"
        ? "secondary"
        : "outline";
  return (
    <Badge variant={variant} className={cn("text-[10px] font-normal", className)}>
      {label}
    </Badge>
  );
}
