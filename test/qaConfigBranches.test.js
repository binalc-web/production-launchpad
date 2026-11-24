import test from "node:test";
import assert from "node:assert/strict";
import {
  devRepoRowsFromProject,
  emptyEnvironmentDraft,
  normalizeQaConfig,
  withDefaultBranches,
} from "../src/utils/qaConfigClient.js";

const DEV = JSON.stringify({
  v: 1,
  repos: [
    { path: "github.com/acme/app", ref: "main", directory: "app" },
    { path: "github.com/acme/api", ref: "develop", directory: "api" },
  ],
});

test("dev repos are read from the project's developmentRepoUrl JSON", () => {
  assert.deepEqual(devRepoRowsFromProject({ developmentRepoUrl: DEV }), [
    { path: "github.com/acme/app", ref: "main" },
    { path: "github.com/acme/api", ref: "develop" },
  ]);
  assert.deepEqual(
    devRepoRowsFromProject({ developmentRepoUrl: "https://github.com/acme/app" }),
    [],
  );
  assert.deepEqual(devRepoRowsFromProject({ developmentRepoUrl: "{bad" }), []);
  assert.deepEqual(devRepoRowsFromProject(null), []);
});

test("empty branches are prefilled from each repo's default ref so the first save passes", () => {
  const repos = devRepoRowsFromProject({ developmentRepoUrl: DEV });
  const draft = emptyEnvironmentDraft(repos.map((r) => r.path));
  assert.deepEqual(
    draft.repoBranches.map((r) => r.branch),
    ["", ""],
  );
  const filled = withDefaultBranches({ ...draft, name: "Production" }, repos);
  assert.deepEqual(filled.repoBranches, [
    { path: "github.com/acme/app", branch: "main" },
    { path: "github.com/acme/api", branch: "develop" },
  ]);
  assert.equal(filled.branch, "main");
});

test("an explicit branch is never overwritten, and projects without repos are left alone", () => {
  const repos = devRepoRowsFromProject({ developmentRepoUrl: DEV });
  const env = {
    name: "Staging",
    repoBranches: [
      { path: "github.com/acme/app", branch: "staging" },
      { path: "github.com/acme/api", branch: "" },
    ],
  };
  const out = withDefaultBranches(env, repos);
  assert.equal(out.repoBranches[0].branch, "staging");
  assert.equal(out.repoBranches[1].branch, "develop");
  const plain = { name: "Dev", branch: "", repoBranches: [] };
  assert.equal(withDefaultBranches(plain, []), plain);
});

test("normalizeQaConfig hydrates one branch row per development repository", () => {
  const paths = ["github.com/acme/app", "github.com/acme/api"];
  const cfg = normalizeQaConfig({ environments: [{ id: "prod", name: "Production" }] }, paths);
  assert.deepEqual(
    cfg.environments[0].repoBranches.map((r) => r.path),
    paths,
  );
});
