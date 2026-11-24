function textFromNode(node) {
  if (!node || typeof node !== "object") return "";
  if (node.type === "text") return node.text || "";
  if (!Array.isArray(node.content)) return "";
  return node.content.map(textFromNode).join("");
}

function inlineToMd(node) {
  if (!node || node.type !== "text") return textFromNode(node);
  let t = node.text || "";
  const marks = Array.isArray(node.marks) ? node.marks : [];
  if (marks.some((m) => m.type === "bold")) t = `**${t}**`;
  if (marks.some((m) => m.type === "italic")) t = `*${t}*`;
  if (marks.some((m) => m.type === "underline")) t = `<u>${t}</u>`;
  if (marks.some((m) => m.type === "strike")) t = `~~${t}~~`;
  if (marks.some((m) => m.type === "code")) t = `\`${t}\``;
  const link = marks.find((m) => m.type === "link");
  if (link?.attrs?.href) t = `[${t}](${link.attrs.href})`;
  return t;
}

function blockToMd(node) {
  if (!node || typeof node !== "object") return "";
  const type = node.type;
  if (type === "paragraph") {
    const line = (node.content || []).map(inlineToMd).join("").trim();
    return line ? `${line}\n\n` : "\n";
  }
  if (type === "heading") {
    const level = Math.min(6, Math.max(1, Number(node.attrs?.level) || 1));
    const line = (node.content || []).map(inlineToMd).join("").trim();
    return line ? `${"#".repeat(level)} ${line}\n\n` : "";
  }
  if (type === "bulletList") {
    return (node.content || [])
      .map((li) => `- ${(li.content || []).map(blockToMd).join("").trim()}\n`)
      .join("")
      .concat("\n");
  }
  if (type === "orderedList") {
    return (node.content || [])
      .map((li, i) => `${i + 1}. ${(li.content || []).map(blockToMd).join("").trim()}\n`)
      .join("")
      .concat("\n");
  }
  if (type === "blockquote") {
    const inner = (node.content || []).map(blockToMd).join("").trim();
    return `${inner
      .split("\n")
      .map((l) => `> ${l}`)
      .join("\n")}\n\n`;
  }
  if (type === "horizontalRule") return "---\n\n";
  if (type === "codeBlock") {
    const code = textFromNode(node);
    const lang = String(node.attrs?.language || "").trim();
    return `\`\`\`${lang}\n${code}\n\`\`\`\n\n`;
  }
  if (type === "taskList") {
    return (node.content || [])
      .map((li) => {
        const checked = li.attrs?.checked ? "x" : " ";
        const text = (li.content || [])
          .map((c) => blockToMd(c, depth + 1))
          .join("")
          .trim();
        return `- [${checked}] ${text}\n`;
      })
      .join("")
      .concat("\n");
  }
  if (Array.isArray(node.content)) return node.content.map(blockToMd).join("");
  return "";
}

export function prdDocumentToMarkdown(doc) {
  const title = doc?.title ? `# ${doc.title}\n\n` : "";
  const content = doc?.content?.content ? doc.content : { type: "doc", content: [] };
  const body = (content.content || []).map(blockToMd).join("");
  return `${title}${body}`.trim() + "\n";
}
