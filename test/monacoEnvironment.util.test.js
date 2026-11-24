import assert from "node:assert/strict";
import test from "node:test";
import {
  applyBundledMonacoLoader,
  createMonacoEnvironmentGetWorker,
  pickMonacoWorkerFactory,
} from "../src/lib/monacoEnvironment.util.js";

function fakeWorker(name) {
  return class FakeWorker {
    constructor() {
      this.name = name;
    }
  };
}

const factories = {
  editor: fakeWorker("editor"),
  json: fakeWorker("json"),
  css: fakeWorker("css"),
  html: fakeWorker("html"),
  ts: fakeWorker("ts"),
};

test("pickMonacoWorkerFactory maps language labels to worker factories", () => {
  assert.equal(pickMonacoWorkerFactory("json", factories), factories.json);
  assert.equal(pickMonacoWorkerFactory("css", factories), factories.css);
  assert.equal(pickMonacoWorkerFactory("scss", factories), factories.css);
  assert.equal(pickMonacoWorkerFactory("html", factories), factories.html);
  assert.equal(pickMonacoWorkerFactory("typescript", factories), factories.ts);
  assert.equal(pickMonacoWorkerFactory("javascript", factories), factories.ts);
  assert.equal(pickMonacoWorkerFactory("plaintext", factories), factories.editor);
  assert.equal(pickMonacoWorkerFactory("shell", factories), factories.editor);
});

test("createMonacoEnvironmentGetWorker constructs same-origin workers", () => {
  const getWorker = createMonacoEnvironmentGetWorker(factories);
  assert.equal(getWorker("1", "json").name, "json");
  assert.equal(getWorker("2", "javascript").name, "ts");
  assert.equal(getWorker("3", "markdown").name, "editor");
});

test("applyBundledMonacoLoader configures loader with the npm monaco package", () => {
  const calls = [];
  const monaco = { __bundled: true };
  applyBundledMonacoLoader(
    {
      config(opts) {
        calls.push(opts);
      },
    },
    monaco,
  );
  assert.deepEqual(calls, [{ monaco }]);
});

test("applyBundledMonacoLoader rejects missing loader or monaco", () => {
  assert.throws(() => applyBundledMonacoLoader(null, {}), /loader\.config/);
  assert.throws(() => applyBundledMonacoLoader({ config() {} }, null), /bundled monaco/);
});
