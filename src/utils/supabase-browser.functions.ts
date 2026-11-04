import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { requireActiveSession } from "~/server/auth";

export const getSupabaseBrowserConfig = createServerFn({ method: "GET" }).handler(async () => ({
  url: process.env.SUPABASE_URL!, publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY!,
}));

/** Browser services need an access token, never the HttpOnly refresh token. */
export const getSupabaseBrowserAccessToken = createServerFn({ method: "GET" }).handler(async () => {
  setResponseHeader("Cache-Control", "private, no-store");
  try {
    const { supabase } = await requireActiveSession();
    const { data, error } = await supabase.auth.getSession();
    return error ? null : data.session?.access_token ?? null;
  } catch { return null; }
});
