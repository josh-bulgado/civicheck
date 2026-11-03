import type { AnyRouter } from "@tanstack/react-router";
import { clearCurrentUser } from "./current-user";

/**
 * Call when a different session takes over this tab — password sign-in, a
 * verified sign-up, an accepted invitation — before the `router.invalidate()`
 * that follows.
 *
 * `clearCurrentUser` only forgets who is signed in. The router keeps its own
 * copy of every page's loader data, keyed by route and not by account, and holds
 * on to it after you leave the page. `router.invalidate()` marks those copies
 * stale rather than dropping them, and a stale copy is painted first while the
 * loader reruns behind it. So the next account to sign in on this tab sees the
 * previous account's dashboard — the "completed request" layout, say, on an
 * account with no requests — until their own data arrives.
 *
 * Clearing the cache makes the first paint a loading state instead. It also
 * aborts any preload still in flight for the old account, so a late response
 * cannot refill what was just emptied.
 */
export function startFreshSession(router: AnyRouter): void {
  clearCurrentUser();
  router.clearCache();
}
