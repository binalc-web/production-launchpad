import StarterKit from "@tiptap/starter-kit";
import CodeBlock from "@tiptap/extension-code-block";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { PrdCodeBlockView } from "./PrdCodeBlockView.jsx";
import { Table, TableRow, TableCell, TableHeader } from "@tiptap/extension-table";
import { Image } from "@tiptap/extension-image";
import { Link } from "@tiptap/extension-link";
import { Highlight } from "@tiptap/extension-highlight";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { PrdSlashCommandExtension } from "./prdSlashCommandExtension.js";
import { PrdKeyboardShortcuts } from "./prdKeyboardShortcuts.js";

const PrdCodeBlock = CodeBlock.extend({
  addNodeView() {
    return ReactNodeViewRenderer(PrdCodeBlockView);
  },
}).configure({
  HTMLAttributes: { class: "prd-code-block" },
});

export function buildPrdEditorExtensions() {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3, 4, 5, 6] },
      dropcursor: { color: "hsl(var(--primary))", width: 2 },
      link: false,
      horizontalRule: true,
      codeBlock: false,
    }),
    PrdCodeBlock,
    Underline,
    TaskList.configure({ HTMLAttributes: { class: "prd-task-list" } }),
    TaskItem.configure({ nested: true, HTMLAttributes: { class: "prd-task-item" } }),
    Table.configure({ resizable: true }),
    TableRow,
    TableHeader,
    TableCell,
    Image.configure({ allowBase64: false }),
    Link.configure({
      openOnClick: false,
      autolink: true,
      linkOnPaste: true,
      HTMLAttributes: { class: "prd-link", rel: "noopener noreferrer", target: "_blank" },
    }),
    Highlight.configure({ multicolor: true }),
    Placeholder.configure({
      placeholder: ({ node }) => {
        if (node.type.name === "heading") return "Heading…";
        return 'Start writing… Type "/" for commands';
      },
      includeChildren: false,
    }),
    PrdSlashCommandExtension,
    PrdKeyboardShortcuts,
  ];
}

export function promptForLink(editor) {
  const prev = editor.getAttributes("link").href || "https://";
  const url = window.prompt("Link URL", prev);
  if (url === null) return;
  if (url === "") {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    return;
  }
  editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
}

export function promptForImage(editor) {
  const url = window.prompt("Image URL");
  if (url) editor.chain().focus().setImage({ src: url }).run();
}
