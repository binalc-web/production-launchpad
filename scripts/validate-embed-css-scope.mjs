import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cssPath = path.join(__dirname, "..", "public", "embed", "feedback-embed.css");
const SURFACE_SCOPE = ".launchpad-feedback-surface";

/** Split a selector list on top-level commas only (ignore commas inside () and []). */
function splitSelectorList(selectorGroup) {
  const parts = [];
  let current = "";
  let depth = 0;
  for (const char of selectorGroup) {
    if (char === "(" || char === "[") depth += 1;
    else if (char === ")" || char === "]") depth -= 1;
    else if (char === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

/** Walk top-level CSS rules and collect selectors that are not scoped to the embed surface. */
function collectUnscopedTopLevelSelectors(css) {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const offenders = [];
  let index = 0;

  while (index < withoutComments.length) {
    while (index < withoutComments.length && /\s/.test(withoutComments[index])) {
      index += 1;
    }
    if (index >= withoutComments.length) break;

    if (withoutComments[index] === "@") {
      const braceStart = withoutComments.indexOf("{", index);
      if (braceStart === -1) break;
      let depth = 1;
      index = braceStart + 1;
      while (index < withoutComments.length && depth > 0) {
        if (withoutComments[index] === "{") depth += 1;
        else if (withoutComments[index] === "}") depth -= 1;
        index += 1;
      }
      continue;
    }

    const braceStart = withoutComments.indexOf("{", index);
    if (braceStart === -1) break;
    const selectorGroup = withoutComments.slice(index, braceStart).trim();

    if (selectorGroup) {
      for (const selector of splitSelectorList(selectorGroup)) {
        if (!selector || selector.includes(SURFACE_SCOPE)) continue;
        offenders.push(selector);
      }
    }

    let depth = 1;
    index = braceStart + 1;
    while (index < withoutComments.length && depth > 0) {
      if (withoutComments[index] === "{") depth += 1;
      else if (withoutComments[index] === "}") depth -= 1;
      index += 1;
    }
  }

  return offenders;
}

const css = fs.readFileSync(cssPath, "utf8");
const offenders = collectUnscopedTopLevelSelectors(css);

if (offenders.length > 0) {
  console.error("Embed CSS contains selectors that could affect the host page if loaded globally:");
  for (const selector of offenders.slice(0, 20)) {
    console.error(`  - ${selector}`);
  }
  if (offenders.length > 20) {
    console.error(`  ... and ${offenders.length - 20} more`);
  }
  process.exit(1);
}

console.log(`Embed CSS scope validation passed (${SURFACE_SCOPE} only).`);
