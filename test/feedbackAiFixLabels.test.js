import test from "node:test";
import assert from "node:assert/strict";
import {
  formatAiFixBranchBrowseUrl,
  formatAiFixCommitBrowseUrl,
  formatFeedbackAiFixFailureMessage,
  getAiFixPhaseOrder,
  isDevRepoFeedbackSource,
  isFeedbackAiFixDeployed,
  resolveAiFixMergeAction,
  resolveTimelinePhaseIndex,
} from "../src/lib/feedbackAiFixLabels.js";
import { formatSentryImportSummary, resolveSentryIssueInfo } from "../src/lib/sentryIntegration.js";

test("getAiFixPhaseOrder fix_only opens a PR for external repos", () => {
  const phases = getAiFixPhaseOrder({
    mergeAction: "fix_only",
    feedbackSource: "CODE_SNIPPET",
  });
  assert.equal(phases.at(-1), "CREATING_PULL_REQUEST");
  assert.equal(phases.includes("MERGING_TO_MAIN"), false);
  assert.equal(phases.includes("DEPLOYING"), false);
});

test("getAiFixPhaseOrder client-link fix_only stays a preview (no PR, no merge)", () => {
  const phases = getAiFixPhaseOrder({
    mergeAction: "fix_only",
    feedbackSource: "CLIENT_LINK",
  });
  assert.equal(phases.includes("CREATING_PULL_REQUEST"), false);
  assert.equal(phases.includes("MERGING_TO_MAIN"), false);
  assert.equal(phases.at(-1), "RUNNING_VALIDATION");
});

test("getAiFixPhaseOrder fix_and_merge code snippet ends at merge", () => {
  const phases = getAiFixPhaseOrder({
    mergeAction: "fix_and_merge",
    feedbackSource: "CODE_SNIPPET",
  });
  assert.deepEqual(phases.slice(-1), ["MERGING_TO_MAIN"]);
  assert.equal(phases.includes("DEPLOYING"), false);
});

test("getAiFixPhaseOrder bulk snippet uses pull request step", () => {
  const phases = getAiFixPhaseOrder({
    mergeAction: "fix_and_merge",
    feedbackSource: "CODE_SNIPPET",
    isBulkBatch: true,
  });
  assert.deepEqual(phases.slice(-1), ["CREATING_PULL_REQUEST"]);
});

test("getAiFixPhaseOrder fix_merge_deploy code snippet includes deploy", () => {
  const phases = getAiFixPhaseOrder({
    mergeAction: "fix_merge_deploy",
    feedbackSource: "CODE_SNIPPET",
  });
  assert.deepEqual(phases.slice(-2), ["MERGING_TO_MAIN", "DEPLOYING"]);
});

test("getAiFixPhaseOrder client link uses merge not PR", () => {
  const phases = getAiFixPhaseOrder({
    mergeAction: "fix_and_merge",
    feedbackSource: "CLIENT_LINK",
  });
  assert.deepEqual(phases.slice(-1), ["MERGING_TO_MAIN"]);
  assert.equal(phases.includes("CREATING_PULL_REQUEST"), false);
});

test("getAiFixPhaseOrder client link fix_merge_deploy adds deploy", () => {
  const phases = getAiFixPhaseOrder({
    mergeAction: "fix_merge_deploy",
    feedbackSource: "CLIENT_LINK",
  });
  assert.deepEqual(phases.slice(-2), ["MERGING_TO_MAIN", "DEPLOYING"]);
});

test("resolveTimelinePhaseIndex maps PR during fix_only to last agent phase", () => {
  const visible = getAiFixPhaseOrder({
    mergeAction: "fix_only",
    feedbackSource: "CODE_SNIPPET",
  });
  const idx = resolveTimelinePhaseIndex("CREATING_PULL_REQUEST", visible);
  assert.equal(idx, visible.length - 1);
});

test("formatAiFixBranchBrowseUrl builds GitHub tree links", () => {
  assert.equal(
    formatAiFixBranchBrowseUrl({
      repositoryUrl: "https://github.com/acme/app",
      branchName: "cursor/fix-button-abc123",
    }),
    "https://github.com/acme/app/tree/cursor%2Ffix-button-abc123",
  );
});

test("formatAiFixBranchBrowseUrl builds Bitbucket branch links", () => {
  assert.equal(
    formatAiFixBranchBrowseUrl({
      repositoryUrl: "https://bitbucket.org/acme/app/",
      branchName: "cursor/fix-only",
    }),
    "https://bitbucket.org/acme/app/branch/cursor%2Ffix-only",
  );
});

test("formatAiFixBranchBrowseUrl falls back to sourceBranch", () => {
  assert.equal(
    formatAiFixBranchBrowseUrl({
      repositoryUrl: "https://github.com/acme/app",
      sourceBranch: "cursor/from-source",
    }),
    "https://github.com/acme/app/tree/cursor%2Ffrom-source",
  );
});

