/** Starter chart inserted by the Diagram command. */
export const MERMAID_BLOCK_STARTER = "flowchart TD\n  A[Start] --> B[End]";

export function isMermaidLanguage(language) {
  return (
    String(language || "")
      .trim()
      .toLowerCase() === "mermaid"
  );
}

/** TipTap code block that the editor renders as a diagram. */
export function mermaidCodeBlockContent() {
  return {
    type: "codeBlock",
    attrs: { language: "mermaid" },
    content: [{ type: "text", text: MERMAID_BLOCK_STARTER }],
  };
}
