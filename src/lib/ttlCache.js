/**
 * Browser-side TTL cache with in-flight coalescing.
 * Parallel callers for the same key share one `loader()`; hits skip the loader.
 */

/**
 * @param {{ ttlMs?: number, maxEntries?: number }} [opts]
 */
export function createTtlCache(opts = {}) {
  const ttlMs = Number.isFinite(opts.ttlMs) && opts.ttlMs > 0 ? opts.ttlMs : 5_000;
  const maxEntries =
    Number.isFinite(opts.maxEntries) && opts.maxEntries > 0 ? Math.floor(opts.maxEntries) : 200;

  /** @type {Map<string, { expiresAt: number, value: unknown }>} */
  const values = new Map();
  /** @type {Map<string, Promise<unknown>>} */
  const inflight = new Map();

  function pruneIfNeeded() {
    if (values.size <= maxEntries) return;
    const now = Date.now();
    for (const [key, entry] of values) {
      if (entry.expiresAt <= now) values.delete(key);
    }
    if (values.size <= maxEntries) return;
    const overflow = values.size - maxEntries;
    let removed = 0;
    for (const key of values.keys()) {
      values.delete(key);
      removed += 1;
      if (removed >= overflow) break;
    }
  }

  /**
   * @template T
   * @param {string} key
   * @param {() => Promise<T>} loader
   * @returns {Promise<T>}
   */
  async function getOrSet(key, loader) {
    const k = String(key);
    const now = Date.now();
    const hit = values.get(k);
    if (hit && hit.expiresAt > now) {
      return /** @type {T} */ (hit.value);
    }
    const pending = inflight.get(k);
    if (pending) return /** @type {Promise<T>} */ (pending);

    const promise = Promise.resolve()
      .then(() => loader())
      .then((value) => {
        values.set(k, { expiresAt: Date.now() + ttlMs, value });
        pruneIfNeeded();
        return value;
      })
      .finally(() => {
        if (inflight.get(k) === promise) inflight.delete(k);
      });

    inflight.set(k, promise);
    return /** @type {Promise<T>} */ (promise);
  }

  /** @param {string} key */
  function invalidate(key) {
    const k = String(key);
    values.delete(k);
    inflight.delete(k);
  }

  function clear() {
    values.clear();
    inflight.clear();
  }

  return {
    getOrSet,
    invalidate,
    clear,
    get size() {
      return values.size;
    },
    get inflightSize() {
      return inflight.size;
    },
  };
}
