import { useEffect, useState } from "react";
import { enrichClientDetails, patchClientDetails } from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useClientInfoContext } from "@/pages/Project/ClientInfo/hooks/useClientInfoContext";
import { EvidenceBadge } from "../components/EvidenceBadge";
import { SmartFieldsSection } from "../components/SmartFieldsSection";
import { COMPANY_PROFILE_FIELDS } from "../utils/profileFields";

function parseOtherUrls(raw) {
  return String(raw || "")
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function enrichErrorMessage(err) {
  const msg = err?.error || "Enrich failed";
  if (msg.includes("updating from new capture") || msg.includes("Profiles are updating")) {
    return "Profiles are updating from new capture — try again shortly.";
  }
  return msg;
}

export function CompanyPersonaView() {
  const { projectId, clientDetails, refresh, setClientDetails } = useClientInfoContext();
  const company = clientDetails?.personas?.company || {};
  const fieldSources = clientDetails?.fieldSources || {};
  const [local, setLocal] = useState(null);
  const [enriching, setEnriching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [otherUrlsRaw, setOtherUrlsRaw] = useState("");
  const data = local || company;

  useEffect(() => {
    if (local) return;
    setOtherUrlsRaw((company.socials?.other || []).join("\n"));
  }, [company, local]);

  const applyClientDetails = (payload) => {
    if (payload?.clientDetails) {
      setClientDetails(payload.clientDetails);
    }
  };

  const update = (key, value) => setLocal((prev) => ({ ...(prev || company), [key]: value }));

  const updateSocial = (key, value) =>
    setLocal((prev) => ({
      ...(prev || company),
      socials: { ...(prev || company).socials, [key]: value },
    }));

  const buildSocialsPayload = () => ({
    linkedin: data.socials?.linkedin || "",
    twitter: data.socials?.twitter || "",
    website: data.socials?.website || data.website || "",
    other: parseOtherUrls(otherUrlsRaw),
  });

  const hasEnrichmentUrl = () => {
    const socials = buildSocialsPayload();
    return Boolean(
      socials.linkedin?.trim() ||
      socials.twitter?.trim() ||
      socials.website?.trim() ||
      socials.other.length > 0,
    );
  };

  const save = async () => {
    if (!local) return;
    setSaving(true);
    try {
      await patchClientDetails(projectId, { personas: { company: local } });
      setLocal(null);
      await refresh();
      toast.success("Saved");
    } catch (err) {
      toast.error(err?.error || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const enrichProfile = async () => {
    if (!hasEnrichmentUrl()) {
      toast.error("Add a website or social URL first");
      return;
    }
    setEnriching(true);
    try {
      const socials = buildSocialsPayload();
      if (local) {
        await patchClientDetails(projectId, {
          personas: { company: { ...local, socials } },
        });
      }
      const result = await enrichClientDetails(projectId, {
        socials,
        scope: "company",
      });
      applyClientDetails(result);
      setLocal(null);
      await refresh({ silent: true });
      toast.success("Company profile enriched");
    } catch (err) {
      toast.error(enrichErrorMessage(err));
    } finally {
      setEnriching(false);
    }
  };

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              onClick={enrichProfile}
              disabled={enriching || !hasEnrichmentUrl()}
            >
              {enriching ? (
                <Loader2 className="size-4 animate-spin mr-2" />
              ) : (
                <Sparkles className="size-4 mr-2" />
              )}
              Enrich profile
            </Button>
            {local ? (
              <Button type="button" size="sm" variant="secondary" onClick={save} disabled={saving}>
                Save changes
              </Button>
            ) : null}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Add your website and social URLs below, then enrich to scan all sources and fill profile
            fields.
          </p>
          <div className="ds-inset space-y-2 p-3">
            <p className="text-xs font-medium text-foreground">Enrichment inputs</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {["linkedin", "twitter", "website"].map((k) => (
                <div key={k} className="space-y-1">
                  <Label className="text-xs capitalize">
                    {k === "twitter" ? "Twitter / X" : k}
                  </Label>
                  <Input
                    value={data.socials?.[k] || (k === "website" ? data.website : "") || ""}
                    onChange={(e) => {
                      if (k === "website") {
                        update("website", e.target.value);
                        updateSocial("website", e.target.value);
                      } else {
                        updateSocial(k, e.target.value);
                      }
                    }}
                    placeholder="https://"
                  />
                </div>
              ))}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Other URLs</Label>
              <Textarea
                value={otherUrlsRaw}
                onChange={(e) => setOtherUrlsRaw(e.target.value)}
                placeholder="One URL per line or comma-separated"
                rows={2}
              />
            </div>
          </div>
          {COMPANY_PROFILE_FIELDS.map(({ key, label, textarea }) => (
            <div key={key} className="space-y-1">
              <div className="flex items-center gap-2">
                <Label className="text-xs">{label}</Label>
                <EvidenceBadge
                  source={
                    fieldSources[`personas.company.${key}`] ||
                    fieldSources[`persona.company.${key}`]
                  }
                />
              </div>
              {textarea ? (
                <Textarea
                  value={data[key] || ""}
                  onChange={(e) => update(key, e.target.value)}
                  rows={3}
                />
              ) : (
                <Input value={data[key] || ""} onChange={(e) => update(key, e.target.value)} />
              )}
            </div>
          ))}
        </div>
        <div className="ds-inset h-fit space-y-2 rounded-xl p-4 lg:sticky lg:top-4">
          <h4 className="text-sm font-semibold">AI summary</h4>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap min-h-[120px]">
            {company.meta?.aiSummary ||
              "Add URLs and enrich, or add timeline entries to build the company profile."}
          </p>
          {company.meta?.summaryStale ? (
            <p className="text-xs text-amber-600">
              Summary may be outdated — new timeline data available.
            </p>
          ) : null}
        </div>
      </div>
      <SmartFieldsSection personaType="company" />
    </>
  );
}
