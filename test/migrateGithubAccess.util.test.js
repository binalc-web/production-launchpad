import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDevelopmentRepoAccessMessage,
  enrichMigrateGithubAccessPayload,
  isGenericGithubAccessError,
  launchpadAccessFromGitRepoPath,
} from "../src/lib/migrateGithubAccess.util.js";

test("launchpadAccessFromGitRepoPath parses github.com host path", () => {
  const access = launchpadAccessFromGitRepoPath("github.com/YorkIE-Launchpad/parth-test-37");
  assert.equal(access?.label, "YorkIE-Launchpad/parth-test-37");
  assert.equal(access?.url, "https://github.com/YorkIE-Launchpad/parth-test-37");
});

test("isGenericGithubAccessError flags Not Found", () => {
  assert.equal(isGenericGithubAccessError("Not Found"), true);
});

test("enrichMigrateGithubAccessPayload replaces Not Found with invitation link", () => {
  const enriched = enrichMigrateGithubAccessPayload(
    { error: "Not Found" },
    { gitRepoPath: "github.com/YorkIE-Launchpad/parth-test-37" },
  );
  assert.match(enriched.error, /invitation/i);
  assert.match(enriched.error, /https:\/\/github\.com\/YorkIE-Launchpad\/parth-test-37/);
  assert.equal(enriched.launchpadRepoLabel, "YorkIE-Launchpad/parth-test-37");
});

test("enrichMigrateGithubAccessPayload uses dev copy for structured development failures", () => {
  const enriched = enrichMigrateGithubAccessPayload(
    {
      error: "Not Found",
      repoAccess: [
        {
          role: "development",
          label: "acme/dev-app",
          url: "https://github.com/acme/dev-app",
          issue: "inaccessible",
        },
      ],
    },
    { gitRepoPath: "github.com/YorkIE-Launchpad/parth-test-37" },
  );
  assert.doesNotMatch(enriched.error, /invitation/i);
  assert.match(enriched.error, /development repository/i);
  assert.match(enriched.error, /https:\/\/github\.com\/acme\/dev-app/);
  assert.equal(enriched.launchpadRepoUrl, undefined);
});

test("enrichMigrateGithubAccessPayload keeps launchpad invitation for launchpad failures", () => {
  const enriched = enrichMigrateGithubAccessPayload(
    {
      error: "Not Found",
      launchpadRepoUrl: "https://github.com/YorkIE-Launchpad/parth-test-41",
      launchpadRepoLabel: "YorkIE-Launchpad/parth-test-41",
      repoAccess: [
        {
          role: "launchpad",
          label: "YorkIE-Launchpad/parth-test-41",
          url: "https://github.com/YorkIE-Launchpad/parth-test-41",
          issue: "inaccessible",
        },
      ],
    },
    { gitRepoPath: "github.com/YorkIE-Launchpad/parth-test-41" },
  );
  assert.match(enriched.error, /invitation/i);
  assert.match(enriched.error, /parth-test-41/);
});

test("enrichMigrateGithubAccessPayload does not map dev API errors to launchpad invitation", () => {
  const enriched = enrichMigrateGithubAccessPayload(
    { error: "Cannot access developer repository: Not Found" },
    { gitRepoPath: "github.com/YorkIE-Launchpad/parth-test-41" },
  );
  assert.doesNotMatch(enriched.error, /invitation/i);
  assert.equal(enriched.error, "Cannot access developer repository: Not Found");
  assert.equal(enriched.launchpadRepoUrl, undefined);
});

test("buildDevelopmentRepoAccessMessage does not use invitation wording", () => {
  const msg = buildDevelopmentRepoAccessMessage("acme/dev-app", "https://github.com/acme/dev-app");
  assert.doesNotMatch(msg, /invitation/i);
  assert.match(msg, /development repository/i);
});
