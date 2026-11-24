import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { getDeployMap } from "@/api";
import { buildProjectStatusItems, resolveFrontendDeployUrl } from "@/lib/projectStatusPresentation";

const VALUE_VARIANTS = {
  default: "text-foreground",
  primary: "text-primary",
  muted: "text-muted-foreground",
  warning: "text-amber-800 dark:text-amber-200",
};

const INLINE_VALUE_VARIANTS = {
  default: "text-sidebar-foreground",
  primary: "text-emerald-400",
  muted: "text-sidebar-foreground/55",
  warning: "text-amber-300",
};

function StatusBarItem({ item, onNavigate, dense = false, valueAddon = null }) {
  const { id, label, value, variant = "default", hint, href, navigate } = item;

  const handleClick = () => {
    if (href) {
      window.open(href, "_blank", "noopener,noreferrer");
      return;
    }
    onNavigate?.(navigate);
  };

  if (dense) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className="flex min-w-0 shrink-0 flex-col gap-0 px-2.5 py-0.5 text-left transition-colors duration-200 hover:bg-sidebar-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        aria-label={
          href
            ? `${label}: ${value}. Open frontend site in a new tab`
            : `${label}: ${value}. Go to ${navigate.section}`
        }
        title={hint ?? `${label}: ${value}`}
      >
        <span className="whitespace-nowrap text-[11px] font-medium leading-tight text-sidebar-foreground/55">
          {label}
        </span>
        <span className="flex min-w-0 items-center gap-1.5">
          <span
            className={cn(
              "max-w-[7.5rem] truncate text-[13px] font-semibold leading-tight",
              INLINE_VALUE_VARIANTS[variant] ?? INLINE_VALUE_VARIANTS.default,
            )}
            data-status-id={id}
          >
            {value}
          </span>
          {valueAddon}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="group flex min-w-[7.5rem] shrink-0 flex-col gap-0.5 rounded-md px-3 py-1.5 text-left transition-colors duration-200 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      aria-label={
        href
          ? `${label}: ${value}. Open frontend site in a new tab`
          : `${label}: ${value}. Go to ${navigate.section}`
      }
      title={hint ?? undefined}
    >
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span
        className={cn(
          "truncate text-sm font-medium",
          VALUE_VARIANTS[variant] ?? VALUE_VARIANTS.default,
        )}
        data-status-id={id}
      >
        {value}
      </span>
    </button>
  );
}

/**
 * Project status metrics.
 * @param {{ dense?: boolean }} [props] — dense = single-row top-nav (sidebar colors)
 */
export function ProjectDetailsStatusStrip({
  project,
  onNavigate,
  dense = false,
  className,
  itemAddons = null,
}) {
  const [frontendDeployUrl, setFrontendDeployUrl] = useState("");

  useEffect(() => {
    if (!project?.id) {
      setFrontendDeployUrl("");
      return undefined;
    }

    let cancelled = false;
    getDeployMap(project.id)
      .then((data) => {
        if (!cancelled) {
          setFrontendDeployUrl(resolveFrontendDeployUrl(data));
        }
      })
      .catch(() => {
        if (!cancelled) setFrontendDeployUrl("");
      });

    return () => {
      cancelled = true;
    };
  }, [project?.id]);

  const items = useMemo(
    () => buildProjectStatusItems(project, { frontendDeployUrl }),
    [project, frontendDeployUrl],
  );

  if (!items.length) return null;

  return (
    <div
      className={cn(
        dense
          ? "flex min-w-0 items-center divide-x divide-sidebar-border overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          : "flex items-stretch divide-x divide-border overflow-x-auto px-1 py-0.5",
        className,
      )}
      role="region"
      aria-label="Project status"
    >
      {items.map((item) => (
        <StatusBarItem
          key={item.id}
          item={item}
          onNavigate={onNavigate}
          dense={dense}
          valueAddon={itemAddons?.[item.id] ?? null}
        />
      ))}
    </div>
  );
}
