/** @typedef {{ key?: string, metaKey?: boolean, ctrlKey?: boolean, altKey?: boolean, shiftKey?: boolean }} FindKeyEvent */

/**
 * Cmd/Ctrl+F (not Alt-alone hijacks).
 * @param {FindKeyEvent} event
 */
export function isFindShortcut(event) {
  if (!event) return false;
  const key = event.key;
  if (key !== 'f' && key !== 'F') return false;
  if (event.altKey && !(event.metaKey || event.ctrlKey)) return false;
  return !!(event.metaKey || event.ctrlKey);
}

/**
 * Enter (when find is open — caller gates) or Cmd/Ctrl+G.
 * @param {FindKeyEvent} event
 */
export function isFindNextShortcut(event) {
  if (!event) return false;
  if (event.key === 'Enter' && !event.shiftKey) return true;
  const key = event.key;
  if ((key === 'g' || key === 'G') && (event.metaKey || event.ctrlKey) && !event.shiftKey) {
    return true;
  }
  return false;
}

/**
 * Shift+Enter or Cmd/Ctrl+Shift+G.
 * @param {FindKeyEvent} event
 */
export function isFindPrevShortcut(event) {
  if (!event) return false;
  if (event.key === 'Enter' && event.shiftKey) return true;
  const key = event.key;
  if ((key === 'g' || key === 'G') && (event.metaKey || event.ctrlKey) && event.shiftKey) {
    return true;
  }
  return false;
}

/**
 * Escape closes find.
 * @param {FindKeyEvent} event
 */
export function isFindCloseShortcut(event) {
  return !!event && event.key === 'Escape';
}

const EDIT_KEYS = new Set(['c', 'C', 'v', 'V', 'a', 'A', 'x', 'X']);

/**
 * True when the event is Cmd/Ctrl+C/V/A/X — never hijack these.
 * @param {FindKeyEvent} event
 */
export function shouldIgnoreNonFindEditShortcut(event) {
  if (!event) return false;
  if (!(event.metaKey || event.ctrlKey)) return false;
  return EDIT_KEYS.has(event.key);
}

/**
 * @param {HTMLIFrameElement | null | undefined} iframe
 */
export function canAccessIframeDocument(iframe) {
  if (!iframe) return false;
  try {
    const d = iframe.contentDocument;
    return !!d?.documentElement;
  } catch {
    return false;
  }
}

/**
 * If activeElement is a same-origin iframe, return its body/documentElement;
 * otherwise return doc.body or doc.documentElement.
 * @param {Document} [doc]
 * @returns {Element | null}
 */
export function getActiveSearchRoot(doc = typeof document !== 'undefined' ? document : undefined) {
  if (!doc) return null;
  const active = doc.activeElement;
  if (active && active.tagName === 'IFRAME' && canAccessIframeDocument(/** @type {HTMLIFrameElement} */ (active))) {
    const iframeDoc = /** @type {HTMLIFrameElement} */ (active).contentDocument;
    return iframeDoc?.body || iframeDoc?.documentElement || null;
  }
  return doc.body || doc.documentElement || null;
}

/**
 * @param {Node | null | undefined} node
 * @returns {boolean}
 */
function isInsideFindBar(node) {
  if (!node || typeof node.closest !== 'function') {
    let n = node;
    while (n) {
      if (n.nodeType === 1 && /** @type {Element} */ (n).hasAttribute?.('data-find-in-page-bar')) {
        return true;
      }
      n = n.parentNode;
    }
    return false;
  }
  return !!/** @type {Element} */ (node).closest('[data-find-in-page-bar]');
}

/**
 * @param {Node | null | undefined} node
 * @returns {boolean}
 */
function hasHiddenAncestor(node) {
  let el = node?.nodeType === 1 ? /** @type {Element} */ (node) : node?.parentElement;
  while (el) {
    if (el.getAttribute?.('aria-hidden') === 'true') return true;
    if (el.hasAttribute?.('data-find-in-page-bar')) return true;
    if (typeof window !== 'undefined' && window.getComputedStyle) {
      try {
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') return true;
      } catch {
        /* ignore */
      }
    }
    el = el.parentElement;
  }
  return false;
}

/**
 * Whether a text node (or its parent) should be searched.
 * @param {Node | null | undefined} node
 */
