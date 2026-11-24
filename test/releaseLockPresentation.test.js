import test from "node:test";
import assert from "node:assert/strict";
import {
  formatBackendLockAgentModeDescription,
  formatBackendLockAgentModeShort,
  formatDevRepoInputModeLabel,
  formatDevRepoRowCompact,
} from "../src/lib/releaseLockPresentation.js";
import { devRowsFromStored } from "../src/utils/projectMultiRepoForm.js";

test("formatBackendLockAgentModeDescription returns full select labels", () => {
  assert.equal(formatBackendLockAgentModeDescription("plan"), "Plan — backend plan document");
  assert.equal(
    formatBackendLockAgentModeDescription("code_auto"),
    "Code + auto merge — implement and merge to base branch",
  );
  assert.equal(
    formatBackendLockAgentModeDescription("code_pr"),
    "Code + PR — implement and open a pull request",
  );
});

test("formatBackendLockAgentModeShort returns compact inline labels", () => {
  assert.equal(formatBackendLockAgentModeShort("plan"), "Plan");
  assert.equal(formatBackendLockAgentModeShort("code_auto"), "Code + auto merge");
  assert.equal(formatBackendLockAgentModeShort("code_pr"), "Code + PR");
  assert.equal(formatBackendLockAgentModeShort("code"), "Code + auto merge");
});

test("formatDevRepoRowCompact joins path and ref", () => {
  assert.equal(
    formatDevRepoRowCompact({ path: "github.com/org/dev", ref: "stage" }),
    "github.com/org/dev @ stage",
  );
  assert.equal(
    formatDevRepoRowCompact({ path: "github.com/org/dev" }),
    "github.com/org/dev @ main",
  );
  assert.equal(formatDevRepoRowCompact({ path: "" }), "");
});

test("formatDevRepoInputModeLabel maps input modes", () => {
  assert.equal(formatDevRepoInputModeLabel("pick"), "Link an existing repository");
  assert.equal(formatDevRepoInputModeLabel("manual"), "Enter repository path manually");
  assert.equal(formatDevRepoInputModeLabel("auto"), "Create new repository");
});

test("devRowsFromStored preserves inputMode from stored JSON", () => {
  const raw = JSON.stringify({
    v: 1,
    repos: [
      {
        path: "github.com/org/dev",
        ref: "stage",
        directory: "development-1",
        inputMode: "manual",
        details: "Dev Repo notes",
      },
    ],
  });
  const rows = devRowsFromStored(raw);
  assert.equal(rows?.length, 1);
  assert.equal(rows[0].inputMode, "manual");
  assert.equal(rows[0].ref, "stage");
  assert.equal(rows[0].details, "Dev Repo notes");
});

test("devRowsFromStored defaults unknown inputMode to manual", () => {
  const raw = JSON.stringify({
    v: 1,
    repos: [{ path: "github.com/org/dev", ref: "main", directory: "development-1" }],
  });
  assert.equal(devRowsFromStored(raw)?.[0]?.inputMode, "manual");
});

test("devRowsFromStored preserves inputMode pick", () => {
  const raw = JSON.stringify({
    v: 1,
    repos: [
      {
        path: "github.com/org/dev",
        ref: "main",
        directory: "development-1",
        inputMode: "pick",
      },
    ],
  });
  assert.equal(devRowsFromStored(raw)?.[0]?.inputMode, "pick");
});
