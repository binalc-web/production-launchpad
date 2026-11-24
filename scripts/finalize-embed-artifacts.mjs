import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import postcss from "postcss";
import prefixSelector from "postcss-prefix-selector";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const embedDir = path.join(__dirname, "..", "public", "embed");
const SURFACE_SCOPE = ".launchpad-feedback-surface";
const PRETTIER_IGNORE = "/* prettier-ignore-file */\n";

const cssPath = path.join(embedDir, "feedback-embed.css");
const jsPath = path.join(embedDir, "feedback-embed.js");

function stampPrettierIgnore(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  if (raw.includes("prettier-ignore-file")) {
    return raw;
  }
  const next = `${PRETTIER_IGNORE}${raw}`;
  fs.writeFileSync(filePath, next);
  return next;
}

const cssInput = fs.readFileSync(cssPath, "utf8");
const scoped = await postcss([
  prefixSelector({
    prefix: SURFACE_SCOPE,
    transform(prefix, selector, prefixedSelector) {
      if (selector === ":host" || selector.startsWith(":host(")) {
        return selector;
      }
      if (selector === ":root") {
        return SURFACE_SCOPE;
      }
      if (selector === "html" || selector === "body") {
        return SURFACE_SCOPE;
      }
      if (selector.startsWith(SURFACE_SCOPE)) {
        return selector;
      }
      if (selector.startsWith(":root")) {
        return selector.replace(":root", SURFACE_SCOPE);
      }
      return prefixedSelector;
    },
  }),
]).process(cssInput, { from: cssPath, to: cssPath });

fs.writeFileSync(cssPath, scoped.css);
stampPrettierIgnore(cssPath);
stampPrettierIgnore(jsPath);

console.log(`Scoped embed CSS under ${SURFACE_SCOPE} (${scoped.css.length} bytes)`);
console.log("Widget CSS is injected into shadow DOM only; scoped selectors are defense-in-depth.");
console.log("Stamped prettier-ignore-file on feedback-embed.css and feedback-embed.js");
