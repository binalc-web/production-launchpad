import { AssistantMarkdown } from "@/components/chat/AssistantMarkdown";
import { AgentResultBadge } from "@/components/chat/AgentResultBadge";
import { AgentThinkingBlock } from "@/components/chat/AgentThinkingBlock";
import { AgentToolCallCard } from "@/components/chat/AgentToolCallCard";
import { cn } from "@/lib/utils";
import {
  agentStreamTimelineHasContent,
  normalizeAgentStreamTimeline,
  resolveAgentLiveAssistantText,
  shouldPreferStreamTextOverTimelineAssistant,
} from "@/pages/ClientLink/chat/clientLinkStreamTimeline.util";

function toolCallCardProps(item, onOpenPath) {
  return {
    toolName: item.toolName,
    toolKind: item.toolKind,
    label: item.label,
    targetPath: item.targetPath,
    command: item.command,
    diffPreview: item.diffPreview,
    diffAdded: item.diffAdded,
    diffRemoved: item.diffRemoved,
    todoSummary: item.todoSummary,
    status: item.status,
    resultPreview: item.resultPreview,
    onOpenPath,
  };
}

function nestToolCallChildren(items) {
  const callIds = new Set();
  for (const item of items) {
    if (item?.type === "tool_call" && typeof item.callId === "string" && item.callId.trim()) {
      callIds.add(item.callId.trim());
    }
  }
  /** @type {Map<string, object[]>} */
  const childrenByParent = new Map();
  const nestedIds = new Set();
  for (const item of items) {
    if (item?.type !== "tool_call") continue;
    const parent = typeof item.parentCallId === "string" ? item.parentCallId.trim() : "";
    if (!parent || !callIds.has(parent)) continue;
    nestedIds.add(item.id);
    const list = childrenByParent.get(parent) || [];
    list.push(item);
    childrenByParent.set(parent, list);
  }
  return { nestedIds, childrenByParent };
}

function renderNestedToolCall(item, childrenByParent, onOpenPath) {
  const nested = childrenByParent.get(item.callId) || [];
  return (
    <div key={item.id} className="flex w-full flex-col gap-1.5">
      <AgentToolCallCard {...toolCallCardProps(item, onOpenPath)} />
      {nested.length > 0 ? (
        <div className="ml-4 flex flex-col gap-1.5 border-l border-border/50 pl-3">
          {nested.map((child) => renderNestedToolCall(child, childrenByParent, onOpenPath))}
        </div>
      ) : null}
    </div>
  );
}

/** @typedef {"card" | "plain"} AgentLiveTimelineAssistantVariant */

/**
 * Structured live view of Cursor CLI stream-json (thinking, tools, assistant, result).
 * @param {object} props
 * @param {AgentLiveTimelineAssistantVariant} [props.assistantVariant] - "card" (default) or "plain" (no bordered assistant wrapper)
 * @param {boolean} [props.collapsibleAssistant] - clamp long assistant text behind a "Read more" toggle, also while it is still streaming
 */
export function AgentLiveTimeline({
  timeline,
  streamText = "",
  isActive = false,
  className,
  assistantVariant = "card",
  collapsibleAssistant = false,
  onOpenPath,
}) {
  const assistantWrapClass =
    assistantVariant === "plain"
      ? "w-full text-left"
      : "w-full rounded-xl border border-border/70 bg-muted/25 px-3 py-2.5 text-left shadow-inner";
  const items = normalizeAgentStreamTimeline(timeline);
  const { nestedIds, childrenByParent } = nestToolCallChildren(items);
  const assistantFallback = resolveAgentLiveAssistantText(streamText, items);
  const hasTimeline = agentStreamTimelineHasContent(items);
  const hasAssistantInTimeline = items.some((item) => item.type === "assistant");
  const streamOverridesTimelineAssistant = shouldPreferStreamTextOverTimelineAssistant(
    streamText,
    items,
  );

  if (!hasTimeline && !assistantFallback.trim()) return null;

  if (!hasTimeline && assistantFallback.trim()) {
    return (
      <div className={cn("relative flex w-full max-w-full flex-col", className)}>
        <div className={assistantWrapClass}>
          <AssistantMarkdown
            text={assistantFallback}
            className="min-w-0"
            showStreamingCursor={isActive}
            collapsible={collapsibleAssistant}
            collapseWhileStreaming={collapsibleAssistant}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative flex w-full max-w-full flex-col gap-2", className)}>
      {items.map((item) => {
        if (item.type === "thinking") {
          return (
            <AgentThinkingBlock
              key={item.id}
              text={item.text}
              isStreaming={item.status === "streaming"}
            />
          );
        }
        if (item.type === "tool_call") {
          if (nestedIds.has(item.id)) return null;
          return renderNestedToolCall(item, childrenByParent, onOpenPath);
        }
        if (item.type === "assistant") {
          if (streamOverridesTimelineAssistant) return null;
          return (
            <div key={item.id} className={assistantWrapClass}>
              <AssistantMarkdown
                text={item.text}
                className="min-w-0"
                showStreamingCursor={isActive}
                collapsible={collapsibleAssistant}
                collapseWhileStreaming={collapsibleAssistant}
              />
            </div>
          );
        }
        if (item.type === "result") {
          return (
            <AgentResultBadge key={item.id} status={item.status} durationMs={item.durationMs} />
          );
        }
        return null;
      })}
      {streamOverridesTimelineAssistant || (!hasAssistantInTimeline && assistantFallback.trim()) ? (
        <div className={assistantWrapClass}>
          <AssistantMarkdown
            text={assistantFallback}
            className="min-w-0"
            showStreamingCursor={isActive}
            collapsible={collapsibleAssistant}
            collapseWhileStreaming={collapsibleAssistant}
          />
        </div>
      ) : null}
    </div>
  );
}
