import { cn } from "@/lib/utils";
import { CompletenessRing } from "@/pages/Project/ProductManagement/components/CompletenessRing";
import { PERSONA_TABS } from "@/pages/Project/ProductManagement/constants";
import { personaCompleteness } from "@/pages/Project/ProductManagement/utils/personaCompleteness";
import { useClientInfoContext } from "@/pages/Project/ClientInfo/hooks/useClientInfoContext";
import { getService, guideStageIdForConsolePage } from "../../constants/projectServices";
import { StageAboutPopover } from "../StageAboutPopover";

/**
 * Vertical left nav for the active service console.
 * Profiles page also shows Client / Company / Competitors / Product switcher.
 */
export function ServiceLeftNav({
  serviceId,
  pageId,
  activeProfile = "company",
  onNavigatePage,
  onNavigateProfile,
  className,
}) {
  const service = getService(serviceId);
  const pages = service.pages ?? [];
  const { clientDetails } = useClientInfoContext();
  const guideStageId = guideStageIdForConsolePage(serviceId, pageId);
  const showPersonas = serviceId === "product-strategy" && pageId === "profiles";

  const groups = [];
  for (const page of pages) {
    const key = page.navGroup || "";
    const last = groups[groups.length - 1];
    if (last && last.navGroup === key) {
      last.pages.push(page);
    } else {
      groups.push({ navGroup: key, pages: [page] });
    }
  }

  return (
    <nav
      aria-label={`${service.label} navigation`}
      data-tour="service-left-nav"
      className={cn(
        "flex w-56 shrink-0 flex-col border-r border-border bg-muted/20",
        className,
      )}
    >
      <div className="border-b border-border/60 px-3 py-3">
        <div className="flex items-center gap-1.5">
          {service.icon ? (
            <service.icon
              className="size-4 shrink-0 text-foreground/80"
              aria-hidden
            />
          ) : null}
          <p className="min-w-0 truncate text-sm font-semibold text-foreground">
            {service.label}
          </p>
          {guideStageId ? (
            <StageAboutPopover stageId={guideStageId} align="start" className="size-6" />
          ) : null}
        </div>
        {service.description ? (
          <p className="mt-0.5 text-xs text-foreground/65">{service.description}</p>
        ) : null}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-2 py-3">
        {groups.map((group) => (
          <div key={group.navGroup || "__default"} className="space-y-0.5">
            {group.navGroup ? (
              <p className="mb-1 border-b border-border/60 px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-foreground/70">
                {group.navGroup}
              </p>
            ) : null}
            <div
              className={cn(
                "space-y-0.5",
                group.navGroup && "ml-1.5 border-l border-border/70 pl-1.5",
              )}
            >
              {group.pages.map((page) => {
                const active = pageId === page.id;
                return (
                  <button
                    key={page.id}
                    type="button"
                    aria-current={active ? "page" : undefined}
                    onClick={() => onNavigatePage?.(page.id)}
                    className={cn(
                      "flex w-full items-center rounded-md px-2.5 py-1.5 text-left text-sm transition-colors duration-200",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground/85 hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {page.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {showPersonas ? (
          <div className="space-y-0.5 border-t border-border/60 pt-3">
            <p className="mb-1 border-b border-border/60 px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-foreground/70">
              Profiles
            </p>
            <div className="ml-1.5 space-y-0.5 border-l border-border/70 pl-1.5">
              {PERSONA_TABS.map(({ id, label }) => {
                const active = activeProfile === id;
                return (
                  <button
                    key={id}
                    type="button"
                    aria-current={active ? "page" : undefined}
                    onClick={() => onNavigateProfile?.(id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors duration-200",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-foreground/85 hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <CompletenessRing
                      value={personaCompleteness(clientDetails?.personas, id)}
                      size={16}
                    />
                    <span className="truncate">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </nav>
  );
}
