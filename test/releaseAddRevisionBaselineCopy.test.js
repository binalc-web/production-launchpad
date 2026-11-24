import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("baseline copy closes the dialog before awaiting and reports progress via one toast", () => {
  const src = readFileSync(
    join(root, "src/pages/Project/ProjectDetails/components/ReleaseAddRevisionDialog.jsx"),
    "utf8",
  );
  const start = src.indexOf("const handleBaselineCopy");
  const end = src.indexOf("const handleAgentSubmit");
  assert.ok(start > 0 && end > start);
  const body = src.slice(start, end);

  const loadingAt = body.indexOf("toast.loading(");
  const closeAt = body.indexOf("handleClose(false);\n    try");
  const awaitAt = body.indexOf("await seedReleaseFromPrior(");
  assert.ok(loadingAt > 0, "shows a loading toast");
  assert.ok(closeAt > loadingAt && closeAt < awaitAt, "closes the dialog before the long request");
  assert.match(body, /toast\.success\([\s\S]*\{ id: toastId \}/);
  assert.match(body, /toast\.error\([^)]*\{ id: toastId \}\)/);
  assert.doesNotMatch(body, /setSubmitting\(true\)/, "must not block the dialog on the copy");
});
