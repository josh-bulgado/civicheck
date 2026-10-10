import type { CookieOptions } from "@supabase/ssr";

// "Keep me signed in" is a cookie-lifetime decision. Supabase writes its auth
// cookies with a ~400 day Max-Age, which is far too long for a portal holding
// civil registry records. Two rules replace it:
//
//   - persistent session: Max-Age is capped at PERSISTENT_SESSION_MAX_AGE_SECONDS.
//     Cookies are rewritten on every token refresh, so the cap works as an idle
//     timeout rather than an absolute one.
//   - browser-only session: no Max-Age at all, so the browser drops the cookies
//     when it closes. Always used for internal (staff/admin) roles.
//
// Each refresh, from the server client and from the browser client, would put
// the long Max-Age straight back, so the choice is kept in this marker cookie
// and both clients apply it on every write. The marker is itself a session
// cookie and only exists while the session is browser-only.
export const SESSION_SCOPE_COOKIE = "civicheck-session-scope";
export const BROWSER_SESSION_VALUE = "browser";

export const PERSISTENT_SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

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

  const isRemoval = next.maxAge !== undefined && next.maxAge <= 0;
  if (isRemoval) return next;

  if (policy.sessionOnly) {
    delete next.maxAge;
    delete next.expires;
  } else if (next.maxAge !== undefined) {
    next.maxAge = Math.min(next.maxAge, PERSISTENT_SESSION_MAX_AGE_SECONDS);
  }
  return next;
}
