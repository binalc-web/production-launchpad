import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { CATEGORY_FILTER_OPTIONS } from "./recommendations/categoryLabels.js";
import { InfraRecommendationCard } from "./recommendations/InfraRecommendationCard.jsx";
import { compareBySeverity } from "./recommendations/recommendationStyles.js";
import { buildNodeLabelMap } from "./recommendations/resolveNodeLabels.js";
import { buildUiPreferenceScope } from "@/lib/uiPreferences";
import { usePageUiPreferences } from "@/hooks/usePageUiPreferences";

const INFRA_SUGGESTIONS_UI_SCHEMA = {
  categoryFilter: {
    defaultValue: "all",
    allowed: CATEGORY_FILTER_OPTIONS.map((option) => option.value),
  },
  linkedOnly: { defaultValue: false, type: "boolean" },
};

function suggestionMatchesCategory(item, categoryFilter) {
  if (categoryFilter === "all") return true;
  return String(item.category ?? "").toLowerCase() === categoryFilter;
}

function suggestionMatchesNode(item, selectedNodeId, linkedOnly) {
  if (!linkedOnly || !selectedNodeId) return true;
  const related = Array.isArray(item.relatedNodeIds) ? item.relatedNodeIds : [];
  return related.map(String).includes(String(selectedNodeId));
}

/**
 * Full suggestions list with category filter, node filter, and rich cards.
 */
export function InfraAnalysisSuggestionsPanel({
  projectId,
  suggestions = [],
  architectureGraph = null,
  selectedNodeId = null,
  onSelectedNodeChange,
  onFocusDiagramNodes,
  onFixSuggestion,
}) {
  const suggestionsScope = buildUiPreferenceScope({ projectId });
  const [prefs, setPref] = usePageUiPreferences(suggestionsScope, INFRA_SUGGESTIONS_UI_SCHEMA);
  const categoryFilter = prefs.categoryFilter;
  const linkedOnly = prefs.linkedOnly;
  const setCategoryFilter = (value) => setPref("categoryFilter", value);
  const setLinkedOnly = (value) => setPref("linkedOnly", value);
  const items = Array.isArray(suggestions) ? suggestions : [];
  const nodeLabelMap = useMemo(() => buildNodeLabelMap(architectureGraph), [architectureGraph]);

  const filteredItems = useMemo(() => {
    return items
      .filter((item) => suggestionMatchesCategory(item, categoryFilter))
      .filter((item) => suggestionMatchesNode(item, selectedNodeId, linkedOnly))
      .sort(compareBySeverity);
  }, [categoryFilter, items, linkedOnly, selectedNodeId]);

  const handleFocusDiagram = (relatedNodeIds) => {
    if (!Array.isArray(relatedNodeIds) || !relatedNodeIds.length) return;
    const firstId = String(relatedNodeIds[0]);
    onSelectedNodeChange?.(firstId);
    onFocusDiagramNodes?.(relatedNodeIds);
  };

  return (
    <Card>
      <CardHeader className="space-y-3 pb-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">All suggestions</CardTitle>
            <p className="text-xs text-muted-foreground">
              {filteredItems.length} of {items.length} shown
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Label htmlFor="infra-suggestion-category" className="sr-only">
                Category
              </Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger id="infra-suggestion-category" className="h-8 w-[160px] text-xs">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_FILTER_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedNodeId ? (
              <div className="flex items-center gap-2">
                <Switch
                  id="infra-suggestion-linked-only"
                  checked={linkedOnly}
                  onCheckedChange={setLinkedOnly}
                />
                <Label htmlFor="infra-suggestion-linked-only" className="text-xs font-normal">
                  Show linked only
                </Label>
              </div>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {!items.length ? (
          <p className="text-sm text-muted-foreground">
            No suggestions yet. Run analysis to get recommendations.
          </p>
        ) : !filteredItems.length ? (
          <p className="text-sm text-muted-foreground">No suggestions match the current filters.</p>
        ) : (
          filteredItems.map((item, index) => (
            <InfraRecommendationCard
              key={String(item.id ?? item.title ?? index)}
              item={item}
              mode="full"
              nodeLabelMap={nodeLabelMap}
              selectedNodeId={selectedNodeId}
              onFocusDiagram={handleFocusDiagram}
              onFix={onFixSuggestion}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}
