import { createBrowserClient } from "@supabase/ssr";
import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";

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

/**
 * Browser-side Supabase client, memoised for the tab. It reads the same auth
 * cookies the server client writes, so realtime subscriptions are evaluated
 * against the signed-in user's own RLS policies.
 */
export function getSupabaseBrowserClient(): Promise<SupabaseClient> {
  clientPromise ??= getSupabaseBrowserConfig().then(({ url, publishableKey }) => {
    const client = createBrowserClient(url, publishableKey);
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
