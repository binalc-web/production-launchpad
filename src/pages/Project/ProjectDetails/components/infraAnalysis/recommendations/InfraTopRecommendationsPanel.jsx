import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfraRecommendationCard } from "./InfraRecommendationCard.jsx";
import { buildNodeLabelMap } from "./resolveNodeLabels.js";

/**
 * Top 10 prioritized recommendations (InfraPilot SuggestionsDrawer-style).
 */
export function InfraTopRecommendationsPanel({
  recommendations = [],
  architectureGraph = null,
  selectedNodeId = null,
  onFocusDiagram,
  onFixSuggestion,
}) {
  const items = Array.isArray(recommendations) ? recommendations.slice(0, 10) : [];
  const nodeLabelMap = buildNodeLabelMap(architectureGraph);

  if (!items.length) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Top recommendations</CardTitle>
        <p className="text-xs text-muted-foreground">
          {items.length} prioritized improvement{items.length === 1 ? "" : "s"} for this project
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((rec) => (
            <InfraRecommendationCard
              key={rec.rank ?? rec.title}
              item={rec}
              mode="compact"
              rank={rec.rank}
              nodeLabelMap={nodeLabelMap}
              selectedNodeId={selectedNodeId}
              onFocusDiagram={onFocusDiagram}
              onFix={onFixSuggestion}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
