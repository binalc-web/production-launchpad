import { useCallback, useEffect, useRef, useState } from 'react';
import { createWebFindAdapter } from './webFindAdapter.js';
import {
  isFindShortcut,
  isFindNextShortcut,
  isFindPrevShortcut,
  isFindCloseShortcut,
  shouldIgnoreNonFindEditShortcut,
} from './findInPage.util.js';

export const FIND_DEBOUNCE_MS = 150;

/**
 * Route key without requiring react-router context.
 * App mounts FindInPageProvider above BrowserRouter (inside Routes),
 * so we listen to history push/replace + popstate.
 */
function useDocumentPathKey() {
  const [pathKey, setPathKey] = useState(() =>
    typeof window !== 'undefined'
      ? `${window.location.pathname}${window.location.search}${window.location.hash}`
      : '',
  );

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const sync = () => {
      setPathKey(
        `${window.location.pathname}${window.location.search}${window.location.hash}`,
      );
    };

    window.addEventListener('popstate', sync);

    const { pushState, replaceState } = window.history;
    window.history.pushState = function findInPagePushState(...args) {
      const ret = pushState.apply(this, args);
      sync();
      return ret;
    };
    window.history.replaceState = function findInPageReplaceState(...args) {
      const ret = replaceState.apply(this, args);
      sync();
      return ret;
    };

    return () => {
      window.removeEventListener('popstate', sync);
      window.history.pushState = pushState;
      window.history.replaceState = replaceState;
    };
  }, []);

  return pathKey;
}

export function useFindInPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeMatchOrdinal, setActiveMatchOrdinal] = useState(0);
  const [matches, setMatches] = useState(0);
  const inputRef = useRef(null);
  const adapterRef = useRef(null);
  const debounceRef = useRef(null);
  const isOpenRef = useRef(false);
  const pathKey = useDocumentPathKey();

  if (!adapterRef.current) {
    adapterRef.current = createWebFindAdapter();
  }

  const applyResult = useCallback((result) => {
    setActiveMatchOrdinal(result.activeMatchOrdinal ?? 0);
    setMatches(result.matches ?? 0);
  }, []);

  const stop = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    const result = adapterRef.current.stop();
    applyResult(result);
  }, [applyResult]);

  const open = useCallback(() => {
    setIsOpen(true);
    isOpenRef.current = true;
    requestAnimationFrame(() => {
      inputRef.current?.focus?.();
      inputRef.current?.select?.();
    });
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    isOpenRef.current = false;
    stop();
  }, [stop]);

  const next = useCallback(() => {
    const result = adapterRef.current.next();
    applyResult(result);
  }, [applyResult]);

  const prev = useCallback(() => {
    const result = adapterRef.current.prev();
    applyResult(result);
  }, [applyResult]);

  const runSearch = useCallback(
    (q) => {
      const result = adapterRef.current.search(q);
      applyResult(result);
    },
    [applyResult],
  );

  const setQueryAndSearch = useCallback(
    (value) => {
      setQuery(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        runSearch(value);
      }, FIND_DEBOUNCE_MS);
    },
    [runSearch],
  );

  // Clear on route change
  useEffect(() => {
    if (!isOpenRef.current && !query) return;
    stop();
    // Keep bar open with empty query on navigation (Chrome clears matches)
    setQuery('');
    setActiveMatchOrdinal(0);
    setMatches(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pathKey is the trigger
  }, [pathKey]);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (shouldIgnoreNonFindEditShortcut(event)) {
        return;
      }

      if (isFindShortcut(event)) {
        event.preventDefault();
        event.stopPropagation();
        if (!isOpenRef.current) {
          open();
        } else {
          next();
        }
        return;
      }

      if (!isOpenRef.current) return;

      if (isFindCloseShortcut(event)) {
        event.preventDefault();
        close();
        return;
      }

      if (isFindPrevShortcut(event)) {
        // Shift+Enter or Mod+Shift+G
        if (event.key === 'Enter' || event.metaKey || event.ctrlKey) {
          event.preventDefault();
          prev();
        }
        return;
      }

      if (isFindNextShortcut(event)) {
        if (event.key === 'Enter' || event.metaKey || event.ctrlKey) {
          event.preventDefault();
          next();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [open, close, next, prev]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      adapterRef.current?.stop?.();
    };
  }, []);

  const barProps = {
    query,
    setQuery: setQueryAndSearch,
    activeMatchOrdinal,
    matches,
    onNext: next,
    onPrev: prev,
    onClose: close,
    inputRef,
    isOpen,
  };

  return {
    isOpen,
    query,
    setQuery: setQueryAndSearch,
    activeMatchOrdinal,
    matches,
    open,
    close,
    next,
    prev,
    inputRef,
    barProps,
  };
}
