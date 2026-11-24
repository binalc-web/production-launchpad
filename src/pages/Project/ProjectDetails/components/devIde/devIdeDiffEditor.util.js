// @monaco-editor/react disposes the models before the diff editor on unmount, which
// monaco >=0.50 rejects ("TextModel got disposed before DiffEditorWidget model got reset").
// Detach the models first, then dispose them.
export function disposeDiffEditorModels(editor) {
  const model = editor?.getModel();
  if (!model) return;
  editor.setModel(null);
  model.original?.dispose();
  model.modified?.dispose();
}
