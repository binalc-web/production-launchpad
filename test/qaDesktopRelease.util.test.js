import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { formatQaDesktopVersionLabel } from "../src/pages/Integrations/qaDesktopRelease.util.js";

test("formatQaDesktopVersionLabel prefixes a v when missing", () => {
  assert.equal(formatQaDesktopVersionLabel("1.3.1"), "v1.3.1");
  assert.equal(formatQaDesktopVersionLabel("v1.3.1"), "v1.3.1");
  assert.equal(formatQaDesktopVersionLabel("  "), "");
  assert.equal(formatQaDesktopVersionLabel(null), "");
});

test("Integrations settings page includes the QA Automation App card", () => {
  const pagePath = fileURLToPath(
    new URL("../src/pages/Integrations/IntegrationsSettingsPage.jsx", import.meta.url),
  );
  const source = readFileSync(pagePath, "utf8");
  assert.match(source, /QaAutomationAppCard/);
});

test("QA Automation App card uses the favicon and download control", () => {
  const cardPath = fileURLToPath(
    new URL("../src/components/integrations/QaAutomationAppCard.jsx", import.meta.url),
  );
  const source = readFileSync(cardPath, "utf8");
  assert.match(source, /QaApp\.png|fevicon\.png/);
  assert.match(source, /Download/);
  assert.match(source, /fetchQaDesktopReleaseLatest/);
  assert.match(source, /formatQaDesktopVersionLabel/);
});

test("Integrations settings stacks cards in two independent columns", () => {
  const pagePath = fileURLToPath(
    new URL("../src/pages/Integrations/IntegrationsSettingsPage.jsx", import.meta.url),
  );
  const source = readFileSync(pagePath, "utf8");
  assert.match(source, /grid grid-cols-1 items-start/);
  assert.match(source, /flex min-w-0 flex-col gap-4 lg:gap-5/);
  assert.doesNotMatch(source, /flex flex-wrap items-start/);
  assert.doesNotMatch(source, /items-stretch/);
});
