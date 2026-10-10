import { redirect, createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { clearSessionScope, getSupabaseServerClient } from "../utils/supabase";
import { clearCurrentUser } from "~/features/auth/current-user";

const logoutFn = createServerFn({ method: "POST" }).handler(async () => {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    // Best effort: clearing the session cookie is what matters, so send the
    // user to sign-in either way instead of stranding them on a blank route.
    console.error("Sign out error:", error);
  }

  // The next session, from an invitation or email link, starts from the default.
  clearSessionScope();

  throw redirect({
    to: "/login",
  });
});

export const Route = createFileRoute("/logout")({
  preload: false,
  loader: () => {
    // Drop the cached identity before the session goes, so nothing downstream
    // can read a signed-out user back out of the cache.
    clearCurrentUser();
    return logoutFn();
  },
});
