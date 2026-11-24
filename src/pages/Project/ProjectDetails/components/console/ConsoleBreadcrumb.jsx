import { getService } from "../../constants/projectServices";

/** Service / page breadcrumb for the console content area. */
export function ConsoleBreadcrumb({ serviceId, pageId, className }) {
  const service = getService(serviceId);
  const page = service.pages.find((p) => p.id === pageId) ?? service.pages[0];
  const pageLabel = page?.label ?? pageId;

  return (
    <p className={className ?? "mb-4 text-sm text-muted-foreground"}>
      <span className="font-medium text-foreground/80">{service.label}</span>
      <span className="mx-1.5 text-muted-foreground/50">/</span>
      <span>{pageLabel}</span>
    </p>
  );
}
