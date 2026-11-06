import { redirect, createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { clearSessionScope, getSupabaseServerClient } from "../utils/supabase";
import { clearCurrentUser } from "~/features/auth/current-user";
import { Spinner } from "~/components/ui/spinner";

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
  // Signing out leaves the portal; page-shaped placeholders imply its content
  // is being loaded again. Use the same immediate feedback from every page.
  pendingMs: 0,
  pendingComponent: LogoutPending,
  loader: () => {
    // Drop the cached identity before the session goes, so nothing downstream
    // can read a signed-out user back out of the cache.
    clearCurrentUser();
    return logoutFn();
  },
});

function LogoutPending() {
  return (
    <main
      id="main-content"
      className="flex min-h-svh items-center justify-center bg-background px-6 text-foreground"
    >
      <div role="status" className="flex flex-col items-center gap-4 text-center">
        <Spinner aria-hidden="true" className="size-6 motion-reduce:animate-none" />
        <p className="text-sm font-medium">Signing out…</p>
      </div>
    </main>
  );
}
