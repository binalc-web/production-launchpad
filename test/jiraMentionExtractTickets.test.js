import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { extractJiraTicketsFromResponse } from "../src/lib/jira-mention/extractTickets.js";

describe("jira-mention extractTickets", () => {
  it("reads issues from paginated API envelope", () => {
    const rows = extractJiraTicketsFromResponse({
      issues: [{ key: "TEST-5", summary: "Story" }],
      nextCursor: null,
      hasMore: false,
      projectKey: "TEST",
    });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].key, "TEST-5");
  });

  it("still accepts legacy array responses", () => {
    assert.deepEqual(extractJiraTicketsFromResponse([{ key: "A-1" }]), [{ key: "A-1" }]);
  });
});
