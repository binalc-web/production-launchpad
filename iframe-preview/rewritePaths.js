import { EMBED_FRAME_PARAM, EMBEDDED_PATH_PREFIX } from "./constants.js";
import { buildEmbedBootstrapScript } from "./embedHmrWs.js";
import { injectEmbedConsoleReporter } from "./embedConsoleReporter.js";
import {
  isIncorrectModuleContentType,
  isModuleScriptRequestPath,
  shouldKeepRootAbsoluteViteImportPath,
} from "./viteSpecialImport.util.js";
import {
  LAUNCHPAD_EMBED_BASENAME_EXPR,
  rewriteReactRouterBasename,
} from "../../shared/preview-rewrite/reactRouterBasename.js";
import { rewriteVueRouterBase } from "../../shared/preview-rewrite/vueRouterBase.js";
import { rewriteTanstackRouterBasepath } from "../../shared/preview-rewrite/tanstackRouterBasepath.js";

export {
  LAUNCHPAD_EMBED_BASENAME_EXPR,
  rewriteReactRouterBasename,
  rewriteVueRouterBase,
  rewriteTanstackRouterBasepath,
};

/** Public/static dirs on the embed app (not Vite module paths like /src or /node_modules). */
export const EMBED_PUBLIC_PATH_PREFIXES = [
  "brand",
  "icons",
  "assets",
  "images",
  "static",
  "public",
  "media",
  "fonts",
];

/** Paths served from upstream origin root (not under app basePath). */
const UPSTREAM_ROOT_PREFIX = new RegExp(
  `^\\/(?:@vite|@react-refresh|@fs|@id|node_modules|src|${[...EMBED_PUBLIC_PATH_PREFIXES].join("|")})(?:\\/|$)`,
);

/** Vite dev module / stylesheet extensions (any root-level folder, not only /src). */
export const VITE_DEV_MODULE_EXT = "tsx?|jsx?|mjs|cjs|vue|svelte|css|scss|sass|less";

const VITE_DEV_MODULE_PATH_RE = new RegExp(`\\.(${VITE_DEV_MODULE_EXT})(?:\\?.*)?$`, "i");

/** Launchpad SPA/API first segments — never treat as upstream project modules. */
const LAUNCHPAD_ROOT_SEGMENTS = new Set([
  "projects",
  "api",
  "auth",
  "admin",
  "embedded",
  "iframe-preview",
  "login",
  "register",
  "signup",
  "settings",
  "releases",
  "workspace",
  "client-link",
]);

/**
 * True for root-absolute Vite dev module URLs (e.g. /lib/foo.tsx, /components/ui/x.tsx).
 * Works for any folder when `@` alias points at project root, not only /src.
 * @param {string} pathname
 */
export function isViteDevModulePath(pathname) {
  const raw = String(pathname ?? "");
  const p = raw.split("?")[0] ?? "";
  if (!p.startsWith("/") || p.startsWith("/embedded/")) return false;
  if (!VITE_DEV_MODULE_PATH_RE.test(p)) return false;
  const segments = p.split("/").filter(Boolean);
  if (!segments.length) return false;
  const first = segments[0].toLowerCase();
  if (LAUNCHPAD_ROOT_SEGMENTS.has(first)) return false;
  return true;
}

/**
 * Vite compiles inline `<script type="module">import '/src/…'</script>` into
 * `/index.html?html-proxy&index=N.js`. Those must stay under `/embedded/<port>/`.
 */
export function isViteHtmlProxyUrl(urlOrPath) {
  const s = String(urlOrPath || "");
  if (!/[?&]html-proxy\b/i.test(s)) return false;
  const pathOnly = s.split("?")[0] ?? "";
  return /(?:^|\/)index\.html$/i.test(pathOnly) || pathOnly === "" || pathOnly === "/";
}

/** Vite dev paths + Next.js `/_next/` + Turbopack root chunks (`/node_modules_*`, `/src_*`, …). */
export function isUpstreamBundlerPath(pathname) {
  const raw = String(pathname ?? "");
  if (isViteHtmlProxyUrl(raw)) return true;
  const p = raw.split("?")[0] ?? "";
  if (!p.startsWith("/")) return false;
  if (UPSTREAM_ROOT_PREFIX.test(p)) return true;
  if (isViteDevModulePath(p)) return true;
  if (/^\/_next(?:\/|$)/.test(p)) return true;
  if (/^\/node_modules_[^/]+$/.test(p)) return true;
  if (/^\/turbopack-[^/]+$/.test(p)) return true;
  if (/^\/webpack-hmr$/.test(p)) return true;
  if (/^\/__webpack_hmr$/.test(p)) return true;
  if (/^\/turbopack-hmr$/.test(p)) return true;
  if (/^\/src_[^/]+$/.test(p)) return true;
  if (/^\/_[a-f0-9]+\._\.[^/]+$/i.test(p)) return true;
  if (/^\/__nextjs_/.test(p)) return true;
  return false;
}

