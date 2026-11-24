import { useEffect, useRef } from "react";
import { DiffEditor } from "@/lib/monacoEditor";
import { Skeleton } from "@/components/ui/skeleton";
import { disposeDiffEditorModels } from "./devIdeDiffEditor.util";

function DiffPane(props) {
  const editorRef = useRef(null);
  // Parent effect cleanup runs before the DiffEditor's own editor.dispose().
  useEffect(() => () => disposeDiffEditorModels(editorRef.current), []);
  return (
    <DiffEditor
      {...props}
      keepCurrentOriginalModel
      keepCurrentModifiedModel
      onMount={(editor) => {
        editorRef.current = editor;
      }}
    />
  );
}

export function DevIdeDiffEditor({ path, diff, base, head, theme = "vs-dark" }) {
  if (diff?.loading) {
    return (
      <div
        className="grid h-full grid-cols-2 gap-4 p-4"
        role="status"
        aria-busy="true"
        aria-label="Loading diff"
      >
        {[0, 1].map((pane) => (
          <div key={pane} className="space-y-2">
            {["w-3/4", "w-full", "w-5/6", "w-2/3", "w-full", "w-1/2"].map((width, i) => (
              <Skeleton key={i} className={`h-3 ${width}`} />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (diff?.error) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center text-sm text-destructive">
        {diff.error}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {(base || head) && (
        <div className="shrink-0 border-b border-border bg-muted/20 px-3 py-1 font-mono text-[10px] text-muted-foreground">
          {base || "(empty)"} → {head || "(empty)"} · {path}
        </div>
      )}
      <div className="min-h-0 flex-1">
        <DiffPane
          key={`${path}:${base}:${head}`}
          original={diff?.original ?? ""}
          modified={diff?.modified ?? ""}
          language={diff?.language || "plaintext"}
          theme={theme}
          options={{
            readOnly: true,
            renderSideBySide: true,
            minimap: { enabled: false },
            fontSize: 13,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            wordWrap: "on",
            originalEditable: false,
          }}
        />
      </div>
    </div>
  );
}
