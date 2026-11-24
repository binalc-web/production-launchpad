import test from "node:test";
import assert from "node:assert/strict";
import {
  buildMarkNotificationsReadBody,
  runMarkNotificationsRead,
} from "../src/hooks/notificationsMarkRead.util.js";

test("buildMarkNotificationsReadBody marks all", () => {
  assert.deepEqual(buildMarkNotificationsReadBody(true), { all: true });
  assert.deepEqual(buildMarkNotificationsReadBody({ all: true }), { all: true });
});

test("buildMarkNotificationsReadBody wraps ids", () => {
  assert.deepEqual(buildMarkNotificationsReadBody(["a", "b"]), { ids: ["a", "b"] });
  assert.deepEqual(buildMarkNotificationsReadBody("n1"), { ids: ["n1"] });
});

test("runMarkNotificationsRead returns data on success", async () => {
  const result = await runMarkNotificationsRead(async (body) => {
    assert.deepEqual(body, { all: true });
    return { unreadCount: 0 };
  }, true);
  assert.equal(result.ok, true);
  assert.deepEqual(result.data, { unreadCount: 0 });
});

test("runMarkNotificationsRead does not reject on Axios-like 401 (Sentry RND-LAUNCHPAD-FE-B)", async () => {
  const axios401 = Object.assign(new Error("Request failed with status code 401"), {
    name: "AxiosError",
    response: { status: 401 },
  });
  const result = await runMarkNotificationsRead(async () => {
    throw axios401;
  }, ["notif-1"]);
  assert.equal(result.ok, false);
  assert.equal(result.error, axios401);
  assert.deepEqual(result.body, { ids: ["notif-1"] });
});
