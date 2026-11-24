/**
 * Build the upstream connect path for LaunchPad embed proxying.
 * Next keeps /embedded/<port> when forwardUnstripped; other frameworks strip it.
 */

export function shouldForwardUnstrippedEmbedPath(framework) {
  return String(framework || "").toLowerCase() === "next";
}

export function buildEmbedUpstreamConnectPath({
  port,
  upstreamTail,
  forwardUnstripped = false,
}) {
  const n = Number(port);
  const raw = String(upstreamTail ?? "");
  const empty = raw === "";
  const tail = empty ? "" : raw.startsWith("/") ? raw : `/${raw}`;
  if (!forwardUnstripped || !Number.isInteger(n) || n < 1 || n > 65535) {
    return tail || "/";
  }
  const prefix = `/embedded/${n}`;
  if (tail === prefix || tail.startsWith(`${prefix}/`)) return tail;
  if (empty || tail === "/") return prefix;
  return `${prefix}${tail}`;
}