test("formatAiFixCommitBrowseUrl builds GitHub commit links", () => {
  assert.equal(
    formatAiFixCommitBrowseUrl({
      repositoryUrl: "https://github.com/acme/app",
      commitHash: "086e094abc",
    }),
    "https://github.com/acme/app/commit/086e094abc",
  );
});

test("formatAiFixCommitBrowseUrl builds Bitbucket commit links", () => {
  assert.equal(
    formatAiFixCommitBrowseUrl({
      repositoryUrl: "https://bitbucket.org/acme/app/",
      commitHash: "086e094abc",
    }),
    "https://bitbucket.org/acme/app/commit/086e094abc",
  );
});

test("SENTRY fixes honor the chosen merge action like other dev-repo sources", () => {
  assert.equal(
    getAiFixPhaseOrder({ mergeAction: "fix_only", feedbackSource: "SENTRY" }).at(-1),
    "CREATING_PULL_REQUEST",
  );
  const merged = getAiFixPhaseOrder({ mergeAction: "fix_merge_deploy", feedbackSource: "SENTRY" });
  assert.equal(merged.includes("MERGING_TO_MAIN"), true);
  assert.equal(merged.at(-1), "DEPLOYING");
  assert.equal(
    resolveAiFixMergeAction({
      feedbackSource: "SENTRY",
      metadata: { aiFixOptions: { mergeAction: "fix_and_merge" } },
    }),
    "fix_and_merge",
  );
});

test("SENTRY is a dev-repo feedback source", () => {
  assert.equal(isDevRepoFeedbackSource("SENTRY"), true);
  assert.equal(isDevRepoFeedbackSource("QA_REPORT"), true);
  assert.equal(isDevRepoFeedbackSource("VISUAL_TEST"), true);
  assert.equal(isDevRepoFeedbackSource("CLIENT_LINK"), false);
});

test("formatSentryImportSummary describes the import result", () => {
  assert.equal(formatSentryImportSummary({ fetched: 0 }), "No unresolved Sentry issues to import.");
  assert.equal(
    formatSentryImportSummary({
      fetched: 5,
      created: 1,
      alreadyImported: 2,
      skipped: 1,
      failed: 1,
    }),
    "Imported 1 Sentry issue, 2 already imported, 1 below the minimum level, 1 failed (see server logs).",
  );
});

test("formatFeedbackAiFixFailureMessage uses aiFixError when present", () => {
  assert.equal(formatFeedbackAiFixFailureMessage("Branch not found", "FAILED"), "Branch not found");
  assert.match(formatFeedbackAiFixFailureMessage("", "FAILED"), /No detailed error/);
  assert.match(formatFeedbackAiFixFailureMessage(null, "CANCELLED"), /cancelled/i);
});

test("isFeedbackAiFixDeployed uses production last deploy for fix_and_merge", () => {
  const envs = [{ id: "production", deployment: { deployedAt: "2026-10-22T08:05:18.290Z" } }];
  assert.equal(
    isFeedbackAiFixDeployed(
      {
        aiFixStatus: "COMPLETED",
        aiFixResult: {
          mergeAction: "fix_and_merge",
          completedAt: "2026-10-22T05:27:32.801Z",
        },
      },
      envs,
    ),
    true,
  );
});

test("isFeedbackAiFixDeployed compares production deployedAt to fix completedAt", () => {
  const envs = [{ id: "production", deployment: { deployedAt: "2026-06-02T12:00:00.000Z" } }];
  assert.equal(
    isFeedbackAiFixDeployed(
      {
        aiFixStatus: "COMPLETED",
        aiFixResult: { completedAt: "2026-06-01T10:00:00.000Z" },
      },
      envs,
    ),
    true,
  );
  assert.equal(
    isFeedbackAiFixDeployed(
      {
        aiFixStatus: "COMPLETED",
        aiFixResult: { completedAt: "2026-06-03T10:00:00.000Z" },
      },
      envs,
    ),
    false,
  );
});

test("resolveSentryIssueInfo prefers the list link summary over metadata", () => {
  assert.equal(resolveSentryIssueInfo({ feedbackSource: "QA_REPORT" }), null);
  const info = resolveSentryIssueInfo({
    feedbackSource: "SENTRY",
    sentryIssue: { shortId: "WEB-12", permalink: "https://acme.sentry.io/issues/1/" },
    metadata: { shortId: "OLD-1", level: "error" },
  });
  assert.equal(info.shortId, "WEB-12");
  assert.equal(info.permalink, "https://acme.sentry.io/issues/1/");
  assert.equal(info.level, "error");
});