/** Split proxy target URL into origin + optional app base path. */
export function parseEmbedTarget(url) {
  const trimmed = String(url || "").replace(/\/$/, "");
  try {
    const parsed = new URL(trimmed);
    const basePath = parsed.pathname === "/" ? "" : parsed.pathname.replace(/\/$/, "");
    return { url: trimmed, origin: parsed.origin, basePath };
  } catch {
    return { url: trimmed, origin: trimmed, basePath: "" };
  }
}

/**
 * Map /embedded/<port>/... requests to the correct upstream path.
 * Page HTML uses basePath; Vite dev modules use the server root.
 */
export function rewriteEmbedProxyPath(path, embedBasePath, embedPathPrefix) {
  const escaped = embedPathPrefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const stripped = path.replace(new RegExp(`^${escaped}/?`), "/") || "/";

  if (isUpstreamBundlerPath(stripped)) {
    return stripped;
  }

  if (!embedBasePath) {
    return stripped;
  }

  if (stripped === "/") {
    return `${embedBasePath}/`;
  }

  return `${embedBasePath}${stripped}`;
}

function joinAppPath(prefix, suffix) {
  const base = prefix.replace(/\/$/, "");
  if (!suffix || suffix === "/") return `${base}/`;
  const path = suffix.startsWith("/") ? suffix : `/${suffix}`;
  return `${base}${path}`;
}

function isProxiedPath(path, basePath, assetPath) {
  if (path.startsWith(`${assetPath}/`) || path === assetPath) return true;
  if (basePath && (path.startsWith(`${basePath}/`) || path === basePath)) return true;
  return false;
}

/** Remove internal proxy params before forwarding to upstream. */
export function stripEmbedFrameParam(rawUrl) {
  const qIdx = String(rawUrl ?? "").indexOf("?");
  if (qIdx === -1) return rawUrl;
  const pathname = rawUrl.slice(0, qIdx);
  const query = rawUrl.slice(qIdx + 1);
  if (!query) return rawUrl;
  // Do not use URLSearchParams — it turns Vite flag params like `?vue&type=style`
  // into `?vue=&type=style`, and upstream then returns raw CSS instead of the JS module.
  const parts = query.split("&").filter((part) => {
    if (!part) return false;
    const eq = part.indexOf("=");
    const key = (eq === -1 ? part : part.slice(0, eq)).trim();
    return key !== EMBED_FRAME_PARAM;
  });
  const qs = parts.join("&");
  return qs ? `${pathname}?${qs}` : pathname;
}

/** Rewrite upstream redirect targets so navigation stays on the host (iframe same-origin). */
export function rewriteRedirectLocation(location, proxyTarget, assetPath) {
  const { url, origin, basePath } = parseEmbedTarget(proxyTarget);
  const trimmed = location.trim();
  if (!trimmed) return trimmed;

  const mapUpstreamPath = (path) => {
    // Always keep redirects under /embedded/<port>/ so Next redirect("/dashboard")
    // does not break out to the LaunchPad host root.
    if (isUpstreamBundlerPath(path)) return joinAppPath(assetPath, path);
    if (basePath && (path === basePath || path.startsWith(`${basePath}/`))) {
      return joinAppPath(assetPath, path);
    }
    if (basePath) return joinAppPath(assetPath, joinAppPath(basePath, path));
    return joinAppPath(assetPath, path);
  };

  if (/^https?:\/\//i.test(trimmed)) {
    if (trimmed.startsWith(`${url}/`) || trimmed === url) {
      const suffix = trimmed.slice(url.length) || "/";
      const path = suffix.startsWith("/") ? suffix : `/${suffix}`;
      return mapUpstreamPath(path);
    }
    if (trimmed.startsWith(`${origin}/`) || trimmed === origin) {
      const suffix = trimmed.slice(origin.length) || "/";
      const path = suffix.startsWith("/") ? suffix : `/${suffix}`;
      return mapUpstreamPath(path);
    }
    return trimmed;
  }

  if (trimmed.startsWith("//")) {
    return trimmed;
  }

  if (trimmed.startsWith("/")) {
    if (isProxiedPath(trimmed, basePath, assetPath)) return trimmed;
    return mapUpstreamPath(trimmed);
  }

  return trimmed;
}

export function rewriteRefreshHeader(refresh, proxyTarget, assetPath) {
  return refresh.replace(
    /url=\s*(\S+)/i,
    (_match, url) => `url=${rewriteRedirectLocation(url, proxyTarget, assetPath)}`,
  );
}

/**
 * Scope Set-Cookie Path under /embedded/<port>/ so preview auth cookies
 * do not use Path=/ on the LaunchPad host (Cookie header → nginx 400).
 * @param {string} setCookieValue
 * @param {string} assetPath e.g. /embedded/8013
 */
export function rewriteSetCookiePathForEmbed(setCookieValue, assetPath) {
  const raw = String(setCookieValue ?? "");
  if (!raw) return raw;
  const prefix = assetPath.endsWith("/") ? assetPath : `${assetPath}/`;
  if (/;\s*path\s*=/i.test(raw)) {
    return raw.replace(/;\s*path\s*=[^;]*/i, `; Path=${prefix}`);
  }
  return `${raw}; Path=${prefix}`;
}

