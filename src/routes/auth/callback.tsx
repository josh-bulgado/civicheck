import { createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { getSupabaseServerClient } from "~/utils/supabase";

const OTP_TYPES = ["invite", "signup", "recovery", "email", "email_change"] as const;

const FALLBACK_MESSAGES: Record<(typeof OTP_TYPES)[number], string> = {
  invite: "This invitation is invalid or has expired.",
  signup: "This verification link is invalid or has expired.",
  recovery: "This password reset link is invalid or has expired.",
  email: "This authentication link is invalid or has expired.",
  email_change: "This email change link is invalid or has expired.",
};

function parseOtpType(value: string | null) {
  return OTP_TYPES.find((type) => type === value);
}

const handleCallback = createServerFn({ method: "GET" }).handler(async () => {
  const request = getRequest();
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const otpType = parseOtpType(url.searchParams.get("type"));
  const next = url.searchParams.get("next");
  const supabase = getSupabaseServerClient();

  if (tokenHash && otpType) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: otpType,
    });
    if (error) {
      console.error(`Auth ${otpType} verification error:`, error);
      return {
        error: true,
        message:
          error.message && error.message !== "{}"
            ? error.message
            : FALLBACK_MESSAGES[otpType],
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
    next,
  };
});

export const Route = createFileRoute("/auth/callback")({
  // This loader consumes a single-use OTP / auth code. Nothing links to it
  // today, but preloading it on hover would silently spend the token, so it is
  // opted out explicitly rather than by convention.
  preload: false,
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
    if (res.next === "/accept-invitation") {
      throw redirect({ to: "/accept-invitation" });
    }
    if (res.next === "/reset-password") {
      throw redirect({ to: "/reset-password" });
    }
    throw redirect({ to: "/dashboard" });
  },
});
