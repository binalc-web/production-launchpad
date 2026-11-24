import { Document, Packer, Paragraph, HeadingLevel, TextRun, Table, TableRow, TableCell, WidthType } from "docx";
import { prdDocumentToMarkdown } from "./prdDocMarkdown";

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportMarkdownFile(doc, filename = "prd.md") {
  const md = prdDocumentToMarkdown(doc);
  downloadBlob(new Blob([md], { type: "text/markdown;charset=utf-8" }), filename);
}

function headingLevel(level) {
  const map = {
    1: HeadingLevel.HEADING_1,
    2: HeadingLevel.HEADING_2,
    3: HeadingLevel.HEADING_3,
    4: HeadingLevel.HEADING_4,
    5: HeadingLevel.HEADING_5,
    6: HeadingLevel.HEADING_6,
  };
  return map[level] || HeadingLevel.HEADING_2;
}

function textRuns(node) {
  if (!node) return [new TextRun("")];
  if (node.type === "text") {
    const opts = { text: node.text || "" };
    const marks = Array.isArray(node.marks) ? node.marks : [];
    if (marks.some((m) => m.type === "bold")) opts.bold = true;
    if (marks.some((m) => m.type === "italic")) opts.italics = true;
    return [new TextRun(opts)];
  }
  if (Array.isArray(node.content)) return node.content.flatMap(textRuns);
  return [];
}

function nodesToDocx(blocks) {
  const out = [];
  for (const node of blocks || []) {
    if (node.type === "heading") {
      out.push(
        new Paragraph({
          heading: headingLevel(node.attrs?.level || 2),
          children: textRuns(node),
        }),
      );
    } else if (node.type === "paragraph") {
      out.push(new Paragraph({ children: textRuns(node) }));
    } else if (node.type === "bulletList" || node.type === "orderedList") {
      for (const li of node.content || []) {
        const text = (li.content || []).map(textFromPlain).join(" ").trim();
        out.push(new Paragraph({ text, bullet: node.type === "bulletList" ? { level: 0 } : undefined }));
      }
    } else if (node.type === "table") {
      const rows = (node.content || []).map(
        (row) =>
          new TableRow({
            children: (row.content || []).map(
              (cell) =>
                new TableCell({
                  width: { size: 2400, type: WidthType.DXA },
                  children: [new Paragraph({ children: textRuns(cell) })],
                }),
            ),
          }),
      );
      if (rows.length) out.push(new Table({ rows }));
    }
  }
  return out;
}

function textFromPlain(node) {
  if (!node) return "";
  if (node.type === "text") return node.text || "";
  return (node.content || []).map(textFromPlain).join("");
}

export async function exportDocxFile(doc, filename = "prd.docx") {
  const children = [
    new Paragraph({
      heading: HeadingLevel.TITLE,
      children: [new TextRun(doc?.title || "Product Requirements Document")],
    }),
    ...nodesToDocx(doc?.content?.content || []),
  ];
  const file = await Packer.toBlob(new Document({ sections: [{ children }] }));
  downloadBlob(file, filename);
}
