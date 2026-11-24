import test from "node:test";
import assert from "node:assert/strict";
import { filterRepositoryOptions } from "../src/utils/repositorySearch.js";

const options = [
  {
    value: "github.com/YorkIE-Launchpad/fuel-design",
    label: "YorkIE-Launchpad/fuel-design (private)",
  },
  { value: "github.com/YorkIE-Launchpad/lms", label: "YorkIE-Launchpad/lms (private)" },
  { value: "github.com/acme/public-app", label: "acme/public-app" },
];

test("filterRepositoryOptions returns every option when the query is empty", () => {
  assert.equal(filterRepositoryOptions(options, "  ").length, 3);
  assert.equal(filterRepositoryOptions(null, "").length, 0);
});

test("filterRepositoryOptions matches repo name in the label or path", () => {
  const byName = filterRepositoryOptions(options, "fuel");
  assert.deepEqual(
    byName.map((row) => row.value),
    ["github.com/YorkIE-Launchpad/fuel-design"],
  );

  const byPath = filterRepositoryOptions(options, "acme/public");
  assert.equal(byPath.length, 1);
  assert.equal(byPath[0].label, "acme/public-app");
});

test("filterRepositoryOptions uses a custom text getter", () => {
  const repos = [{ path: "github.com/org/api", directory: "backend" }];
  const matched = filterRepositoryOptions(
    repos,
    "backend",
    (repo) => `${repo.path} ${repo.directory}`,
  );
  assert.equal(matched.length, 1);
  assert.equal(
    filterRepositoryOptions(repos, "missing", (repo) => `${repo.path} ${repo.directory}`).length,
    0,
  );
});
