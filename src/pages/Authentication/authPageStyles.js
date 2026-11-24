/** Shared shell layout + background for login / auth callback pages. */
export const AUTH_PAGE_SHELL_CLASS =
  "flex min-h-svh flex-col items-center justify-center gap-6 bg-gradient-to-br from-slate-50 via-muted/30 to-indigo-50/50 dark:from-background dark:via-muted/25 dark:to-background p-6 md:p-10";

/** Auth login card: platform radius + light elevation. */
export const AUTH_CARD_SURFACE_CLASS = "rounded-lg border-0 bg-card/95 backdrop-blur-sm shadow-sm";

export const AUTH_CARD_CLASS = `w-full max-w-sm p-8 ${AUTH_CARD_SURFACE_CLASS}`;
export const AUTH_CARD_COMPACT_CLASS = `w-full max-w-sm ${AUTH_CARD_SURFACE_CLASS}`;
export const AUTH_CARD_WIDE_CLASS = `w-full max-w-md ${AUTH_CARD_SURFACE_CLASS}`;
