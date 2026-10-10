import { createBrowserClient, type CookieOptions } from "@supabase/ssr";
import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  applyCookiePolicy,
  BROWSER_SESSION_VALUE,
  SESSION_SCOPE_COOKIE,
} from "~/features/auth/session-scope";

/**
 * Hands the browser the two public Supabase values. Both are safe to expose —
 * the publishable key is the anon key and every table sits behind RLS — but
 * they live in unprefixed env vars, so Vite never inlines them into the client
 * bundle. Fetching them keeps deployment on one set of env vars instead of
 * duplicating each under a VITE_ alias.
 */
export const getSupabaseBrowserConfig = createServerFn({
  method: "GET",
}).handler(async () => ({
  url: process.env.SUPABASE_URL!,
  publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY!,
}));

let clientPromise: Promise<SupabaseClient> | null = null;

function readDocumentCookies() {
  if (typeof document === "undefined") return [];

  return document.cookie
    .split(";")
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const separator = pair.indexOf("=");
      const name = separator === -1 ? pair : pair.slice(0, separator);
      const raw = separator === -1 ? "" : pair.slice(separator + 1);
      try {
        return { name, value: decodeURIComponent(raw) };
      } catch {
        return { name, value: raw };
      }
    });
}

function writeDocumentCookie(
  name: string,
  value: string,
  options: CookieOptions,
) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  parts.push(`Path=${options.path ?? "/"}`);
  if (options.domain) parts.push(`Domain=${options.domain}`);
  if (options.maxAge !== undefined) {
    parts.push(`Max-Age=${Math.floor(options.maxAge)}`);
  }
  if (options.expires) parts.push(`Expires=${options.expires.toUTCString()}`);
  if (typeof options.sameSite === "string") {
    parts.push(`SameSite=${options.sameSite}`);
  }
  if (options.secure) parts.push("Secure");
  document.cookie = parts.join("; ");
}

/**
 * Browser-side Supabase client, memoised for the tab. It reads the same auth
 * cookies the server client writes, so realtime subscriptions are evaluated
 * against the signed-in user's own RLS policies.
 */
export function getSupabaseBrowserClient(): Promise<SupabaseClient> {
  clientPromise ??= getSupabaseBrowserConfig().then(({ url, publishableKey }) => {
    // Custom cookie handling only so a refreshed token keeps the session
    // policy (browser-only, or the capped lifetime) instead of reverting to
    // Supabase's ~400 day default.
    const client = createBrowserClient(url, publishableKey, {
      cookies: {
        getAll: readDocumentCookies,
        setAll(cookies) {
          if (typeof document === "undefined") return;
          const sessionOnly =
            readDocumentCookies().find(
              (cookie) => cookie.name === SESSION_SCOPE_COOKIE,
            )?.value === BROWSER_SESSION_VALUE;
          const secure = window.location.protocol === "https:";
          cookies.forEach(({ name, value, options }) =>
            writeDocumentCookie(
              name,
              value,
              applyCookiePolicy(options, { sessionOnly, secure }),
            ),
          );
        },
      },
    });
    // Realtime sockets don't auto-pick-up a refreshed access token; without
    // this, a long-lived subscription silently stops receiving RLS-filtered
    // rows once the token it was opened with expires (~1hr by default).
    client.auth.onAuthStateChange((event, session) => {
      if (event === "TOKEN_REFRESHED" && session) {
        client.realtime.setAuth(session.access_token);
      }
    });
    return client;
  });
  return clientPromise;
}
