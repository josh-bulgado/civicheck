import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

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
