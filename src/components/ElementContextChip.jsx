import React from "react";
import { SquareMousePointer, X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { buildOpeningTagSnippet } from "@/lib/previewElementAnchor.util";
import { parseContextBlockToInspectorCtx } from "@/pages/ClientLink/components/ClientLinkPreviewPicker";

function InspectorBlock({ title, children }) {
  return (
    <div className="border-b border-zinc-800/90 py-2.5 first:pt-1 last:border-0 last:pb-1">
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        {title}
      </div>
      {children}
    </div>
  );
}

function ElementInspectorTooltipBody({ ctx }) {
  if (!ctx) {
    return <p className="px-2 py-3 text-xs text-zinc-500">No element details.</p>;
  }

  const openSnippet = buildOpeningTagSnippet(ctx);
  const pathLine = ctx.domPath || ctx.selector || "—";

  const attrRows = [];
  if (ctx.className) attrRows.push(["class", ctx.className]);
  if (ctx.id) attrRows.push(["id", ctx.id]);
  if (ctx.role) attrRows.push(["role", ctx.role]);
  if (ctx.href) attrRows.push(["href", ctx.href]);
  if (ctx.ariaLabel) attrRows.push(["aria-label", ctx.ariaLabel]);
  if (ctx.dataTestId) attrRows.push(["data-testid", ctx.dataTestId]);
  if (ctx.dataComponent) attrRows.push(["data-component", ctx.dataComponent]);
  if (ctx.dataCy) attrRows.push(["data-cy", ctx.dataCy]);
  if (ctx.componentHint && !ctx.dataTestId && !ctx.dataComponent && !ctx.dataCy) {
    attrRows.push(["hint", ctx.componentHint]);
  }

  const computedEntries =
    ctx.computedStyles && typeof ctx.computedStyles === "object"
      ? Object.entries(ctx.computedStyles)
      : [];

  return (
    <div className="max-h-[min(70vh,32rem)] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto px-3 py-2">
      <InspectorBlock title="Element">
        <pre className="whitespace-pre-wrap break-all font-mono text-[11px] leading-snug text-sky-300">
          {openSnippet}
        </pre>
      </InspectorBlock>
      <InspectorBlock title="Path">
        <p className="break-all font-mono text-[11px] leading-snug text-zinc-300">{pathLine}</p>
        {ctx.path ? (
          <p className="mt-1.5 font-mono text-[10px] text-zinc-500">URL: {ctx.path}</p>
        ) : null}
      </InspectorBlock>
      {ctx.reactComponentStack?.length ? (
        <InspectorBlock title="React components">
          <p className="break-words font-mono text-[11px] leading-snug text-zinc-200">
            {ctx.reactComponentStack.join(" → ")}
          </p>
          {ctx.reactSourceFile ? (
            <p className="mt-1.5 font-mono text-[10px] text-zinc-500">
              Source: {ctx.reactSourceFile}
              {ctx.reactSourceLine != null ? `:${ctx.reactSourceLine}` : ""}
            </p>
          ) : null}
        </InspectorBlock>
      ) : null}
      {ctx.textPreview ? (
        <InspectorBlock title="Visible text">
          <p className="whitespace-pre-wrap break-words font-mono text-[11px] leading-snug text-zinc-200">
            {ctx.textPreview}
          </p>
        </InspectorBlock>
      ) : null}
      <InspectorBlock title="Attributes">
        {attrRows.length === 0 ? (
          <p className="text-[11px] text-zinc-500">No attributes captured.</p>
        ) : (
          <dl className="space-y-2">
            {attrRows.map(([k, v]) => (
              <div key={k}>
                <dt className="font-mono text-[11px] text-sky-400">{k}:</dt>
                <dd className="mt-0.5 whitespace-pre-wrap break-all font-mono text-[11px] text-zinc-200">
                  {v}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </InspectorBlock>
      <InspectorBlock title="Computed styles">
        {computedEntries.length === 0 ? (
          <p className="text-[11px] text-zinc-500">No snapshot (older pick or unavailable).</p>
        ) : (
          <dl className="space-y-2">
            {computedEntries.map(([k, v]) => (
              <div
                key={k}
                className="flex flex-wrap items-start gap-x-2 gap-y-1 font-mono text-[11px]"
              >
                <dt className="shrink-0 text-sky-400">{k}:</dt>
                <dd className="flex min-w-0 flex-1 items-center gap-2 text-zinc-200">
                  {(k === "color" || k === "background-color") && v ? (
                    <span
                      className="inline-block size-3.5 shrink-0 rounded-sm border border-zinc-600 bg-zinc-800"
                      style={{ backgroundColor: v }}
                      title={v}
                    />
                  ) : null}
                  <span className="min-w-0 break-all">{v}</span>
                </dd>
              </div>
            ))}
          </dl>
        )}
      </InspectorBlock>
    </div>
  );
}

/**
 * Compact chip for a pinned visual-pick element (AI Chat composer, feedback modal).
 * @param {{ tag: string, inspectorCtx?: object | null, contextBlock?: string, onRemove?: () => void, variant?: 'composer' | 'onPrimary', className?: string }} props
 */
export function ElementContextChip({
  tag,
  inspectorCtx = null,
  contextBlock = "",
  onRemove,
  variant = "composer",
  className,
}) {
  const ctx = inspectorCtx || (contextBlock ? parseContextBlockToInspectorCtx(contextBlock) : null);

  const chipVisual =
    variant === "onPrimary"
      ? "border border-white bg-emerald-500/15 text-white ring-1 ring-white/30"
      : "border-emerald-600/40 bg-emerald-50 text-emerald-950 ring-1 ring-emerald-600/15 dark:border-emerald-500/45 dark:bg-emerald-950/55 dark:text-emerald-50 dark:ring-emerald-500/20";

  const iconClass = variant === "onPrimary" ? "text-white" : "text-primary";

  const monoClass =
    variant === "onPrimary"
      ? "text-white py-0.5 leading-tight"
      : "text-emerald-900 leading-tight dark:text-emerald-100";

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex max-w-[min(100%,16rem)] shrink-0 items-center gap-1 rounded-2xl px-1.5 text-[11px] leading-tight",
            chipVisual,
            onRemove && "pr-0",
            className,
          )}
        >
          <SquareMousePointer className={cn("size-2.5 shrink-0", iconClass)} aria-hidden />
          <span className={cn("truncate font-mono text-[11px] leading-tight", monoClass)}>
            &lt;{tag}&gt;
          </span>
          {onRemove ? (
            <button
              type="button"
              className="flex size-5 shrink-0 items-center justify-center rounded-2xl text-primary hover:bg-red-50 hover:text-red-500 dark:text-emerald-200/80 dark:hover:bg-emerald-500/20 dark:hover:text-white"
              aria-label="Remove selected element"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onRemove();
              }}
            >
              <X className="size-3" />
            </button>
          ) : null}
        </span>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        align="start"
        sideOffset={8}
        className="border border-zinc-700 bg-zinc-950 p-0 text-zinc-100 shadow-2xl"
      >
        <ElementInspectorTooltipBody ctx={ctx} />
      </TooltipContent>
    </Tooltip>
  );
}
