import test from "node:test";
import assert from "node:assert/strict";
import { prdDocumentToMarkdown } from "../src/pages/Project/PrdWorkspace/prdDocMarkdown.js";

test("prdDocumentToMarkdown keeps mermaid fences", () => {
  const md = prdDocumentToMarkdown({
    title: "Flow",
    content: {
      type: "doc",
      content: [
        {
          type: "codeBlock",
          attrs: { language: "mermaid" },
          content: [{ type: "text", text: "flowchart TD\n  A --> B" }],
        },
      ],
    },
  });
  assert.match(md, /^# Flow/);
  assert.match(md, /```mermaid\nflowchart TD\n  A --> B\n```/);
});
