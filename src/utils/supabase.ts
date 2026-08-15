import {
  getCookies,
  setCookie,
  setResponseHeader,
} from "@tanstack/react-start/server";
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
        setAll(cookies, headers) {
          cookies.forEach(({ name, value, options }) => {
            setCookie(name, value, options);
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
