import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  isFindShortcut,
  isFindNextShortcut,
  isFindPrevShortcut,
  isFindCloseShortcut,
  shouldIgnoreNonFindEditShortcut,
  findSubstringRanges,
  collectTextMatches,
  clearFindHighlights,
} from '../src/features/find-in-page/findInPage.util.js';

function keyEvent(partial) {
  return {
    key: '',
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    ...partial,
  };
}

test('isFindShortcut detects Mod+F and ignores alt-only', () => {
  assert.equal(isFindShortcut(keyEvent({ key: 'f', metaKey: true })), true);
  assert.equal(isFindShortcut(keyEvent({ key: 'F', ctrlKey: true })), true);
  assert.equal(isFindShortcut(keyEvent({ key: 'f' })), false);
  assert.equal(isFindShortcut(keyEvent({ key: 'f', altKey: true })), false);
  assert.equal(
    isFindShortcut(keyEvent({ key: 'f', metaKey: true, altKey: true })),
    true,
  );
  assert.equal(isFindShortcut(keyEvent({ key: 'g', metaKey: true })), false);
});

test('isFindNextShortcut: Enter and Mod+G', () => {
  assert.equal(isFindNextShortcut(keyEvent({ key: 'Enter' })), true);
  assert.equal(isFindNextShortcut(keyEvent({ key: 'g', metaKey: true })), true);
  assert.equal(isFindNextShortcut(keyEvent({ key: 'G', ctrlKey: true })), true);
  assert.equal(
    isFindNextShortcut(keyEvent({ key: 'Enter', shiftKey: true })),
    false,
  );
  assert.equal(
    isFindNextShortcut(keyEvent({ key: 'g', metaKey: true, shiftKey: true })),
    false,
  );
});

test('isFindPrevShortcut: Shift+Enter and Mod+Shift+G', () => {
  assert.equal(
    isFindPrevShortcut(keyEvent({ key: 'Enter', shiftKey: true })),
    true,
  );
  assert.equal(
    isFindPrevShortcut(keyEvent({ key: 'g', metaKey: true, shiftKey: true })),
    true,
  );
  assert.equal(
    isFindPrevShortcut(keyEvent({ key: 'G', ctrlKey: true, shiftKey: true })),
    true,
  );
  assert.equal(isFindPrevShortcut(keyEvent({ key: 'Enter' })), false);
  assert.equal(isFindPrevShortcut(keyEvent({ key: 'g', metaKey: true })), false);
});

test('isFindCloseShortcut: Escape only', () => {
  assert.equal(isFindCloseShortcut(keyEvent({ key: 'Escape' })), true);
  assert.equal(isFindCloseShortcut(keyEvent({ key: 'Esc' })), false);
  assert.equal(isFindCloseShortcut(keyEvent({ key: 'Enter' })), false);
});

test('shouldIgnoreNonFindEditShortcut never hijacks C/V/A/X', () => {
  for (const key of ['c', 'C', 'v', 'V', 'a', 'A', 'x', 'X']) {
    assert.equal(
      shouldIgnoreNonFindEditShortcut(keyEvent({ key, metaKey: true })),
      true,
      `meta+${key}`,
    );
    assert.equal(
      shouldIgnoreNonFindEditShortcut(keyEvent({ key, ctrlKey: true })),
      true,
      `ctrl+${key}`,
    );
  }
  assert.equal(
    shouldIgnoreNonFindEditShortcut(keyEvent({ key: 'f', metaKey: true })),
    false,
  );
  assert.equal(shouldIgnoreNonFindEditShortcut(keyEvent({ key: 'c' })), false);
});

test('findSubstringRanges: empty query → no matches', () => {
  assert.deepEqual(findSubstringRanges('hello world', ''), []);
  assert.deepEqual(findSubstringRanges('hello', null), []);
});

test('findSubstringRanges: case-insensitive by default', () => {
  assert.deepEqual(findSubstringRanges('Hello HELLO hello', 'hello'), [
    { start: 0, end: 5 },
    { start: 6, end: 11 },
    { start: 12, end: 17 },
  ]);
  assert.deepEqual(
    findSubstringRanges('Hello', 'hello', { caseSensitive: true }),
    [],
  );
  assert.deepEqual(
    findSubstringRanges('Hello', 'Hello', { caseSensitive: true }),
    [{ start: 0, end: 5 }],
  );
});

test('collectTextMatches: empty query → []', () => {
  assert.deepEqual(collectTextMatches({ childNodes: [] }, ''), []);
  assert.deepEqual(collectTextMatches(null, 'x'), []);
});

// RND-LAUNCHPAD-FE-C: clearing find highlights must not unwrap <mark> nodes or
// normalize() React-owned text — that desyncs fibers and throws removeChild.
test('clearFindHighlights never mutates mark/text DOM structure', () => {
  const deleted = [];
  const textNode = { nodeType: 3, nodeValue: 'hello' };
  const mark = {
    nodeType: 1,
    firstChild: textNode,
    parentNode: null,
  };
  const parent = {
    nodeType: 1,
    childNodes: [mark],
    insertBeforeCalls: 0,
    removeChildCalls: 0,
    normalizeCalls: 0,
    insertBefore() {
      this.insertBeforeCalls += 1;
    },
    removeChild() {
      this.removeChildCalls += 1;
    },
    normalize() {
      this.normalizeCalls += 1;
    },
  };
  mark.parentNode = parent;

  const fakeDoc = {
    defaultView: {
      CSS: {
        highlights: {
          delete(name) {
            deleted.push(name);
          },
        },
      },
      Highlight: function Highlight() {},
    },
    querySelectorAll(selector) {
      assert.equal(
        selector.includes('mark'),
        false,
        'clearFindHighlights must not query legacy mark nodes',
      );
      return [mark];
    },
  };

  clearFindHighlights(fakeDoc);

  assert.deepEqual(deleted, ['find-match', 'find-active-match']);
  assert.equal(parent.insertBeforeCalls, 0);
  assert.equal(parent.removeChildCalls, 0);
  assert.equal(parent.normalizeCalls, 0);
  assert.equal(mark.parentNode, parent);
  assert.equal(mark.firstChild, textNode);
});

test('clearFindHighlights source never unwraps marks or normalizes', () => {
  const source = readFileSync(
    fileURLToPath(
      new URL('../src/features/find-in-page/findInPage.util.js', import.meta.url),
    ),
    'utf8',
  );
  // Strip block comments so doc references to the old mark path don't fail.
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  assert.equal(code.includes('data-find-highlight'), false);
  assert.equal(code.includes('querySelectorAll'), false);
  assert.equal(code.includes('removeChild'), false);
  assert.equal(code.includes('.normalize'), false);
  assert.equal(code.includes('insertBefore'), false);
});
