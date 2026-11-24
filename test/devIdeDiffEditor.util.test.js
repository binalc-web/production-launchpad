import assert from "node:assert/strict";
import test from "node:test";
import { disposeDiffEditorModels } from "../src/pages/Project/ProjectDetails/components/devIde/devIdeDiffEditor.util.js";

test("disposeDiffEditorModels detaches models from the diff editor before disposing them", () => {
  const calls = [];
  let current = {
    original: { dispose: () => calls.push(current ? "original-while-attached" : "original") },
    modified: { dispose: () => calls.push(current ? "modified-while-attached" : "modified") },
  };
  const editor = {
    getModel: () => current,
    setModel: (m) => {
      calls.push("setModel");
      current = m;
    },
  };
  disposeDiffEditorModels(editor);
  assert.deepEqual(calls, ["setModel", "original", "modified"]);
});

test("disposeDiffEditorModels is a no-op when the editor never mounted", () => {
  assert.doesNotThrow(() => disposeDiffEditorModels(null));
  assert.doesNotThrow(() => disposeDiffEditorModels({ getModel: () => null }));
});
