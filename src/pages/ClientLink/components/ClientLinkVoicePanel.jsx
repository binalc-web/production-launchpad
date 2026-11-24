import React, { useEffect, useRef } from "react";
import { Mic, MicOff, PhoneOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import mascotFront from "@/assets/voice-mascot-front.jpg";
import mascotDown from "@/assets/voice-mascot-down.jpg";

const STATUS_LABEL = {
  idle: "Voice mode is off",
  connecting: "Connecting…",
  listening: "Listening",
  "user-speaking": "Hearing you…",
  thinking: "Thinking…",
  speaking: "Speaking",
  waiting: "Agent is working — we're both waiting",
  demo: "Walking you through the changes",
  error: "Voice unavailable",
};

/** Mascot looks at the user while talking/listening, and down at its laptop while thinking or working. */
function VoiceMascot({ status, getLevels, working }) {
  const bodyRef = useRef(null);
  const glowRef = useRef(null);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const { mic, agent } = getLevels();
      const level = Math.max(mic, agent);
      if (bodyRef.current) {
        bodyRef.current.style.transform = `translateY(${-level * 6}px) scale(${1 + level * 0.06})`;
      }
      if (glowRef.current) glowRef.current.style.opacity = String(0.3 + level * 0.7);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [getLevels]);

  const lookingDown = working || status === "thinking" || status === "connecting";
  const glow =
    status === "speaking" || status === "demo"
      ? "bg-violet-500"
      : status === "user-speaking"
        ? "bg-sky-500"
        : working
          ? "bg-amber-400"
          : "bg-teal-400";

  return (
    <div className="relative flex size-28 shrink-0 items-center justify-center">
      <div
        ref={glowRef}
        className={cn(
          "absolute inset-2 rounded-2xl blur-xl transition-colors duration-500",
          glow,
          lookingDown && "animate-pulse",
        )}
      />
      <div
        ref={bodyRef}
        className="relative size-24 overflow-hidden rounded-xl bg-white shadow-lg ring-2 ring-white will-change-transform dark:ring-border"
      >
        <img
          src={mascotFront}
          alt=""
          draggable={false}
          className={cn(
            "absolute inset-0 size-full object-cover transition-opacity duration-300",
            lookingDown ? "opacity-0" : "opacity-100",
          )}
        />
        <img
          src={mascotDown}
          alt=""
          draggable={false}
          className={cn(
            "absolute inset-0 size-full object-cover transition-opacity duration-300",
            lookingDown ? "opacity-100" : "opacity-0",
          )}
        />
        {status === "connecting" ? (
          <span className="absolute inset-x-0 bottom-1 flex justify-center">
            <Spinner className="size-4 text-teal-600" />
          </span>
        ) : null}
      </div>
    </div>
  );
}

/**
 * @param {{
 *   voice: ReturnType<typeof import("@/hooks/useClientLinkVoiceAgent").useClientLinkVoiceAgent>,
 *   agentWorking: boolean,
 *   agentStatusLine: string,
 *   disabled: boolean,
 *   disabledReason?: string,
 * }} props
 */
export function ClientLinkVoicePanel({
  voice,
  agentWorking,
  agentStatusLine,
  disabled,
  disabledReason,
  className,
}) {
  const listRef = useRef(null);
  const { status, error, muted, transcript, active } = voice;

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [transcript]);

  const visible = transcript.filter((e) => e.text?.trim());
  const waiting = status === "waiting";
  const mutedIdle = active && muted && (status === "listening" || status === "user-speaking");
  const statusText = mutedIdle ? "Muted" : STATUS_LABEL[status] || "";
  const hint = mutedIdle
    ? "Your microphone is off. Tap the mic button to talk again."
    : !active
      ? error ||
        disabledReason ||
        "Start a hands-free session: describe changes out loud and watch the preview update."
      : waiting
        ? agentStatusLine || "The microphone is paused until the agent finishes."
        : status === "demo"
          ? "Watch the preview — I'm clicking through what changed."
          : "Just talk. Say “work on it” when you're ready; I'll hand it to the coding agent and demo the result.";

  return (
    <div
      className={cn(
        "flex flex-col items-stretch gap-3 rounded-lg border border-slate-200/90 bg-white p-3 shadow-sm dark:border-border dark:bg-card",
        className,
      )}
    >
      <div className="flex items-center gap-4">
        <VoiceMascot
          status={status}
          getLevels={voice.getLevels}
          working={waiting || (!active && agentWorking)}
        />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="truncate text-sm font-semibold text-foreground" aria-live="polite">
            {statusText}
          </p>
          {/* Fixed height: live agent progress text changes length constantly and would resize the chat. */}
          <p className="line-clamp-2 h-10 text-xs leading-5 text-muted-foreground" title={hint}>
            {hint}
          </p>
        </div>
      </div>

      {active || visible.length ? (
        <div
          ref={listRef}
          className="h-40 space-y-1.5 overflow-y-auto overscroll-contain rounded-md bg-muted/40 px-2.5 py-2 text-xs"
          aria-label="Voice transcript"
        >
          {visible.map((e) => (
            <p
              key={e.id}
              className={cn(
                "leading-relaxed",
                e.role === "user" && "text-foreground",
                e.role === "assistant" && "text-violet-700 dark:text-violet-300",
                e.role === "event" &&
                  "text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground",
                e.tone === "error" && "text-destructive",
                !e.final && "opacity-70",
              )}
            >
              {e.role === "user" ? <span className="font-semibold">You: </span> : null}
              {e.role === "assistant" ? <span className="font-semibold">LaunchPad: </span> : null}
              {e.text || (e.role === "user" && !e.final ? "…" : null)}
            </p>
          ))}
        </div>
      ) : null}

      <div className="flex items-center justify-end gap-2">
        {active ? (
          <>
            <Button
              type="button"
              variant={muted ? "default" : "secondary"}
              size="icon"
              className="h-9 w-9 rounded-full"
              aria-pressed={muted}
              aria-label={muted ? "Unmute microphone" : "Mute microphone"}
              onClick={() => voice.setMuted(!muted)}
            >
              {muted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="h-9 gap-1.5 rounded-full px-4"
              onClick={voice.stop}
            >
              <PhoneOff className="size-4" aria-hidden />
              End
            </Button>
          </>
        ) : (
          <Button
            type="button"
            className="h-9 gap-1.5 rounded-full px-4"
            disabled={disabled || status === "connecting"}
            onClick={() => void voice.start()}
          >
            <Mic className="size-4" aria-hidden />
            Start talking
          </Button>
        )}
      </div>
    </div>
  );
}
