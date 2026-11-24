import test from "node:test";
import assert from "node:assert/strict";
import { transformPastedHtml } from "../src/pages/Project/PrdWorkspace/editor/prdEditorPaste.js";

// Minimal DOM stand-in reproducing the browser behaviour behind
// RND-LAUNCHPAD-FE-9: `document.body` is null once the <body> element is
// detached from the document, so reading `doc.body.innerHTML` after
// unwrapping the body throws "Cannot read properties of null".
class FakeText {
  constructor(text, ownerDocument) {
    this.nodeType = 3;
    this.textContent = text;
    this.ownerDocument = ownerDocument;
    this.parentNode = null;
    this.childNodes = [];
  }
  get firstChild() {
    return null;
  }
  remove() {
    this.parentNode?.removeChild(this);
  }
}

class FakeElement {
  constructor(tag, ownerDocument) {
    this.nodeType = 1;
    this.tagName = tag.toUpperCase();
    this.ownerDocument = ownerDocument;
    this.parentNode = null;
    this.childNodes = [];
    this.attributes = [];
  }
  get firstChild() {
    return this.childNodes[0] ?? null;
  }
  appendChild(child) {
    child.parentNode?.removeChild(child);
    child.parentNode = this;
    this.childNodes.push(child);
    return child;
  }
  insertBefore(child, ref) {
    child.parentNode?.removeChild(child);
    child.parentNode = this;
    const idx = ref ? this.childNodes.indexOf(ref) : -1;
    if (idx === -1) this.childNodes.push(child);
    else this.childNodes.splice(idx, 0, child);
    return child;
  }
  removeChild(child) {
    const idx = this.childNodes.indexOf(child);
    if (idx !== -1) this.childNodes.splice(idx, 1);
    child.parentNode = null;
    return child;
  }
  remove() {
    this.parentNode?.removeChild(this);
  }
  getAttribute() {
    return null;
  }
  removeAttribute() {}
  get innerHTML() {
    return this.childNodes
      .map((n) =>
        n.nodeType === 3
          ? n.textContent
          : `<${n.tagName.toLowerCase()}>${n.innerHTML}</${n.tagName.toLowerCase()}>`,
      )
      .join("");
  }
  set outerHTML(html) {
    // Only used as `<strong>…</strong>` / `<em>…</em>` renames in cleanNode.
    const tag = html.match(/^<(\w+)>/)[1];
    const renamed = new FakeElement(tag, this.ownerDocument);
    while (this.firstChild) renamed.appendChild(this.firstChild);
    const parent = this.parentNode;
    if (parent) {
      parent.insertBefore(renamed, this);
      parent.removeChild(this);
    }
  }
}

function buildFakeDoc() {
  const doc = {
    createElement: (tag) => new FakeElement(tag, doc),
  };
  const htmlEl = new FakeElement("html", doc);
  const body = new FakeElement("body", doc);
  htmlEl.appendChild(body);
  const p = new FakeElement("p", doc);
  p.appendChild(new FakeText("Hello ", doc));
  const b = new FakeElement("b", doc);
  b.appendChild(new FakeText("world", doc));
  p.appendChild(b);
  body.appendChild(p);
  // Browser semantics: body is null when no <body> is in the document.
  Object.defineProperty(doc, "body", {
    get: () => htmlEl.childNodes.find((n) => n.tagName === "BODY") ?? null,
  });
  return doc;
}

function withFakeDom(run) {
  const prevParser = globalThis.DOMParser;
  const prevNode = globalThis.Node;
  globalThis.DOMParser = class {
    parseFromString() {
      return buildFakeDoc();
    }
  };
  globalThis.Node = { TEXT_NODE: 3, ELEMENT_NODE: 1 };
  try {
    return run();
  } finally {
    if (prevParser === undefined) delete globalThis.DOMParser;
    else globalThis.DOMParser = prevParser;
    if (prevNode === undefined) delete globalThis.Node;
    else globalThis.Node = prevNode;
  }
}

test("transformPastedHtml keeps pasted content instead of throwing on doc.body", () => {
  withFakeDom(() => {
    const out = transformPastedHtml("<p>Hello <b>world</b></p>");
    assert.equal(out, "<p>Hello <strong>world</strong></p>");
  });
});

test("transformPastedHtml passes through empty input", () => {
  withFakeDom(() => {
    assert.equal(transformPastedHtml(""), "");
    assert.equal(transformPastedHtml(null), null);
  });
});
