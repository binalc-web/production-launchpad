import { useEffect, useState } from "react";
import { clientSocialScrape, generatePersonaInsights, patchClientDetails } from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useClientInfoContext } from "@/pages/Project/ClientInfo/hooks/useClientInfoContext";
import { EvidenceBadge } from "../components/EvidenceBadge";
import { SmartFieldsSection } from "../components/SmartFieldsSection";
import { CLIENT_PROFILE_FIELDS } from "../utils/profileFields";

function parseOtherUrls(raw) {
  return String(raw || "")
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function enrichErrorMessage(err) {
  const msg = err?.error || "Generate failed";
  if (msg.includes("updating from new capture") || msg.includes("Profiles are updating")) {
    return "Profiles are updating from new capture — try again shortly.";
  }
  return msg;
}

export function ClientPersonaView() {
  const { projectId, clientDetails, refresh, setClientDetails } = useClientInfoContext();
  const client = clientDetails?.personas?.client || {};
  const fieldSources = clientDetails?.fieldSources || {};
  const [local, setLocal] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [otherUrlsRaw, setOtherUrlsRaw] = useState((client.socials?.other || []).join("\n"));
  const data = local || client;

  useEffect(() => {
    if (local) return;
    setOtherUrlsRaw((client.socials?.other || []).join("\n"));
  }, [client, local]);

  const applyClientDetails = (payload) => {
    if (payload?.clientDetails) {
      setClientDetails(payload.clientDetails);
    }
  };

  const updateContact = (key, value) =>
    setLocal((prev) => ({
      ...(prev || client),
      primaryContact: { ...(prev || client).primaryContact, [key]: value },
    }));

  const updateSocial = (key, value) =>
    setLocal((prev) => ({
      ...(prev || client),
      socials: { ...(prev || client).socials, [key]: value },
    }));

  const updateField = (key, value) => setLocal((prev) => ({ ...(prev || client), [key]: value }));

  const buildSocialsPayload = () => ({
    linkedin: data.socials?.linkedin || "",
    twitter: data.socials?.twitter || "",
    website: data.socials?.website || "",
    other: parseOtherUrls(otherUrlsRaw),
  });

  const hasSocialUrl = () => {
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
    try {
      await patchClientDetails(projectId, { personas: { client: local } });
      setLocal(null);
      await refresh();
      toast.success("Saved");
    } catch (err) {
      toast.error(err?.error || "Save failed");
    }
  };

  const refreshInsights = async () => {
    setRefreshing(true);
    try {
      await generatePersonaInsights(projectId);
      await refresh();
      toast.success("Client profile refreshed");
    } catch (err) {
      toast.error(err?.error || "Refresh failed");
    } finally {
      setRefreshing(false);
    }
  };

  const generateFromSocials = async () => {
    if (!hasSocialUrl()) {
      toast.error("Add at least one social URL");
      return;
    }
    setGenerating(true);
    try {
      const socials = buildSocialsPayload();
      if (local) {
        await patchClientDetails(projectId, {
          personas: { client: { ...local, socials } },
        });
      }
      const result = await clientSocialScrape(projectId, { socials });
      applyClientDetails(result);
      setLocal(null);
      await refresh({ silent: true });
      toast.success("Client profile enriched");
    } catch (err) {
      toast.error(enrichErrorMessage(err));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 items-center">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={refreshInsights}
              disabled={refreshing || generating}
            >
              {refreshing ? (
                <Loader2 className="size-4 animate-spin mr-2" />
              ) : (
                <Sparkles className="size-4 mr-2" />
              )}
              Refresh insights
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={generateFromSocials}
              disabled={generating || refreshing || !hasSocialUrl()}
            >
              {generating ? (
                <Loader2 className="size-4 animate-spin mr-2" />
              ) : (
                <Sparkles className="size-4 mr-2" />
              )}
              Enrich profile
            </Button>
            {local ? (
              <Button type="button" size="sm" variant="secondary" onClick={save}>
                Save changes
              </Button>
            ) : null}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Add social URLs below, then enrich to scan all sources and fill profile fields.
          </p>
          <div className="ds-inset space-y-2 p-3">
            <p className="text-xs font-medium text-foreground">Enrichment inputs</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {["name", "email", "role"].map((k) => (
                <div key={k} className="space-y-1">
                  <Label className="text-xs capitalize">{k}</Label>
                  <Input
                    value={data.primaryContact?.[k] || ""}
                    onChange={(e) => updateContact(k, e.target.value)}
                  />
                </div>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {["linkedin", "twitter", "website"].map((k) => (
                <div key={k} className="space-y-1">
                  <Label className="text-xs capitalize">
                    {k === "twitter" ? "Twitter / X" : k}
                  </Label>
                  <Input
                    value={data.socials?.[k] || ""}
                    onChange={(e) => updateSocial(k, e.target.value)}
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
          {CLIENT_PROFILE_FIELDS.map(({ key, label, textarea }) => (
            <div key={key} className="space-y-1">
              <div className="flex items-center gap-2">
                <Label className="text-xs">{label}</Label>
                <EvidenceBadge
                  source={
                    fieldSources[`personas.client.${key}`] ||
                    fieldSources[`persona.stakeholderInsights.${key}`]
                  }
                />
              </div>
              {textarea ? (
                <Textarea
                  value={data[key] || ""}
                  onChange={(e) => updateField(key, e.target.value)}
                  rows={2}
                />
              ) : (
                <Input value={data[key] || ""} onChange={(e) => updateField(key, e.target.value)} />
              )}
            </div>
          ))}
        </div>
        <div className="ds-inset h-fit rounded-xl p-4 lg:sticky lg:top-4">
          <h4 className="text-sm font-semibold">AI summary</h4>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-2 min-h-[120px]">
            {client.meta?.aiSummary ||
              "Add social URLs and call notes to build the client profile."}
          </p>
        </div>
      </div>
      <SmartFieldsSection personaType="client" />
    </>
  );
}
