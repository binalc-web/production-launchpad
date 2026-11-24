import { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
// Monaco 0.55 package "exports" require the .js extension for worker entries.
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker.js?worker";
import jsonWorker from "monaco-editor/esm/vs/language/json/json.worker.js?worker";
import cssWorker from "monaco-editor/esm/vs/language/css/css.worker.js?worker";
import htmlWorker from "monaco-editor/esm/vs/language/html/html.worker.js?worker";
import tsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker.js?worker";
import {
  applyBundledMonacoLoader,
  createMonacoEnvironmentGetWorker,
} from "./monacoEnvironment.util.js";

self.MonacoEnvironment = {
  getWorker: createMonacoEnvironmentGetWorker({
    editor: editorWorker,
    json: jsonWorker,
    css: cssWorker,
    html: htmlWorker,
    ts: tsWorker,
  }),
};

applyBundledMonacoLoader(loader, monaco);
