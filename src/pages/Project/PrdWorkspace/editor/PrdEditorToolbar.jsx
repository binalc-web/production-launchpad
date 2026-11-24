import { cn } from "@/lib/utils";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Quote,
  List,
  ListOrdered,
  ListChecks,
  Heading1,
  Heading2,
  Heading3,
  Minus,
  Table2,
  Link2,
  ImageIcon,
  Undo2,
  Redo2,
  Workflow,
} from "lucide-react";
import { promptForImage, promptForLink } from "./prdEditorExtensions.js";
import { mermaidCodeBlockContent } from "./prdMermaid.js";

export function PrdEditorToolbar({ editor }) {
  if (!editor) return null;

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b px-2 py-1.5 bg-muted/20">
      <ToolbarGroup>
        <ToolbarBtn
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo (⌘Z)"
        >
          <Undo2 className="size-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo (⌘⇧Z)"
        >
          <Redo2 className="size-3.5" />
        </ToolbarBtn>
      </ToolbarGroup>

      <ToolbarDivider />

      <ToolbarGroup>
        <ToolbarBtn
          active={editor.isActive("heading", { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          title="Heading 1 (⌘⌥1)"
        >
          <Heading1 className="size-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          title="Heading 2 (⌘⌥2)"
        >
          <Heading2 className="size-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          title="Heading 3 (⌘⌥3)"
        >
          <Heading3 className="size-3.5" />
        </ToolbarBtn>
      </ToolbarGroup>

      <ToolbarDivider />

      <ToolbarGroup>
        <ToolbarBtn
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold (⌘B)"
        >
          <Bold className="size-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic (⌘I)"
        >
          <Italic className="size-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Underline (⌘U)"
        >
          <Underline className="size-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="Strikethrough"
        >
          <Strikethrough className="size-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          active={editor.isActive("code")}
          onClick={() => editor.chain().focus().toggleCode().run()}
          title="Inline code"
        >
          <Code className="size-3.5" />
        </ToolbarBtn>
      </ToolbarGroup>

      <ToolbarDivider />

      <ToolbarGroup>
        <ToolbarBtn
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Bullet list (⌘⇧8)"
        >
          <List className="size-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Numbered list (⌘⇧7)"
        >
          <ListOrdered className="size-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          active={editor.isActive("taskList")}
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          title="Checklist (⌘⇧9)"
        >
          <ListChecks className="size-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          title="Quote (⌘⇧B)"
        >
          <Quote className="size-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Divider (⌘⇧H)"
        >
          <Minus className="size-3.5" />
        </ToolbarBtn>
      </ToolbarGroup>

      <ToolbarDivider />

      <ToolbarGroup>
        <ToolbarBtn
          onClick={() => promptForLink(editor)}
          active={editor.isActive("link")}
          title="Link"
        >
          <Link2 className="size-3.5" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => promptForImage(editor)} title="Image">
          <ImageIcon className="size-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() =>
            editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
          }
          title="Table"
        >
          <Table2 className="size-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          active={editor.isActive("codeBlock", { language: "mermaid" })}
          onClick={() => editor.chain().focus().insertContent(mermaidCodeBlockContent()).run()}
          title="Mermaid diagram"
        >
          <Workflow className="size-3.5" />
        </ToolbarBtn>
      </ToolbarGroup>
    </div>
  );
}

function ToolbarGroup({ children }) {
  return <div className="flex items-center gap-0.5">{children}</div>;
}

function ToolbarDivider() {
  return <div className="w-px h-6 bg-border mx-1 shrink-0" aria-hidden />;
}

function ToolbarBtn({ onClick, active, disabled, title, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "inline-flex items-center justify-center rounded-md size-7 transition-colors",
        "disabled:opacity-40 disabled:pointer-events-none",
        active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}
