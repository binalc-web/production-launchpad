const BLOCK_TAGS = new Set([
  // BODY is the paste root: keeping it prevents cleanNode from unwrapping
  // (detaching) it, which would make doc.body null afterwards.
  "BODY",
  "P",
  "DIV",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "LI",
  "UL",
  "OL",
  "BLOCKQUOTE",
  "PRE",
  "TABLE",
  "TR",
  "TD",
  "TH",
]);

function unwrapElement(el) {
  const parent = el.parentNode;
  if (!parent) return;
  while (el.firstChild) parent.insertBefore(el.firstChild, el);
  parent.removeChild(el);
}

function cleanNode(node) {
  if (node.nodeType === Node.TEXT_NODE) return;
  if (node.nodeType !== Node.ELEMENT_NODE) {
    node.remove();
    return;
  }

  const el = /** @type {HTMLElement} */ (node);
  const tag = el.tagName;

  if (tag === "META" || tag === "STYLE" || tag === "SCRIPT" || tag === "LINK") {
    el.remove();
    return;
  }

  if (tag === "SPAN" || tag === "FONT") {
    const style = el.getAttribute("style") || "";
    const weight = style.match(/font-weight:\s*(bold|[6-9]00)/i);
    const italic = /font-style:\s*italic/i.test(style);
    const underline = /text-decoration:\s*underline/i.test(style);
    const strike = /line-through/i.test(style);

    Array.from(el.childNodes).forEach(cleanNode);

    if (weight) {
      const strong = el.ownerDocument.createElement("strong");
      while (el.firstChild) strong.appendChild(el.firstChild);
      el.appendChild(strong);
    }
    if (italic) {
      const em = el.ownerDocument.createElement("em");
      while (el.firstChild) em.appendChild(el.firstChild);
      el.appendChild(em);
    }
    if (underline) {
      const u = el.ownerDocument.createElement("u");
      while (el.firstChild) u.appendChild(el.firstChild);
      el.appendChild(u);
    }
    if (strike) {
      const s = el.ownerDocument.createElement("s");
      while (el.firstChild) s.appendChild(el.firstChild);
      el.appendChild(s);
    }

    if (!el.childNodes.length) {
      el.remove();
      return;
    }
    unwrapElement(el);
    return;
  }

  if (tag === "B" || tag === "STRONG") {
    el.outerHTML = `<strong>${el.innerHTML}</strong>`;
    return;
  }
  if (tag === "I" || tag === "EM") {
    el.outerHTML = `<em>${el.innerHTML}</em>`;
    return;
  }

  el.removeAttribute("style");
  el.removeAttribute("class");
  el.removeAttribute("id");
  el.removeAttribute("data-");

  Array.from(el.attributes).forEach((attr) => {
    if (attr.name.startsWith("data-")) el.removeAttribute(attr.name);
  });

  if (!BLOCK_TAGS.has(tag) && tag !== "A" && tag !== "BR" && tag !== "STRONG" && tag !== "EM" && tag !== "U" && tag !== "S" && tag !== "CODE") {
    unwrapElement(el);
    return;
  }

  Array.from(el.childNodes).forEach(cleanNode);
}

/** Strip Google Docs / Word / Notion cruft while keeping semantic structure. */
export function transformPastedHtml(html) {
  if (!html || typeof html !== "string") return html;

  const doc = new DOMParser().parseFromString(html, "text/html");
  const body = doc.body;
  if (!body) return "<p></p>";
  cleanNode(body);

  const b = body.innerHTML
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\sclass="[^"]*"/gi, "")
    .replace(/\sstyle="[^"]*"/gi, "")
    .replace(/<o:p>\s*<\/o:p>/gi, "")
    .replace(/<!\[if !supportLists\]>[\s\S]*?<!\[endif\]>/gi, "")
    .trim();

  return b || "<p></p>";
}

export function prdEditorPasteProps() {
  return {
    transformPastedHTML: transformPastedHtml,
    transformPastedText(text) {
      return text.replace(/\r\n/g, "\n");
    },
  };
}
