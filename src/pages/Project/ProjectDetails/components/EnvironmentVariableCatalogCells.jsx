import { Badge } from "@/components/ui/badge";
import {
  formatVariableRepoSummary,
  getEnvVariableLayerBadgeClass,
  getEnvVariableLayerLabel,
} from "@/utils/environmentCatalogDisplay";

export function EnvironmentVariableLayerBadge({ layer }) {
  const label = getEnvVariableLayerLabel(layer);
  const className = getEnvVariableLayerBadgeClass(layer);
  return (
    <Badge variant="outline" className={`text-[11px] font-medium ${className}`}>
      {label}
    </Badge>
  );
}

/**
 * @param {{ sourceDetails?: Array<{ repoLabel?: string, directory?: string, details?: string | null }> }} props
 */
export function EnvironmentVariableRepoCell({ sourceDetails }) {
  if (!sourceDetails?.length) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <ul className="space-y-1">
      {sourceDetails.map((row) => (
        <li key={`${row.directory}-${row.repoLabel}`}>
          <span className="font-medium text-foreground">{row.repoLabel}</span>
          {row.details ? (
            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
              {row.details}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function EnvironmentVariableRepoSummary({ sourceDetails }) {
  return (
    <span className="text-xs text-muted-foreground">
      {formatVariableRepoSummary(sourceDetails)}
    </span>
  );
}
