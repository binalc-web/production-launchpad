import { useMemo, useState } from "react";
import { enrichClientDetails, generatePersonaInsights, undoDiscoveryDocumentFill } from "@/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Loader2, Sparkles, User, X } from "lucide-react";
import { toast } from "sonner";
import { useClientInfoAutoSave } from "../hooks/useClientInfoAutoSave";
import { useClientInfoContext } from "../hooks/useClientInfoContext";

function enrichedClass(fieldSources, path) {
  const src = fieldSources?.[path];
  if (src === "tavily_enriched" || src === "ai_scraped" || src === "merged" || src === "document_extracted") {
    return "border-emerald-400/60 bg-emerald-50/40 dark:bg-emerald-950/20";
  }
  return "";
}

function appliedFieldCount(appliedFields) {
  if (!appliedFields) return 0;
  return (
    Object.keys(appliedFields.personaPaths || {}).length +
    Object.keys(appliedFields.scalarKeys || {}).length
  );
}

const COMPANY_FIELDS = [
  { key: "name", label: "Company name" },
  { key: "website", label: "Website" },
  { key: "industry", label: "Industry" },
  { key: "size", label: "Company size" },
  { key: "location", label: "HQ location" },
  { key: "founded", label: "Founded" },
  { key: "businessModel", label: "Business model" },
  { key: "revenue", label: "Revenue estimate" },
  { key: "targetAudience", label: "Target audience" },
  { key: "description", label: "Business description", textarea: true },
];

