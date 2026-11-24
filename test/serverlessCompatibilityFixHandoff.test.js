import test from "node:test";
import assert from "node:assert/strict";
import {
  buildServerlessCompatibilityFixPrompt,
  readServerlessCompatibilityFailure,
} from "../src/utils/serverlessCompatibilityFixHandoff.util.js";

test("readServerlessCompatibilityFailure uses structured 422 fields", () => {
  const failure = readServerlessCompatibilityFailure({
    code: "SERVERLESS_INCOMPATIBLE",
    error: "RDS blocks the switch. Blockers: PostgreSQL only.",
    summary: "RDS blocks the switch.",
    blockers: ["PostgreSQL only"],
  });
  assert.equal(failure.summary, "RDS blocks the switch.");
  assert.deepEqual(failure.blockers, ["PostgreSQL only"]);
});

test("readServerlessCompatibilityFailure parses the legacy blocker sentence", () => {
  const failure = readServerlessCompatibilityFailure({
    error:
      "The blocker is the data layer. Blockers: The data layer is RDS PostgreSQL only; The IaC provisions an RDS PostgreSQL instance.",
  });
  assert.equal(failure.summary, "The blocker is the data layer.");
  assert.equal(failure.blockers.length, 2);
  assert.match(failure.blockers[0], /RDS PostgreSQL only/);
});

test("readServerlessCompatibilityFailure ignores unrelated save errors", () => {
  assert.equal(readServerlessCompatibilityFailure({ error: "Project name is required" }), null);
});

test("buildServerlessCompatibilityFixPrompt lists every blocker", () => {
  const prompt = buildServerlessCompatibilityFixPrompt({
    summary: "Compute can move. The database cannot.",
    blockers: ["RDS PostgreSQL only", "No DynamoDB path"],
  });
  assert.match(prompt, /Lambda \+ API Gateway \+ DynamoDB/);
  assert.match(prompt, /Compute can move/);
  assert.match(prompt, /- RDS PostgreSQL only/);
  assert.match(prompt, /- No DynamoDB path/);
});
