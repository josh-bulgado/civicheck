import { createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { getSupabaseServerClient } from "~/utils/supabase";

const handleCallback = createServerFn({ method: "GET" }).handler(async () => {
  const request = getRequest();
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (code) {
    const supabase = getSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("OAuth exchangeCodeForSession error:", error);
      const isJsonEmpty = error.message === "{}" || !error.message;
      const cleanMessage = isJsonEmpty 
        ? "An unexpected authentication server error occurred. Please check your SMTP / Auth settings in the Supabase Dashboard."
        : error.message;
      return { error: true, message: cleanMessage };
    }
  }

  return { error: false };
});

export const Route = createFileRoute("/auth/callback")({
  loader: async () => {
    const res = await handleCallback();
    if (res.error) {
      throw redirect({
        to: "/login",
        search: {
          error: res.message,
        },
      });
    }
    throw redirect({ to: "/dashboard" });
  },
});
