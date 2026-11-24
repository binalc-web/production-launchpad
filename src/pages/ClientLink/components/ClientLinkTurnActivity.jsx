import { useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import Lottie from "lottie-react";
import {
  AlertCircleIcon,
  BrainIcon,
  CheckIcon,
  ChevronRightIcon,
  CircleDotIcon,
  ClockIcon,
  CogIcon,
  Loader2Icon,
  MessageSquareTextIcon,
  WrenchIcon,
} from "lucide-react";
import { AgentLiveTimeline } from "@/components/chat/AgentLiveTimeline";
import { AgentWorkingStatusRow } from "@/components/chat/AgentWorkingStatusRow";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { isChatNearBottom } from "@/pages/ClientLink/chat/clientLinkChatScroll.util";
import {
  activityDisclosureLabel,
  buildTurnActivityModel,
} from "@/pages/ClientLink/chat/clientLinkTurnActivity.util";
import websiteChangesAnimation from "../../../assets/animations/website-changes-animations.json";

const KIND_ICON = {
  step: CircleDotIcon,
  thinking: BrainIcon,
  tool_call: WrenchIcon,
  assistant: MessageSquareTextIcon,
  background: CogIcon,
};

/** Auto-scroll only while the user is within this distance of the list bottom. */
const LIST_STICK_THRESHOLD_PX = 24;

function ActivityStatusIcon({ status, live }) {
  if (status === "failed") {
    return <AlertCircleIcon className="size-3.5 shrink-0 text-destructive" aria-hidden />;
  }
  if (status === "done") {
    return <CheckIcon className="size-3.5 shrink-0 text-emerald-600" aria-hidden />;
  }
  // Running-process indicator. An unfinished entry of a turn that is no longer live stays a dot.
  return live ? (
    <Loader2Icon className="size-3.5 shrink-0 text-primary motion-safe:animate-spin" aria-hidden />
  ) : (
    <span className="size-1.5 shrink-0 rounded-full bg-muted-foreground/50" aria-hidden />
  );
}

const STATUS_TEXT = { running: "In progress", done: "Done", failed: "Failed" };

function ActivityList({ entries, live, id }) {
  const scrollRef = useRef(null);
  const stickRef = useRef(true);
  const lastEntry = entries[entries.length - 1];
  const scrollKey = `${entries.length}:${lastEntry?.id ?? ""}:${lastEntry?.status ?? ""}`;

  let currentId = null;
  if (live) {
    for (let i = entries.length - 1; i >= 0; i -= 1) {
      if (entries[i].status === "running") {
        currentId = entries[i].id;
        break;
      }
    }
  }

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!live || !el || !stickRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [live, scrollKey]);

  return (
    <ol
      id={id}
      ref={scrollRef}
      onScroll={(e) => {
        stickRef.current = isChatNearBottom(e.currentTarget, LIST_STICK_THRESHOLD_PX);
      }}
      className="flex max-h-60 min-w-0 flex-col gap-0.5 overflow-y-auto overscroll-contain"
      aria-label="Agent activity"
    >
      {entries.map((entry) => {
        const Icon = KIND_ICON[entry.kind] ?? CircleDotIcon;
        const isCurrent = entry.id === currentId;
        // Only the newest running entry is in progress. An older one that still says "running"
        // was superseded (the source stopped reporting it), so show it as done, never a spinner.
        const shownStatus =
          live && entry.status === "running" && !isCurrent ? "done" : entry.status;
        return (
          <li
            key={entry.id}
            aria-current={isCurrent ? "step" : undefined}
            className={cn(
              "flex min-w-0 items-start gap-2 rounded-md px-2 py-1 text-xs leading-snug",
              isCurrent ? "bg-primary/10 font-medium text-foreground" : "text-muted-foreground",
              entry.status === "failed" && "text-destructive",
            )}
          >
            <Icon className="mt-0.5 size-3.5 shrink-0 opacity-70" aria-hidden />
            <span className="min-w-0 flex-1 break-words">{entry.label}</span>
            <span className="mt-0.5 flex shrink-0 items-center">
              <ActivityStatusIcon status={shownStatus} live={live} />
              <span className="sr-only">{STATUS_TEXT[shownStatus] ?? shownStatus}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** Elapsed time of the running agent, driven by server timestamps (survives a hard reload). */
function ActivityTimer({ elapsed }) {
  return (
    <div
      role="timer"
      aria-label={`Elapsed time ${elapsed}`}
      className="flex items-center justify-center gap-1.5 text-xs font-medium tabular-nums text-muted-foreground"
    >
      <ClockIcon className="size-3.5 shrink-0" aria-hidden />
      <span>{elapsed}</span>
    </div>
  );
}

function CollapsedActivity({ entries, durationMs = null, outcome = "done" }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  if (entries.length === 0) return null;
  return (
    <div className="flex w-full max-w-full shrink-0 flex-col items-stretch gap-1 px-4">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((v) => !v)}
        className="flex w-fit items-center gap-1 rounded-md px-1 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <ChevronRightIcon
          className={cn("size-3.5 transition-transform", open && "rotate-90")}
          aria-hidden
        />
        {activityDisclosureLabel(entries.length, durationMs, outcome)}
      </button>
      {open ? (
        <div className="rounded-xl border border-border/60 bg-muted/20 p-1.5">
          <ActivityList id={panelId} entries={entries} live={false} />
        </div>
      ) : null}
    </div>
  );
}

/**
 * Inline activity for a turn, rendered right under its user message: the ordered log of what the
 * agent did (live while running), streamed agent output, and the server-driven status line.
 * Once the turn finished and the reply landed it renders as a compact "Completed in 2 min 14 sec · N
 * steps" disclosure ("Activity (N steps)" when the duration is unknown).
 * @param {{
 *   entries?: Array<{ id: string, seq: number, kind: string, label: string, status: string }>,
 *   stream?: { text: string, timeline: object[], label?: string | null } | null,
 *   statusLine?: string,
 *   streaming?: boolean,
 *   live?: boolean,
 *   collapsed?: boolean,
 *   elapsed?: string,
 *   durationMs?: number | null,
 *   outcome?: "done" | "failed" | "stopped" | null,
 * }} props
 */
export function ClientLinkTurnActivity({
  entries,
  stream,
  statusLine = "",
  streaming = false,
  live = false,
  collapsed = false,
  elapsed = "",
  durationMs = null,
  outcome = "done",
}) {
  const list = useMemo(() => (Array.isArray(entries) ? entries : []), [entries]);
  const model = useMemo(
    () => buildTurnActivityModel({ entries: list, stream, statusLine }),
    [list, stream, statusLine],
  );
  const listId = useId();

  if (collapsed)
    return <CollapsedActivity entries={list} durationMs={durationMs} outcome={outcome} />;

  const status = typeof statusLine === "string" ? statusLine.trim() : "";
  if (!model.hasEntries && !model.hasOutput && !status) return null;

  return (
    <div className="flex w-full max-w-full shrink-0 flex-col items-stretch gap-3 rounded-3xl px-4 py-3">
      <span className="sr-only" role="status" aria-live="polite">
        {status}
      </span>
      {elapsed ? <ActivityTimer elapsed={elapsed} /> : null}
      {model.items.length > 0 ? (
        <div className="rounded-xl border border-border/60 bg-muted/20 p-1.5">
          <ActivityList id={listId} entries={model.items} live={live} />
        </div>
      ) : null}
      {model.hasOutput ? (
        <AgentLiveTimeline
          timeline={model.timeline}
          streamText={model.streamText}
          isActive={streaming}
          collapsibleAssistant
        />
      ) : null}
      {status ? <AgentWorkingStatusRow text={status} showLiveDot={live} /> : null}
      {!model.hasEntries && !model.hasOutput && status ? (
        <>
          <div className="relative mx-auto h-[120px] w-full max-w-[200px] shrink-0 overflow-hidden">
            <Lottie
              animationData={websiteChangesAnimation}
              loop
              className="h-full w-full [&_svg]:h-full [&_svg]:max-h-full [&_svg]:w-full"
              rendererSettings={{ preserveAspectRatio: "xMidYMid meet" }}
            />
          </div>
          <p className="flex shrink-0 items-center justify-center gap-2 text-center text-xs font-medium text-muted-foreground">
            <Spinner className="size-3.5 shrink-0 text-primary" />
            Waiting for agent output…
          </p>
        </>
      ) : null}
    </div>
  );
}
