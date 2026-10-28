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
import { clearFileCache } from "~/lib/file-preview-cache";
import { clearAuditEventsCache } from "~/features/system-admin/audit-events.cache";
import type { Role } from "~/lib/permissions";

type CurrentUser = AccountProfile | null;

const TTL_MS = 30_000;

let entry: { promise: Promise<CurrentUser>; expiresAt: number } | null = null;

/**
 * Who the page being loaded is for, known before the identity has finished
 * loading: a fresh sign-in already knows its own account, but the lookup behind
 * the first page still takes a round trip. A loading frame reads this so it can
 * be drawn for the right kind of account from its first paint, instead of a
 * neutral placeholder that is swapped for it. A hint, never an authorization
 * input: nothing is shown or allowed because of it.
 */
export type IdentityHint = { id: string | null; role: Role };

// Client-only, like the cache: on the server a module-level value is shared by
// every request the process handles.
let hint: IdentityHint | null = null;

export function hintCurrentUser(next: IdentityHint): void {
  if (typeof window !== "undefined") hint = next;
}

export function peekCurrentUser(): IdentityHint | null {
  return typeof window === "undefined" ? null : hint;
}

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
  // Registered before the caller's own wait, so the hint is already the real
  // identity by the time the page that needed it starts loading.
  void promise.then(
    (user) => {
      if (entry?.promise === promise) {
        hint = user ? { id: user.id, role: user.role } : null;
      }
    },
    () => {},
  );
  return promise;
}

/**
 * Drop the cached identity. Call this *before* `router.invalidate()` anywhere
 * the session or the user's own profile changes, so the reload that follows
 * reads fresh data instead of replaying the copy taken before the change.
 */
export function clearCurrentUser(): void {
  entry = null;
  hint = null;
  // Documents and audit metadata belong to the signed-in account. They must
  // not outlive that identity in this tab.
  clearFileCache();
  clearAuditEventsCache();
}
