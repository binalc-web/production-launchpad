/** Inline chat card minimum height — shorter on phones so the page does not force horizontal shrink/zoom. */
export const chatPanelInlineMinHeightClass =
  "min-h-[min(72dvh,28rem)] sm:min-h-[min(78dvh,32rem)] md:min-h-[560px] lg:min-h-[760px]";

/** Inline chat card max height — message list scrolls inside when content exceeds this. */
export const chatPanelInlineMaxHeightClass = "max-h-[min(90vh,64rem)]";

/** Combined inline shell height — used by ChatPanelShell and disabled-state placeholders. */
export const chatPanelInlineShellClass = `${chatPanelInlineMinHeightClass} ${chatPanelInlineMaxHeightClass}`;

/** Flex body under the header — keeps the message list scrollable inside a capped card. */
export const chatPanelBodyClass = "flex min-h-0 flex-1 flex-col overflow-hidden";

/** Outline header actions (Full screen, Chat History, New Chat) — flat, no shadow. */
export const chatPanelHeaderActionBtnClass =
  "h-8 shrink-0 gap-1.5 px-2 sm:px-2.5 text-xs shadow-none";

/** Hide action button text on very narrow screens; icon + aria-label remain. */
export const chatPanelHeaderActionLabelClass = "hidden sm:inline";

/** User prompt body — pairs with console chat typography overrides (inherits bubble foreground). */
export const chatUserBubbleTextClass = "chat-user-bubble-text";

/** Fullscreen overlay: padded on all sides with subtle backdrop. */
export const chatPanelFullscreenOverlayClass =
  "fixed inset-0 z-50 flex flex-col bg-background/88 p-4 backdrop-blur-[3px] md:p-6 lg:p-8";

/** Inner card when fullscreen — fills padded overlay, capped width for readability. */
export const chatPanelFullscreenCardClass =
  "mx-auto flex h-full min-h-0 w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl";

/** Full-page fullscreen (AI Home style) — edge-to-edge, no modal chrome. */
export const chatPanelFullscreenPageOverlayClass =
  "fixed inset-0 z-50 flex min-h-0 flex-col overflow-hidden bg-muted/40 transition-opacity duration-300 ease-in-out";

export const chatPanelFullscreenPageCardClass =
  "flex h-full min-h-0 w-full max-w-none flex-col overflow-hidden rounded-none border-0 bg-background shadow-none transition-[transform,opacity] duration-300 ease-out";

/** Fullscreen enter/exit timing — keep in sync with overlay/card transition classes. */
export const chatPanelFullscreenTransitionMs = 300;

/** Horizontal gutter for fullscreen page chat (messages + composer share the same padding). */
export const chatPanelPageGutterClass = "px-6 py-6 max-[480px]:px-2 max-[480px]:py-4";

/** Centered content column — matches message list width in page fullscreen. */
export const chatPanelPageColumnClass = "mx-auto w-full max-w-2xl";

/** Wider column for modal-style fullscreen chat. */
export const chatPanelModalColumnClass = "mx-auto w-full max-w-3xl";
