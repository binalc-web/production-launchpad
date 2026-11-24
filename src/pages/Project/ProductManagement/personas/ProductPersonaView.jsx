import { useState } from "react";
import { patchClientDetails } from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useClientInfoContext } from "@/pages/Project/ClientInfo/hooks/useClientInfoContext";
import { ExistingSaasProductsSection } from "../components/ExistingSaasProductsSection";
import { SmartFieldsSection } from "../components/SmartFieldsSection";
import { PRODUCT_PROFILE_FIELDS } from "../utils/profileFields";

export function ProductPersonaView() {
  const { projectId, clientDetails, refresh } = useClientInfoContext();
  const product = clientDetails?.personas?.product || {};
  const [local, setLocal] = useState(null);
  const [saving, setSaving] = useState(false);
  const data = local || product;

  const update = (key, value) => setLocal((prev) => ({ ...(prev || product), [key]: value }));

  const save = async () => {
    if (!local) return;
    setSaving(true);
    try {
      await patchClientDetails(projectId, {
        personas: {
          product: {
            ...local,
            existingProducts: product.existingProducts || [],
            smartFields: product.smartFields || [],
            meta: product.meta,
          },
        },
      });
      setLocal(null);
      await refresh();
      toast.success("Saved");
    } catch (err) {
      toast.error(err?.error || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="space-y-1">
            <h3 className="font-semibold">New SaaS product</h3>
            <p className="text-xs text-muted-foreground">
              What you are building together in this engagement. Fill from discovery calls and
              timeline captures.
            </p>
          </div>
          {local ? (
            <Button type="button" size="sm" variant="secondary" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
              Save changes
            </Button>
          ) : null}
          {PRODUCT_PROFILE_FIELDS.map(({ key, label, textarea }) => (
            <div key={key} className="space-y-1">
              <Label className="text-xs">{label}</Label>
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
          <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-2 min-h-[120px]">
            {product.meta?.aiSummary ||
              "Add timeline captures and refresh this profile to build the new product summary."}
          </p>
          {product.meta?.summaryStale ? (
            <p className="text-xs text-amber-600">
              Summary may be outdated — new timeline data available.
            </p>
          ) : null}
        </div>
      </section>

      <ExistingSaasProductsSection />
      <SmartFieldsSection personaType="product" />
    </div>
  );
}
