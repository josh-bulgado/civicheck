import { redirect, createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getSupabaseServerClient } from "../utils/supabase";

const logoutFn = createServerFn({ method: "POST" }).handler(async () => {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    // Best effort: clearing the session cookie is what matters, so send the
    // user to sign-in either way instead of stranding them on a blank route.
    console.error("Sign out error:", error);
  }

  throw redirect({
    to: "/login",
  });
});

export const Route = createFileRoute("/logout")({
  preload: false,
  loader: () => logoutFn(),
});
