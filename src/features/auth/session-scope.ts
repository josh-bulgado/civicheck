import type { CookieOptions } from "@supabase/ssr";

// "Keep me signed in" is a cookie-lifetime decision. Supabase writes its auth
// cookies with a ~400 day Max-Age, which is far too long for a portal holding
// civil registry records. Two policies replace it:
//
//   - browser-only (the default): no Max-Age at all, so the browser drops the
//     auth cookies when it closes.
//   - persistent (opt-in): Max-Age capped at PERSISTENT_SESSION_MAX_AGE_SECONDS.
//     Cookies are rewritten on every token refresh, so the cap works as an idle
//     timeout rather than an absolute one.
//
// Each refresh, from the server client and from the browser client, would put
// the long Max-Age straight back, so the policy is kept in a marker cookie that
// both clients read on every write. The default is the strict one: a missing,
// cleared or unrecognised marker means browser-only, so anything that opens a
// session without going through the login form fails closed.
//
// The marker only decides how long the browser keeps its own cookies. It is
// never an authorization input — the session's validity is Supabase's.
export const SESSION_SCOPE_COOKIE = "civicheck-session-scope";

/** The only value that asks for a session to outlive the browser. */
export const PERSISTENT_SESSION_VALUE = "persistent";

// Internal roles are held to browser-only whatever the marker says. The server
// cannot read a cookie's Max-Age back, so "these cookies were rewritten" is
// recorded as `enforced.<session id>`: a marker tied to one session, which a
// stale or copied value from another session cannot satisfy.
const ENFORCED_PREFIX = "enforced.";

export const PERSISTENT_SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export function isPersistentScope(markerValue: string | null | undefined) {
  return markerValue === PERSISTENT_SESSION_VALUE;
}

export function enforcedScopeValue(sessionKey: string) {
  return `${ENFORCED_PREFIX}${sessionKey}`;
}

/** Options for the marker while a session is persistent: same cap as the auth cookies. */
export function persistentMarkerOptions(secure: boolean): CookieOptions {
  return {
    path: "/",
    sameSite: "lax",
    maxAge: PERSISTENT_SESSION_MAX_AGE_SECONDS,
    secure,
  };
}

/** True for a cookie being deleted rather than set. */
export function isRemoval(options: CookieOptions) {
  return options.maxAge !== undefined && options.maxAge <= 0;
}

/**
 * Applies the session policy to the options of an auth cookie about to be
 * written. Removals (`maxAge: 0`) always pass through with their lifetime
 * intact — they have to expire — and a cookie that was never persistent is not
 * made persistent.
 */
export function applyCookiePolicy(
  options: CookieOptions,
  policy: { sessionOnly: boolean; secure: boolean },
): CookieOptions {
  const next: CookieOptions = { ...options };
  if (policy.secure) next.secure = true;

  if (isRemoval(next)) return next;

  if (policy.sessionOnly) {
    delete next.maxAge;
    delete next.expires;
  } else if (next.maxAge !== undefined) {
    next.maxAge = Math.min(next.maxAge, PERSISTENT_SESSION_MAX_AGE_SECONDS);
  }
  return next;
}
