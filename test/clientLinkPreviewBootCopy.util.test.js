import test from "node:test";
import assert from "node:assert/strict";

/**
 * Boot status copy rules for Client Link (mirrors ClientLink ensure loop).
 * Installing… only when install is actually running.
 */
export function resolvePreviewBootStatusMessage(st) {
  if (!st || typeof st !== "object") return "Starting preview…";
  if (st.status === "installing" || st.installRunning) {
    return "Installing dependencies…";
  }
  if (st.status === "starting" || st.status === "restarting") {
    return "Starting preview…";
  }
  return "Starting preview…";
}

test("boot copy shows Installing only when installRunning or status installing", () => {
  assert.equal(
    resolvePreviewBootStatusMessage({ status: "installing", installRunning: false }),
    "Installing dependencies…",
  );
  assert.equal(
    resolvePreviewBootStatusMessage({ status: "starting", installRunning: true }),
    "Installing dependencies…",
  );
  assert.equal(
    resolvePreviewBootStatusMessage({ status: "starting", installRunning: false }),
    "Starting preview…",
  );
  assert.equal(
    resolvePreviewBootStatusMessage({ status: "running", installRunning: false }),
    "Starting preview…",
  );
});