export function applyProxyResponseHeaders(headers, proxyTarget, assetPath) {
  const out = { ...headers };

  const location = out.location ?? out.Location;
  if (typeof location === "string") {
    out.location = rewriteRedirectLocation(location, proxyTarget, assetPath);
    delete out.Location;
  }

  const refresh = out.refresh ?? out.Refresh;
  if (typeof refresh === "string") {
    out.refresh = rewriteRefreshHeader(refresh, proxyTarget, assetPath);
    delete out.Refresh;
  }

  const setCookie = out["set-cookie"] ?? out["Set-Cookie"];
  if (setCookie != null) {
    const list = Array.isArray(setCookie) ? setCookie : [setCookie];
    out["set-cookie"] = list.map((v) => rewriteSetCookiePathForEmbed(String(v), assetPath));
    delete out["Set-Cookie"];
  }

  return out;
}

function rewriteHtmlMetaRefresh(html, proxyTarget, assetPath) {
  return html.replace(
    /(<meta\s[^>]*http-equiv\s*=\s*["']refresh["'][^>]*content\s*=\s*["'][^"']*url=)([^"';]+)/gi,
    (_match, prefix, url) =>
      `${prefix}${rewriteRedirectLocation(url.trim(), proxyTarget, assetPath)}`,
  );
}

function embedPrefix(embedPath) {
  const base = embedPath.endsWith("/") ? embedPath.slice(0, -1) : embedPath;
  return `${base}/`;
}

/** <base href> for iframe documents — always under /embedded/<port>/ (+ upstream basePath). */
export function resolveEmbedDocumentBase(assetPath, upstreamBasePath = "") {
  const base = upstreamBasePath.replace(/\/$/, "");
  if (!base) return assetPath.endsWith("/") ? assetPath : `${assetPath}/`;
  const embed = assetPath.replace(/\/$/, "");
  return `${embed}${base}/`;
}

const ASSET_PATH_NAMES = [
  "@vite",
  "@react-refresh",
  "@fs",
  "@id",
  "node_modules",
  "src",
  "_next",
  ...EMBED_PUBLIC_PATH_PREFIXES,
  "favicon.ico",
  "favicon.svg",
].join("|");

/** Chars in a quoted root-absolute path (no whitespace — avoids `\\s` → literal `s` in `[^…]`). */
const QUOTED_URL_SEGMENT = "[^\"'\\`\\)/]+";

/** Next.js dev: /_next/…, Turbopack chunks, and HMR websocket paths (single path segment). */
const NEXT_DEV_ROOT_PATH = `(?:_next(?:\\/${QUOTED_URL_SEGMENT})?|__nextjs_${QUOTED_URL_SEGMENT}|node_modules_${QUOTED_URL_SEGMENT}|turbopack-${QUOTED_URL_SEGMENT}|turbopack-hmr|webpack-hmr|__webpack_hmr|src_${QUOTED_URL_SEGMENT})`;

const NEXT_DEV_QUOTED_PATH_RE = new RegExp(
  `(?<=["'\`(]|url\\(\\s*["']?)\\/(?!\\/|embedded\\/)(${NEXT_DEV_ROOT_PATH})`,
  "gi",
);

const TURBOPACK_HASH_CHUNK_RE = /(?<=["'\`(])\/(?!\/|embedded\/)(_[a-f0-9]+\._\.\w+)/gi;

/** Prefix Next.js / Turbopack dev asset URLs so they stay under /embedded/<port>/. */
const NEXT_FETCH_PATH_RE = /(\bfetch\s*\(\s*["'])\/(?!\/|embedded\/)(__nextjs_[^"']+)/gi;

export function rewriteNextDevPaths(content, embedPath) {
  const prefix = embedPrefix(embedPath).replace(/\/$/, "");
  let out = content.replace(NEXT_DEV_QUOTED_PATH_RE, `${prefix}/$1`);
  out = out.replace(TURBOPACK_HASH_CHUNK_RE, `${prefix}/$1`);
  out = out.replace(NEXT_FETCH_PATH_RE, `$1${prefix}/$2`);
  return out;
}

const PUBLIC_ASSET_ROOTS = [...EMBED_PUBLIC_PATH_PREFIXES, "favicon\\.ico", "favicon\\.svg"].join(
  "|",
);
const ASSET_PATH_PATTERN = `(?:${ASSET_PATH_NAMES})(?:\\/[^"'\\\`\\)\\s]*)?`;

/** Vite `public/` files at server root: /BSP.svg, /logo.png (not SPA routes like /login). */
const PUBLIC_STATIC_EXT =
  "svg|png|jpe?g|gif|webp|ico|avif|woff2?|ttf|eot|otf|mp4|webm|mp3|pdf|json|xml|txt|csv|map";
const PUBLIC_ROOT_FILE = `[^/"'\\\`\\)\\s?#]+\\.(${PUBLIC_STATIC_EXT})(?:\\?[^"'\\)\\s]*)?`;

/** Single path segment public file at server root (e.g. logo.png). */
export function isPublicRootFilePath(pathname) {
  const seg = (pathname ?? "").split("?")[0]?.slice(1) ?? "";
  if (!seg || seg.includes("/")) return false;
  return new RegExp(`^[^/"'\\\`\\)\\s?#]+\\.(${PUBLIC_STATIC_EXT})(?:\\?[^"'\\)\\s]*)?$`, "i").test(
    seg,
  );
}

/**
 * Prefix root-level public files (single segment + extension).
 * Skips app routes (/login) and paths already under /embedded/.
 */
export function rewritePublicRootFiles(content, embedPath) {
  const prefix = embedPrefix(embedPath).replace(/\/$/, "");
  return content.replace(
    new RegExp(`(?<=["'\`(]|url\\(\\s*["']?)\\/(?!\\/|embedded\\/)(${PUBLIC_ROOT_FILE})`, "gi"),
    `${prefix}/$1`,
  );
}

/** Prefix Vite/public asset URLs in HTML — leaves app routes untouched. */
export function rewriteRootPaths(content, embedPath) {
  const prefix = embedPrefix(embedPath).replace(/\/$/, "");
  const pattern = new RegExp(`(?<=["'\`(])\\/(${ASSET_PATH_PATTERN})`, "g");
  return content.replace(pattern, (match, pathPart) => {
    if (shouldKeepRootAbsoluteViteImportPath(`/${pathPart}`)) return match;
    return `${prefix}/${pathPart}`;
  });
}

/**
 * Prefix Vite html-proxy module URLs so they do not break out to the host root.
 */
export function rewriteViteHtmlProxyUrls(content, embedPath) {
  const prefix = embedPrefix(embedPath).replace(/\/$/, "");
  return String(content || "").replace(
    /(^|[\s("'=`])\/(?!\/|embedded\/)((?:index\.html)?\?[^"'\\s>]*html-proxy[^"'\\s>]*)/gi,
    (match, lead, pathPart) => {
      if (!isViteHtmlProxyUrl(`/${pathPart}`)) return match;
      return `${lead}${prefix}/${pathPart.replace(/^\//, "")}`;
    },
  );
}

/** Rewrite root-absolute src/href on dev assets in HTML (<base> does not apply to /paths). */
export function rewriteHtmlAssetAttributes(html, embedPath) {
  const prefix = embedPrefix(embedPath);
  const publicRoots = EMBED_PUBLIC_PATH_PREFIXES.join("|");
  let out = html.replace(
    new RegExp(
      `(\\s)(src|href|poster|data-src|xlink:href)\\s*=\\s*(["'])\\/(?!\\/|embedded\\/)(@vite|@react-refresh|@fs|@id|node_modules|src|_next|__nextjs|${publicRoots})(\\/[^"']*)?`,
      "gi",
    ),
    (match, sp, attr, q, root, rest = "") => {
      const pathPart = `${root}${rest ?? ""}`;
      if (shouldKeepRootAbsoluteViteImportPath(`/${pathPart}`)) return match;
      return `${sp}${attr}=${q}${prefix}${root}${rest}`;
    },
  );

  out = out.replace(
    new RegExp(`(\\s(?:src|href)\\s*=\\s*["'])\\/(?!\\/|embedded\\/)(${PUBLIC_ROOT_FILE})`, "gi"),
    `$1${prefix}$2`,
  );

  // Inline-module → html-proxy entry (not covered by @vite/@id/src allowlist above).
  out = rewriteViteHtmlProxyUrls(out, embedPath);

  return out;
}

/** <link rel="preload" href="/_next/static/…"> and similar. */
export function rewriteHtmlPreloadLinks(html, embedPath) {
  const prefix = embedPrefix(embedPath);
  return html.replace(
    /(<link\s[^>]*\bhref\s*=\s*)(["'])\/(?!\/|embedded\/)(_next\/[^"']+)/gi,
    `$1$2${prefix}$3`,
  );
}

/** Next.js image optimizer URLs in HTML/JS. */
export function rewriteNextImageUrls(content, embedPath) {
  const prefix = embedPrefix(embedPath).replace(/\/$/, "");
  return content.replace(/(["'])\/(?!\/|embedded\/)(_next\/image\?[^"']+)/gi, `$1${prefix}/$2`);
}

const QUOTED_SOURCE_MODULE_PATH =
  "[^\"'\\`\\)\\s]+\\.(" + VITE_DEV_MODULE_EXT + ")(?:\\?[^\"'\\`\\)\\s]*)?";

function prefixQuotedSourceModulePath(match, lead, quote, pathPart, embedPath) {
  if (shouldKeepRootAbsoluteViteImportPath(`/${pathPart}`)) return match;
  const pathname = `/${String(pathPart).split("?")[0]}`;
  if (!isViteDevModulePath(pathname)) return match;
  const prefix = embedPrefix(embedPath);
  return `${lead}${quote}${prefix}${pathPart}`;
}

/** Prefix root-absolute Vite dev module imports outside the legacy folder allowlist. */
export function rewriteJsSourceModulePaths(content, embedPath) {
  let out = content;
  const patterns = [
    new RegExp(`(\\bfrom\\s+)(["'])\\/(?!embedded\\/)((${QUOTED_SOURCE_MODULE_PATH}))`, "g"),
    new RegExp(`(\\bimport\\s+)(["'])\\/(?!embedded\\/)((${QUOTED_SOURCE_MODULE_PATH}))`, "g"),
    new RegExp(
      `(\\bimport\\s*\\(\\s*)(["'])\\/(?!embedded\\/)((${QUOTED_SOURCE_MODULE_PATH}))`,
      "g",
    ),
    new RegExp(
      `(\\bnew\\s+URL\\s*\\(\\s*)(["'])\\/(?!embedded\\/)((${QUOTED_SOURCE_MODULE_PATH}))`,
      "g",
    ),
  ];
  for (const re of patterns) {
    out = out.replace(re, (match, lead, quote, pathPart) =>
      prefixQuotedSourceModulePath(match, lead, quote, pathPart, embedPath),
    );
  }
  return out;
}

/** Rewrite root-absolute module script src/href in HTML (e.g. /lib/main.tsx). */
export function rewriteHtmlSourceModuleAttributes(html, embedPath) {
  const re = new RegExp(
    `(\\s(?:src|href)\\s*=\\s*)(["'])\\/(?!embedded\\/)((${QUOTED_SOURCE_MODULE_PATH}))`,
    "gi",
  );
  return html.replace(re, (match, lead, quote, pathPart) =>
    prefixQuotedSourceModulePath(match, lead, quote, pathPart, embedPath),
  );
}

/** Rewrite ES module string imports only. */
export function rewriteJsModulePaths(content, embedPath) {
  const prefix = embedPrefix(embedPath);
  const asset = ASSET_PATH_PATTERN;

  /** @param {string} match @param {string} lead @param {string} quote @param {string} pathPart */
  function prefixImportMatch(match, lead, quote, pathPart) {
    if (shouldKeepRootAbsoluteViteImportPath(`/${pathPart}`)) return match;
    return `${lead}${quote}${prefix}${pathPart}`;
  }

  let out = content;

  out = out.replace(new RegExp(`\\bfrom\\s+(["'])\\/(${asset})`, "g"), (match, q, pathPart) =>
    prefixImportMatch(match, "from ", q, pathPart),
  );
  out = out.replace(new RegExp(`\\bimport\\s+(["'])\\/(${asset})`, "g"), (match, q, pathPart) =>
    prefixImportMatch(match, "import ", q, pathPart),
  );
  out = out.replace(
    new RegExp(`\\bimport\\s*\\(\\s*(["'])\\/(${asset})`, "g"),
    (match, q, pathPart) => prefixImportMatch(match, "import(", q, pathPart),
  );
  out = out.replace(
    new RegExp(`\\bnew\\s+URL\\s*\\(\\s*(["'])\\/(${asset})`, "g"),
    (match, q, pathPart) => prefixImportMatch(match, "new URL(", q, pathPart),
  );

  return out;
}

export function rewriteJsPublicAssetPaths(content, embedPath) {
  const prefix = embedPrefix(embedPath);
  let out = content;

  out = out.replace(
    new RegExp(`(["'])\\/(?!\\/|embedded\\/)(${PUBLIC_ASSET_ROOTS})(\\/[^"']*)?`, "g"),
    `$1${prefix}$2$3`,
  );

  out = out.replace(
    new RegExp(`\\bsrc:\\s*(["'])\\/(?!\\/|embedded\\/)(${PUBLIC_ROOT_FILE})`, "gi"),
    `src: $1${prefix}$2`,
  );

  return out;
}

export function rewriteCssUrls(content, embedPath) {
  const prefix = embedPrefix(embedPath).replace(/\/$/, "");
  let out = content.replace(
    new RegExp(`url\\(\\s*(["']?)\\/(${ASSET_PATH_PATTERN})`, "g"),
    `url($1${prefix}/$2`,
  );
  out = rewritePublicRootFiles(out, embedPath);
  return rewriteNextDevPaths(out, embedPath);
}

export function rewriteTargetOrigin(content, proxyTarget, assetPath) {
  const { url, origin, basePath } = parseEmbedTarget(proxyTarget);
  const assetPrefix = embedPrefix(assetPath);
  let out = content;

  if (basePath) {
    out = out.replaceAll(`${url}/`, `${basePath}/`);
    out = out.replaceAll(url, basePath);
    out = out.replaceAll(`${origin}/`, assetPrefix);
  } else {
    out = out.replaceAll(`${url}/`, "/");
    out = out.replaceAll(`${origin}/`, assetPrefix);
  }

  return out;
}

/**
 * Public host + HMR socket target for @vite/client rewrites.
 * Uses X-Forwarded-* behind HTTPS edge nginx so we never emit wss://host:80/…
 */
export function buildHmrContext(req, assetPath) {
  const forwardedProto = String(req?.headers?.["x-forwarded-proto"] ?? "")
    .split(",")[0]
    .trim()
    .toLowerCase();
  const forwardedHost = String(req?.headers?.["x-forwarded-host"] ?? "")
    .split(",")[0]
    .trim();
  const hostHeader = String(req?.headers?.host ?? "localhost:5173")
    .split(",")[0]
    .trim();
  const browserHostRaw = forwardedHost || hostHeader;
  const proto = forwardedProto || (req?.socket?.encrypted ? "https" : "http");

  let hostname = "localhost";
  let port = proto === "https" ? "443" : "80";
  try {
    const u = new URL(`http://${browserHostRaw}`);
    hostname = u.hostname;
    if (u.port) port = u.port;
  } catch {
    const idx = browserHostRaw.lastIndexOf(":");
    if (idx > 0) {
      hostname = browserHostRaw.slice(0, idx);
      port = browserHostRaw.slice(idx + 1);
    } else {
      hostname = browserHostRaw;
    }
  }

  const basePath = assetPath.endsWith("/") ? assetPath : `${assetPath}/`;
  const portNum = Number(port);
  const defaultPort = proto === "https" ? 443 : 80;
  const publicPortSuffix =
    Number.isFinite(portNum) && portNum > 0 && portNum !== defaultPort ? `:${port}` : "";
  const publicHost = `${hostname}${publicPortSuffix}`;
  const socketTarget = `${publicHost}${basePath}`;
  const serverHostValue = `${proto}://${publicHost}${basePath}`;

  return {
    browserHost: publicHost,
    hostname,
    port,
    proto,
    basePath,
    socketTarget,
    serverHostValue,
    hmrPort: Number(port) || defaultPort,
  };
}

/**
 * Point Vite's @vite/client HMR at the iframe's own host + /embedded/<port>/ path.
 * The browser host is `location`, not the Host header: CloudFront replaces Host with
 * the origin (`apiv2…`) before this rewrite runs, and that name is the wrong socket.
 */
export function rewriteViteHmrClient(content, hmrContext) {
  if (
    !content.includes("serverHost") &&
    !content.includes("__HMR_") &&
    !content.includes("hmrPort") &&
    !content.includes("setupWebSocket")
  ) {
    return content;
  }

  const basePath = hmrContext.basePath.endsWith("/")
    ? hmrContext.basePath
    : `${hmrContext.basePath}/`;
  const baseLiteral = JSON.stringify(basePath);

  let out = content;

  out = out.replace(
    /const serverHost = ("[^"]*"|__SERVER_HOST__)/,
    `const serverHost = location.origin + ${baseLiteral}`,
  );

  out = out.replace(
    /const directSocketHost = ("[^"]*"|__HMR_DIRECT_TARGET__)/,
    `const directSocketHost = location.host + ${baseLiteral}`,
  );

  // Keep the public port. A leftover :8121 (the dev server) is not reachable in the browser.
  out = out.replace(
    /const hmrPort = ([^;\n]+)/,
    `const hmrPort = (location.protocol === "https:" ? 443 : 80)`,
  );

  out = out.replace(
    /const socketHost = `[^`]+`/s,
    `const socketHost = location.host + ${baseLiteral}`,
  );

  out = out.replace(/const base = (__BASE__[^;]+|["'][^"']*["'])/, `const base = ${baseLiteral}`);

  // Vite 5+ WebSocket URL when socketHost const rewrite missed
  out = out.replace(
    /`\$\{socketProtocol\}:\/\/\$\{socketHost\}\?token=\$\{wsToken\}`/g,
    `\`\${socketProtocol}://\${location.host}${basePath}?token=\${wsToken}\``,
  );

  return out;
}

const EMBED_BOOTSTRAP_SCRIPT = buildEmbedBootstrapScript();

export function injectEmbedBootstrapScripts(html) {
  if (html.includes("data-embed-bootstrap")) return html;
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, (m) => `${m}${EMBED_BOOTSTRAP_SCRIPT}`);
  }
  return `${EMBED_BOOTSTRAP_SCRIPT}${html}`;
}

export function rewriteHtmlLinkTargets(html) {
  return html
    .replace(/\btarget\s*=\s*["']_top["']/gi, 'target="_self"')
    .replace(/\btarget\s*=\s*["']_parent["']/gi, 'target="_self"');
}

const EMBED_ROUTE_REPORTER = `function embedPrefix(){try{var m=location.pathname.match(/^\\/embedded\\/(\\d{1,5})/);if(m)return"/embedded/"+m[1];var cm=document.cookie.match(/(?:^|;\\s*)embed_port=(\\d{1,5})(?:;|$)/);return cm?"/embedded/"+cm[1]:null}catch(e){return null}}function toEmbedUrl(url){var prefix=embedPrefix();if(!prefix||url==null)return url;try{var abs,rest="";if(typeof url!=="string"){if(typeof URL!=="undefined"&&url instanceof URL){if(url.origin!==location.origin)return url;abs=url.pathname;rest=url.search+url.hash}else return url}else{if(!url||url.charAt(0)==="#")return url;if(/^https?:\\/\\//i.test(url)||url.slice(0,2)==="//"){var x=new URL(url,location.href);if(x.origin!==location.origin)return url;abs=x.pathname;rest=x.search+x.hash}else if(url.charAt(0)!=="/"){return url}else{var qi=url.indexOf("?"),hi=url.indexOf("#"),cut=url.length;if(qi>=0)cut=Math.min(cut,qi);if(hi>=0)cut=Math.min(cut,hi);abs=url.slice(0,cut);rest=url.slice(cut)}}if(abs===prefix||abs.indexOf(prefix+"/")===0)return abs+rest;return prefix+(abs==="/"? "/":abs)+rest}catch(e2){return url}}function reportEmbedRoute(){try{if(window.self===window.top)return;var path=location.pathname,search=location.search,hash=location.hash,m=path.match(/^\\/embedded\\/(\\d{1,5})(\\/.*)?$/),port=m?Number(m[1]):null,app=m?(m[2]||"/"):path;if(!port){try{var cm=document.cookie.match(/(?:^|;\\s*)embed_port=(\\d{1,5})(?:;|$)/);if(cm)port=Number(cm[1])}catch(eC){}}if(!app.startsWith("/"))app="/"+app;window.parent.postMessage({type:"launchpad:embed-route",port:port,path:app+search+hash},location.origin)}catch(e){}}reportEmbedRoute();window.addEventListener("popstate",reportEmbedRoute);window.addEventListener("hashchange",reportEmbedRoute);var _ps=history.pushState,_rs=history.replaceState;history.pushState=function(state,title,url){var r=_ps.call(this,state,title,url!=null?toEmbedUrl(url):url);reportEmbedRoute();return r};history.replaceState=function(state,title,url){var r=_rs.call(this,state,title,url!=null?toEmbedUrl(url):url);reportEmbedRoute();return r};`;

const IFRAME_NAV_GUARD = `<script data-embed-guard>(function(){var u=new URL(location.href);var ch=false;if(u.searchParams.has("embed_frame")){u.searchParams.delete("embed_frame");ch=true}if(u.searchParams.has("embed_port")){u.searchParams.delete("embed_port");ch=true}if(ch){var q=u.searchParams.toString();history.replaceState(null,"",u.pathname+(q?"?"+q:"")+u.hash)}if(window.self===window.top)return;${EMBED_ROUTE_REPORTER}var p=Location.prototype,r=p.replace,a=p.assign;p.replace=function(u){var next=toEmbedUrl(u);if(this===window.top.location){window.self.location.replace(next);return}return r.call(this,next)};p.assign=function(u){var next=toEmbedUrl(u);if(this===window.top.location){window.self.location.assign(next);return}return a.call(this,next)};try{Object.defineProperty(window.top,"location",{set:function(v){window.self.location=toEmbedUrl(v)},get:function(){return window.self.location},configurable:true})}catch(e){}document.addEventListener("click",function(e){var n=e.target&&e.target.closest?e.target.closest("a"):null;if(!n)return;var t=(n.getAttribute("target")||"").toLowerCase();if(t==="_top"||t==="_parent"){e.preventDefault();n.setAttribute("target","_self");window.self.location=toEmbedUrl(n.href);return}var href=n.getAttribute("href");if(!href||href.charAt(0)==="#"||/^https?:/i.test(href))return;var prefix=embedPrefix();if(!prefix||href.charAt(0)!=="/")return;try{var qi=href.indexOf("?"),hi=href.indexOf("#"),cut=href.length;if(qi>=0)cut=Math.min(cut,qi);if(hi>=0)cut=Math.min(cut,hi);var abs=href.slice(0,cut);if(abs===prefix||abs.indexOf(prefix+"/")===0)return;e.preventDefault();window.self.location=toEmbedUrl(href)}catch(e2){}},true)})();</script>`;

export function injectIframeNavigationGuard(html) {
  const withConsole = injectEmbedConsoleReporter(html);
  if (withConsole.includes("data-embed-guard")) return withConsole;
  if (/<head[^>]*>/i.test(withConsole)) {
    return withConsole.replace(/<head[^>]*>/i, (m) => `${m}${IFRAME_NAV_GUARD}`);
  }
  return `${IFRAME_NAV_GUARD}${withConsole}`;
}

export function injectBaseHref(html, baseHref) {
  const href = baseHref.endsWith("/") ? baseHref : `${baseHref}/`;
  const tag = `<base href="${href}">`;
  // Replace any existing <base> (e.g. href="/") — Vue createWebHistory() reads it;
  // leaving root base under /embedded/<port>/ yields a blank RouterView.
  if (/<base\b[^>]*>/i.test(html)) {
    return html.replace(/<base\b[^>]*>/gi, tag);
  }
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, (m) => `${m}${tag}`);
  }
  return `${tag}${html}`;
}

/** Vite esbuild pre-bundles — skip string rewrites that corrupt regex literals inside deps. */
export function isVitePrebundledDepPath(pathname) {
  const pathOnly = String(pathname ?? "").split("?")[0];
  return /\/node_modules\/\.vite\/deps(?:_temp)?\//.test(pathOnly);
}

function resolveRewriteRequestPath(req, assetPath) {
  const rawUrl = req?.url ?? "";
  if (rawUrl) {
    const parsed = parseEmbeddedPortRequest(rawUrl);
    if (parsed?.upstreamPath) return parsed.upstreamPath;
    return rawUrl.split("?")[0] ?? "";
  }
  return assetPath ?? "";
}

export function rewriteEmbeddedBody(body, contentType, proxyTarget, assetPath, req) {
  const requestPath = resolveRewriteRequestPath(req, assetPath);

  if (contentType.includes("text/html")) {
    const { basePath } = parseEmbedTarget(proxyTarget);
    const appBase = resolveEmbedDocumentBase(assetPath, basePath);
    let out = rewriteTargetOrigin(body, proxyTarget, assetPath);
    out = rewriteHtmlAssetAttributes(out, assetPath);
    out = rewriteHtmlSourceModuleAttributes(out, assetPath);
    out = rewriteHtmlPreloadLinks(out, assetPath);
    out = rewriteRootPaths(out, assetPath);
    out = rewritePublicRootFiles(out, assetPath);
    out = rewriteNextDevPaths(out, assetPath);
    out = rewriteNextImageUrls(out, assetPath);
    out = rewriteHtmlMetaRefresh(out, proxyTarget, assetPath);
    out = rewriteHtmlLinkTargets(out);
    out = injectEmbedBootstrapScripts(out);
    out = injectIframeNavigationGuard(out);
    out = injectBaseHref(out, appBase);
    return out;
  }

  if (contentType.includes("text/css")) {
    return rewriteCssUrls(rewriteTargetOrigin(body, proxyTarget, assetPath), assetPath);
  }

  if (isRewritableScriptContentType(contentType, requestPath)) {
    if (isVitePrebundledDepPath(requestPath)) {
      // Light path: avoid aggressive /images|/assets rewrites that corrupt vendor regexes.
      // Still apply surgical router basenames — react-router-dom / vue-router /
      // @tanstack/react-router ship from .vite/deps, and without this the SPA
      // navigates to bare /login → LaunchPad host UI (or a history loop).
      let out = rewriteTargetOrigin(body, proxyTarget, assetPath);
      out = rewriteJsModulePaths(out, assetPath);
      out = rewriteViteHtmlProxyUrls(out, assetPath);
      out = rewriteReactRouterBasename(out, { requestPath });
      out = rewriteVueRouterBase(out, { assetPath, requestPath });
      out = rewriteTanstackRouterBasepath(out, { assetPath, requestPath });
      return out;
    }

    let out = rewriteTargetOrigin(body, proxyTarget, assetPath);
    out = rewriteJsModulePaths(out, assetPath);
    out = rewriteJsSourceModulePaths(out, assetPath);
    out = rewriteViteHtmlProxyUrls(out, assetPath);
    out = rewriteJsPublicAssetPaths(out, assetPath);
    out = rewritePublicRootFiles(out, assetPath);
    out = rewriteNextDevPaths(out, assetPath);
    out = rewriteNextImageUrls(out, assetPath);
    out = rewriteReactRouterBasename(out, { requestPath });
    out = rewriteVueRouterBase(out, { assetPath, requestPath });
    out = rewriteTanstackRouterBasepath(out, { assetPath, requestPath });
    if (req) {
      out = rewriteViteHmrClient(out, buildHmrContext(req, assetPath));
    }
    return out;
  }

  return body;
}

function isRewritableScriptContentType(contentType, requestPath) {
  const ct = String(contentType ?? "").toLowerCase();
  if (ct.includes("javascript") || ct.includes("typescript") || ct.includes("text/x-typescript")) {
    return true;
  }
  if (
    requestPath &&
    isModuleScriptRequestPath(requestPath) &&
    isIncorrectModuleContentType(contentType)
  ) {
    return true;
  }
  return false;
}

export function shouldRewriteResponse(contentType, contentEncoding, requestPath) {
  // ?url / ?worker stay root-absolute; skip body rewrite so synthesizeViteUrlModule can run.
  if (requestPath && shouldKeepRootAbsoluteViteImportPath(requestPath)) {
    return false;
  }
  if (contentEncoding && /^(gzip|br|deflate)/i.test(contentEncoding.trim())) {
    return false;
  }
  const isBundledAssetPath =
    requestPath && /\/(?:static|assets)\//.test(requestPath) && !/\/_next\//.test(requestPath);
  if (isBundledAssetPath) {
    // Production Vite chunks live under /assets/ — still rewrite JS for React Router basename.
    return isRewritableScriptContentType(contentType, requestPath);
  }
  return (
    contentType.includes("text/html") ||
    isRewritableScriptContentType(contentType, requestPath) ||
    contentType.includes("text/css") ||
    contentType.includes("application/json")
  );
}

/** Parse /embedded/<port>/... from request URL; returns null if not a match. */
export function parseEmbeddedPortRequest(rawUrl) {
  const pathname = (rawUrl || "/").split("?")[0] ?? "/";
  const match = pathname.match(/^\/embedded\/(\d{1,5})(\/.*)?$/);
  if (!match) return null;
  const port = Number(match[1]);
  if (!Number.isInteger(port) || port < 1 || port > 65535) return null;
  const rest = match[2] ?? "/";
  const upstreamPath = rest === "/" || rest === "" ? "/" : rest.startsWith("/") ? rest : `/${rest}`;
  return { port, assetPath: `/embedded/${port}`, upstreamPath };
}
