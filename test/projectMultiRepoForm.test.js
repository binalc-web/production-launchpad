import test from "node:test";
import assert from "node:assert/strict";
import {
  defaultDevMultiRow,
  devMultiRowsNeedProvision,
  filterDevBranchOptions,
  hasAppRepositories,
  isDevBranchListedLocally,
  isDevRowAutoProvision,
  serializeDevMultiForSave,
  validateDevMultiRows,
} from "../src/utils/projectMultiRepoForm.js";

const GH_RE = /^(https?:\/\/)?github\.com\/[^/\s]+\/[^/\s]+(?:\.git)?$/i;

test("defaultDevMultiRow includes inputMode pick", () => {
  assert.equal(defaultDevMultiRow().inputMode, "pick");
});

test("defaultDevMultiRow starts with empty branch ref", () => {
  assert.equal(defaultDevMultiRow().ref, "");
});

test("hasAppRepositories is false for no rows or only a blank default row", () => {
  assert.equal(hasAppRepositories(undefined), false);
  assert.equal(hasAppRepositories([]), false);
  assert.equal(hasAppRepositories([defaultDevMultiRow()]), false);
  assert.equal(hasAppRepositories([{ ...defaultDevMultiRow(), path: "   " }]), false);
});

test("hasAppRepositories is true for a typed or picked path or an auto-create row", () => {
  assert.equal(hasAppRepositories([{ ...defaultDevMultiRow(), path: "github.com/o/r" }]), true);
  assert.equal(hasAppRepositories([{ ...defaultDevMultiRow(), inputMode: "auto" }]), true);
  assert.equal(
    hasAppRepositories([defaultDevMultiRow(), { ...defaultDevMultiRow(), path: "github.com/o/r" }]),
    true,
  );
});

test("filterDevBranchOptions filters branch list", () => {
  assert.deepEqual(filterDevBranchOptions(["main", "develop"], "dev"), ["develop"]);
});

test("isDevBranchListedLocally matches cached branch names only", () => {
  assert.equal(isDevBranchListedLocally("main", ["main", "develop"]), true);
  assert.equal(isDevBranchListedLocally("feature/x", ["main"]), false);
  assert.equal(isDevBranchListedLocally("main", []), false);
});

test("serializeDevMultiForSave emits provision rows", () => {
  const json = serializeDevMultiForSave([
    { path: "", ref: "main", directory: "development-1", inputMode: "auto", scmHost: "bitbucket" },
  ]);
  const parsed = JSON.parse(json);
  assert.deepEqual(parsed.repos[0], {
    ref: "main",
    directory: "development-1",
    provision: true,
    scmHost: "bitbucket",
  });
});

test("validateDevMultiRows allows auto without path", () => {
  const err = validateDevMultiRows(
    [{ path: "", ref: "main", directory: "development-1", inputMode: "auto" }],
    "github",
    GH_RE,
  );
  assert.equal(err, null);
});

test("validateDevMultiRows allows auto without branch", () => {
  const err = validateDevMultiRows(
    [{ path: "", ref: "", directory: "development-1", inputMode: "auto" }],
    "github",
    GH_RE,
  );
  assert.equal(err, null);
});

test("serializeDevMultiForSave defaults auto branch to main", () => {
  const json = serializeDevMultiForSave([
    { path: "", ref: "", directory: "development-1", inputMode: "auto" },
  ]);
  const parsed = JSON.parse(json);
  assert.equal(parsed.repos[0].ref, "main");
  assert.equal(parsed.repos[0].provision, true);
});

test("devMultiRowsNeedProvision detects auto rows", () => {
  assert.equal(
    devMultiRowsNeedProvision([
      {
        path: "github.com/a/b",
        ref: "main",
        directory: "development-1",
        inputMode: "pick",
      },
    ]),
    false,
  );
  assert.equal(
    devMultiRowsNeedProvision([
      { path: "", ref: "main", directory: "development-1", inputMode: "auto" },
    ]),
    true,
  );
  assert.equal(isDevRowAutoProvision({ inputMode: "auto" }), true);
});

test("validateDevMultiRows requires branch", () => {
  const err = validateDevMultiRows(
    [
      {
        path: "github.com/org/repo",
        ref: "",
        directory: "development-1",
        inputMode: "pick",
      },
    ],
    "github",
    GH_RE,
  );
  assert.equal(err, "Development row 1: Branch is required.");
});

test("validateDevMultiRows rejects duplicate paths", () => {
  const err = validateDevMultiRows(
    [
      {
        path: "github.com/org/same-repo",
        ref: "main",
        directory: "development-1",
        inputMode: "manual",
      },
      {
        path: "https://github.com/org/same-repo.git",
        ref: "main",
        directory: "development-2",
        inputMode: "manual",
      },
    ],
    "github",
    GH_RE,
  );
  assert.match(err, /duplicate repository path/i);
});
