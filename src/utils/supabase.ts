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
  BROWSER_SESSION_VALUE,
  SESSION_SCOPE_COOKIE,
} from "~/features/auth/session-scope";
import { getAppUrl } from "./app-url";

/** Auth cookies are only ever sent over HTTPS when the app is served on it. */
function useSecureCookies() {
  return getAppUrl().startsWith("https://");
}

/**
 * Records whether this browser's session should end when the browser closes.
 * Written on every sign-in so the choice always matches the latest one.
 */
export function setSessionScope(sessionOnly: boolean) {
  if (sessionOnly) {
    setCookie(SESSION_SCOPE_COOKIE, BROWSER_SESSION_VALUE, {
      path: "/",
      sameSite: "lax",
      secure: useSecureCookies(),
    });
  } else {
    deleteCookie(SESSION_SCOPE_COOKIE, { path: "/" });
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
 * Ends a session when the browser closes, whatever was chosen at sign-in, and
 * rewrites the cookies already issued in this request so they stop being
 * persistent straight away. A no-op once the marker is in place.
 *
 * Internal roles (staff, supervisor, cashier, admin) can see every applicant's
 * records, so "keep me signed in" is not theirs to opt into.
 */
export async function limitSessionToBrowser(supabase: SupabaseClient) {
  const scope = clientScopes.get(supabase);
  if (!scope || scope.sessionOnly) return;

  scope.sessionOnly = true;
  setSessionScope(true);

  const { data } = await supabase.auth.getSession();
  if (!data.session) return;
  // Re-saving the session is what makes the client write the cookies again,
  // this time through the browser-only policy.
  await supabase.auth.setSession({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });
}

/**
 * @param options.sessionOnly Overrides the stored choice. Needed at sign-in,
 *   where the cookies are written in the same request that carries the choice,
 *   before the marker cookie could have been read back.
 */
export function getSupabaseServerClient(options?: { sessionOnly?: boolean }) {
  const scope = {
    sessionOnly:
      options?.sessionOnly ??
      getCookie(SESSION_SCOPE_COOKIE) === BROWSER_SESSION_VALUE,
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
