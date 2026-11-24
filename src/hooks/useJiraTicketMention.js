import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  JIRA_MENTION_DEBOUNCE_MS,
  JIRA_MENTION_MIN_SEARCH_LEN,
  MAX_JIRA_MENTIONS,
} from "@/lib/jira-mention/constants.js";
import { detectJiraMentionAtCaret, replaceMentionRange } from "@/lib/jira-mention/detectMention.js";
import { extractJiraTicketsFromResponse } from "@/lib/jira-mention/extractTickets.js";
import {
  dedupeJiraTicketLinks,
  dedupeJiraTicketMentions,
  jiraTicketLinksFromSelection,
  jiraTicketMentionsFromSelection,
} from "@/lib/jira-mention/normalizeLinks.js";

function ticketKey(t) {
  return String(t?.key || "")
    .trim()
    .toUpperCase();
}

function readJiraFetchError(err) {
  if (err && typeof err === "object" && typeof err.error === "string") {
    return err.error.trim();
  }
  if (typeof err?.message === "string" && err.message.trim()) {
    return err.message.trim();
  }
  return "Could not load Jira tickets for this project.";
}

/**
 * @param {{ disabled?: boolean, canSearch?: boolean, fetchTickets?: (search: string) => Promise<unknown[]> }} options
 */
