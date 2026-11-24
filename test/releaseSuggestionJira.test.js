import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildJiraRequestParams,
  extractJiraTicketsFromResponse,
  mergeJiraTicketPages,
  normalizeJiraTicketsPage,
} from "../src/utils/releaseSuggestionJira.js";

describe("releaseSuggestionJira pagination helpers", () => {
  it("extractJiraTicketsFromResponse accepts array or paginated envelope", () => {
    assert.deepEqual(extractJiraTicketsFromResponse([{ key: "A-1" }]), [{ key: "A-1" }]);
    assert.deepEqual(extractJiraTicketsFromResponse({ issues: [{ key: "B-2" }] }), [
      { key: "B-2" },
    ]);
  });

  it("normalizeJiraTicketsPage reads cursor fields", () => {
    const page = normalizeJiraTicketsPage({
      issues: [{ key: "X-1" }],
      nextCursor: "token-abc",
      hasMore: true,
      projectKey: "TEST",
    });
    assert.equal(page.issues.length, 1);
    assert.equal(page.nextCursor, "token-abc");
    assert.equal(page.hasMore, true);
    assert.equal(page.projectKey, "TEST");
  });

  it("mergeJiraTicketPages dedupes by key", () => {
    const merged = mergeJiraTicketPages(
      [{ key: "A-1", summary: "first" }],
      [
        { key: "A-1", summary: "updated" },
        { key: "A-2", summary: "new" },
      ],
    );
    assert.equal(merged.length, 2);
    assert.equal(merged.find((r) => r.key === "A-1").summary, "updated");
  });

  it("buildJiraRequestParams includes limit and cursor", () => {
    const params = buildJiraRequestParams({
      includeEpic: true,
      includeStory: false,
      includeTask: true,
      summarySearch: "foo",
      limit: 50,
      cursor: "next-token",
    });
    assert.equal(params.types, "Epic,Task");
    assert.equal(params.search, "foo");
    assert.equal(params.limit, 50);
    assert.equal(params.cursor, "next-token");
  });
});
