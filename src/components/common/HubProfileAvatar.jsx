import React, { useEffect, useMemo, useState } from "react";
import { UserRound } from "lucide-react";
import { fetchHubProfilePicSignedUrl } from "@/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

function initialsFrom(name, email) {
  const fromName = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
  if (fromName) return fromName.toUpperCase();
  const local = String(email || "").trim().split("@")[0] || "";
  if (local.length >= 2) return local.slice(0, 2).toUpperCase();
  if (local.length === 1) return local.toUpperCase();
  return "";
}

/**
 * Loads signed profile pic from Hub (by email) and shows Avatar with optional fallback image URL.
 * Matches original AppSidebar implementation (Hub signed URL, then Google/OAuth fallback).
 */
export function HubProfileAvatar({
  email,
  alt = "",
  name,
  fallbackImageUrl,
  className,
  fallbackClassName,
  iconClassName = "size-[55%]",
}) {
  const [hubUrl, setHubUrl] = useState(null);

  useEffect(() => {
    const trimmed = typeof email === "string" ? email.trim() : "";
    if (!trimmed) {
      setHubUrl(null);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      const next = await fetchHubProfilePicSignedUrl(trimmed);
      if (cancelled) return;
      setHubUrl(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [email]);

  const fallback =
    typeof fallbackImageUrl === "string" && fallbackImageUrl.trim()
      ? fallbackImageUrl.trim()
      : "";
  const src = hubUrl || fallback || undefined;
  const initials = useMemo(
    () => initialsFrom(name || alt, email),
    [name, alt, email],
  );

  return (
    <Avatar className={cn("shrink-0", className)}>
      {src ? (
        <AvatarImage
          key={src}
          src={src}
          alt={alt}
          referrerPolicy="no-referrer"
          className="object-cover"
        />
      ) : null}
      <AvatarFallback
        className={cn(
          "bg-muted text-muted-foreground",
          initials && "text-[10px] font-semibold tracking-wide",
          fallbackClassName,
        )}
      >
        {initials || <UserRound className={cn(iconClassName)} aria-hidden />}
      </AvatarFallback>
    </Avatar>
  );
}
