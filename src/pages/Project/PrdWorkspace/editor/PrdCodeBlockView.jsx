import { useEffect, useState } from "react";
import { NodeViewContent, NodeViewWrapper } from "@tiptap/react";
import { cn } from "@/lib/utils";
import { MermaidDiagram } from "@/pages/Jobs/components/MermaidDiagram";
import { isMermaidLanguage } from "./prdMermaid.js";

const CHART_DEBOUNCE_MS = 200;

/**
 * Code block node view. Mermaid blocks render as diagrams; other languages stay plain code.
 * @param {{ node: { attrs: { language?: string }, textContent: string }, editor: { isEditable: boolean } }} props
 */
export function PrdCodeBlockView({ node, editor }) {
  const isMermaid = isMermaidLanguage(node.attrs.language);
  const liveSource = node.textContent || "";
  const [chartSource, setChartSource] = useState(liveSource);

  useEffect(() => {
    if (!isMermaid) return undefined;
    const handle = setTimeout(() => setChartSource(liveSource), CHART_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [isMermaid, liveSource]);

  if (!isMermaid) {
    return (
      <NodeViewWrapper>
        <pre className="prd-code-block">
          <NodeViewContent />
        </pre>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper className="prd-mermaid-block" data-type="mermaid">
      <div contentEditable={false}>
        <MermaidDiagram source={chartSource} className="my-0" />
      </div>
      <pre className={cn("prd-code-block prd-mermaid-source", !editor.isEditable && "sr-only")}>
        <NodeViewContent />
      </pre>
    </NodeViewWrapper>
  );
}
