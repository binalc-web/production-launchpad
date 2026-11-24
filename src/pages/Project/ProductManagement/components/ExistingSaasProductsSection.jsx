import { useEffect, useState } from "react";
import {
  detectExistingSaasProducts,
  patchClientDetails,
  refreshExistingSaasProducts,
} from "@/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Box, Loader2, Plus, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useClientInfoContext } from "@/pages/Project/ClientInfo/hooks/useClientInfoContext";
import { AddExistingSaasProductDialog } from "./AddExistingSaasProductDialog";

const SOURCE_LABELS = {
  website_detected: "Auto-detected",
  website_scan: "Website scan",
  manual: "Manual",
};

/** Survives panel unmount when workspace `loading` toggles during refresh. */
const autoDetectAttemptedByProject = new Set();

function enrichErrorMessage(err) {
  const msg = err?.error || "Detection failed";
  if (
    msg.includes("updating from new capture") ||
    msg.includes("Profiles are updating")
  ) {
    return "Profiles are updating from new capture — try again shortly.";
  }
  return msg;
}

function hasCompanyWebsite(clientDetails) {
  const company = clientDetails?.personas?.company || {};
  return Boolean(
    company.website || company.socials?.website || clientDetails?.website,
  );
}

export function ExistingSaasProductsSection() {
  const { projectId, clientDetails, refresh, setClientDetails } =
    useClientInfoContext();
  const product = clientDetails?.personas?.product || {};
  const existingProducts = product.existingProducts || [];
  const [detecting, setDetecting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const applyDetectResult = (result) => {
    if (result?.clientDetails) {
      setClientDetails(result.clientDetails);
    }
  };

  const persistProducts = async (next) => {
    try {
      await patchClientDetails(projectId, {
        personas: {
          product: {
            ...product,
            existingProducts: next,
          },
        },
      });
      await refresh({ silent: true });
    } catch (err) {
      toast.error(err?.error || "Save failed");
    }
  };

  const updateProduct = (id, key, value) => {
    const next = existingProducts.map((item) =>
      item.id === id ? { ...item, [key]: value, source: "manual" } : item,
    );
    persistProducts(next);
  };

  const removeProduct = (id) => {
    persistProducts(existingProducts.filter((item) => item.id !== id));
  };

  const runDetect = async ({ silent = false } = {}) => {
    if (!projectId || detecting) return;
    setDetecting(true);
    try {
      const result = await detectExistingSaasProducts(projectId);
      applyDetectResult(result);
      await refresh({ silent: true });
      if (!silent) {
        const count = result?.products?.length ?? existingProducts.length;
        toast.success(
          count > 0
            ? `Detected ${count} existing SaaS product${count === 1 ? "" : "s"}`
            : "Scan complete — no existing products found on the website",
        );
      }
    } catch (err) {
      if (!silent) toast.error(enrichErrorMessage(err));
    } finally {
      setDetecting(false);
    }
  };

  const runRefresh = async () => {
    if (!projectId || refreshing) return;
    setRefreshing(true);
    try {
      const result = await refreshExistingSaasProducts(projectId, {
        merge: true,
      });
      applyDetectResult(result);
      await refresh({ silent: true });
      toast.success("Existing SaaS products refreshed");
    } catch (err) {
      toast.error(enrichErrorMessage(err));
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!projectId) return;
    if (autoDetectAttemptedByProject.has(projectId)) return;
    if (!hasCompanyWebsite(clientDetails)) return;
    if (existingProducts.length > 0) return;

    autoDetectAttemptedByProject.add(projectId);
    runDetect({ silent: true }).catch(() => {});
  }, [
    projectId,
    existingProducts.length,
    clientDetails?.personas?.company?.website,
    clientDetails?.personas?.company?.socials?.website,
    clientDetails?.website,
  ]);

  const busy = detecting || refreshing;

  return (
    <section className="space-y-4 border-t pt-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Box className="size-4 text-primary" />
            <h3 className="font-semibold">Existing SaaS products</h3>
            <Badge variant="outline">Multi-page crawl</Badge>
          </div>
          <p className="text-xs text-muted-foreground max-w-xl">
            Products the client already sells. We scan the company website
            across multiple pages; add a product URL manually if one was missed.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={runDetect}
            disabled={busy || !hasCompanyWebsite(clientDetails)}
          >
            {detecting ? (
              <Loader2 className="size-4 animate-spin mr-2" />
            ) : (
              <Sparkles className="size-4 mr-2" />
            )}
            Detect from company website
          </Button>
          {existingProducts.length > 0 ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={runRefresh}
              disabled={busy || !hasCompanyWebsite(clientDetails)}
            >
              {refreshing ? (
                <Loader2 className="size-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="size-4 mr-2" />
              )}
              Refresh
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setAddOpen(true)}
          >
            <Plus className="size-4 mr-2" />
            Add from product website
          </Button>
        </div>
      </div>

      {busy && existingProducts.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-8 text-center">
          <Loader2 className="size-5 mx-auto animate-spin text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            Scanning company website for existing products…
          </p>
        </div>
      ) : existingProducts.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-8 text-center space-y-2">
          <Box className="size-5 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {hasCompanyWebsite(clientDetails)
              ? "No existing products detected yet. Try detect again or add a product page URL."
              : "Add a company website on the Company profile to auto-detect existing products."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {existingProducts.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border bg-card p-4 space-y-2 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <Input
                  value={item.name || ""}
                  onChange={(e) =>
                    updateProduct(item.id, "name", e.target.value)
                  }
                  placeholder="Product name"
                  className="font-semibold border-0 px-0 h-auto focus-visible:ring-0"
                />
                <div className="flex items-center gap-1 shrink-0">
                  {item.source ? (
                    <Badge variant="outline" className="text-[10px]">
                      {SOURCE_LABELS[item.source] || item.source}
                    </Badge>
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => removeProduct(item.id)}
                    aria-label="Remove product"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
              <Input
                value={item.website || ""}
                onChange={(e) =>
                  updateProduct(item.id, "website", e.target.value)
                }
                placeholder="https://company.com/product"
                className="text-xs"
              />
              <div className="space-y-1">
                <Label className="text-xs">Description</Label>
                <Textarea
                  value={item.description || ""}
                  onChange={(e) =>
                    updateProduct(item.id, "description", e.target.value)
                  }
                  rows={2}
                  className="text-sm"
                />
              </div>
              <Input
                value={item.targetUsers || ""}
                onChange={(e) =>
                  updateProduct(item.id, "targetUsers", e.target.value)
                }
                placeholder="Target users"
                className="text-sm"
              />
              <Textarea
                value={item.keyFeatures || ""}
                onChange={(e) =>
                  updateProduct(item.id, "keyFeatures", e.target.value)
                }
                placeholder="Key features"
                rows={2}
                className="text-sm"
              />
              <Input
                value={item.positioning || ""}
                onChange={(e) =>
                  updateProduct(item.id, "positioning", e.target.value)
                }
                placeholder="Positioning"
                className="text-sm"
              />
            </div>
          ))}
        </div>
      )}

      <AddExistingSaasProductDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        projectId={projectId}
        onAdded={() => refresh({ silent: true })}
      />
    </section>
  );
}
