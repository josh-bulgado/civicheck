import { trackBackendRequest } from "~/lib/backend-activity";
import type { AuditEventsResult, AuditFilters } from "./system-admin.types";

export const AUDIT_CACHE_TTL_MS = 30_000;
export const AUDIT_CACHE_RETENTION_MS = 5 * 60_000;
const MAX_ENTRIES = 20;

type Entry = {
  promise: Promise<AuditEventsResult>;
  data?: AuditEventsResult;
  expiresAt: number;
  retainUntil: number;
  pending: boolean;
};

// Like the applicant service cache, this shares in-flight reads and serves warm
// results synchronously. Audit metadata stays in this tab's memory only.
const entries = new Map<string, Entry>();
let owner: string | null = null;

export function auditEventsCacheKey(userId: string, filters: AuditFilters) {
  return JSON.stringify([
    userId,
    filters.q?.trim() || "",
    filters.actor?.trim() || "",
    filters.event?.trim() || "",
    filters.source ?? "all",
    filters.from || "",
    filters.to || "",
    filters.account || "",
  ]);
}

export function peekAuditEvents(
  userId: string,
  filters: AuditFilters,
  { allowStale = false } = {},
) {
  if (typeof window === "undefined" || owner !== userId) return undefined;
  const entry = entries.get(auditEventsCacheKey(userId, filters));
  return entry &&
    (allowStale ? entry.retainUntil : entry.expiresAt) > Date.now()
    ? entry.data
    : undefined;
}

export function readAuditEvents(
  userId: string,
  filters: AuditFilters,
  load: () => Promise<AuditEventsResult>,
): Promise<AuditEventsResult> {
  // Never share one session's metadata between server-rendered requests.
  if (typeof window === "undefined") return load();
  if (owner !== userId) {
    clearAuditEventsCache();
    owner = userId;
  }

  const key = auditEventsCacheKey(userId, filters);
  const hit = entries.get(key);
  if (hit && (hit.pending || hit.expiresAt > Date.now())) return hit.promise;
  const stale = hit && hit.retainUntil > Date.now() ? hit : undefined;

  for (const [entryKey, entry] of entries) {
    if (!entry.pending && entry.retainUntil <= Date.now())
      entries.delete(entryKey);
  }
  if (entries.size >= MAX_ENTRIES) entries.delete(entries.keys().next().value!);

  const promise = trackBackendRequest(Promise.resolve().then(load))
    .then((data) => {
      const current = entries.get(key);
      // An invalidation or account change may have superseded this request.
      if (current?.promise === promise) {
        current.data = data;
        current.expiresAt = Date.now() + AUDIT_CACHE_TTL_MS;
        current.retainUntil = Date.now() + AUDIT_CACHE_RETENTION_MS;
        current.pending = false;
      }
      return data;
    })
    .catch((error) => {
      if (entries.get(key)?.promise === promise) {
        // A failed background refresh must not erase the last known rows.
        if (stale?.data && stale.retainUntil > Date.now()) {
          entries.set(key, {
            ...stale,
            promise: Promise.resolve(stale.data),
            expiresAt: 0,
            pending: false,
          });
        } else entries.delete(key);
      }
      throw error;
    });

  entries.set(key, {
    promise,
    data: stale?.data,
    expiresAt: 0,
    retainUntil: stale?.retainUntil ?? 0,
    pending: true,
  });
  return promise;
}

/** Keep rows available for immediate display, but require a background refresh. */
export function invalidateAuditEventsCache() {
  for (const [key, entry] of entries) {
    if (entry.data && entry.retainUntil > Date.now()) {
      entries.set(key, {
        ...entry,
        promise: Promise.resolve(entry.data),
        expiresAt: 0,
        pending: false,
      });
    } else entries.delete(key);
  }
}

/** Drop all protected metadata on identity changes. */
export function clearAuditEventsCache() {
  entries.clear();
  owner = null;
}
