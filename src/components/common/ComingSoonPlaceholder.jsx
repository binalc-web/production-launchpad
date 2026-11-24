import { cn } from "@/lib/utils";

export function ComingSoonPlaceholder({
  label,
  description,
  icon: Icon,
  className,
}) {
  const title = label ? `${label} — coming soon` : "Coming soon";

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card px-6 py-16 text-center",
        className,
      )}
      aria-live="polite"
    >
      {Icon ? (
        <div className="mx-auto mb-4 flex size-12 items-center justify-center text-muted-foreground">
          <Icon className="size-8 stroke-[1.5]" aria-hidden />
        </div>
      ) : null}
      <p className="text-base font-semibold text-foreground">{title}</p>
      {description ? (
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
  );
}
