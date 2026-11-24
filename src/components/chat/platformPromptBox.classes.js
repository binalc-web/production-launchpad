/** Shared prompt-box shell used across LaunchPad chat surfaces. */

export const PLATFORM_PROMPT_BOX_RADIUS = "rounded-[1.25rem]";

export const PLATFORM_PROMPT_BOX_SURFACE = cnJoin(
  PLATFORM_PROMPT_BOX_RADIUS,
  "border border-border bg-card dark:border-white/10 dark:bg-zinc-800/90",
);

const PLATFORM_PROMPT_BOX_TEXTAREA_BG =
  "!bg-transparent dark:!bg-transparent [background-color:transparent]";

export const PLATFORM_PROMPT_BOX_TEXTAREA = cnJoin(
  "field-sizing-content max-h-40 min-h-[56px] w-full resize-none overflow-y-auto rounded-none border-0 px-0 py-0 text-[15px] leading-relaxed shadow-none placeholder:text-muted-foreground focus-visible:border-0 focus-visible:ring-0 dark:placeholder:text-muted-foreground",
  PLATFORM_PROMPT_BOX_TEXTAREA_BG,
);

/** Panel / sidebar composers — short by default, grows with content, scrolls when capped. */
export const PLATFORM_PROMPT_BOX_TEXTAREA_COMPACT = cnJoin(
  "field-sizing-content min-h-[56px] max-h-[min(40dvh,288px)] w-full resize-none overflow-y-auto rounded-none border-0 px-0 py-0 text-sm leading-relaxed shadow-none placeholder:text-muted-foreground focus-visible:border-0 focus-visible:ring-0",
  PLATFORM_PROMPT_BOX_TEXTAREA_BG,
);

export const PLATFORM_PROMPT_BOX_TEXTAREA_FULLSCREEN = cnJoin(
  "field-sizing-content min-h-[56px] max-h-[min(40dvh,320px)] w-full resize-none overflow-y-auto rounded-none border-0 px-0 py-0 text-base leading-relaxed shadow-none placeholder:text-muted-foreground focus-visible:border-0 focus-visible:ring-0",
  PLATFORM_PROMPT_BOX_TEXTAREA_BG,
);

export const PLATFORM_PROMPT_BOX_SEND_BTN = `size-8 shrink-0 shadow-none ${PLATFORM_PROMPT_BOX_RADIUS} bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40`;

export const PLATFORM_PROMPT_BOX_TOOL_BTN = cnJoin(
  "h-8 w-8 shrink-0 text-accent-foreground shadow-none disabled:opacity-40 [&_svg]:size-3.5",
  "bg-accent hover:bg-accent/80 dark:bg-accent/50 dark:hover:bg-accent/60",
  PLATFORM_PROMPT_BOX_RADIUS,
);

export const PLATFORM_PROMPT_BOX_OUTER_PANEL =
  "shrink-0 bg-transparent px-4 py-3 max-[480px]:px-2 max-[480px]:py-2";

/** Full-width horizontal gutter — pairs with an inner `max-w-*` column like {@link ChatPanelMessageArea}. */
export const PLATFORM_PROMPT_BOX_FULLSCREEN_GUTTER =
  "shrink-0 bg-transparent px-6 py-5 max-[480px]:px-2 max-[480px]:py-3";

/** @deprecated Use {@link PLATFORM_PROMPT_BOX_FULLSCREEN_GUTTER} + inner max-width column. */
export const PLATFORM_PROMPT_BOX_OUTER_PANEL_FULLSCREEN = PLATFORM_PROMPT_BOX_FULLSCREEN_GUTTER;

/** Body padding inside the prompt surface (≤480px ≈ 320px phones). */
export const PLATFORM_PROMPT_BOX_BODY =
  "flex flex-col gap-2.5 px-4 pb-1 pt-4 max-[480px]:gap-2 max-[480px]:px-2.5 max-[480px]:pt-3";

/** Toolbar padding below the textarea. */
export const PLATFORM_PROMPT_BOX_TOOLBAR = "px-2.5 pb-2.5 pt-0.5 max-[480px]:px-2";

function cnJoin(...parts) {
  return parts.filter(Boolean).join(" ");
}
