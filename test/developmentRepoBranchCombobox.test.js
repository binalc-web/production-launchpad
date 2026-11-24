import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { filterDevBranchOptions } from "../src/utils/projectMultiRepoForm.js";

test("filterDevBranchOptions filters by substring", () => {
  const branches = ["main", "develop", "feature/login", "release/v1"];
  assert.deepEqual(filterDevBranchOptions(branches, "dev"), ["develop"]);
  assert.deepEqual(filterDevBranchOptions(branches, "feat"), ["feature/login"]);
  assert.deepEqual(filterDevBranchOptions(branches, ""), branches);
});

test("filterDevBranchOptions ranks exact matches first", () => {
  const branches = ["feature/development", "development", "development-v2"];
  assert.deepEqual(filterDevBranchOptions(branches, "development"), [
    "development",
    "development-v2",
    "feature/development",
  ]);
});

test("DevelopmentRepoBranchCombobox hides until repo path is long enough", () => {
  const comboboxPath = fileURLToPath(
    new URL(
      "../src/pages/Project/CreateProject/components/DevelopmentRepoBranchCombobox.jsx",
      import.meta.url,
    ),
  );
  const source = readFileSync(comboboxPath, "utf8");
  assert.match(source, /path\.length >= DEV_BRANCH_MIN_REPO_PATH_LEN/);
  assert.match(source, /if \(!showField\) return null/);
  assert.doesNotMatch(source, /placeholder="main"/);
});

test("DevelopmentRepoBranchCombobox debounces server branch search", () => {
  const comboboxPath = fileURLToPath(
    new URL(
      "../src/pages/Project/CreateProject/components/DevelopmentRepoBranchCombobox.jsx",
      import.meta.url,
    ),
  );
  const source = readFileSync(comboboxPath, "utf8");
  assert.match(source, /onSearchBranches/);
  assert.match(source, /DEV_BRANCH_SEARCH_DEBOUNCE_MS/);
  assert.match(source, /trimmedQuery\.length >= DEV_BRANCH_SEARCH_MIN_LEN/);
  assert.match(source, /search\(trimmedQuery\)/);
  assert.match(source, /onSearchBranchesRef/);
  assert.match(source, /const inputValue = open \? searchQuery : selectedValue/);
  assert.match(source, /const \[hasTyped, setHasTyped\]/);
  assert.match(source, /isServerSearch[\s\S]*hasTyped/);
  assert.match(
    source,
    /Type \$\{DEV_BRANCH_SEARCH_MIN_LEN\} or more characters to search all branches/,
  );
  assert.match(source, /createPortal/);
  assert.match(source, /useAnchoredDropdownPosition/);
  assert.match(source, /computeDropdownStyle/);
  assert.match(source, /resolveDropdownPortalRoot/);
  assert.match(source, /useAnchoredDropdownWheel/);
  assert.match(source, /Skeleton/);
  assert.match(source, /aria-busy="true"/);
  assert.match(source, /Loading branches/);
});

test("ProjectGitJiraOAuthCard wires server branch search into combobox", () => {
  const cardPath = fileURLToPath(
    new URL(
      "../src/pages/Project/CreateProject/components/ProjectGitJiraOAuthCard.jsx",
      import.meta.url,
    ),
  );
  const source = readFileSync(cardPath, "utf8");
  assert.match(source, /searchDevelopmentRepoBranches/);
  assert.match(source, /onSearchBranches=\{\(query\) =>/);
  assert.match(source, /fetchDeveloperRepoBranches\(projectId, path, \{ q \}\)/);
});

test("ProjectGitJiraOAuthCard validates typed branches against remote repository", () => {
  const cardPath = fileURLToPath(
    new URL(
      "../src/pages/Project/CreateProject/components/ProjectGitJiraOAuthCard.jsx",
      import.meta.url,
    ),
  );
  const source = readFileSync(cardPath, "utf8");
  assert.match(source, /validateDevBranchesRemote/);
  assert.match(source, /validateDeveloperRepoBranch/);
  assert.match(source, /validateIntegrationRepoBranch/);
  assert.doesNotMatch(source, /Select a branch from the repository list/);
  assert.match(source, /devBranchRemoteErrors/);
});
