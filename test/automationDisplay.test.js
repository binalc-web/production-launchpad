import test from "node:test";
import assert from "node:assert/strict";
import {
  automationMatchesSearch,
  collectAutomationProjectSearchLabels,
  formatAutomationRepoSearchLabel,
} from "../src/pages/Jobs/utils/automationSearch.util.js";

test("formatAutomationRepoSearchLabel shortens github.com paths", () => {
  assert.equal(
    formatAutomationRepoSearchLabel("github.com/acme/payments-api"),
    "acme/payments-api",
  );
  assert.equal(
    formatAutomationRepoSearchLabel("https://github.com/acme/payments-api.git"),
    "acme/payments-api",
  );
});

test("automationMatchesSearch matches automation name", () => {
  const job = {
    name: "Weekly security scan",
    targets: [{ repoPath: "github.com/acme/api", branch: "main", project: { name: "Acme" } }],
  };
  assert.equal(automationMatchesSearch(job, "security"), true);
  assert.equal(automationMatchesSearch(job, "billing"), false);
});

test("automationMatchesSearch matches github repo path and owner/repo", () => {
  const job = {
    name: "Nightly report",
    targets: [{ repoPath: "github.com/acme/payments-api", branch: "main" }],
  };
  assert.equal(automationMatchesSearch(job, "payments-api"), true);
  assert.equal(automationMatchesSearch(job, "acme/payments"), true);
  assert.equal(automationMatchesSearch(job, "github.com/acme"), true);
});

test("automationMatchesSearch matches project name and branch", () => {
  const job = {
    name: "Docs sync",
    targets: [
      {
        repoPath: "github.com/acme/web",
        branch: "develop",
        project: { name: "Customer Portal" },
      },
    ],
  };
  assert.equal(automationMatchesSearch(job, "customer portal"), true);
  assert.equal(automationMatchesSearch(job, "develop"), true);
});

test("automationMatchesSearch matches projectName fallback and project id label", () => {
  const job = {
    name: "Weekly scan",
    targets: [{ repoPath: "github.com/acme/api", projectName: "Mattar", projectId: 42 }],
  };
  assert.equal(automationMatchesSearch(job, "mattar"), true);
  assert.equal(automationMatchesSearch(job, "project 42"), true);
});

test("collectAutomationProjectSearchLabels includes name and project id", () => {
  assert.deepEqual(
    collectAutomationProjectSearchLabels({
      project: { name: "Acme" },
      projectId: 7,
    }),
    ["acme", "project 7"],
  );
});

test("automationMatchesSearch returns true for empty query", () => {
  const job = { name: "Any", targets: [] };
  assert.equal(automationMatchesSearch(job, ""), true);
  assert.equal(automationMatchesSearch(job, "   "), true);
});
