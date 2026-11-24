import {
  clearFindHighlights,
  collectTextMatches,
  getActiveSearchRoot,
  getDocumentHighlightApi,
  FIND_HIGHLIGHT_STYLE_ATTR,
  FIND_MATCH_HIGHLIGHT,
  FIND_ACTIVE_HIGHLIGHT,
} from './findInPage.util.js';

function emptyResult() {
  return { activeMatchOrdinal: 0, matches: 0, finalUpdate: true };
}

function ensureHighlightStyles(doc) {
  if (!doc || doc.querySelector(`style[${FIND_HIGHLIGHT_STYLE_ATTR}]`)) return;
  const style = doc.createElement('style');
  style.setAttribute(FIND_HIGHLIGHT_STYLE_ATTR, '');
  style.textContent = `
::highlight(${FIND_MATCH_HIGHLIGHT}) {
  background-color: #ffe566;
  color: inherit;
}
::highlight(${FIND_ACTIVE_HIGHLIGHT}) {
  background-color: #ff9632;
  color: inherit;
}
`.trim();
  (doc.head || doc.documentElement).appendChild(style);
}

function supportsCustomHighlight(doc) {
  return !!getDocumentHighlightApi(doc);
}

function scrollRangeIntoView(range) {
  try {
    const node = range.commonAncestorContainer;
    const el =
      node.nodeType === 1 ? /** @type {Element} */ (node) : node.parentElement;
    el?.scrollIntoView?.({ block: 'center', inline: 'nearest', behavior: 'smooth' });
  } catch {
    try {
      const node = range.startContainer;
      const el = node.nodeType === 1 ? node : node.parentElement;
      el?.scrollIntoView?.({ block: 'center', inline: 'nearest', behavior: 'smooth' });
    } catch {
      /* ignore */
    }
  }
}

function applyCustomHighlights(doc, matches, activeIndex) {
  const api = getDocumentHighlightApi(doc);
  if (!api) return;

  ensureHighlightStyles(doc);
  const allRanges = [];
  let activeRange = null;

  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    try {
      const range = doc.createRange();
      range.setStart(m.node, m.start);
      range.setEnd(m.node, m.end);
      allRanges.push(range);
      if (i === activeIndex) activeRange = range;
    } catch {
      /* skip broken range */
    }
  }

  try {
    api.highlights.delete(FIND_MATCH_HIGHLIGHT);
    api.highlights.delete(FIND_ACTIVE_HIGHLIGHT);
  } catch {
    /* ignore */
  }

  if (allRanges.length) {
    api.highlights.set(FIND_MATCH_HIGHLIGHT, new api.Highlight(...allRanges));
  }
  if (activeRange) {
    api.highlights.set(FIND_ACTIVE_HIGHLIGHT, new api.Highlight(activeRange));
    scrollRangeIntoView(activeRange);
  }
}

/**
 * Scroll the active match into view without painting it (used where the CSS
 * Custom Highlight API is unavailable).
 *
 * Never wrap matches in <mark> elements: splitting/wrapping live text nodes
 * rewrites DOM that React owns, so React's recorded parent/child links go
 * stale and a later unmount or text update throws
 * "Failed to execute 'removeChild' on 'Node'" (Sentry RND-LAUNCHPAD-FE-6 /
 * RND-LAUNCHPAD-FE-C on Client Link `/projects/:slug`).
 * @param {Document} doc
 * @param {{ node: Text, start: number, end: number } | undefined} match
 */
function scrollMatchIntoView(doc, match) {
  if (!doc || !match?.node) return;
  try {
    const range = doc.createRange();
    range.setStart(match.node, match.start);
    range.setEnd(match.node, match.end);
    scrollRangeIntoView(range);
  } catch {
    /* node may have been re-rendered away — nothing to scroll to */
  }
}

