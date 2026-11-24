import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "..", "public");
const sourcePath = path.join(publicDir, "launchpad-feedback-shim.source.js");
const outPath = path.join(publicDir, "launchpad-feedback-shim.js");

const apiUrl = String(process.env.VITE_API_URL || "http://localhost:5000")
  .trim()
  .replace(/\/$/, "");

// A production build published with the localhost fallback makes every host page's widget
// call the visitor's own localhost (embed config 404s / fails) — fail the build instead.
if (process.env.VITE_MODE === "production" && /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(apiUrl)) {
  throw new Error(
    `inject-embed-shim: VITE_API_URL must be the public API URL in production builds, got "${apiUrl}"`,
  );
}

let content = fs.readFileSync(sourcePath, "utf8");
content = content.replaceAll("__LAUNCHPAD_EMBED_API_URL__", apiUrl);
fs.writeFileSync(outPath, content);
