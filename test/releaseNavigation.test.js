import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  buildApplicationImplementPath,
  buildPreviewImplementPath,
  buildReleaseManagementDetailsPath,
} from "../src/lib/releaseNavigation.js";

test("buildReleaseManagementDetailsPath targets Plan → Releases overview", () => {
  assert.equal(
    buildReleaseManagementDetailsPath(42),
    "/projects/details/42?section=releases&area=overview",
  );
  assert.equal(
    buildReleaseManagementDetailsPath("99"),
    "/projects/details/99?section=releases&area=overview",
  );
});

test("buildPreviewImplementPath and buildApplicationImplementPath", () => {
  assert.equal(
    buildPreviewImplementPath(42),
    "/projects/details/42?section=web-app&area=implement",
  );
  assert.equal(
    buildApplicationImplementPath(42),
    "/projects/details/42?section=backend&area=implement",
  );
  assert.equal(buildPreviewImplementPath(null), null);
  assert.equal(buildApplicationImplementPath(""), null);
});

test("buildReleaseManagementDetailsPath returns null for missing id", () => {
  assert.equal(buildReleaseManagementDetailsPath(null), null);
  assert.equal(buildReleaseManagementDetailsPath(undefined), null);
  assert.equal(buildReleaseManagementDetailsPath(""), null);
  assert.equal(buildReleaseManagementDetailsPath("  "), null);
});

test("ClientLink Open Release Management CTAs use releases path helper", () => {
  const clientLinkPath = fileURLToPath(
    new URL("../src/pages/ClientLink/ClientLink.jsx", import.meta.url),
  );
  const guidePath = fileURLToPath(
    new URL(
      "../src/pages/ClientLink/components/ClientLinkChatBlockedGuide.jsx",
      import.meta.url,
    ),
  );
  const clientLink = readFileSync(clientLinkPath, "utf8");
  const guide = readFileSync(guidePath, "utf8");

  assert.match(clientLink, /buildReleaseManagementDetailsPath/);
  assert.match(guide, /buildReleaseManagementDetailsPath/);
  assert.doesNotMatch(
    clientLink,
    /href=\{`\/projects\/details\/\$\{publicProject\.id\}`\}/,
    "must not open bare project details (journey resume can land on Build)",
  );
  assert.doesNotMatch(
    guide,
    /`\/projects\/details\/\$\{encodeURIComponent\(String\(projectId\)\)\}`/,
    "chat blocked guide must deep-link to Releases",
  );
});
