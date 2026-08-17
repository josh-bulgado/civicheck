// ─── Client-side read cache for service + requirement data ───────────────────
// Service definitions and their requirement checklists are written rarely (only
// an admin edits them) but read constantly — every requirements popup, every
// checklist panel, every browse of the services directory asks Supabase for the
// same rows again. This keeps one in-memory copy per key so repeat views are
// served locally instead of re-querying.
//
// Entries hold the in-flight promise rather than the resolved value, so several
// components asking for the same service at the same moment share one request
// instead of racing. The resolved value is stashed alongside it so a caller can
// read a warm entry synchronously (`peekServiceCache`) and skip the loading
// state entirely.
//
// Only client components read through here — route loaders use TanStack
// Router's own `staleTime` instead — so this map fills up in the browser and
// stays empty on the server.

const DEFAULT_TTL_MS = 5 * 60 * 1000;

interface CacheEntry<T> {
  promise: Promise<T>;
  /** Set once the promise settles, for synchronous cache hits. */
  resolved?: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

/** Cache keys, kept in one place so reads and invalidations can't drift apart. */
export const serviceCacheKeys = {
  /** One card's full detail: its case(s) plus their checklist. */
  overview: (codeOrGroup: string) => `service:overview:${codeOrGroup}`,
  /** A single service's requirement checklist. */
  checklist: (serviceCode: string, requirementGroup: string | null) =>
    `service:checklist:${serviceCode}:${requirementGroup ?? ""}`,
  /** The whole registry with every requirement, for the public listing. */
  allWithRequirements: () => "service:all-with-requirements",
};

/**
 * Read through the cache: return the live entry when it's still fresh,
 * otherwise run `loader` and cache what it returns.
 */
export function cachedServiceRead<T>(
  key: string,
  loader: () => Promise<T>,
  ttlMs: number = DEFAULT_TTL_MS,
): Promise<T> {
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) {
    return hit.promise as Promise<T>;
  }

  const promise = loader()
    .then((data) => {
      // Only fill in the value if this request still owns the slot — an
      // invalidation may have replaced or dropped it while we were waiting.
      const current = cache.get(key);
      if (current?.promise === promise) current.resolved = data;
      return data;
    })
    .catch((error) => {
      // A failed load must never be cached, or every retry replays the failure
      // until the TTL runs out.
      if (cache.get(key)?.promise === promise) cache.delete(key);
      throw error;
    });

  cache.set(key, { promise, expiresAt: Date.now() + ttlMs });
  return promise;
}

/**
 * Synchronously read an already-resolved entry, or `undefined` when the key is
 * missing, expired, or still loading. Lets a component paint cached data on
 * first render instead of flashing a skeleton it doesn't need.
 */
export function peekServiceCache<T>(key: string): T | undefined {
  const hit = cache.get(key);
  if (!hit || hit.expiresAt <= Date.now()) return undefined;
  return hit.resolved as T | undefined;
}

/**
 * Drop cached reads. Admin mutations call this with no argument after editing a
 * service or its checklist, so the next read reflects the change immediately
 * instead of waiting out the TTL.
 */
export function invalidateServiceCache(key?: string): void {
  if (key === undefined) {
    cache.clear();
    return;
  }
  cache.delete(key);
}
