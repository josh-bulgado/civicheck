import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseBrowserAccessToken, getSupabaseBrowserConfig } from "./supabase-browser.functions";

// Browser-only connection reuse. Refresh credentials remain in HttpOnly cookies
// and the server revalidates the active user before handing out an access token.
let clientPromise: Promise<SupabaseClient> | null = null;

export function getSupabaseBrowserClient(): Promise<SupabaseClient> {
  clientPromise ??= Promise.all([
    getSupabaseBrowserConfig(),
    import("@supabase/supabase-js"),
  ])
    .then(([{ url, publishableKey }, { createClient }]) =>
      createClient(url, publishableKey, {
        accessToken: getSupabaseBrowserAccessToken,
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      }),
    )
    .catch((error) => {
      clientPromise = null;
      throw error;
    });
  return clientPromise;
}
