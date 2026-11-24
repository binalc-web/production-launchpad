import { mermaidCodeBlockContent } from "./prdMermaid.js";

/** @typedef {{ title: string, description?: string, icon?: string, searchTerms?: string[], command: (ctx: { editor: import('@tiptap/react').Editor, range: { from: number, to: number } }) => void }} SlashCommandItem */

/** @returns {SlashCommandItem[]} */
export function getPrdSlashCommands() {
  return [
    {
      title: "Heading 1",
      description: "Large section title",
      searchTerms: ["h1", "title"],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run();
      },
    },
    {
      title: "Heading 2",
      description: "Section title",
      searchTerms: ["h2"],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run();
      },
    },
    {
      title: "Heading 3",
      description: "Subsection title",
      searchTerms: ["h3"],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run();
      },
    },
    {
      title: "Paragraph",
      description: "Plain text block",
      searchTerms: ["text", "p"],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setParagraph().run();
      },
    },
    {
      title: "Bullet list",
      description: "Unordered list",
      searchTerms: ["ul", "list"],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleBulletList().run();
      },
    },
    {
      title: "Numbered list",
      description: "Ordered list",
      searchTerms: ["ol", "ordered"],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleOrderedList().run();
      },
    },
    {
      title: "Checklist",
      description: "Task list with checkboxes",
      searchTerms: ["todo", "task", "check"],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleTaskList().run();
      },
    },
    {
      title: "Quote",
      description: "Blockquote",
      searchTerms: ["blockquote"],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleBlockquote().run();
      },
    },
    {
      title: "Code block",
      description: "Monospace code",
      searchTerms: ["code", "pre"],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
      },
    },
    {
      title: "Diagram",
      description: "Mermaid flowchart",
      searchTerms: ["mermaid", "chart", "flowchart", "graph"],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).insertContent(mermaidCodeBlockContent()).run();
      },
    },
    {
      title: "Divider",
      description: "Horizontal rule",
      searchTerms: ["hr", "line", "separator"],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setHorizontalRule().run();
      },
    },
    {
      title: "Table",
      description: "3×3 table with header",
      searchTerms: ["grid"],
      command: ({ editor, range }) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
          .run();
      },
    },
    {
      title: "Goals",
      description: "PRD goals section",
      searchTerms: ["prd", "objectives"],
      command: ({ editor, range }) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .insertContent([
            { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Goals" }] },
            {
              type: "bulletList",
              content: [{ type: "listItem", content: [{ type: "paragraph" }] }],
            },
          ])
          .run();
      },
    },
    {
      title: "Requirements",
      description: "Requirements section",
      searchTerms: ["prd", "features"],
      command: ({ editor, range }) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .insertContent([
            {
              type: "heading",
              attrs: { level: 2 },
              content: [{ type: "text", text: "Requirements" }],
            },
            {
              type: "orderedList",
              content: [{ type: "listItem", content: [{ type: "paragraph" }] }],
            },
          ])
          .run();
      },
    },
    {
      title: "Risks",
      description: "Risks & assumptions",
      searchTerms: ["assumptions"],
      command: ({ editor, range }) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .insertContent([
            {
              type: "heading",
              attrs: { level: 2 },
              content: [{ type: "text", text: "Risks & assumptions" }],
            },
            {
              type: "bulletList",
              content: [{ type: "listItem", content: [{ type: "paragraph" }] }],
            },
          ])
          .run();
      },
    },
  ];
}

export { filterSlashCommands } from "./prdSlashCommandRegistry.js";
