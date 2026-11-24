import {
  CheckCircle2,
  FilePenLine,
  FileText,
  Globe,
  ListTodo,
  Loader2,
  Plug,
  Search,
  Terminal,
  Users,
  Wrench,
  XCircle,
} from "lucide-react";
import { AgentToolCallDiff } from "@/components/chat/AgentToolCallDiff";
import { resolveToolCallDisplay } from "@/pages/ClientLink/chat/agentToolCallDisplay.util";
import { cn } from "@/lib/utils";

function toolIcon(toolKind, toolName) {
  const name = typeof toolName === "string" ? toolName.toLowerCase() : "";
  if (toolKind === "subagent" || name.includes("subagent")) return Users;
  switch (toolKind) {
    case "shell":
      return Terminal;
    case "read":
      return FileText;
    case "write":
    case "edit":
      return FilePenLine;
    case "search":
      return Search;
    case "todo":
      return ListTodo;
    case "browser":
      return Globe;
    case "mcp":
      return Plug;
    default: {
      if (name === "shell") return Terminal;
      return Wrench;
    }
  }
}

/** Compact card for a single CLI tool_call timeline item. */
export function AgentToolCallCard({
  toolName,
  toolKind,
  label,
  targetPath,
  command,
  diffPreview,
  diffAdded,
  diffRemoved,
  todoSummary,
  status,
  resultPreview,
  className,
  onOpenPath,
}) {
  const display = resolveToolCallDisplay({
    toolName,
    toolKind,
    label,
    targetPath,
    command,
    diffPreview,
    diffAdded,
    diffRemoved,
    todoSummary,
    status,
    resultPreview,
  });

  const Icon = toolIcon(display.toolKind, display.toolName);
  const running = display.status === "running";
  const failed = display.status === "failed";
  const pathForOpen = typeof targetPath === "string" && targetPath.trim() ? targetPath.trim() : "";

  return (
    <div
      className={cn(
        "flex w-full flex-col gap-1 rounded-lg border border-border/60 bg-muted/15 px-3 py-2",
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-foreground">{display.toolName}</span>
            {running ? (
              <Loader2 className="size-3.5 shrink-0 animate-spin text-primary" aria-hidden />
            ) : failed ? (
              <XCircle className="size-3.5 shrink-0 text-destructive" aria-hidden />
            ) : (
              <CheckCircle2
                className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400"
                aria-hidden
              />
            )}
          </div>
          {display.detail ? (
            pathForOpen && onOpenPath ? (
              <button
                type="button"
                className="mt-0.5 line-clamp-2 max-w-full text-left font-mono text-[11px] leading-snug text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                title={`Open ${pathForOpen}`}
                onClick={() => onOpenPath(pathForOpen)}
              >
                {display.detail}
              </button>
            ) : (
              <p className="mt-0.5 line-clamp-2 font-mono text-[11px] leading-snug text-muted-foreground">
                {display.detail}
              </p>
            )
          ) : null}
        </div>
      </div>
      {display.diffPreview && !running ? (
        <AgentToolCallDiff
          diff={display.diffPreview}
          diffAdded={display.diffAdded}
          diffRemoved={display.diffRemoved}
        />
      ) : null}
      {display.resultPreview && !running && !display.diffPreview ? (
        <p className="ml-5 line-clamp-3 text-[11px] leading-snug text-muted-foreground/90">
          {display.resultPreview}
        </p>
      ) : null}
    </div>
  );
}
