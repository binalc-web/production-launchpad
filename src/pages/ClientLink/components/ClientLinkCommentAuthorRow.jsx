import React from "react";
import { HubProfileAvatar } from "@/components/common/HubProfileAvatar";
import { cn } from "@/lib/utils";

function formatWhen(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  });
}

/**
 * Comment author row: profile pic, email, and optional timestamp.
 */
export function ClientLinkCommentAuthorRow({
  authorEmail,
  createdAt,
  className = "",
  compact = false,
}) {
  const displayEmail =
    typeof authorEmail === "string" && authorEmail.trim()
      ? authorEmail.trim()
      : "Team";

  return (
    <div
      className={cn(
        "flex items-center gap-2",
        compact ? "min-w-0" : "mt-1",
        className,
      )}
    >
      <HubProfileAvatar
        email={authorEmail}
        alt={displayEmail}
        className={compact ? "size-5 shrink-0" : "size-6 shrink-0"}
        iconClassName="size-[55%]"
      />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-muted-foreground",
            compact ? "text-[10px]" : "text-[11px]",
          )}
        >
          {displayEmail}
          {createdAt ? (
            <>
              {" · "}
              {formatWhen(createdAt)}
            </>
          ) : null}
        </p>
      </div>
    </div>
  );
}
