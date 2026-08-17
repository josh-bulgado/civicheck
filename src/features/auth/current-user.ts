// ─── Client-side cache for the signed-in user ────────────────────────────────
//
// The root route's `beforeLoad` resolves the current user, and `beforeLoad` runs
// again on *every* navigation. Resolving costs two sequential network hops —
// `supabase.auth.getUser()` (which calls the Supabase Auth API to verify the
// JWT) and then a `profiles` lookup for the role and display details — and on
// client-side navigations the whole thing is wrapped in a server-function round
// trip on top. That sat on the critical path of every single page change, which
// is most of why moving around the app felt like the database was slow.
//
// Identity changes rarely and only at known moments, so it is cached here and
// cleared explicitly at those moments (see `clearCurrentUser` callers: sign in,
// sign out, sign up, password reset, invitation acceptance, profile edits). The
// short TTL is a backstop, not the primary mechanism — it bounds how long a
// change made somewhere that forgot to clear could linger.

import type { AccountProfile } from "~/features/account/account.types";

type CurrentUser = AccountProfile | null;

const TTL_MS = 30_000;

let entry: { promise: Promise<CurrentUser>; expiresAt: number } | null = null;

/**
 * Resolve the current user, reusing the cached result when it is still fresh.
 *
 * Caching is client-only and deliberately so: on the server each request
 * carries its own session cookies, and a module-level cache is shared by every
 * request the process handles — caching there would serve one visitor another
 * visitor's identity. The server path always calls straight through.
 */
export function loadCurrentUser(
  fetchUser: () => Promise<CurrentUser>,
): Promise<CurrentUser> {
  if (typeof window === "undefined") return fetchUser();

  const hit = entry;
  if (hit && hit.expiresAt > Date.now()) return hit.promise;

  // Holding the promise rather than the resolved value means a burst of
  // navigations on a cold cache shares one request instead of racing.
  const promise = fetchUser().catch((error) => {
    // A failed lookup must never stick, or the app stays signed out until the
    // TTL runs down.
    if (entry?.promise === promise) entry = null;
    throw error;
  });

  entry = { promise, expiresAt: Date.now() + TTL_MS };
  return promise;
}

/**
 * Drop the cached identity. Call this *before* `router.invalidate()` anywhere
 * the session or the user's own profile changes, so the reload that follows
 * reads fresh data instead of replaying the copy taken before the change.
 */
export function clearCurrentUser(): void {
  entry = null;
}
