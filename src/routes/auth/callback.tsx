import { createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { getSupabaseServerClient } from "~/utils/supabase";

const handleCallback = createServerFn({ method: "GET" }).handler(async () => {
  const request = getRequest();
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const next = url.searchParams.get("next");
  const supabase = getSupabaseServerClient();

  if (tokenHash && type === "invite") {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "invite",
    });
    if (error) {
      console.error("Invitation verification error:", error);
      return {
        error: true,
        message:
          error.message && error.message !== "{}"
            ? error.message
            : "This invitation is invalid or has expired.",
      };
    }
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("Auth code exchange error:", error);
      return {
        error: true,
        message:
          error.message && error.message !== "{}"
            ? error.message
            : "The authentication session could not be created.",
      };
    }
  } else {
    return {
      error: true,
      message: "This authentication link is invalid or has expired.",
    };
  }

  return {
    error: false,
    next: next === "/accept-invitation" ? next : "/dashboard",
  };
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
    throw redirect({
      to:
        res.next === "/accept-invitation"
          ? "/accept-invitation"
          : "/dashboard",
    });
  },
});