export function useJiraTicketMention({ disabled = false, canSearch = true, fetchTickets }) {
  const [selectedTickets, setSelectedTickets] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionRange, setMentionRange] = useState({ start: 0, end: 0 });
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [menuStyle, setMenuStyle] = useState({ top: 0, left: 0 });
  const debounceRef = useRef(null);
  const textareaRef = useRef(null);
  const mirrorRef = useRef(null);
  const menuRef = useRef(null);
  const blurCloseTimerRef = useRef(null);
  const fetchSeqRef = useRef(0);

  const trimmedQuery = mentionQuery.trim();
  const searchReady = trimmedQuery.length >= JIRA_MENTION_MIN_SEARCH_LEN;

  const selectedKeys = useMemo(
    () => new Set(selectedTickets.map((t) => ticketKey(t)).filter(Boolean)),
    [selectedTickets],
  );

  const visibleTickets = useMemo(() => {
    return tickets.filter((t) => !selectedKeys.has(ticketKey(t)));
  }, [tickets, selectedKeys]);

  const jiraTicketMentions = useMemo(
    () => jiraTicketMentionsFromSelection(selectedTickets),
    [selectedTickets],
  );

  const jiraTicketLinks = useMemo(
    () => jiraTicketLinksFromSelection(selectedTickets),
    [selectedTickets],
  );

  const updateMenuPosition = useCallback(() => {
    const textarea = textareaRef.current;
    const mirror = mirrorRef.current;
    if (!textarea || !mirror || !menuOpen) return;
    const style = window.getComputedStyle(textarea);
    mirror.style.width = `${textarea.clientWidth}px`;
    mirror.style.font = style.font;
    mirror.style.lineHeight = style.lineHeight;
    mirror.style.padding = style.padding;
    mirror.style.letterSpacing = style.letterSpacing;
    const caret = textarea.selectionStart ?? 0;
    const before = textarea.value.slice(0, caret);
    mirror.textContent = before;
    const marker = document.createElement("span");
    marker.textContent = "\u200b";
    mirror.appendChild(marker);
    const rect = marker.getBoundingClientRect();
    mirror.removeChild(marker);

    const gap = 8;
    const menuWidth = menuRef.current?.offsetWidth ?? 512;
    const menuHeight = menuRef.current?.offsetHeight ?? 360;
    const maxLeft = Math.max(8, window.innerWidth - menuWidth - 8);
    const left = Math.min(Math.max(8, rect.left), maxLeft);
    const spaceAbove = rect.top - gap;
    const spaceBelow = window.innerHeight - rect.bottom - gap;
    const openAbove = spaceAbove >= menuHeight || spaceAbove >= spaceBelow;

    setMenuStyle({
      position: "fixed",
      top: openAbove ? rect.top - gap : rect.bottom + gap,
      left,
      transform: openAbove ? "translateY(-100%)" : undefined,
      zIndex: 9999,
      width: Math.min(512, window.innerWidth - 16),
    });
  }, [menuOpen]);

  const loadTickets = useCallback(
    async (search = "") => {
      const q = typeof search === "string" ? search.trim() : "";
      const seq = ++fetchSeqRef.current;

      if (!canSearch || typeof fetchTickets !== "function") {
        setFetchError("Jira search is unavailable for this chat.");
        setTickets([]);
        setLoading(false);
        return;
      }

      if (q.length < JIRA_MENTION_MIN_SEARCH_LEN) {
        setFetchError("");
        setTickets([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setFetchError("");
      try {
        const data = await fetchTickets(q);
        if (seq !== fetchSeqRef.current) return;
        setTickets(extractJiraTicketsFromResponse(data));
      } catch (err) {
        if (seq !== fetchSeqRef.current) return;
        setTickets([]);
        setFetchError(readJiraFetchError(err));
      } finally {
        if (seq === fetchSeqRef.current) {
          setLoading(false);
        }
      }
    },
    [canSearch, fetchTickets],
  );

  useEffect(() => {
    if (!menuOpen) return undefined;
    const frame = requestAnimationFrame(() => {
      updateMenuPosition();
      requestAnimationFrame(updateMenuPosition);
    });
    const onReflow = () => updateMenuPosition();
    window.addEventListener("resize", onReflow);
    window.addEventListener("scroll", onReflow, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onReflow);
      window.removeEventListener("scroll", onReflow, true);
    };
  }, [menuOpen, mentionQuery, loading, tickets.length, updateMenuPosition]);

  useEffect(() => {
    if (!menuOpen) return undefined;

    if (!searchReady) {
      setLoading(false);
      setFetchError("");
      setTickets([]);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      return undefined;
    }

    setLoading(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void loadTickets(trimmedQuery);
    }, JIRA_MENTION_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [menuOpen, trimmedQuery, searchReady, loadTickets]);

  const closeMenu = useCallback(() => {
    fetchSeqRef.current += 1;
    setMenuOpen(false);
    setMentionQuery("");
    setHighlightIndex(0);
    setTickets([]);
    setLoading(false);
    setFetchError("");
  }, []);

  const handleComposerBlur = useCallback(
    (e) => {
      if (blurCloseTimerRef.current) {
        clearTimeout(blurCloseTimerRef.current);
      }
      const blurTarget = e?.currentTarget ?? null;
      blurCloseTimerRef.current = setTimeout(() => {
        const active = document.activeElement;
        if (menuRef.current?.contains(active)) return;
        if (textareaRef.current === active) return;
        if (blurTarget && blurTarget === active) return;
        closeMenu();
      }, 0);
    },
    [closeMenu],
  );

  const handleTextChange = useCallback(
    (nextValue, caretIndex) => {
      if (disabled) return;
      const caret = Number.isFinite(caretIndex) ? caretIndex : nextValue.length;
      const mention = detectJiraMentionAtCaret(nextValue, caret);
      if (mention.active) {
        setMenuOpen(true);
        setMentionQuery(mention.query);
        setMentionRange({ start: mention.start, end: mention.end });
        setHighlightIndex(0);
        requestAnimationFrame(() => {
          updateMenuPosition();
          requestAnimationFrame(updateMenuPosition);
        });
      } else {
        closeMenu();
      }
    },
    [disabled, closeMenu, updateMenuPosition],
  );

  const selectTicket = useCallback(
    (ticket, value, onChange) => {
      const key = ticketKey(ticket);
      if (!key || selectedKeys.has(key)) return value;
      if (selectedTickets.length >= MAX_JIRA_MENTIONS) return value;

      setSelectedTickets((prev) => {
        if (prev.some((t) => ticketKey(t) === key)) return prev;
        return [...prev, ticket];
      });

      const insert = `@${key} `;
      const next = replaceMentionRange(value, mentionRange, insert);
      onChange?.(next);
      closeMenu();
      requestAnimationFrame(() => {
        const el = textareaRef.current;
        if (!el) return;
        const pos = mentionRange.start + insert.length;
        el.focus();
        el.setSelectionRange(pos, pos);
      });
      return next;
    },
    [selectedKeys, selectedTickets.length, mentionRange, closeMenu],
  );

  const removeTicket = useCallback((key) => {
    const k = String(key || "")
      .trim()
      .toUpperCase();
    setSelectedTickets((prev) => prev.filter((t) => ticketKey(t) !== k));
  }, []);

  const handleMenuKeyDown = useCallback(
    (e, value, onChange) => {
      if (!menuOpen) return false;
      if (!visibleTickets.length) return false;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightIndex((i) => Math.min(i + 1, visibleTickets.length - 1));
        return true;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightIndex((i) => Math.max(i - 1, 0));
        return true;
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const ticket = visibleTickets[highlightIndex];
        if (ticket) selectTicket(ticket, value, onChange);
        return true;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        closeMenu();
        return true;
      }
      return false;
    },
    [menuOpen, visibleTickets, highlightIndex, selectTicket, closeMenu],
  );

  const resetSelection = useCallback(() => {
    setSelectedTickets([]);
    closeMenu();
  }, [closeMenu]);

  return {
    textareaRef,
    mirrorRef,
    menuRef,
    selectedTickets,
    jiraTicketMentions: dedupeJiraTicketMentions(jiraTicketMentions),
    jiraTicketLinks: dedupeJiraTicketLinks(jiraTicketLinks),
    menuOpen,
    mentionQuery,
    setMentionQuery,
    searchReady,
    tickets: visibleTickets,
    loading,
    fetchError,
    highlightIndex,
    setHighlightIndex,
    menuStyle,
    handleTextChange,
    selectTicket,
    removeTicket,
    handleMenuKeyDown,
    closeMenu,
    handleComposerBlur,
    resetSelection,
    atMaxMentions: selectedTickets.length >= MAX_JIRA_MENTIONS,
  };
}
