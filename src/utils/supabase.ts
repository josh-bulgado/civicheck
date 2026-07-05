import { getCookies, setCookie } from "@tanstack/react-start/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

export function getSupabaseServerClient() {
  return createServerClient(
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
        setAll(cookies: any) {
          cookies.forEach((cookie: any) => {
            setCookie(cookie.name, cookie.value);
          });
        },
      },
    },
  );
}

export function getSupabaseAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not defined in the environment variables");
  }
  return createClient(process.env.SUPABASE_URL!, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

