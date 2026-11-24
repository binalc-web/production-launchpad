import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createWebFindAdapter } from '../src/features/find-in-page/webFindAdapter.js';

// Regression for Sentry RND-LAUNCHPAD-FE-6 / RND-LAUNCHPAD-FE-C: the old
// <mark> fallback split and re-parented React-managed text nodes, so React
// later threw "Failed to execute 'removeChild' on 'Node'" when deleting that
// subtree (Client Link culprit `/projects/:slug`). The adapter must paint via
// CSS Custom Highlight (or not at all) and must never mutate the text nodes
// it searches.
test('web find adapter counts and navigates matches without mutating text nodes', () => {
  const createdTags = [];
  let scrollCalls = 0;

  const parentEl = {
    nodeType: 1,
    tagName: 'P',
    parentElement: null,
    childNodes: [],
    getAttribute: () => null,
    hasAttribute: () => false,
    closest: () => null,
    scrollIntoView: () => {
      scrollCalls += 1;
    },
  };
  const textNode = {
    nodeType: 3,
    nodeValue: 'hello world hello',
    parentNode: parentEl,
    parentElement: parentEl,
  };
  parentEl.childNodes = [textNode];

  const body = {
    nodeType: 1,
    tagName: 'BODY',
    parentElement: null,
    childNodes: [textNode],
    getAttribute: () => null,
    hasAttribute: () => false,
    closest: () => null,
  };
  parentEl.parentElement = body;

  const fakeDoc = {
    activeElement: null,
    body,
    documentElement: body,
    createElement: (tag) => {
      createdTags.push(tag);
      return { setAttribute() {}, style: {} };
    },
    createRange: () => ({
      setStart() {},
      setEnd() {},
      commonAncestorContainer: textNode,
    }),
    querySelectorAll: () => [],
    querySelector: () => null,
  };

  const prevDocument = globalThis.document;
  globalThis.document = fakeDoc;
  try {
    const adapter = createWebFindAdapter();
    // Node has no CSS Custom Highlight API, so this exercises the
    // no-paint fallback path that previously wrapped matches in <mark>.
    assert.deepEqual(adapter.search('hello'), {
      activeMatchOrdinal: 1,
      matches: 2,
      finalUpdate: true,
    });
    assert.deepEqual(adapter.next(), {
      activeMatchOrdinal: 2,
      matches: 2,
      finalUpdate: true,
    });
    assert.deepEqual(adapter.prev(), {
      activeMatchOrdinal: 1,
      matches: 2,
      finalUpdate: true,
    });
  } finally {
    if (prevDocument === undefined) delete globalThis.document;
    else globalThis.document = prevDocument;
  }

  // The searched text node and its parent are untouched: no splitText,
  // no <mark> wrapper, no re-parenting for React to trip over on unmount.
  assert.equal(textNode.nodeValue, 'hello world hello');
  assert.deepEqual(parentEl.childNodes, [textNode]);
  assert.deepEqual(body.childNodes, [textNode]);
  assert.equal(createdTags.includes('mark'), false);
  assert.ok(scrollCalls > 0, 'active match should still be scrolled into view');
});

test('web find adapter source never wraps matches in <mark> elements', () => {
  const source = readFileSync(
    fileURLToPath(
      new URL('../src/features/find-in-page/webFindAdapter.js', import.meta.url),
    ),
    'utf8',
  );
  assert.equal(source.includes('splitText'), false);
  assert.equal(source.includes('wrapMatchesWithMarks'), false);
  assert.equal(source.includes("createElement('mark')"), false);
  assert.equal(source.includes('createElement("mark")'), false);
});
