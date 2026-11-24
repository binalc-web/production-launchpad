import test from "node:test";
import assert from "node:assert/strict";
import { createTtlCache } from "../src/lib/ttlCache.js";

test("createTtlCache coalesces parallel loaders for the same key", async () => {
  const cache = createTtlCache({ ttlMs: 60_000 });
  let loads = 0;
  const loader = async () => {
    loads += 1;
    await new Promise((r) => setTimeout(r, 20));
    return { loads };
  };

  const [a, b, c] = await Promise.all([
    cache.getOrSet("k", loader),
    cache.getOrSet("k", loader),
    cache.getOrSet("k", loader),
  ]);

  assert.equal(loads, 1);
  assert.equal(a.loads, 1);
  assert.equal(b.loads, 1);
  assert.equal(c.loads, 1);
});

test("createTtlCache invalidate forces the next loader", async () => {
  const cache = createTtlCache({ ttlMs: 60_000 });
  await cache.getOrSet("x", async () => 1);
  cache.invalidate("x");
  const next = await cache.getOrSet("x", async () => 2);
  assert.equal(next, 2);
});
