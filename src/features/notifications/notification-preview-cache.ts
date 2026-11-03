import { useSyncExternalStore } from "react";
import {
  getNotificationPreviewFn,
  type NotificationRow,
} from "~/features/notifications/notifications.queries";

/**
 * Client-side cache behind the bell's popover.
 *
 * The preview used to ride along on every router invalidation (every realtime
 * event, every tab focus, every mark-read), whether or not anyone opened the
 * bell. Now it is fetched only when wanted, and then:
 *
 *  - served from memory while fresh (no request at all),
 *  - shown immediately while stale and revalidated behind the scenes,
 *  - shared, so a hover-prefetch and the open that follows are one request,
 *  - patched optimistically on read/mark-all, so those never need a refetch.
 *
 * Module state, not React state: it has to outlive the popover, which unmounts
 * on every close. It is only ever touched from the browser (handlers/effects),
 * never during server render, so users can't leak into each other.
 */

/** How long a fetched preview is trusted before the next open revalidates it. */
const FRESH_MS = 60_000;
/**
 * Our own write comes back as a realtime event. Within this window that echo is
 * ignored, otherwise every mark-read would immediately refetch what it just
 * patched.
 */
const ECHO_MS = 2_000;
/** After a failed fetch, automatic attempts wait this long. "Try again" doesn't. */
const RETRY_MS = 10_000;

export interface NotificationPreviewSnapshot {
  userId: string | null;
  /** `null` until the first load lands. */
  items: NotificationRow[] | null;
  /** A request is in flight (a first load, or a quiet revalidation). */
  loading: boolean;
  /** The last request failed; any cached `items` are kept and still shown. */
  failed: boolean;
  /** Something changed elsewhere since `items` were fetched. */
  stale: boolean;
}

const EMPTY: NotificationPreviewSnapshot = {
  userId: null,
  items: null,
  loading: false,
  failed: false,
  stale: false,
};

let snapshot = EMPTY;
let fetchedAt = 0;
let failedAt = 0;
let echoUntil = 0;
let inflight: Promise<void> | null = null;
/** Bumped to discard any response that was requested before a newer fact. */
let generation = 0;
const listeners = new Set<() => void>();

function publish(next: Partial<NotificationPreviewSnapshot>) {
  snapshot = { ...snapshot, ...next };
  for (const listener of listeners) listener();
}

/** Starts clean when a different person signs in on the same tab. */
function adopt(userId: string) {
  if (snapshot.userId === userId) return;
  generation += 1;
  inflight = null;
  fetchedAt = failedAt = echoUntil = 0;
  publish({ ...EMPTY, userId });
}

/**
 * Whatever is in flight was asked for before something we now know, so its
 * answer can't be trusted. Drop it and flag the cache for another look.
 */
function supersede() {
  generation += 1;
  if (inflight) {
    inflight = null;
    publish({ loading: false, stale: true });
  }
}

/**
 * Makes sure the preview is loaded and reasonably fresh. Cheap to call: it is a
 * no-op while the cache is fresh or a request is already running.
 */
export function ensureNotificationPreview(
  userId: string,
  { force = false }: { force?: boolean } = {},
): Promise<void> {
  adopt(userId);
  if (inflight) return inflight;

  const now = Date.now();
  const fresh = snapshot.items !== null && !snapshot.stale && now - fetchedAt < FRESH_MS;
  if (fresh && !force) return Promise.resolve();
  if (!force && snapshot.failed && now - failedAt < RETRY_MS) return Promise.resolve();

  const requested = generation;
  publish({ loading: true, failed: false });

  const request: Promise<void> = getNotificationPreviewFn()
    .then((items) => {
      if (generation !== requested) return;
      fetchedAt = Date.now();
      publish({ items, loading: false, failed: false, stale: false });
    })
    .catch(() => {
      if (generation !== requested) return;
      failedAt = Date.now();
      publish({ loading: false, failed: true });
    })
    .finally(() => {
      if (inflight === request) inflight = null;
    });
  inflight = request;
  return request;
}

/**
 * Something on the server changed (a realtime event, or a write made from the
 * full notifications page). Mark what we hold as stale; the next open — or the
 * open popover, right away — revalidates it.
 */
export function invalidateNotificationPreview() {
  if (Date.now() < echoUntil) return;
  supersede();
  publish({ stale: true });
}

/**
 * Applies a change to the cached rows straight away, then performs the server
 * write. On failure the rows roll back and the cache is flagged stale. A fetch
 * that started before or during the write would return pre-write rows, so both
 * are discarded rather than allowed to undo the change.
 */
export async function updateNotificationPreview(
  userId: string,
  patch: (items: NotificationRow[]) => NotificationRow[],
  write: () => Promise<boolean>,
): Promise<boolean> {
  adopt(userId);
  const before = snapshot.items;

  supersede();
  if (before) publish({ items: patch(before) });

  let ok: boolean;
  try {
    ok = await write();
  } catch {
    ok = false;
  }

  supersede();
  if (ok) {
    echoUntil = Date.now() + ECHO_MS;
  } else {
    publish({ items: before, stale: true });
  }
  return ok;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useNotificationPreview(): NotificationPreviewSnapshot {
  return useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => EMPTY,
  );
}
