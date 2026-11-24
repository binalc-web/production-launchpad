import { useCallback, useEffect, useState } from "react";
import { generateDiscoverySummary, generateWorkspaceDocument, patchDiscoverySummary } from "@/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FileText, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useClientInfoContext } from "../hooks/useClientInfoContext";
import { useProjectDiscoveryBridge } from "@/pages/Project/hooks/useProjectDiscoveryBridge";
import { hasDiscoverySignal } from "@/pages/Project/ProductManagement/utils/workflowStatus";

const SECTIONS = [
  { key: "executiveSummary", title: "Executive summary" },
  { key: "clientGoals", title: "Client goals" },
  { key: "productVision", title: "Product vision" },
  { key: "businessObjectives", title: "Business objectives" },
  { key: "stakeholders", title: "Stakeholders" },
  { key: "successCriteria", title: "Success criteria" },
  { key: "risks", title: "Risks" },
  { key: "assumptions", title: "Assumptions" },
  { key: "competitorInsights", title: "Competitor insights" },
  { key: "recommendations", title: "Recommendations" },
];

export function AiSummaryTab({ onNavigateTab, onNavigate, accordion = false }) {
  const { projectId, discoveryData, clientDetails, refresh } = useClientInfoContext();
  const { notifyPrdRefresh, notifyDocumentsRefresh } = useProjectDiscoveryBridge();
  const [generating, setGenerating] = useState(false);
  const [generatingDoc, setGeneratingDoc] = useState(false);
  const [summary, setSummary] = useState(discoveryData?.summary || {});

  useEffect(() => {
    if (discoveryData?.summary) setSummary(discoveryData.summary);
  }, [discoveryData?.summary]);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    try {
      const data = await generateDiscoverySummary(projectId);
      setSummary(data.summary);
      await refresh();
      notifyPrdRefresh();
      toast.success("Brief updated");
    } catch (err) {
      toast.error(err?.error || "Failed to generate summary");
    } finally {
      setGenerating(false);
    }
  }, [projectId, refresh, notifyPrdRefresh]);

  const handleGenerateDocument = useCallback(async () => {
    if (!hasDiscoverySignal(clientDetails, discoveryData)) {
      toast.error("Add discovery data before generating a document");
      return;
    }
    setGeneratingDoc(true);
    try {
      await generateWorkspaceDocument(projectId);
      await refresh();
      notifyDocumentsRefresh();
      toast.success("Document updated from discovery context");
      onNavigate?.("documents");
      onNavigateTab?.("documents");
    } catch (err) {
      toast.error(err?.error || "Failed to generate document");
    } finally {
      setGeneratingDoc(false);
    }
  }, [
    clientDetails,
    discoveryData,
    projectId,
    refresh,
    notifyDocumentsRefresh,
    onNavigate,
    onNavigateTab,
  ]);

  const saveSection = async (section, value) => {
    try {
      const data = await patchDiscoverySummary(projectId, { section, value });
      setSummary(data.summary);
      notifyPrdRefresh();
    } catch (err) {
      toast.error(err?.error || "Failed to save");
    }
  };

  const hasContent = SECTIONS.some(({ key }) => summary?.[key]?.trim());
  const meta = discoveryData?.summaryMeta;
  const lastUpdatedLabel = meta?.generatedAt ? new Date(meta.generatedAt).toLocaleString() : null;
  const canGenerate = hasDiscoverySignal(clientDetails, discoveryData);
  const updateButtonLabel = hasContent ? "Update brief" : "Generate brief";

  const accordionFields = (
    <Accordion type="multiple" defaultValue={["executiveSummary"]} className="w-full">
      {SECTIONS.map(({ key, title }) => (
        <AccordionItem
          key={key}
          value={key}
          className="rounded-xl border bg-card px-4 shadow-sm mb-2 border-b-0"
        >
          <AccordionTrigger className="text-sm font-semibold hover:no-underline py-3">
            {title}
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <Textarea
              value={summary?.[key] || ""}
              onChange={(e) => setSummary((s) => ({ ...s, [key]: e.target.value }))}
              onBlur={(e) => saveSection(key, e.target.value)}
              rows={key === "executiveSummary" ? 4 : 5}
              className="resize-y min-h-[80px] bg-background text-sm"
            />
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Sparkles className="size-4 text-primary shrink-0" />
            <h3 className="font-semibold">Discovery brief</h3>
            <Badge variant="outline">OpenAI</Badge>
            {meta?.stale && !generating ? (
              <Badge variant="secondary" className="text-[10px]">
                Out of date
              </Badge>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            {lastUpdatedLabel ? <>Last updated {lastUpdatedLabel}</> : "Not generated yet"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={hasContent ? "outline" : "default"}
            size="sm"
            onClick={handleGenerate}
            disabled={generating || !canGenerate}
            title={
              !canGenerate
                ? "Add capture notes or enrich profiles before generating the brief."
                : undefined
            }
          >
            {generating ? (
              <Loader2 className="size-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="size-4 mr-2" />
            )}
            {updateButtonLabel}
          </Button>
          {canGenerate ? (
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleGenerateDocument}
              disabled={generatingDoc}
            >
              {generatingDoc ? (
                <Loader2 className="size-4 animate-spin mr-2" />
              ) : (
                <FileText className="size-4 mr-2" />
              )}
              Generate Document
            </Button>
          ) : null}
        </div>
      </div>

      {generating && !hasContent ? (
        <div className="rounded-xl border bg-muted/20 p-12 text-center">
          <Loader2 className="size-8 animate-spin text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Updating brief from discovery data…</p>
        </div>
      ) : !hasContent ? (
        <div className="rounded-xl border border-dashed bg-muted/20 p-12 text-center">
          <Sparkles className="size-10 text-muted-foreground/40 mx-auto mb-4" />
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {canGenerate
              ? "Use Generate brief when you are ready to summarize discovery data. The brief is not updated automatically."
              : "Add capture notes or enrich profiles, then use Generate brief to build the summary."}
          </p>
        </div>
      ) : accordion ? (
        accordionFields
      ) : (
        <div className="space-y-4">
          {SECTIONS.map(({ key, title }) => (
            <div key={key} className="rounded-xl border bg-card p-4 space-y-2 shadow-sm">
              <h4 className="text-sm font-semibold">{title}</h4>
              <Textarea
                value={summary?.[key] || ""}
                onChange={(e) => setSummary((s) => ({ ...s, [key]: e.target.value }))}
                onBlur={(e) => saveSection(key, e.target.value)}
                rows={key === "executiveSummary" ? 4 : 5}
                className="resize-y min-h-[80px] bg-background text-sm"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
