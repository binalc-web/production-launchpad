import { useId, useMemo, useState } from "react";
import { AudioLines, Check, ChevronDown, Infinity, ListTodo, MessageSquare } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { PLATFORM_PROMPT_BOX_RADIUS } from "@/components/chat/platformPromptBox.classes";
import {
  buildComposerModeIds,
  handleComposerModeTabCycleKeyDown,
} from "@/components/chat/chatComposerModeSelect.util.js";

export {
  buildComposerModeIds as buildComposerModeList,
  cycleComposerMode,
  handleComposerModeTabCycleKeyDown,
} from "@/components/chat/chatComposerModeSelect.util.js";

/** Cursor IDE–style composer mode pill + dropdown (Agent / Plan / Ask / optional Voice). */
const BASE_MODES = [
  {
    id: "agent",
    label: "Agent",
    icon: Infinity,
    title: "Agent: can change your project",
  },
  {
    id: "plan",
    label: "Plan",
    icon: ListTodo,
    title: "Plan: review a plan, then Build",
  },
  {
    id: "ask",
    label: "Ask",
    icon: MessageSquare,
    title: "Ask: reply without changing code",
  },
];

const VOICE_MODE = {
  id: "voice",
  label: "Voice",
  icon: AudioLines,
  title: "Voice: talk hands-free; the agent builds and walks you through changes",
};

/** @typedef {'agent' | 'ask' | 'plan' | 'voice'} ComposerModeId */

const TRIGGER_STYLE_BY_MODE = {
  agent: cn(
    "bg-[#ececec] text-[#5c5c5c] hover:bg-[#e4e4e4]",
    "dark:bg-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-600",
  ),
  plan: cn(
    "bg-[#f5edd8] text-[#9a7b2e] hover:bg-[#efe4c8]",
    "[&_svg]:text-[#9a7b2e]",
    "dark:bg-amber-950/45 dark:text-amber-200 dark:hover:bg-amber-950/55 dark:[&_svg]:text-amber-200",
  ),
  ask: cn(
    "bg-[#d8e8d8] text-[#2f6b3a] hover:bg-[#cce0cc]",
    "[&_svg]:text-[#2f6b3a]",
    "dark:bg-emerald-950/40 dark:text-emerald-200 dark:hover:bg-emerald-950/50 dark:[&_svg]:text-emerald-200",
  ),
  voice: cn(
    "bg-[#ebe4f5] text-[#5c4a7a] hover:bg-[#e2d8ef]",
    "[&_svg]:text-[#5c4a7a]",
    "dark:bg-violet-950/40 dark:text-violet-200 dark:hover:bg-violet-950/50 dark:[&_svg]:text-violet-200",
  ),
};

const VOICE_DISABLED_HINT =
  "Voice is not enabled for this project. Turn it on in project settings (admin).";

function resolveComposerModes(showPlan, voiceEnabled, showVoiceInMenu) {
  const ids = buildComposerModeIds(showPlan, voiceEnabled, showVoiceInMenu);
  const byId = Object.fromEntries([...BASE_MODES, VOICE_MODE].map((m) => [m.id, m]));
  return ids.map((id) => byId[id]).filter(Boolean);
}

/**
 * @param {{
 *   value: ComposerModeId,
 *   onValueChange: (value: ComposerModeId) => void,
 *   disabled?: boolean,
 *   voiceEnabled?: boolean,
 *   showVoiceInMenu?: boolean,
 *   showPlan?: boolean,
 *   compact?: boolean,
 *   className?: string,
 * }} props
 */
export function ChatComposerModeSelect({
  value,
  onValueChange,
  disabled = false,
  voiceEnabled = false,
  showVoiceInMenu = false,
  showPlan = true,
  compact = false,
  className,
}) {
  const modes = useMemo(
    () => resolveComposerModes(showPlan, voiceEnabled, showVoiceInMenu),
    [showPlan, voiceEnabled, showVoiceInMenu],
  );

  const [menuOpen, setMenuOpen] = useState(false);
  const hintId = useId();

  const active = modes.find((m) => m.id === value) ?? modes[0];
  const ActiveIcon = active?.icon ?? Infinity;
  const triggerTone = TRIGGER_STYLE_BY_MODE[value] ?? TRIGGER_STYLE_BY_MODE.agent;

  return (
    <div className="flex shrink-0 flex-col items-start gap-0.5">
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild disabled={disabled}>
          <button
            type="button"
            aria-label="Composer mode"
            aria-describedby={hintId}
            title={`${active?.title ?? ""} · Tab / Shift+Tab to switch`}
            onKeyDown={(e) => {
              handleComposerModeTabCycleKeyDown(e, {
                currentMode: value,
                orderedIds: modes.map((m) => m.id),
                onModeChange: onValueChange,
                disabled,
              });
            }}
            className={cn(
              "inline-flex shrink-0 cursor-pointer items-center font-normal leading-none shadow-none transition-colors",
              PLATFORM_PROMPT_BOX_RADIUS,
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
              compact ? "h-8 gap-1 px-2 text-[11px]" : "h-9 gap-1 px-2.5 text-xs",
              triggerTone,
              disabled && "pointer-events-none cursor-not-allowed opacity-40",
              className,
            )}
          >
            <ActiveIcon
              className={cn("shrink-0 opacity-90", compact ? "size-3.5" : "size-4")}
              strokeWidth={2}
              aria-hidden
            />
            <span
              className={cn(
                "truncate",
                compact ? "max-w-[5.75rem] max-[480px]:max-w-[4.25rem]" : "max-w-[6.5rem]",
              )}
            >
              {active?.label}
            </span>
            <ChevronDown
              className={cn("shrink-0 opacity-75", compact ? "size-3.5" : "size-4")}
              strokeWidth={2}
              aria-hidden
            />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          side="top"
          sideOffset={6}
          className="min-w-[10.5rem] rounded-xl border border-border/70 bg-popover p-0.5 shadow-lg"
        >
          {modes.map((mode) => {
            const Icon = mode.icon;
            const selected = mode.id === value;
            const voiceLocked = mode.id === "voice" && !voiceEnabled;
            return (
              <DropdownMenuItem
                key={mode.id}
                disabled={voiceLocked}
                title={voiceLocked ? VOICE_DISABLED_HINT : mode.title}
                className={cn(
                  "cursor-pointer gap-2 rounded-md px-2 py-1.5 text-[13px] font-normal",
                  voiceLocked && "opacity-50",
                )}
                onSelect={() => {
                  if (voiceLocked) return;
                  onValueChange(mode.id);
                  setMenuOpen(false);
                }}
              >
                <Icon className="size-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
                <span className="flex-1">{mode.label}</span>
                {selected ? (
                  <Check
                    className="ml-auto size-3.5 shrink-0 opacity-80"
                    strokeWidth={2}
                    aria-hidden
                  />
                ) : (
                  <span className="ml-auto size-3.5 shrink-0" aria-hidden />
                )}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
      <span
        id={hintId}
        className="hidden select-none whitespace-nowrap pl-1 text-[9px] leading-none text-muted-foreground min-[481px]:block"
      >
        Shift (⇧) + Tab (⇥)
      </span>
    </div>
  );
}
