import { createFileRoute, getRouteApi, redirect } from "@tanstack/react-router";
import { hasPermission } from "~/lib/permissions";
import type { Role } from "~/lib/permissions";
import { getMyRequestsFn } from "~/features/requests/applicant-requests.queries";
import CitizenDashboard from "~/features/dashboard/pages/CitizenDashboard";
import { CitizenDashboardSkeleton } from "~/features/dashboard/CitizenDashboardSkeleton";

// The dashboard layout already loads the unread state the sidebar badge shows.
const dashboardLayout = getRouteApi("/_authed/_dashboard");

export const Route = createFileRoute("/_authed/_dashboard/dashboard")({
  beforeLoad: ({ context }) => {
    const role = (context.user?.role ?? "applicant") as Role;

    if (hasPermission(role, "dashboard:system_admin")) {
      throw redirect({
        to: "/system-admin/health",
      });
    } else if (hasPermission(role, "dashboard:admin")) {
      throw redirect({ to: "/admin" });
    } else if (hasPermission(role, "dashboard:staff")) {
      throw redirect({ to: "/staff-dashboard" });
    } else if (hasPermission(role, "requests:collect_payment")) {
      // The cashier has no dashboard: the counter is the home page.
      throw redirect({ to: "/cashier", search: {} });
    }
    // Applicants have no dedicated route to redirect to — this route renders
    // their dashboard directly instead.
  },
  loader: () => getMyRequestsFn(),
  pendingMs: 250,
  pendingMinMs: 250,
  pendingComponent: CitizenDashboardSkeleton,
  component: RouteComponent,
});

function RouteComponent() {
  const requests = Route.useLoaderData();
  const { user } = Route.useRouteContext();
  const { unreadRequestIds } = dashboardLayout.useLoaderData();

  return (
    <CitizenDashboard
      requests={requests}
      unreadRequestIds={unreadRequestIds}
      firstName={user?.firstName ?? ""}
      userId={user?.id ?? ""}
      welcomeTutorialSeen={user?.welcomeTutorialSeen ?? false}
    />
  );
}
