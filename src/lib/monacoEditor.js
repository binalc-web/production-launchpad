// Side-effect: same-origin Monaco workers + bundled package (not jsDelivr CDN).
import "./monacoEnvironment.js";

export { default, DiffEditor, loader, useMonaco } from "@monaco-editor/react";
