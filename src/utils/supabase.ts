import {
  deleteCookie,
  getCookie,
  getCookies,
  setCookie,
  setResponseHeader,
} from "@tanstack/react-start/server";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  applyCookiePolicy,
  enforcedScopeValue,
  isPersistentScope,
  isRemoval,
  PERSISTENT_SESSION_VALUE,
  persistentMarkerOptions,
  SESSION_SCOPE_COOKIE,
} from "~/features/auth/session-scope";
import { getAppUrl } from "./app-url";

/** Auth cookies are only ever sent over HTTPS when the app is served on it. */
function useSecureCookies() {
  return getAppUrl().startsWith("https://");
}

/**
 * Records the session policy chosen at sign-in. Browser-only is the absence of
 * the marker, so choosing it just clears any marker left by an earlier session.
 */
export function setSessionScope(sessionOnly: boolean) {
  if (sessionOnly) {
    deleteCookie(SESSION_SCOPE_COOKIE, { path: "/" });
  } else {
    setCookie(
      SESSION_SCOPE_COOKIE,
      PERSISTENT_SESSION_VALUE,
      persistentMarkerOptions(useSecureCookies()),
    );
  }
}

/** Forgets the choice once the session it applied to is gone. */
export function clearSessionScope() {
  deleteCookie(SESSION_SCOPE_COOKIE, { path: "/" });
}

// The scope each server client writes cookies with. It lives beside the client
// rather than in a closure so it can be tightened mid-request, once a profile
// shows the session belongs to an internal role.
const clientScopes = new WeakMap<object, { sessionOnly: boolean }>();

/**
 * Holds an internal role's session to the browser's lifetime, whatever was
 * chosen at sign-in, by rewriting its auth cookies without a Max-Age.
 *
 * The marker is trusted only when it names this exact session, because the
 * server cannot see a cookie's lifetime and a bare "browser" value would be
 * satisfied by a cleared, stale or hand-written cookie. Anything else triggers
 * one rewrite, and the proof is recorded only once that rewrite has succeeded.
 *
 * Internal roles (staff, supervisor, cashier, admin) can see every applicant's
 * records, so "keep me signed in" is not theirs to opt into.
 *
 * @param sessionKey Identifies the session — its `session_id` claim.
 * @returns false when the rewrite failed and the session was ended instead, so
 *   the caller must treat the user as signed out.
 */
export async function limitSessionToBrowser(
  supabase: SupabaseClient,
  sessionKey: string,
): Promise<boolean> {
  const scope = clientScopes.get(supabase);
  const proof = enforcedScopeValue(sessionKey);
  if (!scope) return true;
  if (getCookie(SESSION_SCOPE_COOKIE) === proof) return true;

  scope.sessionOnly = true;

  const { data } = await supabase.auth.getSession();
  let failure: string | null = data.session ? null : "no session to rewrite";

  if (data.session) {
    // Re-saving the session is what makes the client write the cookies again,
    // this time through the browser-only policy.
    const { error } = await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
    failure = error?.message ?? null;
  }

  if (failure) {
    // Leaving long-lived cookies in place for a role that must not have them is
    // the worse outcome, so a failed rewrite ends the session instead.
    console.error("Could not restrict internal session to browser:", failure);
    await supabase.auth.signOut({ scope: "local" });
    clearSessionScope();
    return false;
  }

  setCookie(SESSION_SCOPE_COOKIE, proof, {
    path: "/",
    sameSite: "lax",
    secure: useSecureCookies(),
  });
  return true;
}

/**
 * @param options.sessionOnly Overrides the stored choice. Needed at sign-in,
 *   where the cookies are written in the same request that carries the choice,
 *   before the marker cookie could have been read back.
 */
export function getSupabaseServerClient(options?: { sessionOnly?: boolean }) {
  const scope = {
    // Fails closed: only an explicit persistent marker lengthens the session.
    sessionOnly:
      options?.sessionOnly ??
      !isPersistentScope(getCookie(SESSION_SCOPE_COOKIE)),
  };
  const secure = useSecureCookies();

  const client = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return Object.entries(getCookies()).map(([name, value]) => ({
            name,
            value,
          }));
        },
        setAll(cookies, headers) {
          cookies.forEach(({ name, value, options }) => {
            setCookie(
              name,
              value,
              applyCookiePolicy(options, {
                sessionOnly: scope.sessionOnly,
                secure,
              }),
            );
          });
          // The marker has to outlive the cookies it governs, so it is renewed
          // alongside them. Left to lapse it would quietly turn a persistent
          // session browser-only on the next refresh.
          if (
            !scope.sessionOnly &&
            cookies.some(({ options }) => !isRemoval(options))
          ) {
            setCookie(
              SESSION_SCOPE_COOKIE,
              PERSISTENT_SESSION_VALUE,
              persistentMarkerOptions(secure),
            );
          }
          const cacheControl = headers["Cache-Control"];
          const expires = headers.Expires;
          const pragma = headers.Pragma;

          if (cacheControl) setResponseHeader("Cache-Control", cacheControl);
          if (expires) setResponseHeader("Expires", expires);
          if (pragma) setResponseHeader("Pragma", pragma);
        },
      },
    },
  );

  clientScopes.set(client, scope);
  return client;
}

/**
 * Stateless anon client for one-off auth checks — e.g. confirming the current
 * password before changing it. It never touches the session cookies, so the
 * caller's live session is left exactly as it was.
 */
export function getSupabaseStatelessClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

export function getSupabaseAdminClient() {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not defined in the environment variables",
    );
  }
  return createClient(process.env.SUPABASE_URL!, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
