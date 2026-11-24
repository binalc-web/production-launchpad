import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  CHAT_ASSISTANT_COLLAPSED_MAX_HEIGHT,
  ChatExpandableContent,
} from "@/components/chat/ChatExpandableContent";
import { cn } from "@/lib/utils";

/** Max markdown source length — avoids pathological DOM. */
export const ASSISTANT_MARKDOWN_MAX_CHARS = 200_000;

/** Maps GFM node types (headings, lists, tables, code) to Tailwind-styled elements for assistant text. */
export const assistantMarkdownComponents = {
  h1: ({ children }) => (
    <h1 className="mb-2 mt-3 text-base font-semibold tracking-tight text-foreground first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-2 mt-4 text-sm font-semibold tracking-tight text-foreground first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-1.5 mt-3 text-sm font-semibold text-foreground first:mt-0">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="mb-2 text-sm leading-relaxed text-foreground last:mb-0">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="mb-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-foreground">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-2 list-decimal space-y-1 pl-5 text-sm leading-relaxed text-foreground">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  img: ({ src, alt }) => {
    const url = typeof src === "string" ? src.trim() : "";
    const loadable = /^(https?:|data:image\/)/i.test(url);
    if (!loadable) {
      return <span className="text-sm text-muted-foreground">{alt || url || "Image"}</span>;
    }
    return (
      <img
        src={url}
        alt={alt || ""}
        className="my-2 max-h-80 max-w-full rounded-md border border-border"
      />
    );
  },
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline underline-offset-2 transition-colors hover:text-primary/90"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-muted-foreground/40 pl-3 text-sm italic text-muted-foreground">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-4 border-border" />,
  table: ({ children }) => (
    <div className="my-3 w-full min-w-0 overflow-x-auto rounded-md border border-border">
      <table className="w-max min-w-full border-collapse text-left text-xs text-foreground">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-muted/60">{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr className="border-b border-border last:border-0">{children}</tr>,
  th: ({ children }) => (
    <th className="border border-border px-2.5 py-1.5 align-top font-semibold">{children}</th>
  ),
  td: ({ children }) => (
    <td className="border border-border px-2.5 py-1.5 align-top leading-snug">{children}</td>
  ),
  pre: ({ children }) => (
    <pre className="my-2 max-h-[min(50vh,24rem)] overflow-auto rounded-md border border-border bg-muted/50 p-3 text-xs leading-relaxed">
      {children}
    </pre>
  ),
  code: ({ className, children, ...rest }) => {
    const isBlock = typeof className === "string" && className.includes("language-");
    if (isBlock) {
      return (
        <code
          className={cn("block w-full font-mono text-[11px] text-foreground", className)}
          {...rest}
        >
          {children}
        </code>
      );
    }
    return (
      <code
        className="rounded bg-muted/80 px-1 py-0.5 font-mono text-[11px] text-foreground"
        {...rest}
      >
        {children}
      </code>
    );
  },
};

/**
 * GitHub-flavored markdown for assistant-style content (headings, lists, tables, code).
 * @param {{ text: string, className?: string, emptyLabel?: string, showStreamingCursor?: boolean, collapsible?: boolean, collapseWhileStreaming?: boolean, collapsedMaxHeight?: string }} props
 */
export function AssistantMarkdown({
  text,
  className,
  emptyLabel = "(Empty message.)",
  showStreamingCursor = false,
  collapsible = false,
  collapseWhileStreaming = false,
  collapsedMaxHeight = CHAT_ASSISTANT_COLLAPSED_MAX_HEIGHT,
}) {
  const raw = typeof text === "string" ? text : "";
  const source =
    raw.length > ASSISTANT_MARKDOWN_MAX_CHARS ? raw.slice(0, ASSISTANT_MARKDOWN_MAX_CHARS) : raw;
  if (!source.trim()) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }
  const markdownBody = (
    <div className={cn("assistant-markdown w-full min-w-0 max-w-full text-foreground", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={assistantMarkdownComponents}>
        {source}
      </ReactMarkdown>
      {showStreamingCursor ? (
        <span
          className="ml-0.5 inline-block h-[1em] w-[2px] animate-pulse bg-primary align-[-2px]"
          aria-hidden
        />
      ) : null}
      {raw.length > ASSISTANT_MARKDOWN_MAX_CHARS ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Long message — only the beginning is shown here.
        </p>
      ) : null}
    </div>
  );

  // Streaming text is normally shown in full; `collapseWhileStreaming` clamps it behind Read more
  // too (the measurement follows the growing content).
  if (!collapsible || (showStreamingCursor && !collapseWhileStreaming)) {
    return markdownBody;
  }

  return (
    <ChatExpandableContent collapsedMaxHeight={collapsedMaxHeight}>
      {markdownBody}
    </ChatExpandableContent>
  );
}
