/** Shared /chat surface + highlight classes (keep AiHome UI in sync). */

import {
  PLATFORM_PROMPT_BOX_RADIUS,
  PLATFORM_PROMPT_BOX_SEND_BTN,
  PLATFORM_PROMPT_BOX_SURFACE,
} from "@/components/chat/platformPromptBox.classes";

export const ALL_PROJECTS_LABEL = "All Projects";

export const AI_HOME_COMPOSER_RADIUS = PLATFORM_PROMPT_BOX_RADIUS;

export const AI_HOME_COMPOSER_SURFACE = PLATFORM_PROMPT_BOX_SURFACE;

export const AI_HOME_HIGHLIGHT = "bg-neutral-150 dark:bg-zinc-800";

export const AI_HOME_HIGHLIGHT_HOVER = "hover:bg-neutral-150/80 dark:hover:bg-zinc-800/70";

export const AI_HOME_USER_BUBBLE = `max-w-[85%] rounded-[1.25rem] px-4 py-2.5 text-sm text-foreground ${AI_HOME_HIGHLIGHT}`;

export const AI_HOME_SEND_BTN = PLATFORM_PROMPT_BOX_SEND_BTN;
