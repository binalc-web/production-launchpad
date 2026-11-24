import test from "node:test";
import assert from "node:assert/strict";
import { formatAgentTurnElapsed } from "../src/lib/clientLinkAgentTurnTimer.js";

test("formatAgentTurnElapsed renders mm:ss", () => {
  assert.equal(formatAgentTurnElapsed(0), "0:00");
  assert.equal(formatAgentTurnElapsed(8000), "0:08");
  assert.equal(formatAgentTurnElapsed(65000), "1:05");
});
