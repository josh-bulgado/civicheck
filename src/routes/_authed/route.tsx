import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getSupabaseServerClient } from "../../utils/supabase";

export const loginFn = createServerFn({ method: "POST" })
  .validator((d: { email: string; password: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient();
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      return {
        error: true,
        message: error.message,
        role: null,
      };
    }

    // Fetch the user's role from profiles
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, access_status")
      .eq("id", authData.user.id)
      .single();

    if ((profile?.access_status ?? "active") !== "active") {
      await supabase.auth.signOut();
      return { error: true, message: "This account is not active.", role: null };
    }

    return {
      error: false,
      message: "Success",
      role: profile?.role ?? "applicant",
    };
  });

// Auth-only layer: every signed-in area of the app (the dashboard shell and
// the apply wizard alike) nests under here for the session + active-account
// check, but this layer renders no chrome of its own — whether a route also
// gets the sidebar shell is decided by whether it nests under `_dashboard`
// too, not by this guard.
export const Route = createFileRoute("/_authed")({
  component: () => <Outlet />,
  beforeLoad: ({ context, location }) => {
    if (!context.user || context.user.accountStatus !== "active")
      throw redirect({ to: "/login", search: { redirect: location.href } });

    // OAuth sign-ins (Google) don't always hand us a usable first/last name.
    // Bounce anyone with a blank name to onboarding before they can reach the
    // rest of the authed app.
    const hasName =
      context.user.firstName.trim() && context.user.lastName.trim();
    if (!hasName && location.pathname !== "/onboarding") {
      throw redirect({ to: "/onboarding" });
    }
  },
});
