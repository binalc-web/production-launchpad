import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeAgentRepoPath } from "../src/pages/Project/ProjectDetails/components/devIde/normalizeAgentRepoPath.js";

describe("normalizeAgentRepoPath", () => {
  it("strips multi-repo development-N workspace prefix", () => {
    assert.equal(
      normalizeAgentRepoPath("development-1/Frontend/src/App.tsx"),
      "Frontend/src/App.tsx",
    );
    assert.equal(
      normalizeAgentRepoPath("development/backend/src/index.js"),
      "backend/src/index.js",
    );
  });

  it("strips cloud workdir absolute paths before development-N", () => {
    assert.equal(
      normalizeAgentRepoPath(
        "/root/.cursor-local-remote/cloud-workdirs/bc_abc/repo/development-1/backend/src/lib/logger.ts",
      ),
      "backend/src/lib/logger.ts",
    );
    assert.equal(
      normalizeAgentRepoPath(
        "/root/.cursor-local-remote/cloud-workdirs/bc_abc/repo/development-1/Frontend/src/lib/api.ts",
      ),
      "Frontend/src/lib/api.ts",
    );
  });

  it("leaves already repo-relative paths unchanged", () => {
    assert.equal(normalizeAgentRepoPath("Frontend/src/App.tsx"), "Frontend/src/App.tsx");
    assert.equal(
      normalizeAgentRepoPath("backend/src/lib/response.ts"),
      "backend/src/lib/response.ts",
    );
  });
});
