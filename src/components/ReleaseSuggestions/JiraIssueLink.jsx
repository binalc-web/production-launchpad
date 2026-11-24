import { cn } from "@/lib/utils";
import { ExternalLink } from "lucide-react";

/** Monospace Jira key with optional external URL (reuse in description editor + lists). */
export function JiraIssueLink({ issueKey, url, className }) {
  const key = String(issueKey || "").trim();
  if (!key) return null;
  const href = typeof url === "string" && url.trim() ? url.trim() : null;
  const body = (
    <span className="inline-flex items-center gap-1 font-mono text-sm text-primary">
      {key}
      {href ? (
        <ExternalLink className="size-3.5 shrink-0 opacity-70" aria-hidden />
      ) : null}
    </span>
  );
  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "rounded-sm underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className,
        )}
      >
        {body}
      </a>
    );
  }
  return <span className={className}>{body}</span>;
}
