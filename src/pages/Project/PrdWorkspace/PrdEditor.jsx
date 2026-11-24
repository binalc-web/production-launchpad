import { useCallback, useEffect, useMemo, useRef } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { cn } from "@/lib/utils";
import { buildPrdEditorExtensions } from "./editor/prdEditorExtensions.js";
import { prdEditorPasteProps } from "./editor/prdEditorPaste.js";
import { applyExternalEditorContent } from "./editor/prdEditorSync.js";
import { hashTipTapContent, emptyPrdDocContent } from "./editor/prdContentHash.js";
import { PrdEditorToolbar } from "./editor/PrdEditorToolbar.jsx";
import { PrdSlashMenu } from "./editor/PrdSlashMenu.jsx";
import { setSlashMenuRef } from "./editor/prdSlashCommandExtension.js";
import { setExtraSlashCommands } from "./editor/prdSlashCommandRegistry.js";
import "./editor/prdEditor.css";

const UPDATE_DEBOUNCE_MS = 120;

export function PrdEditor({
  document,
  editable = true,
  onUpdate,
  onSelectionChange,
  onBlur,
  onEditorReady,
  extraSlashCommands,
  forceSyncKey,
  className,
}) {
  const slashMenuRef = useRef(null);
  const lastEmittedHashRef = useRef("");
  const lastAppliedHashRef = useRef("");
  const isFocusedRef = useRef(false);
  const pendingExternalRef = useRef(null);
  const updateTimerRef = useRef(null);
  const onUpdateRef = useRef(onUpdate);
  const documentRef = useRef(document);

  onUpdateRef.current = onUpdate;
  documentRef.current = document;

  const extensions = useMemo(() => buildPrdEditorExtensions(), []);

  const flushPendingUpdate = useCallback((ed) => {
    if (!documentRef.current || !onUpdateRef.current) return;
    const json = ed.getJSON();
    const hash = hashTipTapContent(json);
    if (hash === lastEmittedHashRef.current) return;
    lastEmittedHashRef.current = hash;
    onUpdateRef.current({
      ...documentRef.current,
      content: json,
    });
  }, []);

  const scheduleUpdate = useCallback(
    (ed) => {
      if (updateTimerRef.current) clearTimeout(updateTimerRef.current);
      updateTimerRef.current = setTimeout(() => flushPendingUpdate(ed), UPDATE_DEBOUNCE_MS);
    },
    [flushPendingUpdate],
  );

  const editor = useEditor({
    extensions,
    content: document?.content || emptyPrdDocContent(),
    editable,
    shouldRerenderOnTransaction: false,
    enableContentCheck: false,
    editorProps: {
      attributes: {
        class: "prd-editor-prose focus:outline-none min-h-[420px] px-1 py-2",
        spellcheck: "true",
      },
      ...prdEditorPasteProps(),
    },
    onUpdate: ({ editor: ed }) => {
      scheduleUpdate(ed);
    },
    onSelectionUpdate: ({ editor: ed }) => {
      if (!onSelectionChange) return;
      const { from, to } = ed.state.selection;
      onSelectionChange(ed.state.doc.textBetween(from, to, " "));
    },
    onFocus: () => {
      isFocusedRef.current = true;
    },
    onBlur: ({ editor: ed }) => {
      isFocusedRef.current = false;
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
        flushPendingUpdate(ed);
      }
      if (pendingExternalRef.current) {
        applyExternalEditorContent(ed, pendingExternalRef.current);
        lastAppliedHashRef.current = hashTipTapContent(pendingExternalRef.current);
        pendingExternalRef.current = null;
      }
      onBlur?.();
    },
  });

  useEffect(() => {
    setSlashMenuRef(slashMenuRef);
    return () => setSlashMenuRef(null);
  }, []);

  useEffect(() => {
    setExtraSlashCommands(extraSlashCommands);
    return () => setExtraSlashCommands([]);
  }, [extraSlashCommands]);

  useEffect(() => {
    if (editor) onEditorReady?.(editor);
  }, [editor, onEditorReady]);

  const lastForceSyncRef = useRef(forceSyncKey ?? 0);

  useEffect(() => {
    if (!editor || !document?.content) return;

    const forceApply = forceSyncKey != null && forceSyncKey !== lastForceSyncRef.current;
    if (forceApply) lastForceSyncRef.current = forceSyncKey;

    const incomingHash = hashTipTapContent(document.content);
    if (incomingHash === lastAppliedHashRef.current && !forceApply) return;
    if (incomingHash === lastEmittedHashRef.current && !forceApply) {
      lastAppliedHashRef.current = incomingHash;
      return;
    }

    if (isFocusedRef.current && !forceApply) {
      pendingExternalRef.current = document.content;
      return;
    }

    applyExternalEditorContent(editor, document.content);
    lastAppliedHashRef.current = incomingHash;
    lastEmittedHashRef.current = incomingHash;
    pendingExternalRef.current = null;
  }, [editor, document?.content, forceSyncKey]);

  useEffect(() => {
    if (editor) editor.setEditable(editable);
  }, [editor, editable]);

  useEffect(() => {
    return () => {
      if (updateTimerRef.current) clearTimeout(updateTimerRef.current);
    };
  }, []);

  if (!editor) return null;

  return (
    <div className={cn("ds-inset relative", className)}>
      {editable && <PrdEditorToolbar editor={editor} />}
      <EditorContent editor={editor} className="px-4 py-3 prd-editor-shell" />
      <PrdSlashMenu ref={slashMenuRef} />
    </div>
  );
}