export function ClientPersonaTab() {
  const { projectId, clientDetails, refresh } = useClientInfoContext();
  const { saveBulk } = useClientInfoAutoSave(projectId);
  const [enrichUrl, setEnrichUrl] = useState(clientDetails?.persona?.company?.website || "");
  const [enriching, setEnriching] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [local, setLocal] = useState(null);
  const [dismissedDocId, setDismissedDocId] = useState(null);

  const persona = local || clientDetails?.persona;
  const fieldSources = clientDetails?.fieldSources || {};

  const recentAutoFillDoc = useMemo(() => {
    const docs = clientDetails?.documents || [];
    for (let i = docs.length - 1; i >= 0; i -= 1) {
      const d = docs[i];
      if (appliedFieldCount(d.appliedFields) > 0) return d;
    }
    return null;
  }, [clientDetails?.documents]);

  const showAutoFillBanner =
    recentAutoFillDoc && recentAutoFillDoc.id !== dismissedDocId;

  if (!persona && !clientDetails) return null;

  const updateCompany = (key, value) => {
    setLocal((prev) => {
      const base = prev || clientDetails.persona;
      return {
        ...base,
        company: { ...base.company, [key]: value },
      };
    });
  };

  const savePersona = async () => {
    if (!local) return;
    try {
      await saveBulk({ ...clientDetails, persona: local });
      setLocal(null);
      await refresh();
    } catch (err) {
      toast.error(err?.error || "Save failed");
    }
  };

  const handleEnrich = async () => {
    if (!enrichUrl.trim()) return;
    setEnriching(true);
    try {
      await enrichClientDetails(projectId, { url: enrichUrl.trim() });
      await refresh();
      toast.success("Persona enriched");
    } catch (err) {
      toast.error(err?.error || "Enrichment failed");
    } finally {
      setEnriching(false);
    }
  };

  const handleUndoAutoFill = async () => {
    if (!recentAutoFillDoc?.id) return;
    try {
      await undoDiscoveryDocumentFill(projectId, recentAutoFillDoc.id);
      setDismissedDocId(recentAutoFillDoc.id);
      await refresh();
      toast.success("Auto-fill reverted");
    } catch (err) {
      toast.error(err?.error || "Undo failed");
    }
  };

  const handleGenerateInsights = async () => {
    setGenerating(true);
    try {
      await generatePersonaInsights(projectId);
      await refresh();
      toast.success("AI insights generated");
    } catch (err) {
      toast.error(err?.error || "Failed to generate insights");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-2">
        <User className="size-4 text-primary" />
        <h3 className="font-semibold">Client persona</h3>
        <Badge variant="outline">{clientDetails?.lastEnrichedAt ? "Tavily enriched" : "Manual"}</Badge>
      </div>

      {showAutoFillBanner && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 dark:bg-emerald-950/20 px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-sm">
          <p>
            Auto-filled from <span className="font-medium">{recentAutoFillDoc.name}</span>. All fields are editable.
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={handleUndoAutoFill}>
              Undo auto-fill
            </Button>
            <Button type="button" variant="ghost" size="icon" className="size-8" onClick={() => setDismissedDocId(recentAutoFillDoc.id)}>
              <X className="size-4" />
            </Button>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Input
          value={enrichUrl}
          onChange={(e) => setEnrichUrl(e.target.value)}
          placeholder="Company website, LinkedIn, or URL…"
          className="flex-1"
        />
        <Button type="button" onClick={handleEnrich} disabled={enriching}>
          {enriching ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
          Enrich
        </Button>
      </div>

      <div className="rounded-xl border bg-card p-4 space-y-4 shadow-sm">
        <h4 className="text-sm font-semibold">Company</h4>
        <div className="grid gap-3 sm:grid-cols-2">
          {COMPANY_FIELDS.map(({ key, label, textarea }) => (
            <div key={key} className={textarea ? "sm:col-span-2 space-y-1" : "space-y-1"}>
              <Label className="text-xs">{label}</Label>
              {textarea ? (
                <Textarea
                  value={persona?.company?.[key] || ""}
                  onChange={(e) => updateCompany(key, e.target.value)}
                  onBlur={savePersona}
                  rows={3}
                  className={cn("resize-y", enrichedClass(fieldSources, `persona.company.${key}`))}
                />
              ) : (
                <Input
                  value={persona?.company?.[key] || ""}
                  onChange={(e) => updateCompany(key, e.target.value)}
                  onBlur={savePersona}
                  className={enrichedClass(fieldSources, `persona.company.${key}`)}
                />
              )}
            </div>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 pt-2 border-t">
          <div className="space-y-1">
            <Label className="text-xs">CEO / Founder name</Label>
            <Input
              value={persona?.company?.ceo?.name || ""}
              onChange={(e) =>
                setLocal((prev) => {
                  const base = prev || clientDetails.persona;
                  return { ...base, company: { ...base.company, ceo: { ...base.company.ceo, name: e.target.value } } };
                })
              }
              onBlur={savePersona}
              className={enrichedClass(fieldSources, "persona.company.ceo.name")}
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">CEO background</Label>
            <Textarea
              value={persona?.company?.ceo?.background || ""}
              onChange={(e) =>
                setLocal((prev) => {
                  const base = prev || clientDetails.persona;
                  return { ...base, company: { ...base.company, ceo: { ...base.company.ceo, background: e.target.value } } };
                })
              }
              onBlur={savePersona}
              rows={2}
              className={enrichedClass(fieldSources, "persona.company.ceo.background")}
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4 space-y-3 shadow-sm">
        <h4 className="text-sm font-semibold">Primary contact</h4>
        <div className="grid gap-3 sm:grid-cols-3">
          {["name", "email", "role"].map((key) => (
            <div key={key} className="space-y-1">
              <Label className="text-xs capitalize">{key}</Label>
              <Input
                value={persona?.primaryContact?.[key] || ""}
                onChange={(e) =>
                  setLocal((prev) => {
                    const base = prev || clientDetails.persona;
                    return { ...base, primaryContact: { ...base.primaryContact, [key]: e.target.value } };
                  })
                }
                onBlur={savePersona}
                className={enrichedClass(fieldSources, `persona.primaryContact.${key}`)}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4 space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold flex items-center gap-1">
            <Sparkles className="size-3.5" /> AI-generated blocks
          </h4>
          <Button type="button" variant="outline" size="sm" onClick={handleGenerateInsights} disabled={generating}>
            {generating ? <Loader2 className="size-4 animate-spin" /> : "Regenerate"}
          </Button>
        </div>
        {[
          { title: "Client expectations", block: persona?.aiExpectations, keys: ["successDefinition", "deliverables", "outcomes", "metrics", "timeline"] },
          { title: "Stakeholder insights", block: persona?.stakeholderInsights, keys: ["authority", "priorities", "concerns", "commsPreference"] },
        ].map(({ title, block, keys }) => (
          <div key={title} className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">{title}</p>
            {keys.map((key) => (
              <div key={key} className="space-y-1">
                <Label className="text-xs capitalize">{key.replace(/([A-Z])/g, " $1")}</Label>
                <Textarea
                  value={block?.[key] || ""}
                  onChange={(e) =>
                    setLocal((prev) => {
                      const base = prev || clientDetails.persona;
                      const parentKey = title.includes("expectations") ? "aiExpectations" : "stakeholderInsights";
                      return { ...base, [parentKey]: { ...base[parentKey], [key]: e.target.value } };
                    })
                  }
                  onBlur={savePersona}
                  rows={2}
                  className={cn("text-sm", enrichedClass(fieldSources, `persona.${title.includes("expectations") ? "aiExpectations" : "stakeholderInsights"}.${key}`))}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