/**
 * @returns {{
 *   search: (query: string, opts?: { findNext?: boolean, findPrevious?: boolean }) => { activeMatchOrdinal: number, matches: number, finalUpdate: boolean },
 *   next: () => { activeMatchOrdinal: number, matches: number, finalUpdate: boolean },
 *   prev: () => { activeMatchOrdinal: number, matches: number, finalUpdate: boolean },
 *   stop: () => { activeMatchOrdinal: number, matches: number, finalUpdate: boolean },
 *   getResult: () => { activeMatchOrdinal: number, matches: number, finalUpdate: boolean },
 * }}
 */
export function createWebFindAdapter() {
  /** @type {Array<{ node: Text, start: number, end: number }>} */
  let matches = [];
  let activeIndex = -1;
  let lastQuery = '';
  /** @type {Document | null} */
  let lastDoc = null;

  function getDoc() {
    return typeof document !== 'undefined' ? document : null;
  }

  function result() {
    return {
      activeMatchOrdinal: matches.length === 0 ? 0 : Math.max(0, activeIndex) + 1,
      matches: matches.length,
      finalUpdate: true,
    };
  }

  function paintFresh(doc) {
    clearFindHighlights(doc);

    if (matches.length === 0 || activeIndex < 0) return;

    if (supportsCustomHighlight(doc)) {
      applyCustomHighlights(doc, matches, activeIndex);
      return;
    }

    scrollMatchIntoView(doc, matches[activeIndex]);
  }

  function paintActiveOnly() {
    const doc = lastDoc || getDoc();
    if (!doc) return;
    if (!supportsCustomHighlight(doc)) {
      scrollMatchIntoView(doc, matches[activeIndex]);
      return;
    }
    applyCustomHighlights(doc, matches, activeIndex);
  }

  function search(query, { findNext = false, findPrevious = false } = {}) {
    const hostDoc = getDoc();
    const trimmed = query ?? '';

    if (!trimmed) {
      matches = [];
      activeIndex = -1;
      lastQuery = '';
      if (lastDoc) clearFindHighlights(lastDoc);
      else if (hostDoc) clearFindHighlights(hostDoc);
      lastDoc = hostDoc;
      return emptyResult();
    }

    const root = getActiveSearchRoot(hostDoc);
    // Prefer the document that owns the search root (same-origin iframe body
    // vs host), so ranges + CSS.highlights target the same Document.
    const doc = root?.ownerDocument || hostDoc;
    if (lastDoc && lastDoc !== doc) clearFindHighlights(lastDoc);
    lastDoc = doc;
    if (!root || !doc) {
      matches = [];
      activeIndex = -1;
      lastQuery = trimmed;
      return emptyResult();
    }

    const navigating = findNext || findPrevious;
    const sameQuery = trimmed === lastQuery;

    if (!sameQuery || !navigating) {
      lastQuery = trimmed;
      clearFindHighlights(doc);
      matches = collectTextMatches(root, trimmed, { caseSensitive: false });
      activeIndex = matches.length > 0 ? 0 : -1;
      paintFresh(doc);
      return result();
    }

    lastQuery = trimmed;

    if (matches.length === 0) {
      activeIndex = -1;
      return emptyResult();
    }

    if (findNext) {
      activeIndex = (activeIndex + 1) % matches.length;
    } else if (findPrevious) {
      activeIndex = (activeIndex - 1 + matches.length) % matches.length;
    }

    paintActiveOnly();
    return result();
  }

  function next() {
    if (!lastQuery) return emptyResult();
    return search(lastQuery, { findNext: true });
  }

  function prev() {
    if (!lastQuery) return emptyResult();
    return search(lastQuery, { findPrevious: true });
  }

  function stop() {
    const doc = lastDoc || getDoc();
    matches = [];
    activeIndex = -1;
    lastQuery = '';
    if (doc) clearFindHighlights(doc);
    return emptyResult();
  }

  function getResult() {
    return result();
  }

  return { search, next, prev, stop, getResult };
}