export function isSearchableTextNode(node) {
  if (!node || node.nodeType !== 3) return false;
  const parent = node.parentElement;
  if (!parent) return false;

  const tag = parent.tagName?.toUpperCase();
  if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') return false;

  if (tag === 'INPUT' || tag === 'TEXTAREA') {
    const type = (parent.getAttribute('type') || 'text').toLowerCase();
    if (type === 'password') return false;
  }

  if (parent.closest?.('input[type="password"], [type="password"]')) return false;
  if (isInsideFindBar(parent)) return false;
  if (hasHiddenAncestor(parent)) return false;

  return true;
}

/**
 * Pure string helper — all case-insensitive (or sensitive) substring ranges.
 * @param {string} text
 * @param {string} query
 * @param {{ caseSensitive?: boolean }} [opts]
 * @returns {Array<{ start: number, end: number }>}
 */
export function findSubstringRanges(text, query, { caseSensitive = false } = {}) {
  if (!query || text == null || text === '') return [];
  const source = caseSensitive ? text : text.toLowerCase();
  const needle = caseSensitive ? query : query.toLowerCase();
  if (!needle) return [];

  const ranges = [];
  let from = 0;
  while (from <= source.length - needle.length) {
    const idx = source.indexOf(needle, from);
    if (idx === -1) break;
    ranges.push({ start: idx, end: idx + needle.length });
    from = idx + Math.max(1, needle.length);
  }
  return ranges;
}

/**
 * Walk text nodes under root; return match descriptors.
 * @param {Node | null | undefined} root
 * @param {string} query
 * @param {{ caseSensitive?: boolean }} [opts]
 * @returns {Array<{ node: Text, start: number, end: number }>}
 */
export function collectTextMatches(root, query, { caseSensitive = false } = {}) {
  if (!root || !query) return [];

  const matches = [];
  const walker =
    typeof document !== 'undefined' && document.createTreeWalker
      ? document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
          acceptNode(node) {
            return isSearchableTextNode(node)
              ? NodeFilter.FILTER_ACCEPT
              : NodeFilter.FILTER_REJECT;
          },
        })
      : null;

  if (walker) {
    let current = walker.nextNode();
    while (current) {
      const text = current.nodeValue || '';
      for (const range of findSubstringRanges(text, query, { caseSensitive })) {
        matches.push({ node: /** @type {Text} */ (current), start: range.start, end: range.end });
      }
      current = walker.nextNode();
    }
    return matches;
  }

  // Minimal stub path for non-DOM environments (tests with fake trees)
  const visit = (node) => {
    if (!node) return;
    if (node.nodeType === 3 && isSearchableTextNode(node)) {
      const text = node.nodeValue || '';
      for (const range of findSubstringRanges(text, query, { caseSensitive })) {
        matches.push({ node: /** @type {Text} */ (node), start: range.start, end: range.end });
      }
    }
    const children = node.childNodes || [];
    for (let i = 0; i < children.length; i++) visit(children[i]);
  };
  visit(root);
  return matches;
}

const HIGHLIGHT_NAMES = ['find-match', 'find-active-match'];

/**
 * Highlight registry for a document (host or same-origin iframe).
 * @param {Document | null | undefined} doc
 * @returns {{ highlights: HighlightRegistry, Highlight: typeof Highlight } | null}
 */
export function getDocumentHighlightApi(doc) {
  const win =
    doc?.defaultView ||
    (typeof window !== 'undefined' ? window : null);
  if (!win) return null;
  const css = win.CSS;
  const HighlightCtor = win.Highlight;
  if (!css?.highlights || typeof HighlightCtor !== 'function') return null;
  return { highlights: css.highlights, Highlight: HighlightCtor };
}

/**
 * Clear CSS Custom Highlight ranges only.
 *
 * Never unwrap legacy `<mark data-find-highlight>` nodes or call
 * `normalize()`: re-parenting / merging text nodes that React owns leaves
 * fiber parent pointers stale and a later commit throws
 * `NotFoundError: Failed to execute 'removeChild' on 'Node'`
 * (Sentry RND-LAUNCHPAD-FE-6, RND-LAUNCHPAD-FE-C on `/projects/:slug`).
 * @param {Document} [doc]
 */
export function clearFindHighlights(doc = typeof document !== 'undefined' ? document : undefined) {
  if (!doc) return;

  const api = getDocumentHighlightApi(doc);
  if (!api) return;

  for (const name of HIGHLIGHT_NAMES) {
    try {
      api.highlights.delete(name);
    } catch {
      /* ignore */
    }
  }
}

export const FIND_HIGHLIGHT_STYLE_ATTR = 'data-find-in-page-style';
export const FIND_MATCH_HIGHLIGHT = 'find-match';
export const FIND_ACTIVE_HIGHLIGHT = 'find-active-match';
