import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink, Link2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatDeployedAt } from "@/pages/Deployments/deploymentDisplay";

/**
 * Persistent deployment URLs for a deploy-map environment (CloudFront, API, etc.).
 */
export function EnvironmentDeploymentLinks({
  deployment,
  environmentName,
  compact = false,
  className,
}) {
  const [copiedUrl, setCopiedUrl] = useState("");
  const links = Array.isArray(deployment?.links) ? deployment.links : [];
  const deployedAtLabel = formatDeployedAt(deployment?.deployedAt);
  const showDeployedAt = deployedAtLabel && deployedAtLabel !== "—";

  const copyUrl = async (url) => {
    const target = String(url ?? "").trim();
    if (!target) return;
    try {
      await navigator.clipboard.writeText(target);
      setCopiedUrl(target);
      toast.success("Link copied.");
      window.setTimeout(() => setCopiedUrl(""), 2000);
    } catch {
      toast.error("Could not copy link.");
    }
  };

  return (
    <div
      className={cn(
        "space-y-3 rounded-lg border border-border bg-background p-4",
        compact && "p-3",
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <Link2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium text-foreground">
            {environmentName ? `Deployed links — ${environmentName}` : "Deployed links"}
          </p>
          {showDeployedAt ? (
            <p className="text-xs text-muted-foreground">Last deployed {deployedAtLabel}</p>
          ) : null}
        </div>
      </div>

      {links.length ? (
        <ul className="space-y-2">
          {links.map((link) => {
            const url = String(link?.url ?? "").trim();
            if (!url) return null;
            const label = String(link?.label ?? "Link").trim() || "Link";
            const isCopied = copiedUrl === url;
            return (
              <li
                key={`${link.id}-${url}`}
                className="flex flex-col gap-2 rounded-md border border-border bg-muted/20 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground">{label}</p>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-0.5 block truncate text-xs text-primary underline-offset-2 hover:underline"
                    title={url}
                  >
                    {url}
                  </a>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 px-2 text-xs"
                    asChild
                  >
                    <a href={url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="size-3.5" aria-hidden />
                      Open
                    </a>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1.5 px-2 text-xs"
                    onClick={() => void copyUrl(url)}
                  >
                    <Copy className="size-3.5" aria-hidden />
                    {isCopied ? "Copied" : "Copy"}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">
          No deployment links yet — deploy to Cloud to generate URLs.
        </p>
      )}
    </div>
  );
}
